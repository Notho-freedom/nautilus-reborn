import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileCode,
  Loader2,
} from 'lucide-react';
import { fetchFileContent, formatFileSize, type GitHubContentItem, type GitHubRepo } from '@/lib/githubRepos';

interface GitHubFileViewerProps {
  repo: GitHubRepo;
  file: GitHubContentItem;
  token?: string;
  onBack: () => void;
  onNavigate?: (url: string) => void;
  onCreateTab?: (url: string, title?: string) => void;
}

export function GitHubFileViewer({ repo, file, token, onBack, onNavigate, onCreateTab }: GitHubFileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [owner, repoName] = repo.fullName.split('/');
  const fileName = file.path.split('/').pop() ?? file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const isBinary = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'svg', 'pdf', 'zip', 'tar', 'gz', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'mov', 'avi'].includes(extension);

  useEffect(() => {
    if (isBinary) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchFileContent(owner, repoName, file.path, token)
      .then(text => { if (!cancelled) setContent(text); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load file'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [owner, repoName, file.path, token, isBinary]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (file.downloadUrl) {
      const a = document.createElement('a');
      a.href = file.downloadUrl;
      a.download = fileName;
      a.click();
    }
  };

  const handleOpenOnGitHub = () => {
    if (onNavigate) onNavigate(file.htmlUrl);
    else window.open(file.htmlUrl, '_blank');
  };

  const handleOpenInTab = () => {
    if (file.downloadUrl && onCreateTab) {
      onCreateTab(file.downloadUrl, `${fileName} — ${repo.fullName}`);
    }
  };

  const lineCount = content?.split('\n').length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft size={12} />
          </button>
          <FileCode size={12} className="text-muted-foreground shrink-0" />
          <span className="flex-1 text-xs font-body text-foreground font-semibold truncate">{fileName}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-body text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          {!isBinary && content && (
            <>
              <span>•</span>
              <span>{lineCount} lines</span>
            </>
          )}
          <span>•</span>
          <span className="truncate">{file.path}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isBinary && content && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check size={9} className="text-success" /> : <ClipboardCopy size={9} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {file.downloadUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download size={9} /> Download
            </button>
          )}
          {onCreateTab && file.downloadUrl && (
            <button
              onClick={handleOpenInTab}
              className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink size={9} /> Open in Tab
            </button>
          )}
          <button
            onClick={handleOpenOnGitHub}
            className="flex items-center gap-1 px-2 h-6 rounded-md bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <ExternalLink size={9} /> GitHub
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="m-3 text-[10px] font-body text-error bg-error/10 border border-error/30 rounded-md p-2">
            {error}
          </div>
        )}

        {isBinary && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
            <FileCode size={32} className="opacity-30" />
            <span className="text-xs font-body">Binary file — preview not available</span>
            {file.downloadUrl && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-primary/15 text-[10px] font-body text-primary hover:bg-primary/25 transition-colors"
              >
                <Download size={10} /> Download file
              </button>
            )}
            {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) && file.downloadUrl && (
              <img src={file.downloadUrl} alt={fileName} className="max-w-full max-h-48 rounded-md border border-border mt-2" />
            )}
          </div>
        )}

        {!isBinary && !isLoading && !error && content !== null && (
          <div className="relative">
            <pre className="p-3 text-[10px] font-mono leading-relaxed text-foreground overflow-x-auto">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
