import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const T = {
  pageBg:     '#EDECEA',
  surface:    '#FFFFFF',
  surfaceAlt: '#F5F4F1',
  border:     'rgba(0,0,0,0.09)',
  text:       '#1A181E',
  textSub:    '#65657A',
  textFaint:  '#AAAABB',
  accent:     '#3E9E8C',
  codeBg:     '#F0EEF6',
  codeText:   '#7C3AED',
  blockBg:    '#F7F6F3',
  blockBorder:'#D1D5DB',
};

// Pre-process custom syntax: [todo]/[doing]/[done] → HTML, @user → styled
function preProcess(md: string): string {
  return md
    .replace(/\[(todo)\]/gi, '<span class="oxm-status oxm-todo">TODO</span>')
    .replace(/\[(doing)\]/gi, '<span class="oxm-status oxm-doing">DOING</span>')
    .replace(/\[(done)\]/gi, '<span class="oxm-status oxm-done">DONE</span>')
    .replace(/@(\S+)/g, '<span class="oxm-owner">@$1</span>');
}

const previewCSS = `
.oxm-md { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1A181E; line-height: 1.7; }
.oxm-md h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; border-bottom: 2px solid #EDECEA; padding-bottom: 10px; }
.oxm-md h2 { font-size: 16px; font-weight: 700; color: #3E9E8C; margin: 22px 0 6px; padding-left: 10px; border-left: 3px solid #3E9E8C; }
.oxm-md h3 { font-size: 14px; font-weight: 600; color: #8F6BB0; margin: 16px 0 4px; }
.oxm-md h4 { font-size: 13px; font-weight: 600; color: #C08C3A; margin: 12px 0 4px; }
.oxm-md h5, .oxm-md h6 { font-size: 12px; font-weight: 600; color: #AAAABB; margin: 10px 0 2px; }
.oxm-md p { margin: 6px 0 10px; font-size: 14px; color: #3A3848; }
.oxm-md ul, .oxm-md ol { margin: 4px 0 10px; padding-left: 22px; }
.oxm-md li { font-size: 13.5px; color: #3A3848; margin-bottom: 4px; line-height: 1.55; }
.oxm-md li > p { margin: 0; }
.oxm-md li input[type=checkbox] { accent-color: #3E9E8C; width: 14px; height: 14px; margin-right: 6px; vertical-align: middle; cursor: default; }
.oxm-md li.task-list-item { list-style: none; margin-left: -18px; }
.oxm-md strong { font-weight: 700; color: #1A181E; }
.oxm-md em { font-style: italic; color: #4A4858; }
.oxm-md del { color: #AAAABB; text-decoration: line-through; }
.oxm-md code { font-family: 'SF Mono','Fira Code',monospace; font-size: 12px; background: #F0EEF6; color: #7C3AED; padding: 1px 5px; border-radius: 4px; }
.oxm-md pre { background: #1E1E2E; border-radius: 12px; padding: 16px; margin: 10px 0; overflow-x: auto; }
.oxm-md pre code { background: none; color: #CDD6F4; font-size: 12.5px; padding: 0; border-radius: 0; }
.oxm-md blockquote { margin: 10px 0; padding: 10px 16px; background: #F7F6F3; border-left: 3px solid #D1D5DB; border-radius: 0 8px 8px 0; }
.oxm-md blockquote p { margin: 0; color: #65657A; font-style: italic; }
.oxm-md table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
.oxm-md thead { background: #F5F4F1; }
.oxm-md th { font-weight: 700; color: #1A181E; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.1); text-align: left; }
.oxm-md td { padding: 7px 12px; border: 1px solid rgba(0,0,0,0.08); color: #3A3848; }
.oxm-md tr:nth-child(even) td { background: #FAFAF9; }
.oxm-md hr { border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 18px 0; }
.oxm-md a { color: #3E9E8C; text-decoration: underline; text-decoration-color: rgba(62,158,140,0.4); }
.oxm-md img { max-width: 100%; border-radius: 8px; }
.oxm-status { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; margin: 0 2px; vertical-align: middle; }
.oxm-todo  { background: rgba(170,170,187,0.15); color: #AAAABB; border: 1px solid rgba(170,170,187,0.35); }
.oxm-doing { background: rgba(85,128,192,0.12); color: #5580C0; border: 1px solid rgba(85,128,192,0.3); }
.oxm-done  { background: rgba(62,158,140,0.12); color: #3E9E8C; border: 1px solid rgba(62,158,140,0.3); }
.oxm-owner { font-weight: 600; color: #8F6BB0; font-size: 0.92em; }
`;

const components: Components = {
  // Make checkboxes read-only and styled
  input: ({ ...props }) => (
    <input {...props} readOnly style={{ pointerEvents: 'none' }} />
  ),
  // Open links in new tab safely
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  // Raw HTML for our custom oxm-status spans
  span: ({ className, children, ...props }) => (
    <span className={className} {...props}>{children}</span>
  ),
};

function Preview({ markdown }: { markdown: string }) {
  const processed = preProcess(markdown);
  return (
    <>
      <style>{previewCSS}</style>
      <div className="oxm-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[]}
          components={components}
          allowedElements={undefined}
          unwrapDisallowed={false}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </>
  );
}

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
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 20,
            border: `1px solid ${T.border}`,
            background: showPreview ? T.text : T.surface,
            color: showPreview ? '#fff' : T.textSub,
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.18s',
            WebkitTapHighlightColor: 'transparent',
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
                WebkitTapHighlightColor: 'transparent',
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
                WebkitTapHighlightColor: 'transparent',
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
                  WebkitTapHighlightColor: 'transparent',
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
