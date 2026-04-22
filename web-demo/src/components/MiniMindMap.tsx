import React, { useMemo } from 'react';
import type { MindNode, NodeLayout } from '../types';

interface Props {
  node: MindNode;
  accentColor: string;
  availableWidth: number;
}

const NW = 66;
const NH = 24;
const HG = 18;
const VG = 10;
const PAD = 8;

function countLeaves(node: MindNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

function countMaxDepth(node: MindNode, d = 0): number {
  if (!node.children?.length) return d;
  return Math.max(...node.children.map(c => countMaxDepth(c, d + 1)));
}

function buildLayout(node: MindNode, x: number, yTop: number): [NodeLayout, number] {
  const lc = countLeaves(node);
  const totalH = lc * (NH + VG) - VG;
  const y = yTop + (totalH - NH) / 2;
  const nl: NodeLayout = { node, x, y, children: [] };
  if (node.children?.length) {
    let cy = yTop;
    for (const child of node.children) {
      const [cl, ch] = buildLayout(child, x + NW + HG, cy);
      nl.children.push(cl);
      cy += ch + VG;
    }
  }
  return [nl, totalH];
}

function collectElems(nl: NodeLayout, color: string, depth: number): React.ReactElement[] {
  const isRoot = depth === 0;
  const fill = isRoot ? color + '1A' : '#FFFFFF';
  const stroke = isRoot ? color : '#E2E8F0';
  const textFill = isRoot ? color : '#475569';
  const raw = nl.node.title;
  const label = raw.length > 6 ? raw.slice(0, 5) + '…' : raw;

  const elems: React.ReactElement[] = [
    <rect
      key={`rect-${nl.node.id}`}
      x={nl.x} y={nl.y}
      width={NW} height={NH}
      rx={6}
      fill={fill}
      stroke={stroke}
      strokeWidth={isRoot ? 1.5 : 1}
    />,
    <text
      key={`text-${nl.node.id}`}
      x={nl.x + NW / 2}
      y={nl.y + NH / 2 + 4}
      textAnchor="middle"
      fontSize={11}
      fill={textFill}
      fontWeight={isRoot ? 'bold' : 'normal'}
    >
      {label}
    </text>,
  ];

  for (const child of nl.children) {
    const sx = nl.x + NW, sy = nl.y + NH / 2;
    const ex = child.x, ey = child.y + NH / 2;
    const mx = (sx + ex) / 2;
    elems.push(
      <path
        key={`path-${nl.node.id}-${child.node.id}`}
        d={`M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`}
        fill="none"
        stroke={color + '55'}
        strokeWidth={1.5}
      />,
    );
    elems.push(...collectElems(child, color, depth + 1));
  }
  return elems;
}

const MiniMindMap: React.FC<Props> = ({ node, accentColor, availableWidth }) => {
  const { rootLayout, svgW, svgH } = useMemo(() => {
    const [rl, totalH] = buildLayout(node, PAD, PAD);
    const depth = countMaxDepth(node);
    const w = (depth + 1) * (NW + HG) - HG + PAD * 2;
    const h = totalH + PAD * 2;
    return { rootLayout: rl, svgW: w, svgH: h };
  }, [node]);

  const elems = collectElems(rootLayout, accentColor, 0);
  const scale = svgW > availableWidth ? availableWidth / svgW : 1;

  return (
    <div style={{ padding: '10px 4px' }}>
      <svg
        width={svgW * scale}
        height={svgH * scale}
        viewBox={`0 0 ${svgW} ${svgH}`}
      >
        {elems}
      </svg>
    </div>
  );
};

export default MiniMindMap;
