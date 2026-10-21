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
import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
export function dataDir() {
    const base = process.env.DSH_HOME || join(homedir(), '.dsh');
    return join(base, 'dsh-system-monitor');
}
function dayStamp(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export class Ledger {
    dir;
    ready = null;
    disabled = false;
    constructor(dir = dataDir()) {
        this.dir = dir;
    }
    ensureReady() {
        if (this.ready === null) {
            this.ready = mkdir(this.dir, { recursive: true }).catch(error => {
                this.disabled = true;
                console.warn(`[dsh-system-monitor-xg] ledger dir unavailable (${this.dir}): ${String(error)}`);
            });
        }
        return this.ready;
    }
    async append(name, row) {
        if (this.disabled)
            return;
        try {
            await this.ensureReady();
            const file = join(this.dir, `${name}-${dayStamp(Date.now())}.jsonl`);
            await appendFile(file, `${JSON.stringify(row)}\n`, { encoding: 'utf8', flag: 'a' });
        }
        catch (error) {
            console.warn(`[dsh-system-monitor-xg] ledger append failed: ${String(error)}`);
        }
    }
    recordPoint(point) {
        void this.append('metrics', point);
    }
    recordGeneration(summary) {
        void this.append('generations', summary);
    }
}
