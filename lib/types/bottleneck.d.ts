/**
 * Bottleneck diagnosis: pure function over one GPU sample.
 *
 * 核心思想：`smPercent`（算力）与 `memBandwidthPercent`（显存带宽）是两个
 * 正交的利用率轴。GPU 占用高 ≠ 算力打满 —— decode 阶段 SM 大量时间停在
 * 等待显存返回数据，表现为带宽利用率高而算力并未真正饱和。诊断顺序：
 *
 *   idle → 显存容量 → 热限制 → 功耗墙 → 带宽受限 → 算力受限 → 均衡
 *
 * 判据（阈值可后续做成配置）：
 *   - 空闲：SM 与带宽都 < 15%
 *   - 显存瓶颈：显存占用 > 95%
 *   - 热限制：核心温度 ≥ 88℃，或 ≥ 80℃ 且 SM 时钟掉到 < 92% max；
 *     或显存温度 ≥ 95℃（显存独立过热——长 decode 下 GDDR 常比核心先热；
 *     驱动未上报显存温度时为 null，不参与判定）
 *   - 功耗受限：功耗 ≥ 98% 上限
 *   - 带宽受限：带宽 ≥ 80%（SM 较低 = 典型 decode 等待；SM 双高 = 逼近极限）
 *   - 算力受限：SM ≥ 80% 且带宽 < 60%（典型 prefill）
 *
 * @module dsh-system-monitor-xg/bottleneck
 */
import type { Bottleneck, GpuMetrics } from './types.ts';
export declare const KIND_LABELS: Record<string, string>;
/** Diagnose one GPU sample. */
export declare function diagnose(g: GpuMetrics): Bottleneck;
/** Pick the most active GPU (max SM + bandwidth) for the bar diagnosis. */
export declare function diagnoseMostActive(gpus: readonly GpuMetrics[]): Bottleneck | null;
