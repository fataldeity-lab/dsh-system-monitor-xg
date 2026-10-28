window.__ModuleLoader__.load({
	id: "dsh-system-monitor-xg",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* Locale dictionaries for the client half. zh is the key-set source of
		* truth; en is checked complete against it. The namespace merges into
		* LocaleNamespaceMap so the framework synthesizes the typed `t` seat for
		* registered entries.
		*
		* @module dsh-system-monitor-xg/client/locales
		*/
		const NS = "system-monitor";
		const zh = {
			cpu: "CPU",
			memory: "内存",
			gpu: "GPU",
			vram: "显存",
			sm: "SM",
			bw: "带宽",
			unavailable: "不可用",
			waiting: "采样中…",
			clickHint: "点击查看生成阶段对比",
			generationsTitle: "最近生成阶段对比（prefill 算力密集 vs decode 带宽密集）",
			genId: "生成",
			prefill: "prefill",
			decode: "decode",
			noGeneration: "暂无生成记录",
			close: "收起",
			"bottleneck.idle": "空闲",
			"bottleneck.compute": "算力受限",
			"bottleneck.bandwidth": "带宽受限",
			"bottleneck.power": "功耗受限",
			"bottleneck.thermal": "热限制",
			"bottleneck.vram": "显存瓶颈",
			"bottleneck.mixed": "均衡负载",
			"phase.noData": "无采样"
		};
		const en = {
			cpu: "CPU",
			memory: "MEM",
			gpu: "GPU",
			vram: "VRAM",
			sm: "SM",
			bw: "BW",
			unavailable: "n/a",
			waiting: "sampling…",
			clickHint: "click for generation phases",
			generationsTitle: "Recent generations: prefill (compute-bound) vs decode (bandwidth-bound)",
			genId: "gen",
			prefill: "prefill",
			decode: "decode",
			noGeneration: "no generations yet",
			close: "close",
			"bottleneck.idle": "idle",
			"bottleneck.compute": "compute-bound",
			"bottleneck.bandwidth": "bandwidth-bound",
			"bottleneck.power": "power-limited",
			"bottleneck.thermal": "thermal",
			"bottleneck.vram": "vram-limited",
			"bottleneck.mixed": "balanced",
			"phase.noData": "no data"
		};
		//#endregion
		//#region src/client/fetch.ts
		function getSync(path) {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", `${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`, false);
			xhr.send(null);
			if (xhr.status !== 200) return null;
			return JSON.parse(xhr.responseText);
		}
		/** Latest sample only (the 1s bar poll). */
		function fetchSnapshotSync() {
			try {
				return getSync("/system-monitor/api/snapshot?light=1")?.now ?? null;
			} catch {
				return null;
			}
		}
		/** Generation phase summaries (expanded panel). */
		function fetchGenerationsSync(limit = 10) {
			try {
				return getSync(`/system-monitor/api/generations?limit=${limit}`)?.generations ?? [];
			} catch {
				return [];
			}
		}
		//#endregion
		//#region src/client/align.ts
		/**
		* Dock-row alignment for the system bar.
		*
		* DSH renders the conversation.composer.dock slot as:
		*
		*   <div class="…_dock">                           <- 真实布局行（flex row / gap 12px / max-width:100%）
		*     <div data-slot="…" style="display:contents"> <- 槽位包装：没有盒子，clientWidth = 0
		*       <div class="dsm-wrap">…</div>              <- 本插件根节点
		*     <span class="…ContextMeter">                 <- 宿主统计项
		*   </div>
		*
		* 包装层是 display:contents，width / flex-wrap 打在它上面无效，必须往上找到第一个
		* display !== 'contents' 且 clientWidth > 0 的真实行；行宽也不能靠 max-width:100%
		* （它参照 root，不是输入框卡片），得拿卡片当量尺显式设 width。
		*
		* @module dsh-system-monitor-xg/client/align
		*/
		/** 往上找第一个真实布局行（跳过 display:contents 的槽位包装）。 */
		function realRow(el) {
			let node = el.parentElement;
			for (let hops = 0; node !== null && hops < 12; hops += 1) {
				if (node === document.body || node === document.documentElement) return null;
				if (getComputedStyle(node).display !== "contents" && node.clientWidth > 0) return node;
				node = node.parentElement;
			}
			return null;
		}
		/** 量尺：同层兄弟里最宽的那个（DSH 输入框卡片带 data-composer-card）。 */
		function measureCard(row) {
			const parent = row.parentElement;
			if (parent === null) return 0;
			const card = parent.querySelector(":scope > [data-composer-card]");
			if (card !== null) return card.getBoundingClientRect().width;
			let widest = 0;
			for (const sib of parent.children) {
				if (sib === row) continue;
				const w = sib.getBoundingClientRect().width;
				if (w > widest) widest = w;
			}
			return widest;
		}
		/** 行宽 = 卡片宽；允许换行；被截断的宿主统计项折行显示全（不要省略号）。 */
		function alignDockRow(el) {
			const row = realRow(el);
			if (row === null) return null;
			const cardW = measureCard(row);
			if (cardW > 0) row.style.width = `${cardW}px`;
			row.style.maxWidth = "100%";
			row.style.flexWrap = "wrap";
			let wrapped = 0;
			for (const child of row.children) {
				if (child === el || child.contains(el)) continue;
				if (child.scrollWidth > child.clientWidth + 1) {
					child.style.flexWrap = "wrap";
					wrapped += 1;
				} else if (child.style.flexWrap !== "") child.style.flexWrap = "";
			}
			return {
				row,
				cardW,
				rowW: row.getBoundingClientRect().width,
				wrapped
			};
		}
		//#endregion
		//#region src/client/SystemBar.tsx
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
		const KIND_COLORS = {
			idle: "#9aa0aa",
			mixed: "#9aa0aa",
			compute: "#5b8def",
			bandwidth: "#e8b339",
			power: "#e8871e",
			thermal: "#e5484d",
			vram: "#e5484d"
		};
		/** 瓶颈标签走 locale 字典（t('bottleneck.<kind>')），随 DSH 当前语言切换。 */
		function kindLabel(kind, t) {
			if (kind === void 0) return "";
			return t(`bottleneck.${kind}`);
		}
		function fmtGb(mb) {
			return (mb / 1024).toFixed(2);
		}
		function Segment({ text, title, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: className !== void 0 ? `dsm-seg ${className}` : "dsm-seg",
				title,
				children: text
			});
		}
		function PhaseCell(stats, t) {
			if (stats === null) return t("phase.noData");
			return `SM ${stats.smAvg.toFixed(0)}% 带宽 ${stats.bwAvg.toFixed(0)}%`;
		}
		const SystemBar = (0, react.memo)(function SystemBar(props) {
			const { t } = props;
			const [point, setPoint] = (0, react.useState)(null);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [generations, setGenerations] = (0, react.useState)([]);
			const wrapRef = (0, react.useRef)(null);
			/* 对齐 dock 行：卡片宽当量尺；窗口 / 侧栏 / 卡片尺寸变化后重算。 */
			(0, react.useEffect)(() => {
				const el = wrapRef.current;
				if (el === null) return;
				let raf = 0;
				let ro = null;
				const observed = new Set();
				const observe = (target) => {
					if (target === null || target === void 0 || observed.has(target)) return;
					observed.add(target);
					ro.observe(target);
				};
				const run = () => {
					raf = 0;
					const out = alignDockRow(el);
					if (out === null) return;
					observe(out.row);
					observe(out.row.parentElement);
				};
				const schedule = () => {
					if (raf !== 0) return;
					raf = window.requestAnimationFrame(run);
				};
				ro = new ResizeObserver(schedule);
				schedule();
				window.addEventListener("resize", schedule);
				return () => {
					window.removeEventListener("resize", schedule);
					ro.disconnect();
					if (raf !== 0) window.cancelAnimationFrame(raf);
				};
			}, []);
			(0, react.useEffect)(() => {
				let alive = true;
				// 采样间隔由宿主 config.intervalMs 决定（本机 10s）：同一 ts 重复到达
				// 时不再 setState，否则每个采样周期白刷 9 次 React 提交 + 底栏对齐计算。
				let lastTs = -1;
				const poll = () => {
					if (!alive) return;
					const next = fetchSnapshotSync();
					if (next !== null && next.ts !== lastTs) {
						lastTs = next.ts;
						setPoint(next);
					}
					window.setTimeout(poll, 1e3);
				};
				poll();
				return () => {
					alive = false;
				};
			}, []);
			const toggle = () => {
				const next = !expanded;
				setExpanded(next);
				if (next) setGenerations(fetchGenerationsSync(10));
			};
			const gpu = point?.gpus[0];
			const bottleneck = point?.bottleneck;
			const badgeColor = bottleneck ? KIND_COLORS[bottleneck.kind] ?? "#9aa0aa" : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsm-wrap",
				ref: wrapRef,
				"data-dsm-align": "7",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dsm-bar",
					onClick: toggle,
					"aria-expanded": expanded,
					title: `${t("clickHint")} · ${bottleneck?.detail ?? ""}`,
					children: point === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, { text: t("waiting") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
							className: "dsm-fixed-cpu",
							text: `${t("cpu")} ${point.cpu ? `${point.cpu.percent.toFixed(0)}%` : "…"}`,
							title: point.cpu ? `CPU ${point.cpu.percent.toFixed(1)}% (${point.cpu.perCore.map((p) => p.toFixed(0)).join("/")}%)` : void 0
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
							className: "dsm-fixed-mem",
							text: `${t("memory")} ${point.memory ? `${point.memory.percent.toFixed(0)}%` : "…"}`,
							title: point.memory ? `内存 ${point.memory.usedGb.toFixed(1)}/${point.memory.totalGb.toFixed(0)}G` : void 0
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsm-sep",
							"aria-hidden": true,
							children: "│"
						}),
						point.gpuUnavailable || gpu === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
							className: "dsm-fixed-gpu",
							text: `${t("gpu")} ${t("unavailable")}`,
							title: t("unavailable")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
								className: "dsm-fixed-gpu",
								text: `${t("gpu")}${gpu.index} SM ${gpu.smPercent.toFixed(0)}% 带宽 ${gpu.memBandwidthPercent.toFixed(0)}%`,
								title: `${t("sm")} ${gpu.smPercent.toFixed(1)}% · ${t("bw")} ${gpu.memBandwidthPercent.toFixed(1)}%（显存带宽控制器利用率）`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
								className: "dsm-fixed-vram",
								text: `${t("vram")} ${fmtGb(gpu.vramUsedMb)}/${fmtGb(gpu.vramTotalMb)}G`,
								title: `VRAM ${(gpu.vramUsedMb / 1024).toFixed(2)}/${(gpu.vramTotalMb / 1024).toFixed(2)} GiB`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
								className: "dsm-fixed-pwr",
								text: `${gpu.powerDrawW.toFixed(0)}W`,
								title: `功耗 ${gpu.powerDrawW.toFixed(0)}W${gpu.powerLimitW > 0 ? `/${gpu.powerLimitW.toFixed(0)}W` : ""}`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segment, {
								className: "dsm-fixed-temp",
								text: `${gpu.tempC.toFixed(0)}℃`,
								title: `温度 ${gpu.tempC.toFixed(0)}℃ · SM 时钟 ${gpu.smClockMhz.toFixed(0)}/${gpu.smClockMaxMhz.toFixed(0)} MHz`
							})
						] }),
						bottleneck != null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsm-badge",
							style: { color: badgeColor },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsm-dot",
								style: { backgroundColor: badgeColor },
								"aria-hidden": true
							}), kindLabel(bottleneck.kind, t)]
						})
					] })
				}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsm-panel",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-panel-title",
							children: t("generationsTitle")
						}),
						generations.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsm-panel-empty",
							children: t("noGeneration")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: "dsm-table",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "dsm-num",
									children: "#"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "dsm-num",
									children: t("prefill")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("th", {
									className: "dsm-num",
									children: [t("prefill"), " SM/BW"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									className: "dsm-num",
									children: t("decode")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("th", {
									className: "dsm-num",
									children: [t("decode"), " SM/BW"]
								})
							] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: generations.map((g) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "dsm-num",
									children: g.id
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									className: "dsm-num",
									children: [g.prefillMs.toFixed(0), "ms"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "dsm-num",
									children: PhaseCell(g.prefill, t)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									className: "dsm-num",
									children: [g.decodeMs.toFixed(0), "ms"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "dsm-num",
									children: PhaseCell(g.decode, t)
								})
							] }, g.id)) })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsm-close",
							onClick: () => setExpanded(false),
							children: t("close")
						})
					]
				})]
			});
		});
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-system-monitor-xg client entry: installs stylesheet and locale, then
		* registers the system bar on `conversation.composer.dock` (id
		* 'system-monitor', order 1 — next to the built-in stats line at order 0).
		*
		* @module dsh-system-monitor-xg/client
		*/
		/** Bar + panel styles. Class names prefixed `dsm-` to stay collision-free. */
		const STYLES = `
/* 兜底（不依赖 JS）：把 dock 行宽收敛到输入框卡片，并允许换行。
   dock 自带的 max-width:100% 参照 root（窗口减侧边留白）而不是卡片，所以会比输入框宽；
   必须显式给 width —— 只设 max-width 不够：换行 flex 容器的 max-content 会缩成最宽一项。 */
div:has(> [data-slot='conversation.composer.dock']) {
  width: min(100%, var(--dsh-composer-card-max-width, 100%));
  flex-wrap: wrap;
}
.dsm-wrap {
  /* 独占一行：宿主统计行 order 默认 0，本插件 order 1 → 排在统计行下方 */
  flex: 1 0 100%;
  order: 1;
  /* dock 的 gap 是 12px，吃掉 8px，免得两行之间看起来空了一行 */
  margin: -8px 0 0;
  display: block;
  min-width: 0;
  box-sizing: border-box;
}
.dsm-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  column-gap: 10px;
  row-gap: 2px;
  width: 100%;
  margin: 0;
  padding: 0; /* v7: 与 dock 的 row-gap 叠加会显得空一行 */
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary, #9aa0aa);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  text-align: center;
}
.dsm-bar:hover {
  color: var(--dsw-alias-label-secondary, #c8ccd4);
}
.dsm-seg {
  display: inline-block;
  white-space: nowrap;
}
/* 固定段宽：数字位数变化（1% ↔ 100%）不引起整条伸缩 */
.dsm-fixed-cpu,
.dsm-fixed-mem {
  min-width: 5.6em;
}
.dsm-fixed-gpu {
  min-width: 14em;
}
.dsm-fixed-vram {
  /* 22.00/24.00 两位小数，中英文标签最宽约 8.6em */
  min-width: 8.8em;
}
.dsm-fixed-pwr,
.dsm-fixed-temp {
  min-width: 3em;
}
.dsm-sep {
  color: var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.25));
}
.dsm-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 600;
  /* 固定宽：中英文本长度差异大（空闲 ↔ bandwidth-bound），
     状态切换不引起整条伸缩 */
  min-width: 8.8em;
}
.dsm-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent);
}
.dsm-panel {
  margin: 4px auto 0;
  max-width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  font-size: 12px;
  color: var(--dsw-alias-label-primary, #1a1d24);
  color-scheme: light dark;
}
.dsm-panel-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #5b6472);
}
.dsm-panel-empty {
  padding: 6px 0;
  color: var(--dsw-alias-label-tertiary, #9aa0aa);
}
.dsm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.dsm-table th,
.dsm-table td {
  padding: 4px 10px;
  text-align: left;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.08));
  white-space: nowrap;
}
.dsm-table th {
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary, #9aa0aa);
}
.dsm-table .dsm-num {
  text-align: right;
}
.dsm-close {
  margin-top: 8px;
  padding: 4px 14px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6472);
  font-size: 12px;
  cursor: pointer;
}
.dsm-close:hover {
  border-color: var(--dsw-alias-label-secondary, #5b6472);
}
`;
		function installStyles() {
			const style = document.createElement("style");
			style.dataset.plugin = "dsh-system-monitor-xg";
			style.textContent = STYLES;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		/** Client services required by this plugin. */
		const inject = ["slots", "locale"];
		/** Register the system bar on the composer dock (next to the stats line). */
		function apply(ctx) {
			ctx.effect(installStyles, "dsh-system-monitor-xg: styles");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-system-monitor-xg: locale");
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "system-monitor",
				order: 1,
				locale: NS
			}, SystemBar));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map