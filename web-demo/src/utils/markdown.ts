import type { MindNode } from '../types';

function metaStr(node: MindNode): string {
  const s = node.status ? ` [${node.status}]` : '';
  const o = node.owner  ? ` @${node.owner}`  : '';
  return s + o;
}

function makeId(): string {
  return 'n' + Math.random().toString(36).slice(2, 8);
}

// ── Tree → Markdown ──────────────────────────────────────────────────────────
//
//  ## heading   →  L1
//  ### heading  →  L2 (or nested list when L2 has further children)
//  - item       →  leaf list (flat when all siblings are leaves)
//  - item       →  nested list with indentation when items have children

function serializeList(node: MindNode, indent: number): string {
  const pad  = '  '.repeat(indent);
  const line = `${pad}- ${node.title}${metaStr(node)}`;
  if (!node.children?.length) return line;
  const subs = node.children.map(c => serializeList(c, indent + 1)).join('\n');
  return `${line}\n${subs}`;
}

function serialize(node: MindNode, depth: number): string {
  const kids    = node.children ?? [];
  const h       = '#'.repeat(depth);
  const heading = `${h} ${node.title}${metaStr(node)}`;

  if (!kids.length) return heading + '\n';

  const allLeaves = kids.every(k => !k.children?.length);

  if (allLeaves) {
    const items = kids.map(k => `- ${k.title}${metaStr(k)}`).join('\n');
    return `${heading}\n${items}\n`;
  }

  // depth >= 3 (### and deeper): switch to nested list notation
  if (depth >= 3) {
    const items = kids.map(k => serializeList(k, 0)).join('\n');
    return `${heading}\n${items}\n`;
  }

  // ## level with non-leaf children → sub-headings
  const body = kids.map(k => serialize(k, depth + 1)).join('\n');
  return `${heading}\n\n${body}`;
}

export function treeToMarkdown(root: MindNode): string {
  const kids     = root.children ?? [];
  const sections = kids.map(k => serialize(k, 2)).join('\n');
  return `# ${root.title}\n\n${sections}\n`.replace(/\n{3,}/g, '\n\n');
}

// ── Markdown → Tree ──────────────────────────────────────────────────────────
//
//  Supports both heading hierarchy and indented nested lists:
//    # Title              → root
//    ## … / ### …         → heading nodes at respective depths
//    - item               → list child (indent=0 → under nearest heading)
//      - sub-item         → nested child (indent determines parent)
//        - deeper         → further nesting via 2-space increments

function parseMeta(text: string): { title: string; status?: MindNode['status']; owner?: string } {
  const sMatch = text.match(/\[(todo|doing|done)\]/i);
  const oMatch = text.match(/@(\S+)/);
  const title  = text
    .replace(/\[(todo|doing|done)\]/gi, '')
    .replace(/@\S+/g, '')
    .trim();
  return {
    title,
    status: sMatch ? (sMatch[1].toLowerCase() as MindNode['status']) : undefined,
    owner:  oMatch ? oMatch[1] : undefined,
  };
}

export function markdownToTree(md: string): MindNode {
  const root: MindNode = { id: 'root', title: 'Untitled', children: [] };

  const headingStack: (MindNode | null)[] = new Array(7).fill(null);
  headingStack[1] = root;

  let listTarget: MindNode | null = null;

  // Stack for nested list items: each entry tracks the node and its indent level
  const listStack: Array<{ node: MindNode; indent: number }> = [];

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (/^-{3,}$/.test(line)) continue; // skip horizontal rules

    const hm = line.match(/^(#{1,6})\s+(.*)/);
    // Capture leading whitespace to detect indentation level
    const lm = line.match(/^(\s*)[-*+]\s+(.*)/);

    if (hm) {
      const lvl  = hm[1].length;
      const meta = parseMeta(hm[2]);

      if (lvl === 1) {
        root.title  = meta.title;
        root.status = meta.status;
        root.owner  = meta.owner;
        for (let i = 2; i < headingStack.length; i++) headingStack[i] = null;
        listTarget = root;
        listStack.length = 0;
        continue;
      }

      const node: MindNode = { id: makeId(), ...meta, children: [] };
      const parent = headingStack[lvl - 1];
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      }
      headingStack[lvl] = node;
      for (let i = lvl + 1; i < headingStack.length; i++) headingStack[i] = null;
      listTarget = node;
      listStack.length = 0; // new heading resets list nesting

    } else if (lm) {
      const indent = lm[1].length;
      const meta   = parseMeta(lm[2]);
      const node: MindNode = { id: makeId(), ...meta, children: [] };

      // Pop stack entries that are at the same or deeper indent level
      while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indent) {
        listStack.pop();
      }

      // Parent is the top of the list stack, or the current heading if stack is empty
      const parent = listStack.length > 0 ? listStack[listStack.length - 1].node : listTarget;
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      }

      listStack.push({ node, indent });
    }
  }

  return root;
}
