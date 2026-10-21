/**
 * Locale dictionaries for the client half. zh is the key-set source of
 * truth; en is checked complete against it. The namespace merges into
 * LocaleNamespaceMap so the framework synthesizes the typed `t` seat for
 * registered entries.
 *
 * @module dsh-system-monitor-xg/client/locales
 */
export declare const NS = "system-monitor";
declare const zh: {
    cpu: string;
    memory: string;
    gpu: string;
    vram: string;
    sm: string;
    bw: string;
    unavailable: string;
    waiting: string;
    clickHint: string;
    generationsTitle: string;
    genId: string;
    prefill: string;
    decode: string;
    noGeneration: string;
    close: string;
    'bottleneck.idle': string;
    'bottleneck.compute': string;
    'bottleneck.bandwidth': string;
    'bottleneck.power': string;
    'bottleneck.thermal': string;
    'bottleneck.vram': string;
    'bottleneck.mixed': string;
    'phase.noData': string;
};
declare const en: Record<keyof typeof zh, string>;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-system-monitor-xg dictionary namespace. */
        'system-monitor': keyof typeof zh;
    }
}
export { zh, en };
