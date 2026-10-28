/**
 * GPU monitor: parses `nvidia-smi --query-gpu=...` CSV output. Zero npm
 * native deps — nvidia-smi ships with the driver on every NVIDIA platform
 * (Windows: System32, Linux: /usr/bin or driver path). A single query is
 * ~50ms; the sampler's busy flag drops ticks that would overlap.
 *
 * Two separate queries per tick:
 *  1. GPU-level utilization / memory / power / temp / clocks
 *  2. compute-app processes (显存占用进程，供 tool 展示；5s 节流)
 *
 * 失败恢复（自动重试，不锁死）：
 *  单次 nvidia-smi 失败不会永久置 unavailable（旧行为首败即永久锁死，
 *  驱动更新 / GPU 瞬态异常后底栏一直显示「GPU 不可用」，必须重启 DSH）。
 *  失败后进入冷却期再自动重试：
 *   - 瞬态失败（驱动瞬态、GPU 复位、超时）→ 5s 后重试；
 *   - nvidia-smi 二进制完全缺失（无 NVIDIA 驱动 / 非 NVIDIA 机器）→ 5min 后重试，
 *     避免对不存在的可执行文件高频 spawn；
 *   - 采样再次成功即清除 unavailable 并打印恢复日志。
 *
 * @module dsh-system-monitor-xg/gpu
 */
import type { GpuMetrics } from './types.ts';
export type GpuProcess = {
    pid: number;
    name: string;
    usedMb: number;
};
/** 瞬态失败（驱动异常/GPU 复位/超时/空输出）后的重试冷却。 */
export declare const RETRY_COOLDOWN_MS = 5000;
/** nvidia-smi 二进制完全缺失（无驱动/非 NVIDIA 机器）后的重试冷却：避免高频无谓 spawn。 */
export declare const MISSING_COOLDOWN_MS: number;
/** 失败后应用的冷却期：二进制完全缺失 → 长冷却；其余（瞬态故障）→ 短冷却。 */
export declare function failureCooldownMs(allMissing: boolean): number;
/** 是否允许发起 nvidia-smi 调用：未失败恒允许；失败状态需冷却期结束（自动重试，瞬态故障自动恢复）。 */
export declare function canAttemptNvidiaSmi(now: number, unavailable: boolean, lastFailAt: number, cooldownMs: number): boolean;
export declare class GpuMonitor {
    private busy;
    private unavailable;
    private lastFailAt;
    private cooldownMs;
    private lastErrorMsg;
    private cachedProcesses;
    private lastProcessFetch;
    get isUnavailable(): boolean;
    /** 最近一次失败原因（健康时为 ''）；供 system_metrics 工具展示，免去翻日志。 */
    get lastError(): string;
    /** 冷却期内不发起 nvidia-smi 调用；冷却结束自动重试（瞬态故障自动恢复）。 */
    private canAttempt;
    private noteFailure;
    private noteSuccess;
    /** Current per-GPU metrics. Resolves [] when nvidia-smi is unavailable (冷却期内 / 重试未成功). */
    sample(): Promise<GpuMetrics[]>;
    /** Compute-app processes (显存占用进程); throttled to once per 5s. 空进程列表是合法状态（无 compute 进程），不视为失败。 */
    processes(): Promise<GpuProcess[]>;
}
