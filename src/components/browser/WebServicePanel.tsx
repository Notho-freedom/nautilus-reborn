import { useEffect, useState } from 'react';
import { ArrowUpRight, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import type { WebServiceItem } from './DevToolsSidebar';

interface WebServicePanelProps {
  service: WebServiceItem | null;
  onOpenInTab: (url: string, label: string) => void;
  onClose: () => void;
}

export function WebServicePanel({ service, onOpenInTab, onClose }: WebServicePanelProps) {
  const [currentUrl, setCurrentUrl] = useState(service?.url ?? '');
  const [reloadKey, setReloadKey] = useState(0);
  const [input, setInput] = useState(service?.url ?? '');

  useEffect(() => {
    const next = service?.url ?? '';
    setCurrentUrl(next);
    setInput(next);
    setReloadKey(0);
  }, [service?.url]);

  if (!service) {
    return (
      <div className="flex flex-col h-full p-3">
        <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest mb-3">
          Web Panel
        </h3>
        <p className="text-xs font-body text-muted-foreground">
          Select a web service from the sidebar.
        </p>
      </div>
    );
  }

  const openInTab = () => {
    onOpenInTab(currentUrl, service.label);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
    } catch {
      // No-op if clipboard is not available.
    }
  };

  const openExternal = () => {
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const submitUrl = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input.trim());
    const next = hasProtocol ? input.trim() : `https://${input.trim()}`;
    setCurrentUrl(next);
    setReloadKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">
            {service.label}
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast"
            title="Close panel"
          >
            <X size={12} />
          </button>
        </div>

        <form onSubmit={submitUrl} className="flex items-center gap-1.5">
          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            className="flex-1 h-7 rounded-md bg-notilus-surface-1 border border-border px-2 text-[10px] font-body text-foreground outline-none focus:border-primary/40"
          />
          <button
            type="submit"
            className="h-7 px-2 rounded-md bg-notilus-surface-2 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors duration-fast"
          >
            Go
          </button>
        </form>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setReloadKey(prev => prev + 1)}
            className="h-7 px-2 rounded-md bg-notilus-surface-1 border border-border text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors duration-fast flex items-center gap-1"
            title="Reload panel"
          >
            <RefreshCw size={10} />
            Reload
          </button>
          <button
            onClick={openInTab}
            className="h-7 px-2 rounded-md notilus-gradient text-[10px] font-body text-primary-foreground flex items-center gap-1"
            title="Transfer to tab"
          >
            <ArrowUpRight size={10} />
            Open in tab
          </button>
          <button
            onClick={copyUrl}
            className="h-7 w-7 rounded-md bg-notilus-surface-1 border border-border text-muted-foreground hover:text-foreground transition-colors duration-fast flex items-center justify-center"
            title="Copy URL"
          >
            <Copy size={10} />
          </button>
          <button
            onClick={openExternal}
            className="h-7 w-7 rounded-md bg-notilus-surface-1 border border-border text-muted-foreground hover:text-foreground transition-colors duration-fast flex items-center justify-center"
            title="Open in browser"
          >
            <ExternalLink size={10} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-notilus-surface-1">
        <iframe
          key={`${currentUrl}-${reloadKey}`}
          src={currentUrl}
          title={service.label}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}

