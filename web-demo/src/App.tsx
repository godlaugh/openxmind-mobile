import { useState, useCallback } from 'react';
import TreeTable from './components/TreeTable';
import MarkdownView from './components/MarkdownView';
import { TEMPLATES } from './data/templates';
import { markdownToTree } from './utils/markdown';
import { MONO_PALETTES } from './constants/colors';
import type { MindNode } from './types';

const T = {
  surface: '#FFFFFF',
  border:  'rgba(0,0,0,0.09)',
  textSub: '#65657A',
  textFaint: '#AAAABB',
  accent:  '#3E9E8C',
};

const initialMd   = TEMPLATES[0].markdown;
const initialTree = markdownToTree(initialMd);

export default function App() {
  const [view,          setView]          = useState<'table' | 'markdown'>('table');
  const [tree,          setTree]          = useState<MindNode>(initialTree);
  const [markdown,      setMarkdown]      = useState(initialMd);
  const [templateIdx,   setTemplateIdx]   = useState(0);
  const [colorMode,     setColorMode]     = useState<'multi' | 'mono'>('multi');
  const [monoColor,     setMonoColor]     = useState(MONO_PALETTES[0].color);

  const handleMarkdownChange = useCallback((md: string) => {
    setMarkdown(md);
    setTree(markdownToTree(md));
  }, []);

  const handleViewChange = (v: 'table' | 'markdown') => {
    setView(v);
  };

  const handleTemplateSelect = (idx: number) => {
    if (idx === templateIdx) return;
    const md = TEMPLATES[idx].markdown;
    setTemplateIdx(idx);
    setMarkdown(md);
    setTree(markdownToTree(md));
  };

  const toggleColorMode = () =>
    setColorMode(m => m === 'multi' ? 'mono' : 'multi');

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Floating bottom nav ── */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100,
        background: T.surface, borderRadius: 24, padding: '4px 5px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        border: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* View switcher row */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['table', 'markdown'] as const).map(v => {
            const active = view === v;
            return (
              <button key={v} onClick={() => handleViewChange(v)} style={{
                padding: '7px 18px', borderRadius: 20, border: 'none',
                background: active ? T.accent : 'transparent',
                color: active ? '#fff' : T.textSub,
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.18s ease',
              }}>
                {v === 'table' ? '≡ 表格' : '# Markdown'}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />

        {/* Template switcher row */}
        <div style={{ display: 'flex', gap: 2, padding: '0 4px' }}>
          {TEMPLATES.map((tpl, idx) => {
            const active = templateIdx === idx;
            return (
              <button key={tpl.id} onClick={() => handleTemplateSelect(idx)} style={{
                padding: '4px 12px', borderRadius: 20, border: 'none',
                background: 'transparent',
                color: active ? T.accent : T.textFaint,
                fontSize: 11, fontWeight: active ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}>
                {tpl.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ paddingBottom: 88 }}>
        {view === 'table'
          ? <TreeTable
              data={tree}
              colorMode={colorMode}
              monoColor={monoColor}
              onToggleColorMode={toggleColorMode}
              onSelectMonoColor={setMonoColor}
            />
          : <MarkdownView markdown={markdown} onChange={handleMarkdownChange} />
        }
      </div>
    </div>
  );
}
