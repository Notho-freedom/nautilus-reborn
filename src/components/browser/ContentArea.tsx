import { SpeedDial } from './SpeedDial';
import { DesktopWebviewLayer } from './DesktopWebviewLayer';
import type { BrowserTab } from '@/hooks/useBrowserState';
import type { MosaicLayoutId } from '@/lib/mosaic';

interface ContentAreaProps {
  url: string;
  onNavigate: (url: string) => void;
  isDesktopMode: boolean;
  tabs: BrowserTab[];
  activeTabId: string;
  onCreateTab: (url: string) => void;
  zoom: number;
  studioViewport: { width: number; height: number } | null;
  mosaicLayout: MosaicLayoutId;
}

export function ContentArea({
  url,
  onNavigate,
  isDesktopMode,
  tabs,
  activeTabId,
  onCreateTab,
  zoom,
  studioViewport,
  mosaicLayout,
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
          zoom={zoom}
          studioViewport={studioViewport}
          mosaicLayout={mosaicLayout}
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
