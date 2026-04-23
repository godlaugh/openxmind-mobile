import React, { useMemo } from 'react';
import type { MindNode, NodeLayout } from '../types';

interface Props {
  node: MindNode;
  accentColor: string;
  availableWidth: number;
}

const NW = 74, NH = 26, HG = 24, VG = 14, PAD = 12;

function leaves(n: MindNode): number {
  if (!n.children?.length) return 1;
  return n.children.reduce((s, c) => s + leaves(c), 0);
}
function maxDepth(n: MindNode, d = 0): number {
  if (!n.children?.length) return d;
  return Math.max(...n.children.map(c => maxDepth(c, d + 1)));
}
function buildLayout(n: MindNode, x: number, yTop: number): [NodeLayout, number] {
  const lc = leaves(n);
  const totalH = lc * (NH + VG) - VG;
  const y = yTop + (totalH - NH) / 2;
  const nl: NodeLayout = { node: n, x, y, children: [] };
  if (n.children?.length) {
    let cy = yTop;
    for (const c of n.children) {
      const [cl, ch] = buildLayout(c, x + NW + HG, cy);
      nl.children.push(cl);
      cy += ch + VG;
    }
  }
  return [nl, totalH];
}

function renderTree(
  nl: NodeLayout,
  accent: string,
  depth: number,
  shapes: React.ReactElement[],
) {
  // ── Node style by depth ──────────────────────────────────────────
  const isRoot = depth === 0;
  const isChild = depth === 1;

  const fill   = isRoot  ? accent
               : isChild ? accent + '1C'
               :            'rgba(255,255,255,0.03)';
  const stroke = isRoot  ? 'none'
               : isChild ? accent + '50'
               :            'rgba(255,255,255,0.08)';
  const tColor = isRoot  ? '#ffffff'
               : isChild ? accent
               :            '#66667A';
  const fWeight = isRoot ? 700 : isChild ? 500 : 400;
  const fSize   = isRoot ? 11  : 10.5;

  const label = nl.node.title.length > 6
    ? nl.node.title.slice(0, 5) + '…'
    : nl.node.title;

  // Root glow halo
  if (isRoot) {
    shapes.push(
      <ellipse
        key={`halo-${nl.node.id}`}
        cx={nl.x + NW / 2} cy={nl.y + NH / 2}
        rx={NW / 2 + 10} ry={NH / 2 + 10}
        fill={accent} fillOpacity={0.09}
      />,
    );
  }

  shapes.push(
    <rect
      key={`rect-${nl.node.id}`}
      x={nl.x} y={nl.y} width={NW} height={NH} rx={7}
      fill={fill} stroke={stroke} strokeWidth={1}
    />,
    <text
      key={`text-${nl.node.id}`}
      x={nl.x + NW / 2} y={nl.y + NH / 2 + 4.5}
      textAnchor="middle"
      fontSize={fSize} fontWeight={fWeight} fill={tColor}
    >
      {label}
    </text>,
  );

  // ── Connection lines ─────────────────────────────────────────────
  for (const child of nl.children) {
    const sx = nl.x + NW, sy = nl.y + NH / 2;
    const ex = child.x,   ey = child.y + NH / 2;
    const mx = (sx + ex) / 2;
    const lineColor = isRoot
      ? accent + '55'
      : 'rgba(255,255,255,0.09)';
    shapes.push(
      <path
        key={`path-${nl.node.id}-${child.node.id}`}
        d={`M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`}
        fill="none" stroke={lineColor} strokeWidth={1.5}
        strokeLinecap="round"
      />,
    );
    renderTree(child, accent, depth + 1, shapes);
  }
}

const MiniMindMap: React.FC<Props> = ({ node, accentColor, availableWidth }) => {
  const { rootLayout, svgW, svgH } = useMemo(() => {
    const [rl, totalH] = buildLayout(node, PAD, PAD);
    const d = maxDepth(node);
    const w = (d + 1) * (NW + HG) - HG + PAD * 2;
    const h = totalH + PAD * 2;
    return { rootLayout: rl, svgW: w, svgH: h };
  }, [node]);

  const shapes: React.ReactElement[] = [];
  renderTree(rootLayout, accentColor, 0, shapes);

  const scale = svgW > availableWidth ? availableWidth / svgW : 1;
  const uid = node.id.replace(/[^a-z0-9]/gi, '');

  return (
    <svg
      width={svgW * scale} height={svgH * scale}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: 'block' }}
    >
      <defs>
        {/* Subtle radial gradient behind root node */}
        <radialGradient id={`rg-${uid}`} cx="18%" cy="50%" r="55%" gradientUnits="userSpaceOnUse"
          x1="0" y1="0" x2={svgW} y2={svgH}>
          <stop offset="0%"   stopColor={accentColor} stopOpacity={0.09} />
          <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Gradient wash */}
      <rect width={svgW} height={svgH} fill={`url(#rg-${uid})`} />
      {shapes}
    </svg>
  );
};

export default MiniMindMap;
