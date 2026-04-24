import React, { useMemo } from 'react';
import type { MindNode, NodeLayout } from '../types';

interface Props {
  node: MindNode;
  accentColor: string;
  availableWidth: number;
}

// Compact dimensions suited for embedding in a table cell
const NW = 56, NH = 21, HG = 13, VG = 9, PAD = 7;
const RC = 7; // root dot radius — replaces the repeated L2 title rect

function leaves(n: MindNode): number {
  if (!n.children?.length) return 1;
  return n.children.reduce((s, c) => s + leaves(c), 0);
}
function maxDepth(n: MindNode, d = 0): number {
  if (!n.children?.length) return d;
  return Math.max(...n.children.map(c => maxDepth(c, d + 1)));
}
function buildLayout(n: MindNode, x: number, yTop: number, depth = 0): [NodeLayout, number] {
  const lc = leaves(n);
  const totalH = lc * (NH + VG) - VG;
  const y = yTop + (totalH - NH) / 2;
  const nl: NodeLayout = { node: n, x, y, children: [] };
  if (n.children?.length) {
    const colW = depth === 0 ? RC * 2 : NW;
    let cy = yTop;
    for (const c of n.children) {
      const [cl, ch] = buildLayout(c, x + colW + HG, cy, depth + 1);
      nl.children.push(cl);
      cy += ch + VG;
    }
  }
  return [nl, totalH];
}

function draw(nl: NodeLayout, accent: string, depth: number, out: React.ReactElement[]) {
  if (depth === 0) {
    // Root = small filled dot (the title is already shown in the L2 cell)
    const cx = nl.x + RC;
    const cy = nl.y + NH / 2;
    out.push(
      <circle key={`r-${nl.node.id}`} cx={cx} cy={cy} r={RC} fill={accent} />,
    );
    for (const child of nl.children) {
      const sx = nl.x + RC * 2, sy = cy;
      const ex = child.x, ey = child.y + NH / 2;
      const mx = (sx + ex) / 2;
      out.push(
        <path key={`p-${nl.node.id}-${child.node.id}`}
          d={`M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`}
          fill="none" stroke={accent + '55'}
          strokeWidth={1.4} strokeLinecap="round"
        />,
      );
      draw(child, accent, depth + 1, out);
    }
    return;
  }

  const isChild = depth === 1;
  const fill   = isChild ? '#FFFFFF' : 'rgba(0,0,0,0.04)';
  const stroke = isChild ? accent + '55' : 'rgba(0,0,0,0.10)';
  const tColor = isChild ? accent : '#8888A0';
  const fw     = isChild ? 550 : 400;

  const raw   = nl.node.title;
  const label = raw.length > 6 ? raw.slice(0, 5) + '…' : raw;

  out.push(
    <rect key={`r-${nl.node.id}`}
      x={nl.x} y={nl.y} width={NW} height={NH} rx={5}
      fill={fill} stroke={stroke} strokeWidth={1}
    />,
    <text key={`t-${nl.node.id}`}
      x={nl.x + NW / 2} y={nl.y + NH / 2 + 3.8}
      textAnchor="middle" fontSize={9.5} fontWeight={fw} fill={tColor}
    >
      {label}
    </text>,
  );

  for (const child of nl.children) {
    const sx = nl.x + NW, sy = nl.y + NH / 2;
    const ex = child.x,   ey = child.y + NH / 2;
    const mx = (sx + ex) / 2;
    out.push(
      <path key={`p-${nl.node.id}-${child.node.id}`}
        d={`M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`}
        fill="none" stroke="rgba(0,0,0,0.11)"
        strokeWidth={1.4} strokeLinecap="round"
      />,
    );
    draw(child, accent, depth + 1, out);
  }
}

const MiniMindMap: React.FC<Props> = ({ node, accentColor, availableWidth }) => {
  const { rootLayout, svgW, svgH } = useMemo(() => {
    const [rl, totalH] = buildLayout(node, PAD, PAD);
    const d = maxDepth(node);
    // Root column = RC*2 (dot), remaining d columns = NW each, gaps = HG each
    const w = PAD * 2 + RC * 2 + d * (NW + HG);
    const h = totalH + PAD * 2;
    return { rootLayout: rl, svgW: w, svgH: h };
  }, [node]);

  const shapes: React.ReactElement[] = [];
  draw(rootLayout, accentColor, 0, shapes);

  const scale = svgW > availableWidth ? availableWidth / svgW : 1;
  const uid   = node.id.replace(/[^a-z0-9]/gi, '');

  return (
    <svg
      width={svgW * scale} height={svgH * scale}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`g-${uid}`} cx="12%" cy="50%" r="55%"
          gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={svgW} y2={svgH}>
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
