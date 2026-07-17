import Editor from '@monaco-editor/react';
import { Code2 } from 'lucide-react';

export default function CodeViewer({ file }) {
  if (!file) {
    return (
      <section className="grid min-h-96 place-items-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
        Select a mission file to inspect its context.
      </section>
    );
  }

  return (
    <section aria-labelledby="code-heading" className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
        <Code2 aria-hidden="true" size={16} className="text-violet-300" />
        <h2 id="code-heading" className="font-mono text-xs text-slate-300">{file.path}</h2>
        <span className="ml-auto text-xs text-slate-500">Read only</span>
      </div>
      <Editor
        height="510px"
        language={file.language}
        value={file.content}
        theme="vs-dark"
        loading={<div className="grid h-full place-items-center text-sm text-slate-400">Loading mission file…</div>}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbersMinChars: 3,
          padding: { top: 16, bottom: 16 },
          wordWrap: 'on'
        }}
      />
    </section>
  );
}
