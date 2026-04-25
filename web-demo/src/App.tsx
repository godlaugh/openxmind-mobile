import { useState, useCallback } from 'react';
import TreeTable from './components/TreeTable';
import MarkdownView from './components/MarkdownView';
import { sampleData } from './data/sampleData';
import { treeToMarkdown, markdownToTree } from './utils/markdown';
import type { MindNode } from './types';

const T = {
  surface: '#FFFFFF',
  border:  'rgba(0,0,0,0.09)',
  textSub: '#65657A',
  accent:  '#3E9E8C',
};

export default function App() {
  const [view,     setView]     = useState<'table' | 'markdown'>('table');
  const [tree,     setTree]     = useState<MindNode>(sampleData);
  const [markdown, setMarkdown] = useState(() => treeToMarkdown(sampleData));

  // Markdown edited → update tree; tree unchanged so table reflects edits on next switch
  const handleMarkdownChange = useCallback((md: string) => {
    setMarkdown(md);
    setTree(markdownToTree(md));
  }, []);

  // Switching table → markdown: regenerate Markdown from current tree
  // Switching markdown → table: tree is already kept in sync by handleMarkdownChange
  const handleViewChange = (v: 'table' | 'markdown') => {
    if (v === 'markdown' && view === 'table') {
      setMarkdown(treeToMarkdown(tree));
    }
    setView(v);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Floating tab bar */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, display: 'flex', alignItems: 'center', gap: 2,
        background: T.surface, borderRadius: 24, padding: '4px 5px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        border: `1px solid ${T.border}`,
      }}>
        {(['table', 'markdown'] as const).map(v => {
          const active = view === v;
          const label  = v === 'table' ? '≡ 表格' : '# Markdown';
          return (
            <button key={v} onClick={() => handleViewChange(v)} style={{
              padding: '7px 18px', borderRadius: 20, border: 'none',
              background: active ? T.accent : 'transparent',
              color: active ? '#fff' : T.textSub,
              fontSize: 12.5, fontWeight: active ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.18s ease',
              letterSpacing: active ? '-0.1px' : '0',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ paddingBottom: 72 }}>
        {view === 'table'
          ? <TreeTable data={tree} />
          : <MarkdownView markdown={markdown} onChange={handleMarkdownChange} />
        }
      </div>
    </div>
  );
}
