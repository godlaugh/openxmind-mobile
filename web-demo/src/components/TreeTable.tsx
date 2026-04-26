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

const clampW = (vw: number) => Math.min(Math.max(vw - 32, 280), 760);

// ── Data model ────────────────────────────────────────────────────────────────
//
//  Each FlatRow maps to exactly one <tr>.
//
//  L1 cell:  rendered only on isFirstL1 rows (rowSpan = l1Span)
//  L2 cell:  rendered only on isFirstL2 rows (rowSpan = l2Span)
//            when L2 has no L3 children → colSpan = 2 (absorbs the L3 column)
//  L3 cell:  rendered on every row where l2ColSpan === 1

interface FlatRow {
  color:      string;
  l1:         MindNode;
  l1Span:     number;
  isFirstL1:  boolean;
  l2:         MindNode;
  l2Span:     number;
  l2ColSpan:  1 | 2;   // 2 when L2 has no children
  isFirstL2:  boolean;
  l3?:        MindNode; // absent when l2ColSpan === 2
}

// Number of <tr> rows an L2 node occupies
function l2RowCount(l2: MindNode): number {
  const kids = l2.children ?? [];
  return kids.length === 0 ? 1 : kids.length;
}

function flatten(data: MindNode, monoColor: string | null): FlatRow[] {
  const rows: FlatRow[] = [];

  (data.children ?? []).forEach((l1, idx) => {
    const color = monoColor ?? ACCENTS[idx % ACCENTS.length];
    const l2s   = l1.children ?? [];

    // L1 with no children: one row, L2 cell absorbs L3 column
    if (l2s.length === 0) {
      rows.push({
        color, l1, l1Span: 1, isFirstL1: true,
        l2: l1, l2Span: 1, l2ColSpan: 2, isFirstL2: true,
      });
      return;
    }

    const l1Span  = l2s.reduce((s, l2) => s + l2RowCount(l2), 0);
    let   l1First = true;

    l2s.forEach(l2 => {
      const l3s    = l2.children ?? [];
      const l2Span = l2RowCount(l2);

      if (l3s.length === 0) {
        // L2 leaf: colspan=2, one row
        rows.push({
          color,
          l1, l1Span, isFirstL1: l1First,
          l2, l2Span: 1, l2ColSpan: 2, isFirstL2: true,
        });
        l1First = false;
      } else {
        // L2 has L3 children: expand into multiple rows
        l3s.forEach((l3, j) => {
          rows.push({
            color,
            l1, l1Span, isFirstL1: l1First,
            l2, l2Span, l2ColSpan: 1, isFirstL2: j === 0,
            l3,
          });
          l1First = false;
        });
      }
    });
  });

  return rows;
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
  const rows        = flatten(data, activeColor);

  // Progress: count L2-level nodes with status (deduplicated)
  const allL2       = (data.children ?? []).flatMap(l1 => l1.children?.length ? l1.children : [l1]);
  const statusNodes = allL2.filter(n => n.status);
  const done        = statusNodes.filter(n => n.status === 'done').length;
  const total       = statusNodes.length;
  const showProgress = total > 0;
  const pct          = total > 0 ? done / total : 0;

  // L3 column gets 50% of table width for MiniMindMap
  const mmWidth = Math.max(80, Math.floor(tableW * 0.50) - 16);

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
            <button
              onClick={onToggleColorMode}
              style={{
                padding: '3px 12px', borderRadius: 20, border: 'none',
                background: mono ? T.text : 'rgba(0,0,0,0.06)',
                color: mono ? '#fff' : T.textSub,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
            >
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
                    boxShadow: selected ? `0 0 0 1px rgba(0,0,0,0.15)` : 'none',
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
              <col style={{ width: '20%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '50%' }} />
            </colgroup>
            <tbody>
              {rows.map((row, i) => {
                const { isFirstL1, isFirstL2, l2ColSpan, l3 } = row;

                // Top border logic
                const l1Top  = secTop(row.color);
                const l2Top  = isFirstL1 ? secTop(row.color) : inner;
                const l3Top  = isFirstL1 ? secTop(row.color) : isFirstL2 ? inner : innerSub;

                const hasMap = !!l3?.children?.length;

                return (
                  <tr key={i}>

                    {/* ── L1 cell (rowspan) ── */}
                    {isFirstL1 && (
                      <td rowSpan={row.l1Span} style={{
                        verticalAlign: 'middle', textAlign: 'center', padding: '14px 8px',
                        background: row.color + '13',
                        borderLeft: `3.5px solid ${row.color}`,
                        borderRight: inner, borderTop: l1Top, borderBottom: inner,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: row.color, lineHeight: 1.35, letterSpacing: '-0.1px', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                          {row.l1.title}
                        </div>
                        {row.l1.status && <div style={{ marginTop: 5 }}><StatusBadge status={row.l1.status} size={12} /></div>}
                        {row.l1.owner  && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><Chip name={row.l1.owner} color={row.color} /></div>}
                      </td>
                    )}

                    {/* ── L2 cell (rowspan + optional colspan) ── */}
                    {isFirstL2 && (
                      <td rowSpan={row.l2Span} colSpan={l2ColSpan} style={{
                        verticalAlign: 'middle', padding: '10px 12px',
                        background: T.surface,
                        borderRight: l2ColSpan === 1 ? inner : undefined,
                        borderTop: l2Top, borderBottom: inner,
                      }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'break-word', marginBottom: (row.l2.status || row.l2.owner) ? 4 : 0 }}>
                          {row.l2.title}
                        </div>
                        {(row.l2.status || row.l2.owner) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <StatusBadge status={row.l2.status} />
                            {row.l2.owner && <Chip name={row.l2.owner} color={row.color} />}
                          </div>
                        )}
                      </td>
                    )}

                    {/* ── L3 cell (only when L2 didn't absorb it with colspan=2) ── */}
                    {l2ColSpan === 1 && (
                      <td style={{
                        verticalAlign: 'middle',
                        padding: hasMap ? '7px 8px' : '10px 12px',
                        background: hasMap ? row.color + '07' : T.surfaceAlt,
                        borderTop: l3Top, borderBottom: innerSub,
                      }}>
                        {hasMap ? (
                          <MiniMindMap node={l3!} accentColor={row.color} availableWidth={mmWidth} />
                        ) : (
                          <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                            {l3!.title}
                            {(l3!.status || l3!.owner) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                <StatusBadge status={l3!.status} />
                                {l3!.owner && <Chip name={l3!.owner} color={row.color} />}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )}
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
