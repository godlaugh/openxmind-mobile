import React, { useState } from 'react';

const T = {
  pageBg:    '#EDECEA',
  surface:   '#FFFFFF',
  surfaceAlt:'#F7F6F3',
  border:    'rgba(0,0,0,0.09)',
  borderFocus:'#3E9E8C',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
  h2:        '#3E9E8C',
  h3:        '#8F6BB0',
  h4:        '#C08C3A',
  todo:      '#AAAABB',
  doing:     '#5580C0',
  done:      '#3E9E8C',
};

interface Token {
  type: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'li'|'blank'|'text';
  content: string;
}

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
    const color = T[s];
    spans.push({
      start: m.index, end: m.index + m[0].length,
      node: (
        <span key={key++} style={{
          display: 'inline-block', padding: '1px 6px', borderRadius: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
          background: color + '18', color, border: `1px solid ${color}40`, margin: '0 2px',
        }}>{m[0]}</span>
      ),
    });
  }
  ownerRe.lastIndex = 0;
  while ((m = ownerRe.exec(text)) !== null) {
    spans.push({
      start: m.index, end: m.index + m[0].length,
      node: <span key={key++} style={{ fontWeight: 600, color: '#8F6BB0', fontSize: '0.92em' }}>{m[0]}</span>,
    });
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

function HeadingLine({ type, content }: { type: Token['type']; content: string }) {
  const cfg: Record<string, { size: number; weight: number; color: string; indent: number; borderLeft?: string }> = {
    h1: { size: 22, weight: 800, color: T.text,    indent: 0 },
    h2: { size: 15, weight: 700, color: T.h2,      indent: 0,  borderLeft: `3px solid ${T.h2}` },
    h3: { size: 13, weight: 600, color: T.h3,      indent: 16 },
    h4: { size: 12, weight: 500, color: T.h4,      indent: 28 },
    h5: { size: 11.5,weight:500, color: T.textSub, indent: 36 },
    h6: { size: 11, weight: 400, color: T.textFaint,indent:44 },
  };
  const c = cfg[type] ?? cfg.h6;
  const hashes = '#'.repeat(parseInt(type[1]));
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 6,
      marginLeft: c.indent, paddingLeft: c.borderLeft ? 10 : 0, borderLeft: c.borderLeft,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: c.color + '70', flexShrink: 0, fontFamily: 'monospace' }}>
        {hashes}
      </span>
      <span style={{ fontSize: c.size, fontWeight: c.weight, color: c.color, lineHeight: 1.35 }}>
        <InlineContent text={content} />
      </span>
    </div>
  );
}

function ListLine({ content }: { content: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginLeft: 44 }}>
      <span style={{ fontSize: 11, color: T.textFaint, flexShrink: 0, fontFamily: 'monospace' }}>-</span>
      <span style={{ fontSize: 11.5, color: T.textSub, lineHeight: 1.4 }}>
        <InlineContent text={content} />
      </span>
    </div>
  );
}

function Preview({ markdown }: { markdown: string }) {
  const tokens = tokenize(markdown);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {tokens.map((tok, i) => {
        if (tok.type === 'blank') {
          const prev = tokens[i - 1];
          const isAfterMajor = prev && (prev.type === 'h1' || prev.type === 'h2');
          return <div key={i} style={{ height: isAfterMajor ? 14 : 6 }} />;
        }
        if (tok.type === 'li') return <ListLine key={i} content={tok.content} />;
        if (tok.type.startsWith('h')) {
          const prev = tokens.slice(0, i).reverse().find(t => t.type !== 'blank');
          const spacer = tok.type === 'h2' && prev && prev.type !== 'h1'
            ? <div key={`sp-${i}`} style={{ height: 20 }} /> : null;
          return (
            <React.Fragment key={i}>
              {spacer}
              <HeadingLine type={tok.type} content={tok.content} />
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
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', padding: '24px 8px 60px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ padding: '0 2px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.4px',
              color: T.textFaint, textTransform: 'uppercase', marginBottom: 7,
            }}>
              OpenXmind · Markdown
            </div>
            <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.5 }}>
              输入 Markdown，实时生成树状表格
            </div>
          </div>
          <button
            onClick={handleCopy}
            style={{
              marginTop: 2, padding: '6px 14px', borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: copied ? '#3E9E8C18' : T.surface,
              color: copied ? '#3E9E8C' : T.textSub,
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            {copied ? '✓ 已复制' : '复制'}
          </button>
        </div>

        {/* ── Editable input ── */}
        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${focused ? T.borderFocus : T.border}`,
          boxShadow: focused
            ? `0 0 0 3px ${T.borderFocus}22, 0 2px 12px rgba(0,0,0,0.06)`
            : '0 2px 8px rgba(0,0,0,0.05)',
          background: T.surfaceAlt,
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}>
          <div style={{
            padding: '9px 14px', borderBottom: `1px solid ${T.border}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
            color: T.textFaint, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Markdown 输入</span>
            <span style={{ fontWeight: 400, letterSpacing: 0, fontSize: 10, textTransform: 'none' }}>
              可直接粘贴
            </span>
          </div>
          <textarea
            value={markdown}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            style={{
              display: 'block', width: '100%',
              minHeight: 200, maxHeight: 400,
              margin: 0, padding: '14px 16px',
              border: 'none', outline: 'none', resize: 'vertical',
              background: 'transparent',
              fontSize: 11, lineHeight: 1.75, color: T.textSub,
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              overflowY: 'auto',
            }}
          />
        </div>

        {/* ── Live preview ── */}
        <div style={{
          marginTop: 14, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
          background: T.surface,
        }}>
          <div style={{
            padding: '9px 14px', borderBottom: `1px solid ${T.border}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
            color: T.textFaint, textTransform: 'uppercase',
          }}>
            预览
          </div>
          <div style={{ padding: '18px 20px 22px' }}>
            <Preview markdown={markdown} />
          </div>
        </div>

        <div style={{ marginTop: 12, padding: '0 2px' }}>
          <span style={{ fontSize: 10.5, color: T.textFaint }}>
            # 根节点 · ## 一级 · ### 二级 · - 叶子 · [done/doing/todo] @负责人
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownView;
