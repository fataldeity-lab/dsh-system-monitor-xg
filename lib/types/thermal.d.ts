/**
 * CPU temperature monitor: reads the platform's ACPI / sysfs thermal zones.
 * A slow channel decoupled from the 1s sampler (its own 5s tick + busy flag),
 * latest value cached and attached to every sample point by the Sampler.
 *
 * Sources:
 *  - Windows: WMI `root/wmi:MSAcpi_ThermalZoneTemperature`（CurrentReading 为
 *    0.1℃ 单位），取全部热区均值；经 `powershell -NoProfile` 启动查询
 *    （启动开销约 0.5s，故 5s 节流）。`root/wmi` 命名空间常被机器策略限制
 *    为仅管理员可读：拒绝访问（退出码 3）按环境问题处理，5min 冷却，
 *    DSH 以管理员运行后自动恢复。
 *  - Linux: /sys/class/thermal 下 thermal_zone* 的 {type, temp}（毫摄氏度），
 *    优先选 type 含 cpu/pkg/soc 的热区，否则取最热区（WSL2 下只有 acpitz
 *    通用热区时回退到最热区）。
 *  - 其他平台（macOS 等）：无可用传感器，latest() 恒为 null，不产生任何 spawn。
 *
 * 失败语义与 GpuMonitor 一致：缓存最后一次成功值；失败进冷却
 * （瞬态 5s / 环境 5min）；仅正常→不可用转变时打日志。
 *
 * @module dsh-system-monitor-xg/thermal
 */
/** CPU 温度轮询间隔（慢通道；WMI 查询含 powershell 启动约 0.5s，1s 会占掉半个核）。 */
export declare const CPU_TEMP_POLL_MS = 5000;
/** 瞬态失败（WMI 查询出错 / 超时）后的重试冷却。 */
export declare const THERMAL_RETRY_MS = 5000;
/** 环境性失败（无热区 / WMI 拒绝访问 / powershell 缺失）后的重试冷却。 */
export declare const THERMAL_UNAVAILABLE_COOLDOWN_MS: number;
/** 解析 PowerShell 成功时输出的温度（℃）；空 / 非数值 → null。 */
export declare function parseThermalStdout(stdout: string): number | null;
/**
 * 失败后应用的冷却期：exit 2（无热区）/ 3（拒绝访问）/ 4（powershell 缺失）
 * 是环境性问题，短期重试不会恢复 → 长冷却；exit 1 / null（超时/瞬态）→ 短冷却。
 */
export declare function thermalFailureCooldown(exitCode: number | null): number;
/** sysfs 原始读数换算：>1000 视为毫摄氏度（x86_pkg_temp 等常见驱动），否则已是摄氏度。 */
export declare function zoneTempC(raw: number): number;
/** 优先选 CPU 热区（type 含 cpu/pkg/soc，忽略大小写），否则取最热区；空列表 → null。 */
export declare function selectCpuZone(zones: Array<{
    type: string;
    tempC: number;
}>): number | null;
export declare class CpuThermalMonitor {
    private tempC;
    private busy;
    private unavailable;
    private lastFailAt;
    private cooldownMs;
    private lastErrorMsg;
    private timer;
    private readonly unsupported;
    get isUnavailable(): boolean;
    /** 最近一次失败原因（健康时为 ''）；供 system_metrics 工具回答「为什么没有 CPU 温度」。 */
    get lastError(): string;
    /** 最新已知温度（℃）；null = 平台无传感器 / 尚未成功采样。 */
    latest(): number | null;
    /** 启动 5s 轮询（立即首采）；不支持的平台打一行日志后返回。随插件 fiber dispose 一并停止。 */
    start(intervalMs: number): void;
    dispose(): void;
    /** 冷却期内不发起查询；冷却结束自动重试（瞬态故障自动恢复）。 */
    private canAttempt;
    private noteSuccess;
    private noteFailure;
    private poll;
    private pollLinux;
}
