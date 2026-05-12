import React, { useState, useRef, useEffect } from 'react';

const T = {
  pageBg:     '#EDECEA',
  surface:    '#FFFFFF',
  surfaceAlt: '#F7F6F3',
  border:     'rgba(0,0,0,0.09)',
  text:       '#1A181E',
  textSub:    '#65657A',
  textFaint:  '#AAAABB',
  accent:     '#3E9E8C',
  h2:         '#3E9E8C',
  h3:         '#8F6BB0',
  h4:         '#C08C3A',
  todo:       '#AAAABB',
  doing:      '#5580C0',
  done:       '#3E9E8C',
};

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

interface Token { type: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'li'|'blank'|'text'; content: string }

function tokenize(md: string): Token[] {
  return md.split('\n').map(raw => {
    const line = raw.trimEnd();
    const hm = line.match(/^(#{1,6})\s+(.*)/);
    if (hm) return { type: `h${hm[1].length}` as Token['type'], content: hm[2] };
    const lm = line.match(/^[-*+]\s+(.*)/);
    if (lm) return { type: 'li', content: lm[1] };
    if (!line.trim()) return { type: 'blank', content: '' };
    return { type: 'text', content: line };
  });
}

function InlineContent({ text }: { text: string }) {
  type Span = { start: number; end: number; node: React.ReactNode };
  const spans: Span[] = [];
  let key = 0;
  const statusRe = /\[(todo|doing|done)\]/gi;
  const ownerRe  = /@(\S+)/g;
  let m: RegExpExecArray | null;
  statusRe.lastIndex = 0;
  while ((m = statusRe.exec(text)) !== null) {
    const s = m[1].toLowerCase() as 'todo'|'doing'|'done';
    spans.push({ start: m.index, end: m.index + m[0].length, node: (
      <span key={key++} style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', background: T[s] + '18', color: T[s], border: `1px solid ${T[s]}40`, margin: '0 2px' }}>{m[0]}</span>
    )});
  }
  ownerRe.lastIndex = 0;
  while ((m = ownerRe.exec(text)) !== null) {
    spans.push({ start: m.index, end: m.index + m[0].length, node: <span key={key++} style={{ fontWeight: 600, color: '#8F6BB0', fontSize: '0.92em' }}>{m[0]}</span> });
  }
  spans.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) parts.push(text.slice(cursor, span.start));
    parts.push(span.node);
    cursor = span.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function Preview({ markdown }: { markdown: string }) {
  const tokens = tokenize(markdown);
  const cfg: Record<string, { size: number; weight: number; color: string; indent: number; borderLeft?: string }> = {
    h1: { size: 22, weight: 800, color: T.text, indent: 0 },
    h2: { size: 15, weight: 700, color: T.h2,   indent: 0,  borderLeft: `3px solid ${T.h2}` },
    h3: { size: 13, weight: 600, color: T.h3,   indent: 16 },
    h4: { size: 12, weight: 500, color: T.h4,   indent: 28 },
    h5: { size: 11.5, weight: 500, color: T.textSub,   indent: 36 },
    h6: { size: 11,   weight: 400, color: T.textFaint, indent: 44 },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {tokens.map((tok, i) => {
        if (tok.type === 'blank') {
          const prev = tokens[i - 1];
          return <div key={i} style={{ height: prev && (prev.type === 'h1' || prev.type === 'h2') ? 14 : 6 }} />;
        }
        if (tok.type === 'li') {
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginLeft: 44 }}>
              <span style={{ fontSize: 11, color: T.textFaint, flexShrink: 0, fontFamily: 'monospace' }}>-</span>
              <span style={{ fontSize: 11.5, color: T.textSub, lineHeight: 1.4 }}><InlineContent text={tok.content} /></span>
            </div>
          );
        }
        if (tok.type.startsWith('h')) {
          const c = cfg[tok.type] ?? cfg.h6;
          const hashes = '#'.repeat(parseInt(tok.type[1]));
          const prev = tokens.slice(0, i).reverse().find(t => t.type !== 'blank');
          const spacer = tok.type === 'h2' && prev && prev.type !== 'h1'
            ? <div key={`sp-${i}`} style={{ height: 20 }} /> : null;
          return (
            <React.Fragment key={i}>
              {spacer}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginLeft: c.indent, paddingLeft: c.borderLeft ? 10 : 0, borderLeft: c.borderLeft }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: c.color + '70', flexShrink: 0, fontFamily: 'monospace' }}>{hashes}</span>
                <span style={{ fontSize: c.size, fontWeight: c.weight, color: c.color, lineHeight: 1.35 }}><InlineContent text={tok.content} /></span>
              </div>
            </React.Fragment>
          );
        }
        return <span key={i} style={{ fontSize: 12, color: T.textSub }}>{tok.content}</span>;
      })}
    </div>
  );
}

interface Props {
  markdown: string;
  onChange: (md: string) => void;
}

const MarkdownView: React.FC<Props> = ({ markdown, onChange }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [pasteState,  setPasteState]  = useState<'idle'|'ok'|'denied'>('idle');
  const [copied,      setCopied]      = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = !markdown.trim();

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [markdown]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
      setPasteState('ok');
      setTimeout(() => setPasteState('idle'), 1800);
    } catch {
      setPasteState('denied');
      setTimeout(() => setPasteState('idle'), 2500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{
      background: T.pageBg,
      minHeight: '100vh',
      padding: '24px 16px 80px',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.4px', color: T.textFaint, textTransform: 'uppercase' }}>
            OpenXmind · Markdown
          </div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>
            {showPreview ? '预览模式' : '编辑模式'}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowPreview(p => !p)}
          title={showPreview ? '返回编辑' : '预览'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 20,
            border: `1px solid ${T.border}`,
            background: showPreview ? T.text : T.surface,
            color: showPreview ? '#fff' : T.textSub,
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.18s',
          }}
        >
          {showPreview ? <EyeOffIcon /> : <EyeIcon />}
          <span>{showPreview ? '编辑' : '预览'}</span>
        </button>
      </div>

      {!showPreview && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={handlePaste}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
                background: pasteState === 'ok' ? T.accent : pasteState === 'denied' ? '#C08C3A' : T.text,
                color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)', transition: 'background 0.2s',
              }}
            >
              {pasteState === 'ok' ? '✓ 已粘贴' : pasteState === 'denied' ? '请允许访问剪贴板' : '快速粘贴'}
            </button>
            <button
              onClick={() => onChange('')}
              disabled={isEmpty}
              style={{
                padding: '11px 16px', borderRadius: 12,
                border: `1px solid ${T.border}`, background: T.surface,
                color: isEmpty ? T.textFaint : T.textSub,
                fontSize: 13, fontWeight: 600, cursor: isEmpty ? 'default' : 'pointer',
              }}
            >
              清除
            </button>
            {!isEmpty && (
              <button
                onClick={handleCopy}
                style={{
                  padding: '11px 16px', borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: copied ? T.accent + '18' : T.surface,
                  color: copied ? T.accent : T.textSub,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {copied ? '✓' : '复制'}
              </button>
            )}
          </div>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.surface }}>
            {isEmpty ? (
              <div
                onClick={handlePaste}
                style={{
                  minHeight: 'calc(100vh - 230px)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', gap: 10,
                }}
              >
                <div style={{ fontSize: 13, color: T.textFaint, textAlign: 'center', lineHeight: 1.8 }}>
                  点击「快速粘贴」导入 Markdown
                  <br />
                  <span style={{ fontSize: 11, color: T.textFaint + 'AA' }}>
                    # 根节点 · ## 一级 · ### 二级 · - 叶子
                  </span>
                </div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={e => onChange(e.target.value)}
                spellCheck={false}
                style={{
                  display: 'block', width: '100%', boxSizing: 'border-box',
                  minHeight: 'calc(100vh - 230px)',
                  height: 'auto', overflow: 'hidden',
                  margin: 0, padding: '16px',
                  border: 'none', outline: 'none', resize: 'none',
                  background: 'transparent',
                  fontSize: 13, lineHeight: 1.75, color: T.textSub,
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                }}
              />
            )}
          </div>
        </>
      )}

      {showPreview && (
        <div style={{
          borderRadius: 14, border: `1px solid ${T.border}`,
          background: T.surface,
          padding: '20px 20px 28px',
          minHeight: 'calc(100vh - 150px)',
        }}>
          {isEmpty
            ? <div style={{ fontSize: 13, color: T.textFaint, textAlign: 'center', marginTop: 40 }}>暂无内容</div>
            : <Preview markdown={markdown} />
          }
        </div>
      )}
    </div>
  );
};

export default MarkdownView;
