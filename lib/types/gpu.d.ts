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
 * @module dsh-system-monitor-xg/gpu
 */
import type { GpuMetrics } from './types.ts';
export type GpuProcess = {
    pid: number;
    name: string;
    usedMb: number;
};
export declare class GpuMonitor {
    private busy;
    private unavailable;
    private cachedProcesses;
    private lastProcessFetch;
    get isUnavailable(): boolean;
    /** Current per-GPU metrics. Resolves [] when nvidia-smi is unavailable. */
    sample(): Promise<GpuMetrics[]>;
    /** Compute-app processes (显存占用进程); throttled to once per 5s. */
    processes(): Promise<GpuProcess[]>;
}
