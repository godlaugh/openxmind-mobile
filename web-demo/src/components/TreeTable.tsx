import React, { useRef, useState, useEffect, useCallback } from 'react';
import { toPng, toSvg } from 'html-to-image';
import type { MindNode } from '../types';
import { ACCENTS, MONO_PALETTES, STATUS_CONFIG } from '../constants/colors';
import MiniMindMap from './MiniMindMap';

const T = {
  pageBg:    '#EDECEA',
  surface:   '#FFFFFF',
  surfaceAlt:'#F7F6F3',
  border:    'rgba(0,0,0,0.09)',
  borderSub: 'rgba(0,0,0,0.055)',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
};

// Responsive max width: wider on landscape/tablet
const clampW = (vw: number) => Math.min(Math.max(vw - 32, 280), 760);

interface FlatRow {
  l1: MindNode;
  l1Span: number;
  isFirstInL1: boolean;
  l2: MindNode;
  color: string;
}

function flatten(data: MindNode, monoColor: string | null): FlatRow[] {
  const rows: FlatRow[] = [];
  (data.children ?? []).forEach((l1, idx) => {
    const color = monoColor ?? ACCENTS[idx % ACCENTS.length];
    const l2s   = l1.children ?? [];
    if (!l2s.length) {
      rows.push({ l1, l1Span: 1, isFirstInL1: true, l2: l1, color });
    } else {
      l2s.forEach((l2, j) => {
        rows.push({ l1, l1Span: l2s.length, isFirstInL1: j === 0, l2, color });
      });
    }
  });
  return rows;
}

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

interface Props {
  data: MindNode;
  colorMode: 'multi' | 'mono';
  monoColor: string;
  onToggleColorMode: () => void;
  onSelectMonoColor: (c: string) => void;
}

const TreeTable: React.FC<Props> = ({
  data, colorMode, monoColor, onToggleColorMode, onSelectMonoColor,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const tableRef   = useRef<HTMLDivElement>(null);
  const [exporting,  setExporting]  = useState<'svg' | 'png' | null>(null);
  const [tableW,     setTableW]     = useState(() =>
    typeof window !== 'undefined' ? clampW(window.innerWidth) : 480
  );

  // Re-measure on resize and orientation change using the actual container width
  useEffect(() => {
    const measure = () => {
      if (tableRef.current) {
        setTableW(tableRef.current.offsetWidth);
      } else {
        setTableW(clampW(window.innerWidth));
      }
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

  const statusRows   = rows.filter(r => r.l2.status);
  const done         = statusRows.filter(r => r.l2.status === 'done').length;
  const total        = statusRows.length;
  const pct          = total > 0 ? done / total : 0;
  const showProgress = total > 0;

  // MiniMindMap gets 46% of the real measured container width
  const mmWidth = Math.max(80, Math.floor(tableW * 0.46) - 16);

  const secTop   = (c: string) => `2px solid ${c}`;
  const inner    = `1px solid ${T.border}`;
  const innerSub = `1px solid ${T.borderSub}`;

  const exportAs = useCallback(async (fmt: 'svg' | 'png') => {
    if (!captureRef.current || exporting) return;
    setExporting(fmt);
    try {
      const el  = captureRef.current;
      const url = fmt === 'png'
        ? await toPng(el,  { pixelRatio: 2, backgroundColor: T.pageBg })
        : await toSvg(el,  { backgroundColor: T.pageBg });
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

          {/* Top row: eyebrow + toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.4px',
              color: T.textFaint, textTransform: 'uppercase',
            }}>
              OpenXmind · Mobile Demo
            </div>
            <button
              onClick={onToggleColorMode}
              style={{
                padding: '3px 12px', borderRadius: 20, border: 'none',
                background: mono ? T.text : 'rgba(0,0,0,0.06)',
                color: mono ? '#fff' : T.textSub,
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {mono ? '单色' : '彩色'}
            </button>
          </div>

          {/* Mono palette swatches */}
          {mono && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {MONO_PALETTES.map(p => {
                const selected = monoColor === p.color;
                return (
                  <button
                    key={p.color}
                    title={p.name}
                    onClick={() => onSelectMonoColor(p.color)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: p.color, border: 'none',
                      cursor: 'pointer', flexShrink: 0,
                      outline: selected ? `2.5px solid ${p.color}` : '2.5px solid transparent',
                      outlineOffset: selected ? 2 : 0,
                      boxShadow: selected ? `0 0 0 1px rgba(0,0,0,0.15)` : 'none',
                      transform: selected ? 'scale(1.18)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Title */}
          <div style={{
            fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, color: T.text,
            letterSpacing: '-0.6px', lineHeight: 1.1, marginBottom: 14,
          }}>
            {data.title}
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.09)', borderRadius: 2 }}>
                <div style={{
                  height: '100%', width: `${pct * 100}%`,
                  background: mono
                    ? `${monoColor}`
                    : 'linear-gradient(90deg, #3E9E8C 0%, #6DA84E 100%)',
                  borderRadius: 2, transition: 'width 0.9s ease',
                }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, flexShrink: 0 }}>
                {done} / {total} ✓
              </span>
            </div>
          )}
        </div>

        {/* ── Tree Table (capture target) ── */}
        <div
          ref={captureRef}
          style={{
            borderRadius: 14, overflow: 'hidden',
            border: inner,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            background: T.surface, tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '46%' }} />
            </colgroup>
            <tbody>
              {rows.map((row, i) => {
                const isNew     = row.isFirstInL1;
                const topBorder = isNew ? secTop(row.color) : innerSub;
                const hasMap    = !!row.l2.children?.length;
                return (
                  <tr key={i}>
                    {isNew && (
                      <td
                        rowSpan={row.l1Span}
                        style={{
                          verticalAlign: 'middle', textAlign: 'center',
                          padding: '14px 8px',
                          background: row.color + '13',
                          borderLeft: `3.5px solid ${row.color}`,
                          borderRight: inner,
                          borderTop: secTop(row.color),
                          borderBottom: inner,
                        }}
                      >
                        <div style={{
                          fontSize: 12, fontWeight: 800, color: row.color,
                          lineHeight: 1.35, letterSpacing: '-0.1px',
                          wordBreak: 'keep-all', overflowWrap: 'break-word',
                        }}>
                          {row.l1.title}
                        </div>
                        {row.l1.status && (
                          <div style={{ marginTop: 5 }}>
                            <StatusBadge status={row.l1.status} size={12} />
                          </div>
                        )}
                        {row.l1.owner && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                            <Chip name={row.l1.owner} color={row.color} />
                          </div>
                        )}
                      </td>
                    )}

                    <td style={{
                      verticalAlign: 'middle', padding: '10px 12px',
                      background: T.surface,
                      borderRight: inner, borderTop: topBorder, borderBottom: innerSub,
                    }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 500, color: T.text,
                        lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'break-word',
                        marginBottom: (row.l2.status || row.l2.owner) ? 4 : 0,
                      }}>
                        {row.l2.title}
                      </div>
                      {(row.l2.status || row.l2.owner) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StatusBadge status={row.l2.status} />
                          {row.l2.owner && <Chip name={row.l2.owner} color={row.color} />}
                        </div>
                      )}
                    </td>

                    <td style={{
                      verticalAlign: 'middle',
                      padding: hasMap ? '7px 8px' : '10px 12px',
                      background: hasMap ? row.color + '07' : T.surfaceAlt,
                      borderTop: topBorder, borderBottom: innerSub,
                    }}>
                      {hasMap ? (
                        <MiniMindMap node={row.l2} accentColor={row.color} availableWidth={mmWidth} />
                      ) : (
                        <span style={{ fontSize: 11, color: T.textFaint }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer: branding + export ── */}
        <div style={{
          marginTop: 14, padding: '0 2px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10.5, color: T.textFaint, flex: 1 }}>
            Presented with OpenXmind
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
