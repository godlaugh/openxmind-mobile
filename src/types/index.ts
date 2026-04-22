export type Status = 'todo' | 'doing' | 'done';

export interface MindNode {
  id: string;
  title: string;
  status?: Status;
  owner?: string;
  children?: MindNode[];
}

export interface NodeLayout {
  node: MindNode;
  x: number;
  y: number;
  children: NodeLayout[];
}
