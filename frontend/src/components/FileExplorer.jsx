import { ChevronRight, FileCode2, FolderOpen } from 'lucide-react';

function fileLabel(path) {
  return path.split('/').at(-1);
}

export default function FileExplorer({ files, selectedFilePath, onSelect }) {
  return (
    <section aria-labelledby="files-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 id="files-heading" className="flex items-center gap-2 px-2 text-sm font-semibold text-white"><FolderOpen aria-hidden="true" size={17} className="text-cyan-300" />Mission files</h2>
      <nav aria-label="Mission code files" className="mt-4 space-y-1">
        {files.map((file) => {
          const [folder] = file.path.split('/');
          const isSelected = file.path === selectedFilePath;
          return (
            <button
              key={file.path}
              type="button"
              onClick={() => onSelect(file.path)}
              aria-current={isSelected ? 'page' : undefined}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${isSelected ? 'bg-cyan-300/15 text-cyan-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <ChevronRight aria-hidden="true" size={14} className={isSelected ? 'text-cyan-300' : 'text-slate-600'} />
              <FileCode2 aria-hidden="true" size={15} className="shrink-0 text-violet-300" />
              <span className="min-w-0 truncate"><span className="text-slate-500">{folder}/</span>{fileLabel(file.path)}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
