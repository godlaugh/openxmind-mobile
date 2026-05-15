import { useState, useRef, useCallback } from 'react';
import type { MindNode } from '../types';
import { ACCENTS, STATUS_CONFIG } from '../constants/colors';

const T = {
  pageBg:    '#EDECEA',
  surface:   '#FFFFFF',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
};

const SWIPE_THRESHOLD = 64;
const MAX_BEHIND      = 2;

interface Props { data: MindNode; }

function accentFor(data: MindNode, stackPath: MindNode[], nodeIdx: number): string {
  const l1 = stackPath[1];
  if (!l1) return ACCENTS[nodeIdx % ACCENTS.length];
  const l1Idx = (data.children ?? []).indexOf(l1);
  return ACCENTS[Math.max(0, l1Idx) % ACCENTS.length];
}

export default function StackView({ data }: Props) {
  const [stackPath, setStackPath] = useState<MindNode[]>([data]);
  const [idx,       setIdx]       = useState(0);
  const [dragX,     setDragX]     = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir,   setExitDir]   = useState<'left' | 'right' | null>(null);
  const pointerRef = useRef<{ id: number; startX: number; startY: number } | null>(null);

  const currentParent = stackPath[stackPath.length - 1];
  const nodes         = currentParent.children ?? [];
  const current       = nodes[idx];
  const accent        = accentFor(data, stackPath, idx);

  const advance = useCallback((dir: 'left' | 'right', newIdx: number) => {
    setExitDir(dir);
    setTimeout(() => { setIdx(newIdx); setDragX(0); setExitDir(null); }, 220);
  }, []);

  const drillIn = useCallback(() => {
    if (current?.children?.length) {
      setStackPath(p => [...p, current]);
      setIdx(0);
    }
  }, [current]);

  const drillOut = useCallback(() => {
    if (stackPath.length <= 1) return;
    const parent   = stackPath[stackPath.length - 2];
    const siblings = parent.children ?? [];
    const backIdx  = siblings.indexOf(stackPath[stackPath.length - 1]);
    setStackPath(p => p.slice(0, -1));
    setIdx(Math.max(0, backIdx));
  }, [stackPath]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pointerRef.current) return;
    pointerRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY };
    setIsDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (Math.abs(dx) > Math.abs(dy)) setDragX(dx);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    pointerRef.current = null;
    setIsDragging(false);

    if (Math.hypot(dx, dy) < 10) {
      drillIn();
    } else if (dx < -SWIPE_THRESHOLD && idx < nodes.length - 1) {
      advance('left', idx + 1);
    } else if (dx > SWIPE_THRESHOLD && idx > 0) {
      advance('right', idx - 1);
    } else {
      setDragX(0);
    }
  }, [drillIn, advance, idx, nodes.length]);

  if (nodes.length === 0) {
    return (
      <div style={{
        minHeight: '100svh', background: T.pageBg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 14, color: T.textFaint }}>没有子内容</div>
        {stackPath.length > 1 && (
          <button onClick={drillOut} style={{
            fontSize: 13, color: T.textSub, background: 'none',
            border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20,
            padding: '8px 18px', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>← 返回</button>
        )}
      </div>
    );
  }

  // Show cards behind in the direction the user is heading
  const goingBack = isDragging && dragX > 0;
  const behindCards: Array<{ ni: number; depth: number }> = goingBack
    ? Array.from({ length: Math.min(MAX_BEHIND, idx) }, (_, i) => {
        const depth = Math.min(MAX_BEHIND, idx) - i;
        return { ni: idx - depth, depth };
      })
    : Array.from({ length: Math.min(MAX_BEHIND, nodes.length - 1 - idx) }, (_, i) => {
        const depth = Math.min(MAX_BEHIND, nodes.length - 1 - idx) - i;
        return { ni: idx + depth, depth };
      });

  return (
    <div style={{
      minHeight: '100svh', background: T.pageBg,
      display: 'flex', flexDirection: 'column',
      paddingBottom: 88,
    }}>
      {/* Header */}
      <div style={{
        padding: '52px 20px 0',
        display: 'flex', alignItems: 'center', gap: 6, minHeight: 68,
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {stackPath.slice(1).map((n, i, arr) => (
            <span key={i} style={{ fontSize: 12, color: T.textFaint }}>
              {n.title}{i < arr.length - 1 ? ' ›' : ''}
            </span>
          ))}
        </div>
        {stackPath.length > 1 && (
          <button onClick={drillOut} style={{
            flexShrink: 0, fontSize: 12, fontWeight: 600, color: T.textSub,
            background: 'rgba(0,0,0,0.06)', border: 'none',
            borderRadius: 14, padding: '5px 12px', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>↑ 返回</button>
        )}
      </div>

      {/* Stack area */}
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 24px',
      }}>
        {/* Behind cards (lowest z first) */}
        {behindCards.map(({ ni, depth }, i) => {
          const scale = 1 - depth * 0.045;
          const ty    = depth * 10;
          return (
            <div key={`b${ni}`} style={{
              position: 'absolute',
              width: 'calc(100% - 48px)', maxWidth: 340,
              transform: `scale(${scale}) translateY(${ty}px)`,
              transition: 'transform 0.22s ease',
              zIndex: i + 1,
            }}>
              <CardFace
                node={nodes[ni]}
                accent={accentFor(data, stackPath, ni)}
                isTop={false}
              />
            </div>
          );
        })}

        {/* Top card */}
        {current && (
          <div
            style={{
              position: 'absolute',
              width: 'calc(100% - 48px)', maxWidth: 340,
              zIndex: 10,
              transform: exitDir
                ? `translateX(${exitDir === 'left' ? -520 : 520}px) rotate(${exitDir === 'left' ? -14 : 14}deg)`
                : `translateX(${isDragging ? dragX : 0}px) rotate(${isDragging ? dragX * 0.025 : 0}deg)`,
              transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              cursor: current.children?.length ? 'pointer' : 'default',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <CardFace node={current} accent={accent} isTop />
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 5, paddingBottom: 16,
      }}>
        {nodes.length <= 12
          ? nodes.map((_, i) => (
              <div key={i} style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === idx ? accent : 'rgba(0,0,0,0.14)',
                transition: 'all 0.2s ease',
              }} />
            ))
          : <span style={{ fontSize: 12, color: T.textFaint }}>{idx + 1} / {nodes.length}</span>
        }
      </div>
    </div>
  );
}

function CardFace({ node, accent, isTop }: { node: MindNode; accent: string; isTop: boolean }) {
  const status = node.status ? STATUS_CONFIG[node.status] : null;
  const kids   = node.children ?? [];

  return (
    <div style={{
      background: T.surface,
      borderRadius: 22,
      overflow: 'hidden',
      boxShadow: isTop
        ? '0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)'
        : '0 2px 8px rgba(0,0,0,0.05)',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      <div style={{ height: 5, background: accent }} />

      <div style={{ padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: T.text,
          letterSpacing: '-0.4px', lineHeight: 1.3,
        }}>
          {node.title}
        </div>

        {(status || node.owner) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {status && (
              <span className={node.status === 'doing' ? 'pulse' : ''} style={{
                fontSize: 10, fontWeight: 700, color: status.color,
                background: status.color + '1A',
                padding: '3px 8px', borderRadius: 6, letterSpacing: '0.5px',
              }}>
                {status.label}
              </span>
            )}
            {node.owner && (
              <span style={{ fontSize: 12, color: T.textSub }}>{node.owner}</span>
            )}
          </div>
        )}

        {kids.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1px',
              color: T.textFaint, textTransform: 'uppercase', marginBottom: 8,
            }}>
              {kids.length} 个子主题
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {kids.slice(0, 5).map((c, i) => (
                <span key={i} style={{
                  fontSize: 11.5, color: accent, fontWeight: 500,
                  background: accent + '14', border: `1px solid ${accent}28`,
                  padding: '3px 9px', borderRadius: 20,
                }}>
                  {c.title}
                </span>
              ))}
              {kids.length > 5 && (
                <span style={{ fontSize: 11.5, color: T.textFaint, padding: '3px 4px' }}>
                  +{kids.length - 5}
                </span>
              )}
            </div>
          </div>
        )}

        {isTop && kids.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>点击展开 →</span>
          </div>
        )}
      </div>
    </div>
  );
}
