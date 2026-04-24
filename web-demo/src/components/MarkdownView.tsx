import React, { useState } from 'react';

const T = {
  pageBg:    '#EDECEA',
  surface:   '#FFFFFF',
  border:    'rgba(0,0,0,0.09)',
  text:      '#1A181E',
  textSub:   '#65657A',
  textFaint: '#AAAABB',
  h1:        '#1A181E',
  h2:        '#3E9E8C',
  h3:        '#8F6BB0',
  h4:        '#C08C3A',
  todo:      '#AAAABB',
  doing:     '#5580C0',
  done:      '#3E9E8C',
};

interface Token {
  type: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6'|'li'|'blank'|'text';
  raw: string;
  content: string;
}

function tokenize(md: string): Token[] {
  return md.split('\n').map(raw => {
    const line = raw.trimEnd();
    const hm = line.match(/^(#{1,6})\s+(.*)/);
    if (hm) return { type: `h${hm[1].length}` as Token['type'], raw, content: hm[2] };
    const lm = line.match(/^[-*+]\s+(.*)/);
    if (lm) return { type: 'li', raw, content: lm[1] };
    if (!line.trim()) return { type: 'blank', raw, content: '' };
    return { type: 'text', raw, content: line };
  });
}

// Render a content string with inline status/owner highlights
function InlineContent({ text }: { text: string }) {
  // Split into segments: [status], @owner, and plain text
  const parts: React.ReactNode[] = [];
  let key = 0;

  const statusRe = /\[(todo|doing|done)\]/gi;
  const ownerRe  = /@(\S+)/g;

  // Annotate all match positions in order
  type Span = { start: number; end: number; node: React.ReactNode };
  const spans: Span[] = [];

  let m: RegExpExecArray | null;
  statusRe.lastIndex = 0;
  while ((m = statusRe.exec(text)) !== null) {
    const s = m[1].toLowerCase() as 'todo'|'doing'|'done';
    const color = T[s];
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <span key={key++} style={{
          display: 'inline-block',
          padding: '1px 6px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.3px',
          background: color + '18',
          color,
          border: `1px solid ${color}40`,
          margin: '0 2px',
        }}>
          {m[0]}
        </span>
      ),
    });
  }

  ownerRe.lastIndex = 0;
  while ((m = ownerRe.exec(text)) !== null) {
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      node: (
        <span key={key++} style={{
          fontWeight: 600,
          color: '#8F6BB0',
          fontSize: '0.92em',
        }}>
          {m[0]}
        </span>
      ),
    });
  }

  spans.sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push(text.slice(cursor, span.start));
    }
    parts.push(span.node);
    cursor = span.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}

function HeadingLine({ type, content }: { type: Token['type']; content: string }) {
  const cfg: Record<string, { size: number; weight: number; color: string; indent: number; borderLeft?: string }> = {
    h1: { size: 22, weight: 800, color: T.h1, indent: 0 },
    h2: { size: 15, weight: 700, color: T.h2, indent: 0, borderLeft: `3px solid ${T.h2}` },
    h3: { size: 13, weight: 600, color: T.h3, indent: 16 },
    h4: { size: 12, weight: 500, color: T.h4, indent: 28 },
    h5: { size: 11.5, weight: 500, color: T.textSub, indent: 36 },
    h6: { size: 11, weight: 400, color: T.textFaint, indent: 44 },
  };
  const c = cfg[type] ?? cfg.h6;
  const hashes = '#'.repeat(parseInt(type[1]));

  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginLeft: c.indent,
      paddingLeft: c.borderLeft ? 10 : 0,
      borderLeft: c.borderLeft,
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

interface Props {
  markdown: string;
}

const MarkdownView: React.FC<Props> = ({ markdown }) => {
  const [copied, setCopied] = useState(false);
  const tokens = tokenize(markdown);

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
              树状表格与 Markdown 完美映射
            </div>
          </div>
          <button
            onClick={handleCopy}
            style={{
              marginTop: 2,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: copied ? '#3E9E8C18' : T.surface,
              color: copied ? '#3E9E8C' : T.textSub,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            {copied ? '✓ 已复制' : '复制'}
          </button>
        </div>

        {/* Markdown render */}
        <div style={{
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
          background: T.surface,
          padding: '20px 20px 24px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {tokens.map((tok, i) => {
              if (tok.type === 'blank') {
                // Varying blank space by context: after h1/h2 more space
                const prev = tokens[i - 1];
                const isAfterMajor = prev && (prev.type === 'h1' || prev.type === 'h2');
                return <div key={i} style={{ height: isAfterMajor ? 14 : 6 }} />;
              }
              if (tok.type === 'li') return <ListLine key={i} content={tok.content} />;
              if (tok.type.startsWith('h')) {
                // Extra spacing before h2 sections (not the first)
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
              return (
                <span key={i} style={{ fontSize: 12, color: T.textSub }}>
                  {tok.content}
                </span>
              );
            })}
          </div>
        </div>

        {/* Raw markdown block */}
        <div style={{
          marginTop: 16,
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          background: '#F7F6F3',
        }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${T.border}`,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '1.2px',
            color: T.textFaint,
            textTransform: 'uppercase',
          }}>
            Raw Markdown
          </div>
          <pre style={{
            margin: 0,
            padding: '14px 16px',
            fontSize: 11,
            lineHeight: 1.75,
            color: T.textSub,
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}>
            {markdown}
          </pre>
        </div>

        <div style={{ marginTop: 14, padding: '0 2px' }}>
          <span style={{ fontSize: 10.5, color: T.textFaint }}>
            # = 根节点 · ## = 一级 · ### = 二级 · - = 叶子节点
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownView;
