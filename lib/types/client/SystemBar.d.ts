/**
 * The system monitor bar: a `conversation.composer.dock` entry (id
 * 'system-monitor', order 1 — sits right of the built-in stats line) that
 * polls the host's light snapshot once per second and renders CPU / memory /
 * GPU (SM 算力 · 显存带宽 · 显存 · 功耗 · 温度) plus the bottleneck badge.
 *
 * Clicking the bar expands the generation phase comparison (prefill vs
 * decode). 瓶颈徽标颜色：算力=蓝、带宽=琥珀、功耗=橙、热/显存=红、均衡=灰。
 *
 * @module dsh-system-monitor-xg/client/SystemBar
 */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
export declare const SystemBar: import("react").MemoExoticComponent<(props: PropsRuntime<"conversation.composer.dock"> & PropsLocale<typeof NS>) => import("react").JSX.Element>;
