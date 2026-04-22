import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { MindNode } from '../types';
import { LEVEL1_COLORS, STATUS_CONFIG } from '../constants/colors';
import MiniMindMap from './MiniMindMap';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status?: string; small?: boolean }> = ({ status, small }) => {
  const cfg = STATUS_CONFIG[status ?? 'todo'];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, small && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color: cfg.color }, small && styles.badgeTextSm]}>
        {cfg.label}
      </Text>
    </View>
  );
};

// ─── Level-1 Row ──────────────────────────────────────────────────────────────

interface L1RowProps {
  node: MindNode;
  color: string;
  expanded: boolean;
  onToggle: () => void;
}

const L1Row: React.FC<L1RowProps> = ({ node, color, expanded, onToggle }) => (
  <TouchableOpacity
    style={[styles.l1Row, { borderLeftColor: color }]}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <Text style={[styles.chevron, { color }]}>{expanded ? '▼' : '▶'}</Text>
    <Text style={[styles.l1Title, { color }]} numberOfLines={1}>
      {node.title}
    </Text>
    <StatusBadge status={node.status} />
    {node.owner && <Text style={styles.owner}>{node.owner}</Text>}
  </TouchableOpacity>
);

// ─── Level-2 Row ──────────────────────────────────────────────────────────────

interface L2RowProps {
  node: MindNode;
  color: string;
  mapExpanded: boolean;
  onMapToggle: () => void;
}

const L2Row: React.FC<L2RowProps> = ({ node, color, mapExpanded, onMapToggle }) => {
  const hasChildren = !!node.children?.length;
  return (
    <TouchableOpacity
      style={styles.l2Row}
      onPress={hasChildren ? onMapToggle : undefined}
      activeOpacity={hasChildren ? 0.7 : 1}
    >
      {/* Colored indent bar */}
      <View style={[styles.l2Bar, { backgroundColor: color + '50' }]} />

      {/* Chevron or bullet */}
      {hasChildren ? (
        <Text style={[styles.chevronSm, { color }]}>{mapExpanded ? '▼' : '▶'}</Text>
      ) : (
        <View style={[styles.dot, { backgroundColor: color + '60' }]} />
      )}

      <Text style={styles.l2Title} numberOfLines={1}>
        {node.title}
      </Text>
      <StatusBadge status={node.status} small />
      {node.owner && <Text style={styles.ownerSm}>{node.owner}</Text>}

      {/* Mindmap indicator */}
      {hasChildren && (
        <View style={[styles.mmTag, { borderColor: color + '80', backgroundColor: color + '0D' }]}>
          <Text style={[styles.mmTagText, { color }]}>脑图</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── TreeTable ────────────────────────────────────────────────────────────────

const TreeTable: React.FC<{ data: MindNode }> = ({ data }) => {
  const { width } = useWindowDimensions();

  // Start with everything expanded for the demo
  const allL1Ids = new Set((data.children ?? []).map(n => n.id));
  const allL2WithChildrenIds = new Set(
    (data.children ?? []).flatMap(l1 =>
      (l1.children ?? []).filter(l2 => l2.children?.length).map(l2 => l2.id),
    ),
  );

  const [expandedL1, setExpandedL1] = useState<Set<string>>(allL1Ids);
  const [expandedMaps, setExpandedMaps] = useState<Set<string>>(allL2WithChildrenIds);

  const toggleL1 = useCallback((id: string) => {
    setExpandedL1(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleMap = useCallback((id: string) => {
    setExpandedMaps(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Available width for mindmap SVG (screen - outer padding - left indent)
  const mmAvailWidth = width - 16 - 52;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ── App Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OpenXmind Mobile</Text>
        <Text style={styles.headerSub}>TreeTable × MindMap 混合视图</Text>
      </View>

      {/* ── Root node ── */}
      <View style={styles.rootCard}>
        <Text style={styles.rootIcon}>🗺</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rootTitle}>{data.title}</Text>
          <Text style={styles.rootMeta}>
            {data.children?.length ?? 0} 个板块 · 前两级用表格，深层用脑图
          </Text>
        </View>
      </View>

      {/* ── Level-1 sections ── */}
      {(data.children ?? []).map((l1, idx) => {
        const color = LEVEL1_COLORS[idx % LEVEL1_COLORS.length];
        const isL1Open = expandedL1.has(l1.id);

        return (
          <View key={l1.id} style={styles.section}>
            <L1Row
              node={l1}
              color={color}
              expanded={isL1Open}
              onToggle={() => toggleL1(l1.id)}
            />

            {isL1Open && (
              <View style={styles.l2List}>
                {(l1.children ?? []).map((l2) => {
                  const hasChildren = !!l2.children?.length;
                  const isMapOpen = expandedMaps.has(l2.id);

                  return (
                    <View key={l2.id}>
                      <L2Row
                        node={l2}
                        color={color}
                        mapExpanded={isMapOpen}
                        onMapToggle={() => toggleMap(l2.id)}
                      />

                      {/* ── Embedded Mini MindMap ── */}
                      {hasChildren && isMapOpen && (
                        <View style={[styles.mmWrapper, { borderLeftColor: color + '40' }]}>
                          <MiniMindMap
                            node={l2}
                            accentColor={color}
                            availableWidth={mmAvailWidth}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {/* ── Legend ── */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>视图说明</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
          <Text style={styles.legendText}>点击板块名 → 展开/折叠子项</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>点击带「脑图」标签的行 → 展开内嵌脑图</Text>
        </View>
      </View>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 8, paddingBottom: 48 },

  // Header
  header: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  headerSub: { fontSize: 12, color: '#94A3B8' },

  // Root card
  rootCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rootIcon: { fontSize: 30 },
  rootTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  rootMeta: { fontSize: 11, color: '#94A3B8' },

  // Section card
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Level-1 row
  l1Row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderLeftWidth: 4,
    gap: 8,
  },
  chevron: { fontSize: 10, width: 12 },
  l1Title: { fontSize: 15, fontWeight: '700', flex: 1 },
  owner: { fontSize: 12, color: '#64748B' },

  // Level-2 area
  l2List: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  l2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  l2Bar: { width: 3, height: 18, borderRadius: 2 },
  chevronSm: { fontSize: 9, width: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
  l2Title: { fontSize: 14, fontWeight: '500', color: '#334155', flex: 1 },
  ownerSm: { fontSize: 11, color: '#94A3B8' },
  mmTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  mmTagText: { fontSize: 10, fontWeight: '600' },

  // Mindmap embed
  mmWrapper: {
    marginLeft: 52,
    marginRight: 10,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderRadius: 8,
    backgroundColor: '#F8FAFF',
    paddingLeft: 8,
  },

  // Status badge
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextSm: { fontSize: 10 },

  // Legend
  legend: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    gap: 8,
  },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#64748B' },
});

export default TreeTable;
