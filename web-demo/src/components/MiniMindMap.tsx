import React, { useMemo } from 'react';
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

// ── Constants ────────────────────────────────────────────────────────────────
const FONT      = 9.5;
const NW_PARENT = 68;   // fixed width for nodes that have children (text wraps)
const NH        = 22;   // minimum node height
const LINE_H    = 13;   // line-height for wrapped text
const PAD_X     = 6;    // horizontal text padding inside node
const PAD_Y     = 3;    // vertical text padding for multi-line nodes
const HG        = 10;   // gap between columns
const VG        = 7;    // gap between sibling rows
const PAD       = 7;    // SVG outer padding
const RC        = 2;    // root dot radius

// ── Text helpers ─────────────────────────────────────────────────────────────
function charW(ch: string): number {
  const c = ch.charCodeAt(0);
  // CJK + full-width characters take one full em
  return (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) ||
         (c >= 0xFF00 && c <= 0xFF60) || (c >= 0x3000 && c <= 0x303F)
    ? FONT : FONT * 0.6;
}
function textW(s: string): number { return [...s].reduce((w, c) => w + charW(c), 0); }

function wrapText(text: string, maxW: number): string[] {
  if (textW(text) <= maxW) return [text];
  const lines: string[] = [];
  let line = '', lw = 0;
  for (const ch of [...text]) {
    const cw = charW(ch);
    if (lw + cw > maxW && line) { lines.push(line); line = ch; lw = cw; }
    else { line += ch; lw += cw; }
  }
  if (line) lines.push(line);
  return lines;
}

function clean(node: MindNode): string {
  return node.title.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
}

// ── Node dimension computation ────────────────────────────────────────────────
// Leaf nodes: natural width (no truncation), single line
// Non-leaf nodes: fixed NW_PARENT, text wraps vertically
function dim(node: MindNode): { w: number; h: number; lines: string[] } {
  const title   = clean(node);
  const hasKids = (node.children?.length ?? 0) > 0;

  if (!hasKids) {
    const tw = textW(title);
    return { w: Math.max(36, Math.ceil(tw) + PAD_X * 2), h: NH, lines: [title] };
  }

  const lines = wrapText(title, NW_PARENT - PAD_X * 2);
  const h     = lines.length === 1
    ? NH
    : Math.max(NH, PAD_Y * 2 + lines.length * LINE_H);
  return { w: NW_PARENT, h, lines };
}

// ── Layout ────────────────────────────────────────────────────────────────────
// subtreeH: total vertical pixels consumed by a node and all its descendants
function subtreeH(node: MindNode, depth: number): number {
  if (depth === 0) {
    if (!node.children?.length) return 0;
    return node.children.reduce((s, c, i) =>
      s + subtreeH(c, 1) + (i > 0 ? VG : 0), 0);
  }
  const { h } = dim(node);
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

  const d = dim(node);
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

// ── Drawing ───────────────────────────────────────────────────────────────────
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
        textAnchor="middle" fontSize={FONT} fontWeight={fw} fill={tColor}
      >
        {nl.lines[0]}
      </text>
    );
  } else {
    // Vertically center the text block inside the node
    const blockH = (nl.lines.length - 1) * LINE_H + FONT;
    const startY = nl.y + (nl.h - blockH) / 2 + FONT * 0.8;
    out.push(
      <text key={`t-${nl.node.id}`} textAnchor="middle"
        fontSize={FONT} fontWeight={fw} fill={tColor}
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

// ── Component ─────────────────────────────────────────────────────────────────
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
