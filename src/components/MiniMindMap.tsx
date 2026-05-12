import React, { useMemo } from 'react';
import { prepareWithSegments, layoutWithLines, measureNaturalWidth } from '@chenglou/pretext';
import type { PreparedTextWithSegments } from '@chenglou/pretext';
import type { MindNode } from '../types';

interface Props {
  node: MindNode;
  accentColor: string;
  availableWidth: number;
}

interface NL {
  node: MindNode;
  x: number; y: number;
  w: number; h: number;
  lines: string[];
  children: NL[];
}

const FONT      = 9.5;
const NW_PARENT = 68;
const NH        = 22;
const LINE_H    = 13;
const PAD_X     = 6;
const PAD_Y     = 3;
const HG        = 10;
const VG        = 7;
const PAD       = 7;
const RC        = 2;

const preparedCache = new Map<string, PreparedTextWithSegments>();
function getCachedPrepared(text: string, fs: string): PreparedTextWithSegments {
  const key = `${fs}::${text}`;
  let p = preparedCache.get(key);
  if (!p) { p = prepareWithSegments(text, fs); preparedCache.set(key, p); }
  return p;
}

function fontStr(depth: number): string {
  return `${depth === 1 ? 550 : 400} ${FONT}px system-ui, sans-serif`;
}

function clean(node: MindNode): string {
  return node.title.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
}

function dim(node: MindNode, depth: number): { w: number; h: number; lines: string[] } {
  const title   = clean(node);
  const hasKids = (node.children?.length ?? 0) > 0;
  const fs      = fontStr(depth);

  if (title === '') return { w: hasKids ? NW_PARENT : 36, h: NH, lines: [''] };

  if (!hasKids) {
    const p  = getCachedPrepared(title, fs);
    const tw = measureNaturalWidth(p);
    return { w: Math.max(36, Math.ceil(tw) + PAD_X * 2), h: NH, lines: [title] };
  }

  const p           = getCachedPrepared(title, fs);
  const { lines }   = layoutWithLines(p, NW_PARENT - PAD_X * 2, LINE_H);
  const lineTexts   = lines.length > 0 ? lines.map(l => l.text) : [title];
  const h           = lineTexts.length === 1
    ? NH
    : Math.max(NH, PAD_Y * 2 + lineTexts.length * LINE_H);
  return { w: NW_PARENT, h, lines: lineTexts };
}

function subtreeH(node: MindNode, depth: number): number {
  if (depth === 0) {
    if (!node.children?.length) return 0;
    return node.children.reduce((s, c, i) =>
      s + subtreeH(c, 1) + (i > 0 ? VG : 0), 0);
  }
  const { h } = dim(node, depth);
  if (!node.children?.length) return h;
  const childH = node.children.reduce((s, c, i) =>
    s + subtreeH(c, depth + 1) + (i > 0 ? VG : 0), 0);
  return Math.max(h, childH);
}

function buildLayout(node: MindNode, x: number, yTop: number, depth: number): NL {
  if (depth === 0) {
    const sH = subtreeH(node, 0);
    const nl: NL = { node, x, y: yTop + sH / 2 - RC, w: RC * 2, h: RC * 2, lines: [], children: [] };
    if (node.children?.length) {
      let cy = yTop;
      for (const c of node.children) {
        const cH = subtreeH(c, 1);
        nl.children.push(buildLayout(c, x + RC * 2 + HG, cy, 1));
        cy += cH + VG;
      }
    }
    return nl;
  }

  const d  = dim(node, depth);
  const sH = subtreeH(node, depth);
  const nl: NL = { node, x, y: yTop + (sH - d.h) / 2, w: d.w, h: d.h, lines: d.lines, children: [] };

  if (node.children?.length) {
    let cy = yTop;
    for (const c of node.children) {
      const cH = subtreeH(c, depth + 1);
      nl.children.push(buildLayout(c, x + d.w + HG, cy, depth + 1));
      cy += cH + VG;
    }
  }
  return nl;
}

function measure(nl: NL): { maxX: number; maxY: number } {
  let maxX = nl.x + nl.w, maxY = nl.y + nl.h;
  for (const c of nl.children) {
    const m = measure(c);
    maxX = Math.max(maxX, m.maxX);
    maxY = Math.max(maxY, m.maxY);
  }
  return { maxX, maxY };
}

function drawNode(nl: NL, accent: string, depth: number, out: React.ReactElement[]) {
  if (depth === 0) {
    const cx = nl.x + RC, cy = nl.y + RC;
    out.push(<circle key={`dot-${nl.node.id}`} cx={cx} cy={cy} r={RC} fill={accent} />);
    for (const child of nl.children) {
      const ex = child.x, ey = child.y + child.h / 2;
      const mx = (cx + RC + ex) / 2;
      out.push(
        <path key={`e-${nl.node.id}-${child.node.id}`}
          d={`M${cx + RC},${cy} C${mx},${cy} ${mx},${ey} ${ex},${ey}`}
          fill="none" stroke={accent + '55'} strokeWidth={1.4} strokeLinecap="round"
        />
      );
      drawNode(child, accent, 1, out);
    }
    return;
  }

  const isL1   = depth === 1;
  const fill   = isL1 ? '#FFFFFF' : 'rgba(0,0,0,0.04)';
  const stroke = isL1 ? accent + '55' : 'rgba(0,0,0,0.10)';
  const tColor = isL1 ? accent : '#8888A0';
  const fw     = isL1 ? 550 : 400;

  out.push(
    <rect key={`box-${nl.node.id}`}
      x={nl.x} y={nl.y} width={nl.w} height={nl.h} rx={5}
      fill={fill} stroke={stroke} strokeWidth={1}
    />
  );

  if (nl.lines.length === 1) {
    out.push(
      <text key={`t-${nl.node.id}`}
        x={nl.x + nl.w / 2} y={nl.y + nl.h / 2 + FONT * 0.38}
        textAnchor="middle" fontSize={FONT} fontWeight={fw}
        fontFamily="system-ui, sans-serif" fill={tColor}
      >
        {nl.lines[0]}
      </text>
    );
  } else {
    const blockH = (nl.lines.length - 1) * LINE_H + FONT;
    const startY = nl.y + (nl.h - blockH) / 2 + FONT * 0.8;
    out.push(
      <text key={`t-${nl.node.id}`} textAnchor="middle"
        fontSize={FONT} fontWeight={fw}
        fontFamily="system-ui, sans-serif" fill={tColor}
      >
        {nl.lines.map((line, i) => (
          <tspan key={i} x={nl.x + nl.w / 2} y={startY + i * LINE_H}>{line}</tspan>
        ))}
      </text>
    );
  }

  for (const child of nl.children) {
    const sx = nl.x + nl.w, sy = nl.y + nl.h / 2;
    const ex = child.x,     ey = child.y + child.h / 2;
    const mx = (sx + ex) / 2;
    out.push(
      <path key={`e-${nl.node.id}-${child.node.id}`}
        d={`M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`}
        fill="none" stroke="rgba(0,0,0,0.11)" strokeWidth={1.4} strokeLinecap="round"
      />
    );
    drawNode(child, accent, depth + 1, out);
  }
}

const MiniMindMap: React.FC<Props> = ({ node, accentColor, availableWidth }) => {
  const { root, svgW, svgH } = useMemo(() => {
    const rl = buildLayout(node, PAD, PAD, 0);
    const { maxX, maxY } = measure(rl);
    return { root: rl, svgW: maxX + PAD, svgH: maxY + PAD };
  }, [node]);

  const shapes: React.ReactElement[] = [];
  drawNode(root, accentColor, 0, shapes);

  const scale = svgW > availableWidth ? availableWidth / svgW : 1;
  const uid   = node.id.replace(/[^a-z0-9]/gi, '');

  return (
    <svg
      width={svgW * scale} height={svgH * scale}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`g-${uid}`} cx="12%" cy="50%" r="55%">
          <stop offset="0%"   stopColor={accentColor} stopOpacity={0.08} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0}    />
        </radialGradient>
      </defs>
      <rect width={svgW} height={svgH} fill={`url(#g-${uid})`} rx={5} />
      {shapes}
    </svg>
  );
};

export default MiniMindMap;
