import { SpeedDial } from './SpeedDial';
import { DesktopWebviewLayer } from './DesktopWebviewLayer';
import type { BrowserTab } from '@/hooks/useBrowserState';

interface ContentAreaProps {
  url: string;
  onNavigate: (url: string) => void;
  isDesktopMode: boolean;
  tabs: BrowserTab[];
  activeTabId: string;
  onCreateTab: (url: string) => void;
}

export function ContentArea({
  url,
  onNavigate,
  isDesktopMode,
  tabs,
  activeTabId,
  onCreateTab,
}: ContentAreaProps) {
  const isInternalPage = url.startsWith('notilus://');

  if (isInternalPage || !url || url === 'notilus://speed-dial') {
    return <SpeedDial onNavigate={onNavigate} />;
  }

  if (isDesktopMode) {
    return (
      <div className="flex-1 relative">
        <DesktopWebviewLayer
          tabs={tabs}
          activeTabId={activeTabId}
          onCreateTab={onCreateTab}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <iframe
        src={url}
        title="Web content"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
