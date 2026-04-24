import type { MindNode } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
//  Mapping rules:
//    root            →  # Title
//    depth-1 node    →  ## Title [status] @owner
//    depth-2 node    →  ### Title [status] @owner
//    depth-3 node    →  #### Title   (or  - item  if all siblings are leaves)
//    leaf children   →  - item       (when ALL siblings have no children)

function serialize(node: MindNode, depth: number): string {
  const kids      = node.children ?? [];
  const h         = '#'.repeat(depth);
  const heading   = `${h} ${node.title}${metaStr(node)}`;

  if (!kids.length) return heading + '\n';

  const allLeaves = kids.every(k => !k.children?.length);

  if (allLeaves) {
    // Compact list notation for leaf-only children
    const items = kids.map(k => `- ${k.title}${metaStr(k)}`).join('\n');
    return `${heading}\n${items}\n`;
  }

  // Has at least one non-leaf child → recurse with subheadings
  const body = kids.map(k => serialize(k, depth + 1)).join('\n');
  return `${heading}\n\n${body}`;
}

export function treeToMarkdown(root: MindNode): string {
  const kids = root.children ?? [];
  const sections = kids.map(k => serialize(k, 2)).join('\n');
  return `# ${root.title}\n\n${sections}\n`.replace(/\n{3,}/g, '\n\n');
}

// ── Markdown → Tree ──────────────────────────────────────────────────────────
//
//  Inverse mapping:
//    # Title              → root
//    ## …  [status] @own  → depth-1 node
//    ### …                → depth-2 node
//    #### …               → depth-3 node
//    - item               → leaf child of the nearest preceding heading

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

  // stack[level] = current node at that heading level (1-indexed)
  const stack: (MindNode | null)[] = new Array(7).fill(null);
  stack[1] = root;

  let listTarget: MindNode | null = null;   // most recent heading node

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (!line) continue;

    const hm = line.match(/^(#{1,6})\s+(.*)/);
    const lm = line.match(/^[-*+]\s+(.*)/);

    if (hm) {
      const lvl  = hm[1].length;
      const meta = parseMeta(hm[2]);

      if (lvl === 1) {
        // Root heading — update root in place
        root.title  = meta.title;
        root.status = meta.status;
        root.owner  = meta.owner;
        // Reset stack above root
        for (let i = 2; i < stack.length; i++) stack[i] = null;
        listTarget = root;
        continue;
      }

      const node: MindNode = { id: makeId(), ...meta, children: [] };
      const parent = stack[lvl - 1];
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      }
      stack[lvl] = node;
      // Clear deeper levels
      for (let i = lvl + 1; i < stack.length; i++) stack[i] = null;
      listTarget = node;

    } else if (lm && listTarget) {
      const meta = parseMeta(lm[1]);
      const leaf: MindNode = { id: makeId(), ...meta };
      listTarget.children = listTarget.children ?? [];
      listTarget.children.push(leaf);
    }
  }

  return root;
}
