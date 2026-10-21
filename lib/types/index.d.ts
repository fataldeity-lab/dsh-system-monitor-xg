/**
 * dsh-system-monitor-xg host entry: sampler lifecycle + REST API + the
 * `system_metrics` tool.
 *
 * Host side provides everything the browser cannot:
 *  1. 定时采样 CPU / 内存 / GPU（算力 · 显存带宽 · 显存 · 功耗 · 温度 · 时钟）
 *  2. 瓶颈诊断（算力受限 / 带宽受限 / 功耗受限 / 热限制 / 显存容量）
 *  3. 生成阶段跟踪：prefill（计算密集）vs decode（带宽密集）两阶段负载对比
 *  4. REST API（底栏 1s 轮询）：/system-monitor/api/snapshot · /generations
 *  5. JSONL 落盘（~/.dsh/dsh-system-monitor-xg/）
 *  6. system_metrics 工具：agent 会话内随时查询负载与瓶颈（评测归因）
 *
 * @module dsh-system-monitor-xg
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-system-monitor-xg";
export declare const inject: string[];
export interface HostConfig {
    intervalMs?: number;
    historySize?: number;
    persist?: boolean;
}
export declare function apply(ctx: Context, rawConfig?: HostConfig): void;
