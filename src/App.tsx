import { useState, useCallback } from 'react';
import TreeTable from './components/TreeTable';
import MarkdownView from './components/MarkdownView';
import FullMindMap from './components/FullMindMap';
import { TEMPLATES } from './data/templates';
import { markdownToTree } from './utils/markdown';
import { MONO_PALETTES } from './constants/colors';
import type { MindNode } from './types';

const T = {
  surface:   '#FFFFFF',
  pageBg:    '#EDECEA',
  border:    'rgba(0,0,0,0.09)',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
  accent:    '#3E9E8C',
};

const initialMd   = TEMPLATES[0].markdown;
const initialTree = markdownToTree(initialMd);

export default function App() {
  const [view,         setView]         = useState<'table' | 'markdown' | 'mindmap'>('table');
  const [tree,         setTree]         = useState<MindNode>(initialTree);
  const [markdown,     setMarkdown]     = useState(initialMd);
  const [templateIdx,  setTemplateIdx]  = useState(0);
  const [showPicker,   setShowPicker]   = useState(false);
  const [colorMode,    setColorMode]    = useState<'multi' | 'mono'>('multi');
  const [monoColor,    setMonoColor]    = useState(MONO_PALETTES[0].color);

  const handleMarkdownChange = useCallback((md: string) => {
    setMarkdown(md);
    setTree(markdownToTree(md));
  }, []);

  const handleTemplateSelect = (idx: number) => {
    if (idx !== templateIdx) {
      const md = TEMPLATES[idx].markdown;
      setTemplateIdx(idx);
      setMarkdown(md);
      setTree(markdownToTree(md));
    }
    setShowPicker(false);
  };

  const toggleColorMode = () =>
    setColorMode(m => m === 'multi' ? 'mono' : 'multi');

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Template picker sheet ── */}
      {showPicker && (
        <div
          onClick={() => setShowPicker(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: T.pageBg,
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(0,0,0,0.18)',
              margin: '12px auto 20px',
            }} />
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
              color: T.textFaint, textTransform: 'uppercase',
              padding: '0 22px 10px',
            }}>
              切换模板
            </div>
            {TEMPLATES.map((tpl, idx) => {
              const active = idx === templateIdx;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateSelect(idx)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    width: '100%', padding: '15px 22px',
                    background: active ? 'rgba(62,158,140,0.07)' : 'transparent',
                    border: 'none',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    flex: 1,
                    fontSize: 15, fontWeight: active ? 600 : 400,
                    color: active ? T.accent : T.text,
                    letterSpacing: '-0.2px',
                  }}>
                    {tpl.title}
                  </span>
                  {active && (
                    <span style={{ fontSize: 16, color: T.accent, fontWeight: 700 }}>✓</span>
                  )}
                </button>
              );
            })}
            <div style={{ height: 12 }} />
          </div>
        </div>
      )}

      {/* ── Floating bottom nav ── */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, display: 'flex', alignItems: 'center', gap: 2,
        background: T.surface, borderRadius: 24, padding: '4px 5px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        border: `1px solid ${T.border}`,
      }}>
        {([
          ['table',    '≡ 表格'],
          ['mindmap',  '◎ 脑图'],
          ['markdown', '# Markdown'],
        ] as const).map(([v, label]) => {
          const active = view === v;
          return (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 16px', borderRadius: 20, border: 'none',
              background: active ? T.accent : 'transparent',
              color: active ? '#fff' : T.textSub,
              fontSize: 12.5, fontWeight: active ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.18s ease',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {view === 'mindmap'
        ? <FullMindMap data={tree} />
        : (
          <div style={{ paddingBottom: 72 }}>
            {view === 'table'
              ? <TreeTable
                  data={tree}
                  colorMode={colorMode}
                  monoColor={monoColor}
                  onToggleColorMode={toggleColorMode}
                  onSelectMonoColor={setMonoColor}
                  onOpenTemplatePicker={() => setShowPicker(true)}
                />
              : <MarkdownView markdown={markdown} onChange={handleMarkdownChange} />
            }
          </div>
        )
      }
    </div>
  );
}
