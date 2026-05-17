import { useState, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import type { MindNode } from '../types';
import { ACCENTS, STATUS_CONFIG } from '../constants/colors';

const T = {
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
  surface:   '#FFFFFF',
};

const SWIPE_THRESHOLD = 72;
const EXIT_MS         = 280;

interface SectionSlide {
  type:       'section';
  node:       MindNode;
  accent:     string;
  sectionNum: number;
  slideCount: number;
}
interface ContentSlide {
  type:         'content';
  node:         MindNode;
  accent:       string;
  sectionTitle: string;
}
type Slide = SectionSlide | ContentSlide;

function flattenToSlides(root: MindNode): Slide[] {
  const out: Slide[] = [];
  (root.children ?? []).forEach((l1, i) => {
    const accent = ACCENTS[i % ACCENTS.length];
    const l2s    = l1.children ?? [];
    out.push({ type: 'section', node: l1, accent, sectionNum: i + 1, slideCount: l2s.length });
    l2s.forEach(l2 => out.push({ type: 'content', node: l2, accent, sectionTitle: l1.title }));
  });
  return out;
}

interface Props { data: MindNode; onExit: () => void; }

export default function PresentationView({ data, onExit }: Props) {
  const slides = useMemo(() => flattenToSlides(data), [data]);

  const [idx,        setIdx]        = useState(0);
  const [dragX,      setDragX]      = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir,    setExitDir]    = useState<'left' | 'right' | null>(null);
  const enterFrom  = useRef({ dir: null as 'left' | 'right' | null });
  const pointerRef = useRef<{ id: number; startX: number; startY: number } | null>(null);

  const total   = slides.length;
  const slide   = slides[idx] ?? slides[0];
  const hasPrev = idx > 0;
  const hasNext = idx < total - 1;

  const go = useCallback((dir: 'left' | 'right', newIdx: number) => {
    setExitDir(dir);
    setTimeout(() => {
      enterFrom.current.dir = dir === 'left' ? 'right' : 'left';
      setIdx(newIdx);
      setDragX(0);
      setExitDir(null);
    }, EXIT_MS);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pointerRef.current || exitDir) return;
    pointerRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY };
    setIsDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, [exitDir]);

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
    pointerRef.current = null;
    setIsDragging(false);
    if      (dx < -SWIPE_THRESHOLD && hasNext) go('left',  idx + 1);
    else if (dx >  SWIPE_THRESHOLD && hasPrev) go('right', idx - 1);
    else                                        setDragX(0);
  }, [go, idx, hasNext, hasPrev]);

  if (total === 0) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: T.textFaint, fontSize: 14 }}>没有可展示内容</span>
    </div>
  );

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100svh' }}>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 50 }}>
        <div style={{
          height: '100%',
          width: `${((idx + 1) / total) * 100}%`,
          background: slide.accent,
          transition: 'width 0.35s ease, background 0.35s ease',
        }} />
      </div>

      {/* Exit button */}
      <button onClick={onExit} style={{
        position: 'fixed', top: 12, right: 16, zIndex: 50,
        padding: '5px 13px', borderRadius: 20,
        background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: 'none', color: 'rgba(255,255,255,0.92)',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.3px',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        ✕ 退出
      </button>

      {/* Slide (re-mounts on idx change via key) */}
      <SlideArea
        key={idx}
        slide={slide}
        enterFrom={enterFrom}
        isDragging={isDragging}
        dragX={dragX}
        exitDir={exitDir}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* Counter */}
      <div style={{
        position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        padding: '4px 12px', borderRadius: 12,
        background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        fontSize: 11, color: 'rgba(255,255,255,0.88)', fontWeight: 600,
        letterSpacing: '0.5px', zIndex: 40,
        pointerEvents: 'none',
      }}>
        {idx + 1} / {total}
      </div>
    </div>
  );
}

// ── SlideArea ────────────────────────────────────────────────────────────

function SlideArea({
  slide, enterFrom, isDragging, dragX, exitDir,
  onPointerDown, onPointerMove, onPointerUp,
}: {
  slide:         Slide;
  enterFrom:     { current: { dir: 'left' | 'right' | null } };
  isDragging:    boolean;
  dragX:         number;
  exitDir:       'left' | 'right' | null;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp:   (e: React.PointerEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // On mount: if we entered from a direction, start off-screen and slide in
  useLayoutEffect(() => {
    const from = enterFrom.current.dir;
    enterFrom.current.dir = null;
    if (!from || !ref.current) return;
    const el = ref.current;
    el.style.transform  = `translateX(${from === 'right' ? '110%' : '-110%'})`;
    el.style.transition = 'none';
    el.getBoundingClientRect(); // force reflow
    el.style.transform  = 'translateX(0)';
    el.style.transition = `transform ${EXIT_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
  }, []); // intentionally empty — only runs once on mount

  const transform = exitDir
    ? `translateX(${exitDir === 'left' ? '-110%' : '110%'})`
    : `translateX(${isDragging ? dragX + 'px' : '0'})`;

  const transition = isDragging
    ? 'none'
    : `transform ${EXIT_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;

  return (
    <div
      ref={ref}
      style={{ width: '100%', minHeight: '100svh', transform, transition, touchAction: 'none', willChange: 'transform' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {slide.type === 'section'
        ? <SectionCard slide={slide} />
        : <ContentCard slide={slide} />
      }
    </div>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────

function SectionCard({ slide }: { slide: SectionSlide }) {
  return (
    <div style={{
      minHeight: '100svh', background: slide.accent,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 44px 60px',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '3px',
        color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
        marginBottom: 22,
      }}>
        第 {slide.sectionNum} 章
      </div>

      <div style={{
        fontSize: 38, fontWeight: 900, color: '#fff',
        letterSpacing: '-1.2px', lineHeight: 1.15, textAlign: 'center',
        marginBottom: 28,
      }}>
        {slide.node.title}
      </div>

      {slide.slideCount > 0 && (
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.2px',
        }}>
          {slide.slideCount} 张幻灯片
        </div>
      )}
    </div>
  );
}

// ── ContentCard ──────────────────────────────────────────────────────

function ContentCard({ slide }: { slide: ContentSlide }) {
  const status  = slide.node.status ? STATUS_CONFIG[slide.node.status] : null;
  const bullets = slide.node.children ?? [];

  return (
    <div style={{
      minHeight: '100svh', background: T.surface,
      display: 'flex', flexDirection: 'column',
      padding: '72px 28px 60px',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      {/* Section breadcrumb */}
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '2px',
        color: slide.accent, textTransform: 'uppercase', marginBottom: 18,
      }}>
        {slide.sectionTitle}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 30, fontWeight: 900, color: T.text,
        letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 16,
      }}>
        {slide.node.title}
      </div>

      {/* Status / owner */}
      {(status || slide.node.owner) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          {status && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: status.color,
              background: status.color + '1A',
              padding: '3px 9px', borderRadius: 6, letterSpacing: '0.5px',
            }}>
              {status.label}
            </span>
          )}
          {slide.node.owner && (
            <span style={{ fontSize: 12, color: T.textSub }}>{slide.node.owner}</span>
          )}
        </div>
      )}

      {/* Accent divider */}
      <div style={{
        width: 36, height: 3, borderRadius: 2,
        background: slide.accent, marginBottom: 24,
      }} />

      {/* Bullet list */}
      {bullets.length > 0 && (
        <BulletList nodes={bullets} accent={slide.accent} depth={0} />
      )}
    </div>
  );
}

function BulletList({ nodes, accent, depth }: { nodes: MindNode[]; accent: string; depth: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: depth === 0 ? 10 : 6 }}>
      {nodes.map((node, i) => <BulletItem key={i} node={node} accent={accent} depth={depth} />)}
    </div>
  );
}

function BulletItem({ node, accent, depth }: { node: MindNode; accent: string; depth: number }) {
  const status   = node.status ? STATUS_CONFIG[node.status] : null;
  const children = node.children ?? [];
  const isRoot   = depth === 0;

  const dotSize = isRoot ? 7 : depth === 1 ? 5 : 4;
  const fs      = isRoot ? 15 : depth === 1 ? 13.5 : 12.5;
  const fw      = isRoot ? 600 : depth === 1 ? 500 : 400;
  const color   = isRoot ? T.text : depth === 1 ? T.textSub : T.textFaint;
  const dotColor = isRoot ? accent : depth === 1 ? accent + 'BB' : T.textFaint;

  return (
    <div style={{
      padding: isRoot ? '13px 16px' : 0,
      borderRadius: isRoot ? 14 : 0,
      background: isRoot ? accent + '0D' : 'transparent',
      border: isRoot ? `1px solid ${accent}22` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: dotSize, height: dotSize, borderRadius: dotSize / 2,
          background: dotColor, flexShrink: 0, marginTop: isRoot ? 5 : 6,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: fs, fontWeight: fw, color, lineHeight: 1.4 }}>
            {node.title}
          </div>
          {(status || node.owner) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {status && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: status.color,
                  background: status.color + '1A',
                  padding: '1px 5px', borderRadius: 4, letterSpacing: '0.5px',
                }}>{status.label}</span>
              )}
              {node.owner && (
                <span style={{ fontSize: 11, color: T.textFaint }}>{node.owner}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {children.length > 0 && (
        <div style={{ paddingLeft: 19, marginTop: 8 }}>
          <BulletList nodes={children} accent={accent} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}
