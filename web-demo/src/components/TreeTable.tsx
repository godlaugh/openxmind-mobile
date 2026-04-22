import React, { useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { MindNode } from '../types';
import { LEVEL1_COLORS, STATUS_CONFIG } from '../constants/colors';
import MiniMindMap from './MiniMindMap';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status?: string; small?: boolean }> = ({ status, small }) => {
  const cfg = STATUS_CONFIG[status ?? 'todo'];
  return (
    <span style={{
      backgroundColor: cfg.bg,
      color: cfg.color,
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
};

// ─── Level-1 Row ──────────────────────────────────────────────────────────────

const L1Row: React.FC<{
  node: MindNode; color: string; expanded: boolean; onToggle: () => void;
}> = ({ node, color, expanded, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '13px 14px',
      borderLeft: `4px solid ${color}`,
      cursor: 'pointer',
      userSelect: 'none',
    }}
  >
    <span style={{ color, fontSize: 10, width: 12, flexShrink: 0 }}>
      {expanded ? '▼' : '▶'}
    </span>
    <span style={{ color, fontSize: 15, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {node.title}
    </span>
    <StatusBadge status={node.status} />
    {node.owner && <span style={{ fontSize: 12, color: '#64748B', flexShrink: 0 }}>{node.owner}</span>}
  </div>
);

// ─── Level-2 Row ──────────────────────────────────────────────────────────────

const L2Row: React.FC<{
  node: MindNode; color: string; mapExpanded: boolean; onMapToggle: () => void;
}> = ({ node, color, mapExpanded, onMapToggle }) => {
  const hasChildren = !!node.children?.length;
  return (
    <div
      onClick={hasChildren ? onMapToggle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px 10px 12px',
        backgroundColor: '#FAFAFA',
        borderTop: '1px solid #F1F5F9',
        cursor: hasChildren ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <div style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: color + '50', flexShrink: 0 }} />
      {hasChildren ? (
        <span style={{ color, fontSize: 9, width: 10, flexShrink: 0 }}>{mapExpanded ? '▼' : '▶'}</span>
      ) : (
        <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color + '60', margin: '0 2px', flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 14, fontWeight: 500, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {node.title}
      </span>
      <StatusBadge status={node.status} small />
      {node.owner && <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0 }}>{node.owner}</span>}
      {hasChildren && (
        <span style={{
          border: `1px solid ${color}80`,
          backgroundColor: color + '0D',
          color,
          fontSize: 10, fontWeight: 600,
          padding: '1px 5px', borderRadius: 4, flexShrink: 0,
        }}>
          脑图
        </span>
      )}
    </div>
  );
};

// ─── TreeTable ────────────────────────────────────────────────────────────────

const CONTAINER_MAX_WIDTH = 480;

const TreeTable: React.FC<{ data: MindNode }> = ({ data }) => {
  const allL1Ids = new Set((data.children ?? []).map(n => n.id));
  const allL2WithChildrenIds = new Set(
    (data.children ?? []).flatMap(l1 =>
      (l1.children ?? []).filter(l2 => l2.children?.length).map(l2 => l2.id),
    ),
  );

  const [expandedL1, setExpandedL1] = useState<Set<string>>(allL1Ids);
  const [expandedMaps, setExpandedMaps] = useState<Set<string>>(allL2WithChildrenIds);

  const toggleL1 = useCallback((id: string) => {
    setExpandedL1(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  const toggleMap = useCallback((id: string) => {
    setExpandedMaps(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }, []);

  const mmAvailWidth = CONTAINER_MAX_WIDTH - 16 - 60;

  const card: CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(15,23,42,0.07)',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F1F5F9', padding: '8px 0', fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      <div style={{ maxWidth: CONTAINER_MAX_WIDTH, margin: '0 auto', padding: '0 8px' }}>

        {/* Header */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>OpenXmind Mobile</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>TreeTable × MindMap 混合视图 Demo</div>
        </div>

        {/* Root card */}
        <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 30 }}>🗺</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', marginBottom: 2 }}>{data.title}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              前两级用表格视图，深层子节点自动切换为脑图
            </div>
          </div>
        </div>

        {/* Level-1 sections */}
        {(data.children ?? []).map((l1, idx) => {
          const color = LEVEL1_COLORS[idx % LEVEL1_COLORS.length];
          const isL1Open = expandedL1.has(l1.id);

          return (
            <div key={l1.id} style={card}>
              <L1Row node={l1} color={color} expanded={isL1Open} onToggle={() => toggleL1(l1.id)} />

              {isL1Open && (
                <div style={{ borderTop: '1px solid #F1F5F9' }}>
                  {(l1.children ?? []).map((l2) => {
                    const hasChildren = !!l2.children?.length;
                    const isMapOpen = expandedMaps.has(l2.id);

                    return (
                      <div key={l2.id}>
                        <L2Row node={l2} color={color} mapExpanded={isMapOpen} onMapToggle={() => toggleMap(l2.id)} />

                        {/* Embedded Mini MindMap */}
                        {hasChildren && isMapOpen && (
                          <div style={{
                            marginLeft: 52, marginRight: 10, marginBottom: 10,
                            borderLeft: `2px solid ${color}40`,
                            borderRadius: 8,
                            backgroundColor: '#F8FAFF',
                            paddingLeft: 8,
                          }}>
                            <MiniMindMap node={l2} accentColor={color} availableWidth={mmAvailWidth} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Legend */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 10 }}>操作说明</div>
          {[
            { color: '#6366F1', text: '点击板块标题行 → 展开/折叠该板块的所有子项' },
            { color: '#10B981', text: '点击带「脑图」标签的子项 → 展开/收起内嵌 SVG 脑图' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TreeTable;
