import { GitBranch, GitCommit, Plus, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_STATUS = {
  branch: 'main',
  ahead: 2,
  behind: 0,
  staged: [
    { name: 'src/App.tsx', status: 'modified' },
    { name: 'src/index.css', status: 'modified' },
  ],
  unstaged: [
    { name: 'src/components/Header.tsx', status: 'modified' },
    { name: 'src/utils/helpers.ts', status: 'new' },
  ],
};

export function GitPanel() {
  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin">
      <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
        Git
      </h3>
      <div className="flex items-center gap-2 text-xs">
        <GitBranch size={13} className="text-primary" />
        <span className="font-mono text-foreground">{MOCK_STATUS.branch}</span>
        {MOCK_STATUS.ahead > 0 && (
          <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
            ↑{MOCK_STATUS.ahead}
          </span>
        )}
      </div>

      <FileSection title="Staged Changes" files={MOCK_STATUS.staged} color="text-green-500" />
      <FileSection title="Changes" files={MOCK_STATUS.unstaged} color="text-accent" />

      <div className="border-t border-border pt-3">
        <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Recent Commits</h4>
        <div className="space-y-1.5">
          {['feat: add AI assistant panel', 'fix: tab close behavior', 'refactor: system monitor hook'].map((msg, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <GitCommit size={11} className="text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-foreground">{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FileSection({ title, files, color }: { title: string; files: { name: string; status: string }[]; color: string }) {
  return (
    <div className="border-t border-border pt-3 space-y-1.5">
      <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{title} ({files.length})</h4>
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <FileText size={11} className={cn(color, "shrink-0")} />
          <span className="text-foreground truncate">{f.name}</span>
          <span className="text-[9px] font-mono text-muted-foreground ml-auto">{f.status[0].toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}
