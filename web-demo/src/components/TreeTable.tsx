import React, { useState, useCallback } from 'react';
import type { MindNode } from '../types';
import { ACCENTS, STATUS_CONFIG } from '../constants/colors';
import MiniMindMap from './MiniMindMap';

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#07070C',
  card:      '#0F0F16',
  cardEdge:  '#13131B',
  border:    'rgba(255,255,255,0.065)',
  borderSub: 'rgba(255,255,255,0.04)',
  text:      '#DCDCE8',
  textSub:   '#7676A0',
  textFaint: '#3E3E58',
};
const MAX_W = 460;

// ── Helpers ──────────────────────────────────────────────────────────────────
function progress(l1: MindNode): number {
  const kids = l1.children ?? [];
  if (!kids.length) return l1.status === 'done' ? 1 : 0;
  return kids.filter(c => c.status === 'done').length / kids.length;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const Avatar: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 22 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: color + '20', border: `1px solid ${color}40`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.45, fontWeight: 700, color,
  }}>
    {name[0]}
  </div>
);

const StatusPill: React.FC<{ status?: string; small?: boolean }> = ({ status, small }) => {
  const s = STATUS_CONFIG[status ?? 'todo'];
  const isDoing = status === 'doing';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <div
        className={isDoing ? 'pulse' : ''}
        style={{
          width: small ? 5 : 6, height: small ? 5 : 6,
          borderRadius: '50%', background: s.color, flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: small ? 10 : 11, fontWeight: 600,
        color: s.color, letterSpacing: '0.25px',
      }}>
        {s.label}
      </span>
    </div>
  );
};

// ── L2 Row + embedded mindmap ─────────────────────────────────────────────────
interface L2Props {
  node: MindNode; color: string;
  mapOpen: boolean; onMapToggle: () => void;
  mmWidth: number;
}
const L2Row: React.FC<L2Props> = ({ node, color, mapOpen, onMapToggle, mmWidth }) => {
  const hasKids = !!node.children?.length;
  return (
    <div>
      <div
        className={`r2${hasKids ? ' click' : ''}`}
        onClick={hasKids ? onMapToggle : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          padding: '9px 16px 9px 28px', gap: 9,
          borderTop: `1px solid ${T.borderSub}`,
        }}
      >
        {/* Indent accent bar */}
        <div style={{
          width: 2.5, height: 16, borderRadius: 2,
          background: color + '45', flexShrink: 0,
        }} />

        {/* Chevron or dot */}
        {hasKids
          ? <span style={{ fontSize: 8, color, width: 9, flexShrink: 0, transition: 'transform 0.22s ease', display: 'inline-block', transform: mapOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
          : <div style={{ width: 5, height: 5, borderRadius: '50%', background: color + '55', flexShrink: 0, margin: '0 2px' }} />
        }

        <span style={{
          flex: 1, fontSize: 13.5, fontWeight: 450,
          color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {node.title}
        </span>

        <StatusPill status={node.status} small />
        {node.owner && <Avatar name={node.owner} color={color} size={20} />}

        {/* Mindmap tag */}
        {hasKids && (
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.2px',
            padding: '2px 7px', borderRadius: 5,
            color: mapOpen ? color : T.textFaint,
            border: `1px solid ${mapOpen ? color + '45' : 'rgba(255,255,255,0.06)'}`,
            background: mapOpen ? color + '12' : 'transparent',
            transition: 'color 0.2s, border-color 0.2s, background 0.2s',
            flexShrink: 0,
          }}>
            脑图
          </div>
        )}
      </div>

      {/* Inline mindmap — grid-based smooth collapse */}
      {hasKids && (
        <div className={`cx ${mapOpen ? 'open' : 'shut'}`}>
          <div>
            <div style={{
              margin: '2px 14px 12px 44px',
              borderRadius: 10,
              border: `1px solid ${color}22`,
              background: `linear-gradient(135deg, ${color}08 0%, rgba(255,255,255,0.01) 100%)`,
              padding: '10px 10px',
              overflow: 'hidden',
            }}>
              <MiniMindMap node={node} accentColor={color} availableWidth={mmWidth} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Section card (L1 + its L2 children) ──────────────────────────────────────
interface SectionProps {
  l1: MindNode; color: string; idx: number;
  l1Open: boolean; onL1Toggle: () => void;
  mapOpenIds: Set<string>; onMapToggle: (id: string) => void;
  mmWidth: number;
}
const Section: React.FC<SectionProps> = ({
  l1, color, l1Open, onL1Toggle, mapOpenIds, onMapToggle, mmWidth,
}) => {
  const pct = progress(l1);
  return (
    <div style={{
      background: T.card, borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${T.border}`,
      boxShadow: `0 2px 12px rgba(0,0,0,0.28), 0 0 0 0.5px ${color}18`,
    }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: T.borderSub }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 1, transition: 'width 0.6s ease',
        }} />
      </div>

      {/* L1 row */}
      <div
        className="r1"
        onClick={onL1Toggle}
        style={{
          display: 'flex', alignItems: 'center',
          padding: '13px 16px', gap: 10,
          borderLeft: `3px solid ${color}`,
        }}
      >
        <span style={{
          fontSize: 10, color, width: 12, flexShrink: 0,
          display: 'inline-block',
          transition: 'transform 0.25s ease',
          transform: l1Open ? 'rotate(90deg)' : 'none',
        }}>▶</span>

        <span style={{
          flex: 1, fontSize: 15, fontWeight: 700,
          color, letterSpacing: '-0.2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {l1.title}
        </span>

        <StatusPill status={l1.status} />
        {l1.owner && <Avatar name={l1.owner} color={color} />}
      </div>

      {/* L2 children — grid collapse */}
      <div className={`cx ${l1Open ? 'open' : 'shut'}`}>
        <div>
          {(l1.children ?? []).map(l2 => (
            <L2Row
              key={l2.id}
              node={l2}
              color={color}
              mapOpen={mapOpenIds.has(l2.id)}
              onMapToggle={() => onMapToggle(l2.id)}
              mmWidth={mmWidth}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Dot-grid background ───────────────────────────────────────────────────────
const DotGrid: React.FC = () => (
  <svg
    style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.9" fill="rgba(255,255,255,0.06)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
  </svg>
);

// ── TreeTable root ────────────────────────────────────────────────────────────
const TreeTable: React.FC<{ data: MindNode }> = ({ data }) => {
  const allL1 = data.children ?? [];
  const allL2WithKids = allL1.flatMap(l1 =>
    (l1.children ?? []).filter(l2 => l2.children?.length).map(l2 => l2.id),
  );

  const [openL1, setOpenL1] = useState(() => new Set(allL1.map(n => n.id)));
  const [openMaps, setOpenMaps] = useState(() => new Set(allL2WithKids));

  const toggleL1 = useCallback((id: string) => {
    setOpenL1(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);
  const toggleMap = useCallback((id: string) => {
    setOpenMaps(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  // Mindmap available width: container(MAX_W) - outer padding(16) - left indent(44) - right margin(14)
  const mmWidth = MAX_W - 16 - 44 - 14 - 20;

  // Overall completion stats
  const totalL2 = allL1.flatMap(l => l.children ?? []).length;
  const doneL2  = allL1.flatMap(l => l.children ?? []).filter(l => l.status === 'done').length;
  const overallPct = totalL2 > 0 ? Math.round((doneL2 / totalL2) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '16px 0 48px', position: 'relative' }}>
      <DotGrid />

      <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '0 8px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 20, padding: '4px 4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: T.textFaint, textTransform: 'uppercase' }}>
              OpenXmind
            </span>
            <span style={{ fontSize: 11, color: T.textFaint }}>·</span>
            <span style={{ fontSize: 11, color: T.textFaint, letterSpacing: '0.5px' }}>Mobile Demo</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            {data.title}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
          }}>
            {/* Mini overall progress */}
            <div style={{ flex: 1, height: 3, background: T.border, borderRadius: 2 }}>
              <div style={{
                height: '100%', width: `${overallPct}%`,
                background: 'linear-gradient(90deg, #7B7CEB, #3DBFA6)',
                borderRadius: 2, transition: 'width 0.8s ease',
              }} />
            </div>
            <span style={{ fontSize: 12, color: T.textSub, fontWeight: 600, flexShrink: 0 }}>
              {doneL2} / {totalL2} 完成
            </span>
          </div>
        </div>

        {/* ── Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allL1.map((l1, i) => (
            <Section
              key={l1.id}
              l1={l1}
              color={ACCENTS[i % ACCENTS.length]}
              idx={i}
              l1Open={openL1.has(l1.id)}
              onL1Toggle={() => toggleL1(l1.id)}
              mapOpenIds={openMaps}
              onMapToggle={toggleMap}
              mmWidth={mmWidth}
            />
          ))}
        </div>

        {/* ── Legend ── */}
        <div style={{
          marginTop: 24, padding: '14px 16px',
          borderRadius: 10, border: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: T.textFaint, textTransform: 'uppercase' }}>
            操作
          </span>
          {[
            ['▶', '点击板块名称 — 折叠/展开子任务列表'],
            ['脑图', '点击含「脑图」标签的子项 — 展开内嵌思维导图'],
          ].map(([tag, desc]) => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: T.textSub, minWidth: 28, textAlign: 'center',
                padding: '1px 5px', borderRadius: 4, border: `1px solid ${T.border}`,
              }}>
                {tag}
              </span>
              <span style={{ fontSize: 12, color: T.textFaint }}>{desc}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TreeTable;
