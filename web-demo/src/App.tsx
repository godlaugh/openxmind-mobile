import { useState } from 'react';
import TreeTable from './components/TreeTable';
import MarkdownView from './components/MarkdownView';
import { sampleData } from './data/sampleData';
import { treeToMarkdown } from './utils/markdown';

const md = treeToMarkdown(sampleData);

const T = {
  surface:   '#FFFFFF',
  border:    'rgba(0,0,0,0.09)',
  text:      '#1A181E',
  textSub:   '#65657A',
  accent:    '#3E9E8C',
};

export default function App() {
  const [view, setView] = useState<'table' | 'markdown'>('table');

  return (
    <div style={{ position: 'relative' }}>
      {/* Floating tab bar */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: T.surface,
        borderRadius: 24,
        padding: '4px 5px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        border: `1px solid ${T.border}`,
      }}>
        {(['table', 'markdown'] as const).map(v => {
          const active = view === v;
          const label  = v === 'table' ? '≡ 表格' : '# Markdown';
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '7px 18px',
                borderRadius: 20,
                border: 'none',
                background: active ? T.accent : 'transparent',
                color: active ? '#fff' : T.textSub,
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                letterSpacing: active ? '-0.1px' : '0',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 72 }}>
        {view === 'table'
          ? <TreeTable data={sampleData} />
          : <MarkdownView markdown={md} />
        }
      </div>
    </div>
  );
}
