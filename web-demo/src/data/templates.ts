import plan  from '../templates/产品开发计划.md?raw';
import agent from '../templates/AI Agent 漫游指南.md?raw';

export interface Template {
  id:       string;
  title:    string;
  markdown: string;
}

function extractTitle(md: string): string {
  return md.match(/^#\s+(.+)/m)?.[1]?.trim() ?? 'Untitled';
}

export const TEMPLATES: Template[] = [
  { id: 'plan',  title: extractTitle(plan),  markdown: plan  },
  { id: 'agent', title: extractTitle(agent), markdown: agent },
];
