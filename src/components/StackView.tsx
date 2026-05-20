import { useState, useRef, useCallback } from 'react';
import type { MindNode } from '../types';
import { ACCENTS, STATUS_CONFIG } from '../constants/colors';

const T = {
  pageBg:    '#F0EEF0',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
};

const SWIPE_THRESHOLD = 64;
const MAX_BEHIND      = 2;

interface Props { data: MindNode; }

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - amount;
  return `#${Math.round(r*f).toString(16).padStart(2,'0')}${Math.round(g*f).toString(16).padStart(2,'0')}${Math.round(b*f).toString(16).padStart(2,'0')}`;
}

function accentFor(data: MindNode, stackPath: MindNode[], nodeIdx: number): string {
  const l1 = stackPath[1];
  if (!l1) return ACCENTS[nodeIdx % ACCENTS.length];
  const l1Idx = (data.children ?? []).indexOf(l1);
  return ACCENTS[Math.max(0, l1Idx) % ACCENTS.length];
}

export default function StackView({ data }: Props) {
  const [stackPath,  setStackPath]  = useState<MindNode[]>([data]);
  const [idx,        setIdx]        = useState(0);
  const [dragX,      setDragX]      = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir,    setExitDir]    = useState<'left' | 'right' | null>(null);
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

  const goingBack = exitDir === 'right' || (isDragging && dragX > 0);
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
      paddingBottom: 96,
    }}>
      {/* Header */}
      <div style={{
        padding: '52px 22px 0',
        display: 'flex', alignItems: 'center', gap: 8, minHeight: 72,
      }}>
        <div style={{ flex: 1 }}>
          {stackPath.slice(1).map((n, i, arr) => (
            <span key={i} style={{
              fontSize: 12, fontWeight: 500,
              color: i === arr.length - 1 ? T.text : T.textFaint,
            }}>
              {n.title}{i < arr.length - 1 ? ' › ' : ''}
            </span>
          ))}
        </div>
        {stackPath.length > 1 && (
          <button onClick={drillOut} style={{
            flexShrink: 0, fontSize: 12, fontWeight: 600, color: T.textSub,
            background: 'rgba(0,0,0,0.06)', border: 'none',
            borderRadius: 14, padding: '6px 14px', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>← 返回</button>
        )}
      </div>

      {/* Stack area */}
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px 8px',
        minHeight: 420,
      }}>
        {behindCards.map(({ ni, depth }, i) => {
          const d     = exitDir !== null ? Math.max(0, depth - 1) : depth;
          const scale = 1 - d * 0.04;
          const ty    = d * 12;
          return (
            <div key={`b${ni}`} style={{
              position: 'absolute',
              width: 'calc(100% - 48px)', maxWidth: 360,
              transform: `scale(${scale}) translateY(${ty}px)`,
              transition: 'transform 0.22s ease',
              zIndex: i + 1,
            }}>
              <CardFace
                node={nodes[ni]}
                accent={accentFor(data, stackPath, ni)}
                isTop={false}
                cardIdx={ni}
                total={nodes.length}
              />
            </div>
          );
        })}

        {current && (
          <div
            key={idx}
            style={{
              position: 'absolute',
              width: 'calc(100% - 48px)', maxWidth: 360,
              zIndex: 10,
              transform: exitDir
                ? `translateX(${exitDir === 'left' ? -540 : 540}px) rotate(${exitDir === 'left' ? -12 : 12}deg)`
                : `translateX(${isDragging ? dragX : 0}px) rotate(${isDragging ? dragX * 0.022 : 0}deg)`,
              transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
              cursor: current.children?.length ? 'pointer' : 'default',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <CardFace node={current} accent={accent} isTop cardIdx={idx} total={nodes.length} />
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 5, padding: '8px 0 16px',
      }}>
        {nodes.length <= 14
          ? nodes.map((_, i) => (
              <div key={i} style={{
                width: i === idx ? 22 : 6, height: 6, borderRadius: 3,
                background: i === idx ? accent : 'rgba(0,0,0,0.13)',
                transition: 'all 0.2s ease',
              }} />
            ))
          : <span style={{ fontSize: 12, color: T.textFaint, fontWeight: 500 }}>
              {idx + 1} / {nodes.length}
            </span>
        }
      </div>
    </div>
  );
}

function CardFace({
  node, accent, isTop, cardIdx, total,
}: {
  node: MindNode; accent: string; isTop: boolean; cardIdx: number; total: number;
}) {
  const status  = node.status ? STATUS_CONFIG[node.status] : null;
  const kids    = node.children ?? [];
  const num     = String(cardIdx + 1).padStart(2, '0');
  const tot     = String(total).padStart(2, '0');
  const darkEnd = darken(accent, 0.38);

  return (
    <div style={{
      borderRadius: 26,
      overflow: 'hidden',
      position: 'relative',
      background: `linear-gradient(145deg, ${accent} 0%, ${darkEnd} 100%)`,
      minHeight: 340,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: isTop
        ? `0 24px 64px ${accent}50, 0 8px 24px rgba(0,0,0,0.18)`
        : '0 4px 16px rgba(0,0,0,0.10)',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -50, right: -50,
        width: 200, height: 200, borderRadius: '50%',
        background: 'rgba(255,255,255,0.09)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 30, right: -20,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, left: -30,
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Ghost number */}
      <div style={{
        position: 'absolute', bottom: -8, right: 18,
        fontSize: 130, fontWeight: 900, lineHeight: 1,
        color: 'rgba(255,255,255,0.10)',
        letterSpacing: '-6px',
        pointerEvents: 'none',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {num}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, padding: '26px 24px 22px',
        display: 'flex', flexDirection: 'column', gap: 0,
        position: 'relative', zIndex: 1,
      }}>
        {/* Top bar: counter + status */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 24,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '2px',
            color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {num} / {tot}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {node.owner && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
              }}>
                {node.owner}
              </span>
            )}
            {status && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                background: 'rgba(255,255,255,0.18)',
                padding: '4px 10px', borderRadius: 20,
                letterSpacing: '0.8px', textTransform: 'uppercase',
              }}>
                {status.label}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: kids.length > 0 ? 24 : 28,
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.4px',
          lineHeight: 1.35,
          flex: 1,
        }}>
          {node.title}
        </div>

        {/* Children panel */}
        {kids.length > 0 && (
          <div style={{
            marginTop: 20,
            background: 'rgba(0,0,0,0.20)',
            borderRadius: 16,
            padding: '14px 16px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 9,
            }}>
              {kids.slice(0, 4).map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.45)',
                    marginTop: 7, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13.5, fontWeight: 400,
                    color: 'rgba(255,255,255,0.80)',
                    lineHeight: 1.45,
                  }}>
                    {c.title}
                  </span>
                </div>
              ))}
              {kids.length > 4 && (
                <div style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.40)',
                  paddingLeft: 15, marginTop: 2,
                }}>
                  +{kids.length - 4} 项
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tap hint */}
        {isTop && kids.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            alignItems: 'center', gap: 4, marginTop: 14,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.2px',
            }}>
              点击深入
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>→</span>
          </div>
        )}
      </div>
    </div>
  );
}
