import React from 'react';
import type { MindNode } from '../types';
import { ACCENTS, STATUS_CONFIG } from '../constants/colors';
import MiniMindMap from './MiniMindMap';

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  pageBg:   '#EDECEA',
  surface:  '#FFFFFF',
  surfaceAlt: '#F7F6F3',
  border:   'rgba(0,0,0,0.09)',
  borderSub:'rgba(0,0,0,0.055)',
  text:     '#1A181E',
  textSub:  '#65657A',
  textFaint:'#AAAABB',
};
const MAX_W = 520;

// ── Row flattening ───────────────────────────────────────────────────────────
// Converts nested tree into flat table rows, with rowSpan for parent cells.
interface FlatRow {
  l1: MindNode;
  l1Span: number;     // rowSpan of the L1 cell
  isFirstInL1: boolean;
  l2: MindNode;
  color: string;
}

function flatten(data: MindNode): FlatRow[] {
  const rows: FlatRow[] = [];
  (data.children ?? []).forEach((l1, idx) => {
    const color = ACCENTS[idx % ACCENTS.length];
    const l2s   = l1.children ?? [];
    if (!l2s.length) {
      // L1 has no children — single row, L2 = L1
      rows.push({ l1, l1Span: 1, isFirstInL1: true, l2: l1, color });
    } else {
      l2s.forEach((l2, j) => {
        rows.push({ l1, l1Span: l2s.length, isFirstInL1: j === 0, l2, color });
      });
    }
  });
  return rows;
}

// ── Helper components ────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;
  const s = STATUS_CONFIG[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
      <div
        className={status === 'doing' ? 'pulse' : ''}
        style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }}
      />
      <span style={{ fontSize: 10, fontWeight: 600, color: s.color, letterSpacing: '0.15px' }}>
        {s.label}
      </span>
    </div>
  );
};

const Chip: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 19, height: 19, borderRadius: '50%',
    background: color + '1C', border: `1px solid ${color}3E`,
    fontSize: 9, fontWeight: 700, color,
  }}>
    {name[0]}
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const TreeTable: React.FC<{ data: MindNode }> = ({ data }) => {
  const rows = flatten(data);

  // Overall completion — only shown when nodes carry status metadata
  const statusRows = rows.filter(r => r.l2.status);
  const done  = statusRows.filter(r => r.l2.status === 'done').length;
  const total = statusRows.length;
  const pct   = total > 0 ? done / total : 0;
  const showProgress = total > 0;

  // Mindmap column available width ≈ 46% of table - cell padding
  const tableW  = Math.min(MAX_W, typeof window !== 'undefined' ? window.innerWidth - 32 : 488);
  const mmWidth = Math.floor(tableW * 0.46) - 14;

  // ── Section border helpers ───────────────────────────────────────────────
  const secTop = (color: string) => `2px solid ${color}`;
  const inner  = `1px solid ${T.border}`;
  const innerSub = `1px solid ${T.borderSub}`;

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', padding: '24px 8px 60px' }}>
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ padding: '0 2px 18px' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.4px',
            color: T.textFaint, textTransform: 'uppercase', marginBottom: 7,
          }}>
            OpenXmind · Mobile Demo
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800, color: T.text,
            letterSpacing: '-0.6px', lineHeight: 1.1, marginBottom: 14,
          }}>
            {data.title}
          </div>
          {/* Overall progress — hidden when no status metadata */}
          {showProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.09)', borderRadius: 2 }}>
                <div style={{
                  height: '100%', width: `${pct * 100}%`,
                  background: 'linear-gradient(90deg, #3E9E8C 0%, #6DA84E 100%)',
                  borderRadius: 2, transition: 'width 0.9s ease',
                }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub, flexShrink: 0 }}>
                {done} / {total} 完成
              </span>
            </div>
          )}
        </div>

        {/* ── Tree Table ── */}
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: inner,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: T.surface,
            tableLayout: 'fixed',
          }}>
            <colgroup>
              {/* L1 category  |  L2 sub-item  |  L3 mindmap */}
              <col style={{ width: '22%' }} />
              <col style={{ width: '32%' }} />
              <col style={{ width: '46%' }} />
            </colgroup>

            <tbody>
              {rows.map((row, i) => {
                const isNew = row.isFirstInL1;
                const topBorder = isNew ? secTop(row.color) : innerSub;
                const hasMap    = !!row.l2.children?.length;

                return (
                  <tr key={i}>
                    {/* ── L1 cell (rowSpan = number of L2 children) ── */}
                    {isNew && (
                      <td
                        rowSpan={row.l1Span}
                        style={{
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          padding: '14px 8px',
                          background: row.color + '13',
                          borderLeft: `3.5px solid ${row.color}`,
                          borderRight: inner,
                          borderTop: secTop(row.color),
                          borderBottom: inner,
                        }}
                      >
                        <div style={{
                          fontSize: 12, fontWeight: 800,
                          color: row.color, lineHeight: 1.35,
                          letterSpacing: '-0.1px',
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                        }}>
                          {row.l1.title}
                        </div>
                        <StatusDot status={row.l1.status} />
                        {row.l1.owner && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 7 }}>
                            <Chip name={row.l1.owner} color={row.color} />
                          </div>
                        )}
                      </td>
                    )}

                    {/* ── L2 cell ── */}
                    <td style={{
                      verticalAlign: 'middle',
                      padding: '10px 12px',
                      background: T.surface,
                      borderRight: inner,
                      borderTop: topBorder,
                      borderBottom: innerSub,
                    }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 500,
                        color: T.text, lineHeight: 1.4,
                        wordBreak: 'keep-all', overflowWrap: 'break-word',
                        marginBottom: (row.l2.status || row.l2.owner) ? 5 : 0,
                      }}>
                        {row.l2.title}
                      </div>
                      {(row.l2.status || row.l2.owner) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row.l2.status && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div
                                className={row.l2.status === 'doing' ? 'pulse' : ''}
                                style={{
                                  width: 5, height: 5, borderRadius: '50%',
                                  background: STATUS_CONFIG[row.l2.status].color,
                                }}
                              />
                              <span style={{
                                fontSize: 10, fontWeight: 600,
                                color: STATUS_CONFIG[row.l2.status].color,
                              }}>
                                {STATUS_CONFIG[row.l2.status].label}
                              </span>
                            </div>
                          )}
                          {row.l2.owner && <Chip name={row.l2.owner} color={row.color} />}
                        </div>
                      )}
                    </td>

                    {/* ── L3 / MindMap cell ── */}
                    <td style={{
                      verticalAlign: 'middle',
                      padding: hasMap ? '7px 8px' : '10px 12px',
                      background: hasMap ? row.color + '07' : T.surfaceAlt,
                      borderTop: topBorder,
                      borderBottom: innerSub,
                    }}>
                      {hasMap ? (
                        <MiniMindMap
                          node={row.l2}
                          accentColor={row.color}
                          availableWidth={mmWidth}
                        />
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

        {/* ── Footer note ── */}
        <div style={{
          marginTop: 14, padding: '0 2px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10.5, color: T.textFaint }}>
            前两级用表格 · 第三级用脑图
          </span>
          <span style={{ fontSize: 10.5, color: T.textFaint }}>·</span>
          <span style={{ fontSize: 10.5, color: T.textFaint }}>
            Presented with OpenXmind
          </span>
        </div>

      </div>
    </div>
  );
};

export default TreeTable;
