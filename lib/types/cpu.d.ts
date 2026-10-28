/**
 * CPU utilization monitor: pure Node, no native deps. Overall + per-core
 * utilization is derived from the delta of `os.cpus()` tick counters between
 * two samples (the same technique psutil uses). The first call returns null
 * (no previous ticks to diff against).
 *
 * CPU 温度不走本模块的利用率差值：由 Sampler 把 CpuThermalMonitor 的
 * 最新缓存值作为参数传入 sample()，统一在 CpuMetrics 出口组装。
 *
 * @module dsh-system-monitor-xg/cpu
 */
import type { CpuMetrics } from './types.ts';
export declare class CpuMonitor {
    private prev;
    /**
     * Sample utilization since the last call. First call returns null.
     * `tempC` 是 CpuThermalMonitor 的最新缓存值（5s 慢通道），原样透传进结果。
     */
    sample(tempC?: number | null): CpuMetrics | null;
}
