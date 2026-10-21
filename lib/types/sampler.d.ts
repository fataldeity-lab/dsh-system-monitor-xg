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
import type { Context } from '@deepseek-ai/cordis';
import type { CpuMonitor } from './cpu.ts';
import type { GpuMonitor } from './gpu.ts';
import type { GenerationSummary, SamplePoint } from './types.ts';
export interface SamplerOptions {
    intervalMs: number;
    historySize: number;
    onPoint?: (point: SamplePoint) => void;
    onGeneration?: (summary: GenerationSummary) => void;
}
export declare class Sampler {
    private readonly options;
    private readonly cpu;
    private readonly gpu;
    private readonly history;
    private readonly generations;
    private active;
    private nextGenerationId;
    private timer;
    private tickId;
    private disposers;
    constructor(cpu: CpuMonitor, gpu: GpuMonitor, options: SamplerOptions);
    /** 安装定时采样与会话事件监听；随插件 fiber dispose 一并卸载。 */
    start(ctx: Context): void;
    dispose(): void;
    private onEvent;
    private finishActive;
    private push;
    latest(): SamplePoint | null;
    historySlice(window: number): SamplePoint[];
    recentGenerations(limit: number): GenerationSummary[];
}
