import React, { useRef, useState, useEffect, useCallback } from 'react';
import { toPng, toSvg } from 'html-to-image';
import type { MindNode } from '../types';
import { ACCENTS, MONO_PALETTES, STATUS_CONFIG } from '../constants/colors';
import MiniMindMap from './MiniMindMap';

const T = {
  pageBg:    '#EDECEA',
  surface:   '#FFFFFF',
  surfaceAlt:'#F7F6F3',
  border:    'rgba(0,0,0,0.06)',
  borderSub: 'rgba(0,0,0,0.035)',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
};

const clampW  = (vw: number) => Math.min(Math.max(vw - 32, 280), 760);
const MAX_COLS = 4; // beyond this depth, last column shows MiniMindMap

// ── Tree measurement ──────────────────────────────────────────────────────────

function nodeDepth(node: MindNode): number {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(nodeDepth));
}

// How many table rows does this node occupy, given colsRemaining columns left?
function rowCount(node: MindNode, colsRemaining: number): number {
  if (colsRemaining <= 1 || !node.children?.length) return 1;
  return node.children.reduce((s, c) => s + rowCount(c, colsRemaining - 1), 0);
}

// Collect all "row-defining" paths: every true leaf, or any node at depth numCols-1
function collectPaths(
  node:    MindNode,
  depth:   number,
  numCols: number,
  color:   string,
  prefix:  MindNode[],
): { nodes: MindNode[]; color: string }[] {
  const path = [...prefix, node];
  if (depth === numCols - 1 || !node.children?.length) return [{ nodes: path, color }];
  return node.children.flatMap(c => collectPaths(c, depth + 1, numCols, color, path));
}

// ── Flat row model ────────────────────────────────────────────────────────────
//
//  Each FlatRow = one <tr>. Every cell records whether to emit a <td> (render flag).
//  Cells with render=false are covered by a previous row's rowSpan — skip them.
//
//  Last cell in each path:
//    - true leaf           → colSpan fills remaining columns, plain text
//    - isTruncated (has children but at column limit) → MiniMindMap

interface CellSpec {
  node:        MindNode;
  rowSpan:     number;
  colSpan:     number;
  render:      boolean;
  isTruncated: boolean;
}

interface FlatRow {
  color: string;
  cells: CellSpec[];
}

function buildFlatRows(
  data:      MindNode,
  monoColor: string | null,
): { rows: FlatRow[]; numCols: number } {
  const l1s = data.children ?? [];
  if (!l1s.length) return { rows: [], numCols: 1 };

  const actualDepth = Math.max(...l1s.map(n => nodeDepth(n)));
  const numCols     = Math.min(actualDepth, MAX_COLS);

  // All row-defining paths across the whole tree
  const allPaths = l1s.flatMap((l1, idx) => {
    const color = monoColor ?? ACCENTS[idx % ACCENTS.length];
    return collectPaths(l1, 0, numCols, color, []);
  });

  // Second pass: assign render flags and spans
  const lastSeen: (MindNode | null)[] = new Array(numCols).fill(null);

  const rows: FlatRow[] = allPaths.map(({ nodes, color }) => {
    const cells: CellSpec[] = nodes.map((node, d) => {
      const isLast      = d === nodes.length - 1;
      const hasKids     = !!node.children?.length;
      const isTruncated = isLast && hasKids;
      const render      = lastSeen[d] !== node;
      if (render) lastSeen[d] = node;

      return {
        node,
        rowSpan:     isLast ? 1 : rowCount(node, numCols - d),
        colSpan:     isLast ? numCols - d : 1,
        render,
        isTruncated,
      };
    });
    return { color, cells };
  });

  return { rows, numCols };
}

// ── Progress: collect every node that carries a status ────────────────────────
function collectStatus(node: MindNode, out: MindNode[] = []): MindNode[] {
  if (node.status) out.push(node);
  (node.children ?? []).forEach(c => collectStatus(c, out));
  return out;
}

// ── Column widths by number of columns ───────────────────────────────────────
const COL_WIDTHS: Record<number, string[]> = {
  1: ['100%'],
  2: ['28%', '72%'],
  3: ['20%', '30%', '50%'],
  4: ['18%', '21%', '23%', '38%'],
};
function getColWidths(n: number): string[] {
  return COL_WIDTHS[Math.min(n, MAX_COLS)] ?? COL_WIDTHS[MAX_COLS];
}

// ── Sub-components ────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status?: string; size?: number }> = ({ status, size = 11 }) => {
  if (!status) return null;
  const s = STATUS_CONFIG[status];
  return (
    <span
      className={status === 'doing' ? 'pulse' : ''}
      style={{ fontSize: size, fontWeight: 700, color: s.color, letterSpacing: '0.2px' }}
    >
      {s.label}
    </span>
  );
};

const Chip: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 18, height: 18, borderRadius: '50%',
    background: color + '1C', border: `1px solid ${color}3E`,
    fontSize: 9, fontWeight: 700, color,
  }}>
    {name[0]}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  data: MindNode;
  colorMode: 'multi' | 'mono';
  monoColor: string;
  onToggleColorMode: () => void;
  onSelectMonoColor: (c: string) => void;
  onOpenTemplatePicker: () => void;
}

const TreeTable: React.FC<Props> = ({
  data, colorMode, monoColor, onToggleColorMode, onSelectMonoColor, onOpenTemplatePicker,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const tableRef   = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'svg' | 'png' | null>(null);
  const [tableW,    setTableW]    = useState(() =>
    typeof window !== 'undefined' ? clampW(window.innerWidth) : 480
  );

  useEffect(() => {
    const measure = () => {
      setTableW(tableRef.current ? tableRef.current.offsetWidth : clampW(window.innerWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  const mono        = colorMode === 'mono';
  const activeColor = mono ? monoColor : null;

  const { rows, numCols } = buildFlatRows(data, activeColor);
  const colWidths          = getColWidths(numCols);

  // Progress across whole tree
  const statusNodes  = collectStatus(data).filter(n => n !== data);
  const done         = statusNodes.filter(n => n.status === 'done').length;
  const total        = statusNodes.length;
  const showProgress = total > 0;
  const pct          = total > 0 ? done / total : 0;

  // Last column width for MiniMindMap sizing
  const lastColPct = parseFloat(colWidths[numCols - 1]) / 100;
  const mmWidth    = Math.max(60, Math.floor(tableW * lastColPct) - 16);

  const secTop   = (c: string) => `2px solid ${c}60`;
  const inner    = `1px solid ${T.border}`;
  const innerSub = `1px solid ${T.borderSub}`;

  const exportAs = useCallback(async (fmt: 'svg' | 'png') => {
    if (!captureRef.current || exporting) return;
    setExporting(fmt);
    try {
      const el  = captureRef.current;
      const url = fmt === 'png'
        ? await toPng(el, { pixelRatio: 2, backgroundColor: T.pageBg })
        : await toSvg(el, { backgroundColor: T.pageBg, width: el.offsetWidth, height: el.offsetHeight });
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${data.title || 'openxmind'}.${fmt}`;
      a.click();
    } finally {
      setExporting(null);
    }
  }, [exporting, data.title]);

  const btnSm: React.CSSProperties = {
    padding: '5px 13px', borderRadius: 8, border: `1px solid ${T.border}`,
    background: T.surface, color: T.textSub,
    fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
  };

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', padding: '24px 16px 60px' }}>
      <div ref={tableRef} style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ padding: '0 2px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.4px', color: T.textFaint, textTransform: 'uppercase' }}>
              OpenXmind · Mobile Demo
            </div>
            <button onClick={onToggleColorMode} style={{
              padding: '3px 12px', borderRadius: 20, border: 'none',
              background: mono ? T.text : 'rgba(0,0,0,0.06)',
              color: mono ? '#fff' : T.textSub,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
            }}>
              {mono ? '单色' : '彩色'}
            </button>
          </div>

          {mono && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {MONO_PALETTES.map(p => {
                const selected = monoColor === p.color;
                return (
                  <button key={p.color} title={p.name} onClick={() => onSelectMonoColor(p.color)} style={{
                    width: 22, height: 22, borderRadius: '50%', background: p.color, border: 'none',
                    cursor: 'pointer', flexShrink: 0,
                    outline: selected ? `2.5px solid ${p.color}` : '2.5px solid transparent',
                    outlineOffset: selected ? 2 : 0,
                    boxShadow: selected ? '0 0 0 1px rgba(0,0,0,0.15)' : 'none',
                    transform: selected ? 'scale(1.18)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }} />
                );
              })}
            </div>
          )}

          <div onClick={onOpenTemplatePicker} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, cursor: 'pointer', marginBottom: 14 }}>
            <span style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, color: T.text, letterSpacing: '-0.6px', lineHeight: 1.1 }}>
              {data.title}
            </span>
            <span style={{ fontSize: 13, color: T.textFaint, lineHeight: 1, userSelect: 'none' }}>⌄</span>
          </div>

          {showProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.09)', borderRadius: 2 }}>
                <div style={{
                  height: '100%', width: `${pct * 100}%`,
                  background: mono ? monoColor : 'linear-gradient(90deg, #3E9E8C 0%, #6DA84E 100%)',
                  borderRadius: 2, transition: 'width 0.9s ease',
                }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, flexShrink: 0 }}>{done} / {total} ✓</span>
            </div>
          )}
        </div>

        {/* ── Tree Table ── */}
        <div ref={captureRef} style={{ overflow: 'hidden', border: inner, boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: T.surface, tableLayout: 'fixed' }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <tbody>
              {rows.map((row, ri) => {
                const isFirstL1 = row.cells[0]?.render ?? false;

                return (
                  <tr key={ri}>
                    {row.cells.map((cell, d) => {
                      if (!cell.render) return null;

                      const isFirstCol  = d === 0;
                      const isLastSlot  = d + cell.colSpan === numCols;
                      const topBorder   = isFirstL1 ? secTop(row.color) : innerSub;
                      const rightBorder = isLastSlot ? undefined : inner;

                      // ── L1 column (leftmost) ──
                      if (isFirstCol) {
                        return (
                          <td key={d} rowSpan={cell.rowSpan} style={{
                            verticalAlign: 'middle', textAlign: 'center', padding: '14px 8px',
                            background: row.color + '13',
                            borderLeft: `3.5px solid ${row.color}`,
                            borderRight: inner,
                            borderTop: secTop(row.color),
                            borderBottom: inner,
                          }}>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: row.color, lineHeight: 1.35, letterSpacing: '-0.1px', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                              {cell.node.title}
                            </div>
                            {cell.node.status && <div style={{ marginTop: 5 }}><StatusBadge status={cell.node.status} size={11} /></div>}
                            {cell.node.owner  && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 5 }}><Chip name={cell.node.owner} color={row.color} /></div>}
                          </td>
                        );
                      }

                      // ── MiniMindMap cell (truncated node with children) ──
                      if (cell.isTruncated) {
                        return (
                          <td key={d} rowSpan={cell.rowSpan} colSpan={cell.colSpan} style={{
                            verticalAlign: 'middle', padding: '7px 8px',
                            background: row.color + '07',
                            borderRight: rightBorder, borderTop: topBorder, borderBottom: innerSub,
                          }}>
                            <MiniMindMap node={cell.node} accentColor={row.color} availableWidth={mmWidth} />
                          </td>
                        );
                      }

                      // ── Intermediate or leaf text cell ──
                      const fw       = d === 1 ? 500 : 400;
                      const fs       = d === 1 ? 12.5 : 12;
                      const bg       = !cell.node.children?.length ? T.surfaceAlt : T.surface;

                      return (
                        <td key={d} rowSpan={cell.rowSpan} colSpan={cell.colSpan} style={{
                          verticalAlign: 'middle', padding: '10px 12px',
                          background: bg,
                          borderRight: rightBorder, borderTop: topBorder, borderBottom: innerSub,
                        }}>
                          <div style={{
                            fontSize: fs, fontWeight: fw, color: T.text,
                            lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'break-word',
                            marginBottom: (cell.node.status || cell.node.owner) ? 4 : 0,
                          }}>
                            {cell.node.title}
                          </div>
                          {(cell.node.status || cell.node.owner) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <StatusBadge status={cell.node.status} size={10} />
                              {cell.node.owner && <Chip name={cell.node.owner} color={row.color} />}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 14, padding: '0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10.5, color: T.textFaint, flex: 1 }}>
            OpenXmind · v{__APP_VERSION__}-{__GIT_HASH__} · {new Date(__BUILD_TIME__).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => exportAs('svg')} disabled={!!exporting} style={{ ...btnSm, opacity: exporting === 'png' ? 0.4 : 1 }}>
            {exporting === 'svg' ? '…' : 'SVG ↓'}
          </button>
          <button onClick={() => exportAs('png')} disabled={!!exporting} style={{ ...btnSm, opacity: exporting === 'svg' ? 0.4 : 1 }}>
            {exporting === 'png' ? '…' : 'PNG ↓'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TreeTable;
