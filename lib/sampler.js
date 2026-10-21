/**
 * Sampler: the heart of dsh-system-monitor-xg.
 *
 * 1. 定时采样（默认 1s）：CPU（os.cpus 差值）+ 内存（os）+ GPU（nvidia-smi），
 *    组合成 SamplePoint 推入环形缓冲，并打上当前生成阶段的标签。
 * 2. 生成阶段跟踪（会话事件驱动）：
 *      request/header  → 新 generation 开始，stage = prefill（模型处理提示词）
 *      assistant/chunk（首个）→ stage = decode（流式生成，逐 token 解码）
 *      assistant/message → generation 结束，汇总 prefill/decode 两阶段统计
 *    prefill 是计算密集（矩阵乘），decode 是带宽密集（逐 token 访存）——
 *    两阶段负载特征的对比正是「GPU 占用高但算力没跑满」的量化证据。
 *
 * 采样是异步的（GPU 查询约 50ms）；用 tickId 序号保护乱序，重复 tick 直接
 * 丢弃，保证环形缓冲单调推进。
 *
 * @module dsh-system-monitor-xg/sampler
 */
import { freemem, totalmem } from 'node:os';
import { diagnoseMostActive } from "./bottleneck.js";
const GENERATIONS_CAP = 200;
function avg(values) {
    if (values.length === 0)
        return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}
function toPhaseStats(points) {
    if (points.length === 0)
        return null;
    return {
        samples: points.length,
        cpuAvg: avg(points.map(p => p.cpu?.percent ?? 0)),
        smAvg: avg(points.map(p => p.gpus[0]?.smPercent ?? 0)),
        bwAvg: avg(points.map(p => p.gpus[0]?.memBandwidthPercent ?? 0)),
        vramUsedAvgMb: avg(points.map(p => p.gpus[0]?.vramUsedMb ?? 0)),
        powerAvgW: avg(points.map(p => p.gpus[0]?.powerDrawW ?? 0)),
        maxSm: Math.max(0, ...points.map(p => p.gpus[0]?.smPercent ?? 0)),
        maxBw: Math.max(0, ...points.map(p => p.gpus[0]?.memBandwidthPercent ?? 0)),
    };
}
export class Sampler {
    options;
    cpu;
    gpu;
    history = [];
    generations = [];
    active = null;
    nextGenerationId = 1;
    timer = null;
    tickId = 0;
    disposers = [];
    constructor(cpu, gpu, options) {
        this.cpu = cpu;
        this.gpu = gpu;
        this.options = options;
    }
    /** 安装定时采样与会话事件监听；随插件 fiber dispose 一并卸载。 */
    start(ctx) {
        const tick = () => {
            const id = ++this.tickId;
            const stage = this.active?.stage ?? 'idle';
            const generationId = this.active?.id ?? null;
            const cpu = this.cpu.sample();
            const memory = {
                usedGb: (totalmem() - freemem()) / 1024 ** 3,
                totalGb: totalmem() / 1024 ** 3,
                percent: totalmem() > 0 ? ((totalmem() - freemem()) / totalmem()) * 100 : 0,
            };
            void this.gpu.sample().then(gpus => {
                if (id !== this.tickId)
                    return; // 过期 tick，丢弃
                const point = {
                    ts: Date.now(),
                    stage,
                    generationId,
                    cpu,
                    memory,
                    gpus,
                    gpuUnavailable: this.gpu.isUnavailable,
                    bottleneck: diagnoseMostActive(gpus),
                };
                this.push(point);
            });
        };
        this.timer = setInterval(tick, this.options.intervalMs);
        tick(); // 立即首采（CPU 首采为 null，GPU 就绪）
        this.disposers.push(() => {
            if (this.timer !== null)
                clearInterval(this.timer);
            this.timer = null;
        });
        const onEvent = (session, event) => {
            this.onEvent(event);
        };
        // cordis 的 ctx.on 返回卸载函数（dispose），随插件 fiber 一并释放。
        this.disposers.push(ctx.on('session/event', onEvent));
    }
    dispose() {
        for (const dispose of this.disposers) {
            try {
                dispose();
            }
            catch { /* no-op */ }
        }
        this.disposers = [];
    }
    onEvent(event) {
        switch (event.type) {
            case 'request/header': {
                // 新模型请求：prefill 窗口开始。旧 generation 若未收尾则强制结束。
                this.finishActive(Date.now());
                this.active = {
                    id: this.nextGenerationId++,
                    startedAt: Date.now(),
                    decodeStartedAt: null,
                    stage: 'prefill',
                    samples: [],
                };
                break;
            }
            case 'assistant/chunk': {
                const now = Date.now();
                if (this.active === null) {
                    // 无 header 直出的流（兜底）：视首个 chunk 为 decode 起点
                    this.active = { id: this.nextGenerationId++, startedAt: now, decodeStartedAt: now, stage: 'decode', samples: [] };
                    break;
                }
                if (this.active.stage === 'prefill') {
                    this.active.stage = 'decode';
                    this.active.decodeStartedAt = now;
                }
                break;
            }
            case 'assistant/message': {
                this.finishActive(Date.now());
                break;
            }
            default:
                break;
        }
    }
    finishActive(endedAt) {
        const active = this.active;
        if (active === null)
            return;
        this.active = null;
        const prefillPoints = active.samples.filter(p => p.stage === 'prefill');
        const decodePoints = active.samples.filter(p => p.stage === 'decode');
        const prefillMs = active.decodeStartedAt !== null ? active.decodeStartedAt - active.startedAt : endedAt - active.startedAt;
        const decodeMs = active.decodeStartedAt !== null ? endedAt - active.decodeStartedAt : 0;
        const summary = {
            id: active.id,
            turn: null,
            step: null,
            startedAt: active.startedAt,
            endedAt,
            prefillMs: Math.max(0, prefillMs),
            decodeMs: Math.max(0, decodeMs),
            prefill: toPhaseStats(prefillPoints),
            decode: toPhaseStats(decodePoints),
        };
        this.generations.push(summary);
        if (this.generations.length > GENERATIONS_CAP)
            this.generations.splice(0, this.generations.length - GENERATIONS_CAP);
        try {
            this.options.onGeneration?.(summary);
        }
        catch { /* 观察者失败不影响主流程 */ }
    }
    push(point) {
        this.history.push(point);
        if (this.history.length > this.options.historySize)
            this.history.splice(0, this.history.length - this.options.historySize);
        const active = this.active;
        if (active !== null && point.generationId === active.id) {
            active.samples.push(point);
        }
        try {
            this.options.onPoint?.(point);
        }
        catch { /* no-op */ }
    }
    latest() {
        return this.history.at(-1) ?? null;
    }
    historySlice(window) {
        return this.history.slice(-Math.max(1, Math.min(window, this.options.historySize)));
    }
    recentGenerations(limit) {
        return this.generations.slice(-Math.max(1, Math.min(limit, GENERATIONS_CAP)));
    }
}
