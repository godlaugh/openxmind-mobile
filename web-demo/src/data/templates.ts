import plan  from '../templates/产品开发计划.md?raw';
import agent from '../templates/AI Agent 漫游指南.md?raw';

export interface Template {
  id:       string;
  label:    string;
  markdown: string;
}

export const TEMPLATES: Template[] = [
  { id: 'plan',  label: '产品计划',  markdown: plan  },
  { id: 'agent', label: 'Agent 指南', markdown: agent },
];
