import { useState, useCallback } from 'react';
import TreeTable from './components/TreeTable';
import MarkdownView from './components/MarkdownView';
import FullMindMap from './components/FullMindMap';
import StackView from './components/StackView';
import PresentationView from './components/PresentationView';
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

type DocSource = 'none' | 'template' | 'file';
interface RecentFile { name: string; ts: number; }
const RECENT_KEY = 'oxm-recent-v1';

function loadRecent(): RecentFile[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); }
  catch { return []; }
}
function addRecent(name: string) {
  const next = [{ name, ts: Date.now() }, ...loadRecent().filter(r => r.name !== name)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// IndexedDB helpers for persisting FileSystemFileHandle across sessions
const IDB_NAME  = 'oxm-db';
const IDB_STORE = 'handles';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function idbPut(name: string, handle: unknown) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, name);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
async function idbGet(name: string): Promise<any | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(name);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function pickMdFile(): Promise<{ content: string; name: string; handle?: unknown } | null> {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Markdown files', accept: { 'text/plain': ['.md'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      return { content: await file.text(), name: file.name, handle };
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
    }
  }
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { content: await file.text(), name: file.name } : null);
    };
    input.click();
  });
}

export default function App() {
  const [view,        setView]        = useState<'table' | 'markdown' | 'mindmap' | 'stack' | 'ppt'>('table');
  const [tree,        setTree]        = useState<MindNode>(() => markdownToTree(TEMPLATES[0].markdown));
  const [markdown,    setMarkdown]    = useState(TEMPLATES[0].markdown);
  const [docSource,   setDocSource]   = useState<DocSource>('none');
  const [templateIdx, setTemplateIdx] = useState(0);
  const [fileName,    setFileName]    = useState('');
  const [fileHandle,  setFileHandle]  = useState<any>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecent);
  const [showHub,     setShowHub]     = useState(false);
  const [mdPreview,   setMdPreview]   = useState(false);
  const [colorMode,   setColorMode]   = useState<'multi' | 'mono'>('multi');
  const [monoColor,   setMonoColor]   = useState(MONO_PALETTES[0].color);

  const applyMd = useCallback((md: string) => {
    setMarkdown(md);
    setTree(markdownToTree(md));
  }, []);

  const handleMarkdownChange = useCallback((md: string) => {
    setMarkdown(md);
    setTree(markdownToTree(md));
  }, []);

  const selectTemplate = (idx: number) => {
    setTemplateIdx(idx);
    setDocSource('template');
    setFileName('');
    setFileHandle(null);
    applyMd(TEMPLATES[idx].markdown);
    setShowHub(false);
  };

  const openFile = useCallback(async () => {
    const result = await pickMdFile();
    if (!result) return;
    const handle = (result as any).handle ?? null;
    setDocSource('file');
    setFileName(result.name);
    setFileHandle(handle);
    applyMd(result.content);
    addRecent(result.name);
    setRecentFiles(loadRecent());
    if (handle) void idbPut(result.name, handle);
    setShowHub(false);
  }, [applyMd]);

  const openRecentFile = useCallback(async (name: string) => {
    const handle = await idbGet(name).catch(() => null);
    if (handle) {
      try {
        const perm = await handle.queryPermission({ mode: 'read' });
        const granted = perm === 'granted'
          || (await handle.requestPermission({ mode: 'read' })) === 'granted';
        if (granted) {
          const file    = await handle.getFile();
          const content = await file.text();
          setDocSource('file');
          setFileName(name);
          setFileHandle(handle);
          applyMd(content);
          addRecent(name);
          setRecentFiles(loadRecent());
          setShowHub(false);
          return;
        }
      } catch { /* fall through to picker */ }
    }
    void openFile();
  }, [applyMd, openFile]);

  const reloadFile = useCallback(async () => {
    if (!fileHandle) return;
    const file = await fileHandle.getFile();
    applyMd(await file.text());
  }, [fileHandle, applyMd]);

  const toggleColorMode = () => setColorMode(m => m === 'multi' ? 'mono' : 'multi');

  // ── Landing screen ──────────────────────────────────────────────────────
  if (docSource === 'none') {
    return (
      <div style={{
        minHeight: '100svh', background: T.pageBg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: T.text, letterSpacing: '-1px' }}>
            OpenXmind
          </div>
          <div style={{ fontSize: 14, color: T.textSub, marginTop: 8 }}>
            把 Markdown 变成思维导图
          </div>
        </div>

        <button onClick={openFile} style={{
          width: '100%', maxWidth: 300, marginBottom: 28,
          padding: '17px 24px',
          background: T.text, color: '#fff',
          border: 'none', borderRadius: 16,
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          WebkitTapHighlightColor: 'transparent',
        }}>
          <span style={{ fontSize: 18 }}>📂</span>
          打开 .md 文件
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', maxWidth: 300, marginBottom: 16,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ fontSize: 11, color: T.textFaint, fontWeight: 600 }}>或从模板开始</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
        </div>

        <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TEMPLATES.map((tpl, idx) => (
            <button key={tpl.id} onClick={() => selectTemplate(idx)} style={{
              width: '100%', padding: '14px 18px',
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              fontSize: 14, fontWeight: 500, color: T.text,
              WebkitTapHighlightColor: 'transparent',
            }}>
              {tpl.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Main app ──────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>

      {/* ── Document hub sheet ── */}
      {showHub && (
        <div onClick={() => setShowHub(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: T.pageBg, borderRadius: '20px 20px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom, 20px)',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(0,0,0,0.18)', margin: '12px auto 20px',
            }} />

            {docSource === 'file' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 16px 16px',
              }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.textSub }}>
                  {fileName}
                </span>
                {fileHandle && (
                  <button onClick={() => { void reloadFile(); setShowHub(false); }} style={{
                    padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
                    background: T.surface, color: T.textSub,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    ↻ 重新加载
                  </button>
                )}
              </div>
            )}

            <div style={{ padding: '0 16px 16px' }}>
              <button onClick={openFile} style={{
                width: '100%', padding: '16px 18px',
                background: T.surface, border: `1.5px dashed rgba(0,0,0,0.18)`,
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontSize: 24 }}>📂</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>从 Files 选择 .md</div>
                  <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2 }}>iCloud · 本地 · 云盘</div>
                </div>
              </button>
            </div>

            {recentFiles.length > 0 && (
              <>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
                  color: T.textFaint, textTransform: 'uppercase',
                  padding: '4px 22px 10px',
                }}>最近打开</div>
                {recentFiles.map(rf => {
                  const active = docSource === 'file' && rf.name === fileName;
                  return (
                    <button key={rf.name} onClick={() => openRecentFile(rf.name)} style={{
                      display: 'flex', alignItems: 'center',
                      width: '100%', padding: '13px 22px',
                      background: active ? 'rgba(62,158,140,0.07)' : 'transparent',
                      border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}>
                      <span style={{ fontSize: 14, marginRight: 10 }}>📄</span>
                      <span style={{ flex: 1, fontSize: 14, color: T.text, textAlign: 'left' }}>
                        {rf.name}
                      </span>
                      {active && <span style={{ fontSize: 16, color: T.accent, fontWeight: 700 }}>✓</span>}
                    </button>
                  );
                })}
              </>
            )}

            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
              color: T.textFaint, textTransform: 'uppercase',
              padding: `${recentFiles.length > 0 ? 16 : 4}px 22px 10px`,
            }}>模板</div>
            {TEMPLATES.map((tpl, idx) => {
              const active = docSource === 'template' && idx === templateIdx;
              return (
                <button key={tpl.id} onClick={() => selectTemplate(idx)} style={{
                  display: 'flex', alignItems: 'center',
                  width: '100%', padding: '15px 22px',
                  background: active ? 'rgba(62,158,140,0.07)' : 'transparent',
                  border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}>
                  <span style={{
                    flex: 1, fontSize: 15,
                    fontWeight: active ? 600 : 400,
                    color: active ? T.accent : T.text,
                    letterSpacing: '-0.2px', textAlign: 'left',
                  }}>{tpl.title}</span>
                  {active && <span style={{ fontSize: 16, color: T.accent, fontWeight: 700 }}>✓</span>}
                </button>
              );
            })}
            <div style={{ height: 12 }} />
          </div>
        </div>
      )}

      {/* ── Floating bottom nav (hidden in PPT mode and MD edit mode) ── */}
      {view !== 'ppt' && !(view === 'markdown' && !mdPreview) && <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, display: 'flex', alignItems: 'center', gap: 2,
        background: T.surface, borderRadius: 24, padding: '4px 5px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        border: `1px solid ${T.border}`,
      }}>
        {([
          ['table',    '≡ 表格'],
          ['mindmap',  '◎ 脑图'],
          ['stack',    '⊞ 卡片'],
          ['ppt',      '▶ 演示'],
          ['markdown', '# MD'],
        ] as const).map(([v, label]) => {
          const active = view === v;
          return (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 16px', borderRadius: 20, border: 'none',
              background: active ? T.accent : 'transparent',
              color: active ? '#fff' : T.textSub,
              fontSize: 12.5, fontWeight: active ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.18s ease',
              WebkitTapHighlightColor: 'transparent',
            }}>
              {label}
            </button>
          );
        })}
      </div>}

      {/* ── Views ── */}
      {view === 'ppt'
        ? <PresentationView data={tree} onExit={() => setView('stack')} />
        : view === 'mindmap'
          ? <FullMindMap data={tree} />
          : view === 'stack'
            ? <StackView data={tree} />
            : (
              <div style={{ paddingBottom: 72 }}>
                {view === 'table'
                  ? <TreeTable
                      data={tree}
                      colorMode={colorMode}
                      monoColor={monoColor}
                      onToggleColorMode={toggleColorMode}
                      onSelectMonoColor={setMonoColor}
                      onOpenTemplatePicker={() => setShowHub(true)}
                    />
                  : <MarkdownView markdown={markdown} onChange={handleMarkdownChange} showPreview={mdPreview} onTogglePreview={setMdPreview} />
                }
              </div>
            )
      }
    </div>
  );
}
