/**
 * dsh-system-monitor-xg client entry: installs stylesheet and locale, then
 * registers the system bar on `conversation.composer.dock` (id
 * 'system-monitor', order 1 — next to the built-in stats line at order 0).
 *
 * @module dsh-system-monitor-xg/client
 */
/** Structural slots face (register/inject) — matches the runtime SlotRegistry. */
type SlotsService = {
    inject(key: string, callback: () => () => void): () => void;
    register(options: Record<string, unknown>, component: unknown): () => void;
};
type ClientContext = {
    slots: SlotsService;
    locale: {
        register(ns: string, dictionaries: {
            zh: Record<string, string>;
            en: Record<string, string>;
        }): void;
        bind(ns: string): (key: string, params?: Record<string, string | number>) => string;
    };
    effect(fn: () => void | (() => void), label: string): void;
};
/** Client services required by this plugin. */
export declare const inject: string[];
/** Register the system bar on the composer dock (next to the stats line). */
export declare function apply(ctx: ClientContext): void;
export {};
