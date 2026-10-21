/**
 * CPU utilization monitor: pure Node, no native deps. Overall + per-core
 * utilization is derived from the delta of `os.cpus()` tick counters between
 * two samples (the same technique psutil uses). The first call returns null
 * (no previous ticks to diff against).
 *
 * @module dsh-system-monitor-xg/cpu
 */
import type { CpuMetrics } from './types.ts';
export declare class CpuMonitor {
    private prev;
    /** Sample utilization since the last call. First call returns null. */
    sample(): CpuMetrics | null;
}
