/**
 * JSONL ledger: persists every sample point and generation summary to
 * `~/.dsh/dsh-system-monitor/` (or `$DSH_HOME/dsh-system-monitor/`), one
 * JSON object per line, rotated daily. Disk failures only warn — the ledger
 * must never take the sampler down (the exporter 兜底 lesson applies to any
 * host-side persistence).
 *
 * 数据目录与包名解耦（保持 dsh-system-monitor，不随包名 -xg 后缀变化）：
 * 升级/改名不迁移历史负载数据。
 *
 * @module dsh-system-monitor-xg/ledger
 */
import type { GenerationSummary, SamplePoint } from './types.ts';
export declare function dataDir(): string;
export declare class Ledger {
    private dir;
    private ready;
    private disabled;
    constructor(dir?: string);
    private ensureReady;
    private append;
    recordPoint(point: SamplePoint): void;
    recordGeneration(summary: GenerationSummary): void;
}
