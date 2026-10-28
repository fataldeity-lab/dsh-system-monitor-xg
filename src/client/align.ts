/**
 * Dock-row alignment for the system bar.
 *
 * DSH 把 `conversation.composer.dock` 槽位渲染成：
 *
 *   <div class="…_dock">                           ← 真实布局行（flex row / gap 12px / max-width:100%）
 *     <div data-slot="…" style="display:contents"> ← 槽位包装：没有盒子，clientWidth = 0
 *       <div class="dsm-wrap">…</div>              ← 本插件根节点
 *     <span class="…ContextMeter">                 ← 宿主统计项
 *   </div>
 *
 * 包装层是 display:contents，width / flex-wrap 打在它上面无效，必须往上找到第一个
 * display !== 'contents' 且 clientWidth > 0 的真实行；行宽也不能靠 max-width:100%
 * （它参照 root，不是输入框卡片），得拿卡片当量尺显式设 width。
 *
 * @module dsh-system-monitor-xg/client/align
 */

/** 对齐结果，用于一次性读数与调试。 */
export type AlignResult = {
  row: HTMLElement
  cardW: number
  rowW: number
  wrapped: number
}

/** 往上找第一个真实布局行（跳过 display:contents 的槽位包装）。 */
export function realRow(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement
  for (let hops = 0; node !== null && hops < 12; hops += 1) {
    if (node === document.body || node === document.documentElement) return null
    if (getComputedStyle(node).display !== 'contents' && node.clientWidth > 0) return node
    node = node.parentElement
  }
  return null
}

/** 量尺：同层兄弟里最宽的那个（DSH 输入框卡片带 data-composer-card）。 */
export function measureCard(row: HTMLElement): number {
  const parent = row.parentElement
  if (parent === null) return 0
  const card = parent.querySelector(':scope > [data-composer-card]')
  if (card !== null) return card.getBoundingClientRect().width
  let widest = 0
  for (const sib of parent.children) {
    if (sib === row) continue
    const w = sib.getBoundingClientRect().width
    if (w > widest) widest = w
  }
  return widest
}

/** 行宽与卡片宽的容差（px）：小于它视为宿主自己已对齐，不动内联 width。 */
const TOLERANCE_PX = 2

/**
 * 行宽 = 卡片宽；允许换行；被截断的宿主统计项折行显示全（不要省略号）。
 *
 * 只在宿主自己没对齐时才写 width（|行宽 - 卡片宽| > 容差）。rc.2 的 dock 已经
 * 用 `calc(100% - …)` + `max-width: calc(var(--dsh-composer-card-max-width) - …)`
 * 收敛到卡片宽，此时这里退化为无操作、布局完全交还宿主；只有 dock 仍按 root
 * 取宽的形态（hero 页等）才接管。
 */
export function alignDockRow(el: HTMLElement): AlignResult | null {
  const row = realRow(el)
  if (row === null) return null
  const cardW = measureCard(row)
  const rowW0 = row.getBoundingClientRect().width
  if (cardW > 0 && Math.abs(rowW0 - cardW) > TOLERANCE_PX) row.style.width = `${cardW}px`
  row.style.maxWidth = '100%'
  row.style.flexWrap = 'wrap'
  let wrapped = 0
  for (const child of row.children) {
    if (child === el || child.contains(el)) continue
    if (child.scrollWidth > child.clientWidth + 1) {
      ;(child as HTMLElement).style.flexWrap = 'wrap'
      wrapped += 1
    } else if ((child as HTMLElement).style.flexWrap !== '') (child as HTMLElement).style.flexWrap = ''
  }
  return {
    row,
    cardW,
    rowW: row.getBoundingClientRect().width,
    wrapped,
  }
}
