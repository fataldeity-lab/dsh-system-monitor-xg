/**
 * Shared wire types for dsh-system-monitor-xg.
 *
 * A sample point is the host-side unit of observation: one tick of the
 * sampler with CPU / memory / GPU metrics and the generation stage it
 * belonged to. Everything served over REST or the tool is plain JSON of
 * these shapes. Types are `type` aliases (not interfaces) so they satisfy
 * DSH's JsonValue structural constraint (implicit index signature).
 *
 * @module dsh-system-monitor-xg/types
 */
export {};
