import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { prepareWithSegments, layoutWithLines, measureNaturalWidth } from '@chenglou/pretext';
import type { PreparedTextWithSegments } from '@chenglou/pretext';
import type { MindNode } from '../types';
import { ACCENTS, STATUS_CONFIG } from '../constants/colors';

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT   = 12;
const NW_P   = 88;    // fixed width for parent (non-leaf) nodes
const NH     = 30;    // node height
const LINE_H = 15;    // wrapped line height
const PAD_X  = 10;    // horizontal text padding
const PAD_Y  = 5;     // vertical padding for multi-line
const HG     = 30;    // horizontal gap between tree levels
const VG     = 12;    // vertical gap between siblings
const PAD    = 24;    // SVG outer padding
const RC     = 6;     // root circle radius

// ── Pretext cache ──────────────────────────────────────────────────────────────
const prepCache = new Map<string, PreparedTextWithSegments>();
function getPrep(text: string, fw: number): PreparedTextWithSegments {
  const key = `${fw}|${text}`;
  if (!prepCache.has(key))
    prepCache.set(key, prepareWithSegments(text, `${fw} ${FONT}px system-ui,sans-serif`));
  return prepCache.get(key)!;
}

function clean(n: MindNode) {
  return n.title.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
}

// ── Layout types ───────────────────────────────────────────────────────────────
interface NL {
  node: MindNode;
  x: number; y: number; w: number; h: number;
  lines: string[];
  color: string;
  depth: number;
  children: NL[];
}

// ── Node dimensions ────────────────────────────────────────────────────────────
function dim(node: MindNode, depth: number, col: Set<string>) {
  const t     = clean(node);
  const fw    = depth === 1 ? 600 : 400;
  const hasCh = !!node.children?.length && !col.has(node.id);

  if (!t) return { w: hasCh ? NW_P : 40, h: NH, lines: [''] };

  if (!hasCh) {
    const tw = measureNaturalWidth(getPrep(t, fw));
    return { w: Math.max(40, Math.ceil(tw) + PAD_X * 2), h: NH, lines: [t] };
  }

  const { lines } = layoutWithLines(getPrep(t, fw), NW_P - PAD_X * 2, LINE_H);
  const ls = lines.length ? lines.map(l => l.text) : [t];
  const h  = ls.length === 1 ? NH : Math.max(NH, PAD_Y * 2 + ls.length * LINE_H);
  return { w: NW_P, h, lines: ls };
}

// ── Subtree height ─────────────────────────────────────────────────────────────
function treeH(node: MindNode, depth: number, col: Set<string>): number {
  if (depth === 0) {
    if (!node.children?.length) return RC * 2;
    return node.children.reduce((s, c, i) => s + treeH(c, 1, col) + (i > 0 ? VG : 0), 0);
  }
  const d = dim(node, depth, col);
  if (!node.children?.length || col.has(node.id)) return d.h;
  const ch = node.children.reduce((s, c, i) =>
    s + treeH(c, depth + 1, col) + (i > 0 ? VG : 0), 0);
  return Math.max(d.h, ch);
}

// ── Build layout tree ──────────────────────────────────────────────────────────
function buildLayout(
  node: MindNode, x: number, yTop: number,
  depth: number, color: string, col: Set<string>
): NL {
  if (depth === 0) {
    const sH = treeH(node, 0, col);
    const nl: NL = {
      node, x, y: yTop + sH / 2 - RC,
      w: RC * 2, h: RC * 2, lines: [], color: '#888899', depth: 0, children: [],
    };
    let cy = yTop;
    for (let i = 0; i < (node.children?.length ?? 0); i++) {
      const c = node.children![i];
      const cc = ACCENTS[i % ACCENTS.length];
      const cH = treeH(c, 1, col);
      nl.children.push(buildLayout(c, x + RC * 2 + HG, cy, 1, cc, col));
      cy += cH + VG;
    }
    return nl;
  }

  const d  = dim(node, depth, col);
  const sH = treeH(node, depth, col);
  const nl: NL = {
    node, x, y: yTop + (sH - d.h) / 2,
    w: d.w, h: d.h, lines: d.lines, color, depth, children: [],
  };
  if (node.children?.length && !col.has(node.id)) {
    let cy = yTop;
    for (const c of node.children) {
      const cH = treeH(c, depth + 1, col);
      nl.children.push(buildLayout(c, x + d.w + HG, cy, depth + 1, color, col));
      cy += cH + VG;
    }
  }
  return nl;
}

// ── Bounding box ───────────────────────────────────────────────────────────────
function bbox(nl: NL, col: Set<string>): { x2: number; y2: number } {
  const collapsed = col.has(nl.node.id) && !!nl.node.children?.length;
  const x2 = nl.x + nl.w + (collapsed ? 30 : 0);
  let mx = x2, my = nl.y + nl.h;
  for (const c of nl.children) {
    const b = bbox(c, col);
    mx = Math.max(mx, b.x2); my = Math.max(my, b.y2);
  }
  return { x2: mx, y2: my };
}

// ── SVG shape renderer ─────────────────────────────────────────────────────────
function renderTree(nl: NL, col: Set<string>): React.ReactElement[] {
  const out: React.ReactElement[] = [];

  if (nl.depth === 0) {
    const cx = nl.x + RC, cy = nl.y + RC;
    out.push(<circle key="root-dot" cx={cx} cy={cy} r={RC} fill={nl.color} />);
    for (const c of nl.children) {
      const ey = c.y + c.h / 2, mx = (cx + RC + c.x) / 2;
      out.push(
        <path key={`re-${c.node.id}`} fill="none"
          stroke={c.color + '88'} strokeWidth={2.5} strokeLinecap="round"
          d={`M${cx + RC},${cy} C${mx},${cy} ${mx},${ey} ${c.x},${ey}`}
        />
      );
    }
    for (const c of nl.children) out.push(...renderTree(c, col));
    return out;
  }

  const { x, y, w, h, lines, color, depth, node, children } = nl;
  const isL1  = depth === 1;
  const hasCh = !!node.children?.length;
  const isCo  = col.has(node.id);
  const st    = node.status ? STATUS_CONFIG[node.status] : null;
  const fw    = isL1 ? 600 : 400;

  const nodeEls: React.ReactElement[] = [];

  // Box
  nodeEls.push(
    <rect key="r"
      x={x} y={y} width={w} height={h} rx={isL1 ? 9 : 6}
      fill={isL1 ? color + '18' : 'rgba(255,255,255,0.78)'}
      stroke={isL1 ? color + '66' : 'rgba(0,0,0,0.08)'}
      strokeWidth={isL1 ? 1.5 : 1}
    />
  );

  // Status badge (top-left corner)
  if (st) {
    nodeEls.push(
      <text key="st"
        x={x + 5} y={y + 9}
        fontSize={8} fontFamily="system-ui,sans-serif"
        fill={st.color} textAnchor="start"
        style={{ pointerEvents: 'none' }}
      >{st.label}</text>
    );
  }

  // Label
  if (lines.length <= 1) {
    nodeEls.push(
      <text key="t"
        x={x + w / 2} y={y + h / 2 + FONT * 0.38}
        textAnchor="middle" fontSize={FONT} fontWeight={fw}
        fontFamily="system-ui,sans-serif"
        fill={isL1 ? color : '#38384E'}
        style={{ pointerEvents: 'none' }}
      >{lines[0] ?? ''}</text>
    );
  } else {
    const bH = (lines.length - 1) * LINE_H + FONT;
    const sy = y + (h - bH) / 2 + FONT * 0.85;
    nodeEls.push(
      <text key="t"
        textAnchor="middle" fontSize={FONT} fontWeight={fw}
        fontFamily="system-ui,sans-serif"
        fill={isL1 ? color : '#38384E'}
        style={{ pointerEvents: 'none' }}
      >
        {lines.map((ln, i) => (
          <tspan key={i} x={x + w / 2} y={sy + i * LINE_H}>{ln}</tspan>
        ))}
      </text>
    );
  }

  // Collapsed pill (+N indicator to the right of the box)
  if (hasCh && isCo) {
    const px = x + w + 5, py = y + h / 2;
    nodeEls.push(
      <rect key="cp" x={px} y={py - 9} width={24} height={18} rx={9}
        fill={color + '22'} stroke={color + '55'} strokeWidth={1} />,
      <text key="ct"
        x={px + 12} y={py + 5}
        textAnchor="middle" fontSize={8} fontWeight={700}
        fontFamily="system-ui,sans-serif" fill={color}
        style={{ pointerEvents: 'none' }}
      >+{node.children!.length}</text>
    );
  }

  out.push(
    <g key={`g-${node.id}`}
      data-nodeid={hasCh ? node.id : undefined}
      style={{ cursor: hasCh ? 'pointer' : 'default' }}
    >
      {nodeEls}
    </g>
  );

  // Edges to children
  for (const c of children) {
    const sx = x + w, sy = y + h / 2, ey = c.y + c.h / 2, mx = (sx + c.x) / 2;
    out.push(
      <path key={`e-${node.id}-${c.node.id}`}
        d={`M${sx},${sy} C${mx},${sy} ${mx},${ey} ${c.x},${ey}`}
        fill="none" stroke={color + '55'}
        strokeWidth={isL1 ? 2 : 1.2} strokeLinecap="round"
      />
    );
  }
  for (const c of children) out.push(...renderTree(c, col));

  return out;
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props { data: MindNode; }

const FullMindMap: React.FC<Props> = ({ data }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tf, setTf]               = useState({ x: 0, y: 0, s: 1 });
  const wrapRef  = useRef<HTMLDivElement>(null);
  const ptrs     = useRef(new Map<number, { x: number; y: number }>());
  const prevDist = useRef<number | null>(null);
  const tapStart = useRef<{ x: number; y: number; id: number; el: Element | null } | null>(null);

  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const { root, W, H } = useMemo(() => {
    const r = buildLayout(data, PAD, PAD, 0, '', collapsed);
    const b = bbox(r, collapsed);
    return { root: r, W: b.x2 + PAD, H: b.y2 + PAD };
  }, [data, collapsed]);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const vw = el.clientWidth, vh = el.clientHeight;
    const s = Math.min((vw - 16) / W, (vh - 100) / H, 2) * 0.95;
    setTf({ x: (vw - W * s) / 2, y: Math.max(16, (vh - 100 - H * s) / 2) + 16, s });
  }, [W, H]);

  // Fit when data changes (template switch), not on every collapse toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fit(); }, [data]);

  // ── Pointer events for pan + pinch zoom ──────────────────────────────────────
  const onPDC = useCallback((e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    wrapRef.current?.setPointerCapture(e.pointerId);
    if (ptrs.current.size === 1) {
      tapStart.current = {
        x: e.clientX, y: e.clientY, id: e.pointerId,
        el: (e.target as Element).closest?.('[data-nodeid]') ?? null,
      };
    }
  }, []);

  const onPM = useCallback((e: React.PointerEvent) => {
    const map = ptrs.current;
    if (!map.has(e.pointerId)) return;
    const prev = map.get(e.pointerId)!;
    const curr = { x: e.clientX, y: e.clientY };

    if (map.size === 1) {
      setTf(t => ({ ...t, x: t.x + curr.x - prev.x, y: t.y + curr.y - prev.y }));
    } else if (map.size >= 2) {
      const ids  = [...map.keys()];
      const oth  = map.get(ids[0] === e.pointerId ? ids[1] : ids[0])!;
      const nd   = Math.hypot(curr.x - oth.x, curr.y - oth.y);
      if (prevDist.current != null && prevDist.current > 0) {
        const r = nd / prevDist.current;
        const mx = (curr.x + oth.x) / 2, my = (curr.y + oth.y) / 2;
        setTf(t => {
          const ns = Math.max(0.1, Math.min(8, t.s * r));
          return { x: mx - (mx - t.x) * (ns / t.s), y: my - (my - t.y) * (ns / t.s), s: ns };
        });
      }
      prevDist.current = nd;
    }
    map.set(e.pointerId, curr);
  }, []);

  const onPU = useCallback((e: React.PointerEvent) => {
    const ts = tapStart.current;
    if (ts && ts.id === e.pointerId && ptrs.current.size === 1) {
      const moved = Math.hypot(e.clientX - ts.x, e.clientY - ts.y);
      if (moved < 10 && ts.el) {
        const nodeId = ts.el.getAttribute('data-nodeid');
        if (nodeId) toggle(nodeId);
      }
    }
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) prevDist.current = null;
    if (ptrs.current.size === 0) tapStart.current = null;
  }, [toggle]);

  const shapes = useMemo(() => renderTree(root, collapsed), [root, collapsed]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed', inset: 0,
        background: '#F4F3F0',
        touchAction: 'none',
        overflow: 'hidden',
      }}
      onPointerDownCapture={onPDC}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onPointerCancel={onPU}
    >
      <div style={{
        transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.s})`,
        transformOrigin: '0 0',
        willChange: 'transform',
      }}>
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
          {shapes}
        </svg>
      </div>

      {/* Fit-to-screen button */}
      <button
        onClick={fit}
        title="适配视图"
        style={{
          position: 'absolute', bottom: 96, right: 20,
          width: 40, height: 40, borderRadius: 20,
          border: '1px solid rgba(0,0,0,0.09)',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          color: '#65657A', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >⊡</button>
    </div>
  );
};

export default FullMindMap;
