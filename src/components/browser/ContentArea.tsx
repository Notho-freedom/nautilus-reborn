import { SpeedDial } from './SpeedDial';
import { DesktopWebviewLayer } from './DesktopWebviewLayer';
import type { BrowserTab } from '@/hooks/useBrowserState';
import type { MosaicState, MosaicTile } from '@/types/mosaic';

interface ContentAreaProps {
  url: string;
  onNavigate: (url: string) => void;
  isDesktopMode: boolean;
  tabs: BrowserTab[];
  activeTabId: string;
  onSwitchToTab?: (tabId: string) => void;
  onCreateTab: (url: string) => void;
  zoom: number;
  studioViewport: { width: number; height: number } | null;
  mosaicState: MosaicState;
  mosaicRootTile: MosaicTile | null;
}

export function ContentArea({
  url,
  onNavigate,
  isDesktopMode,
  tabs,
  activeTabId,
  onSwitchToTab,
  onCreateTab,
  zoom,
  studioViewport,
  mosaicState,
  mosaicRootTile,
}: ContentAreaProps) {
  const isInternalPage = url.startsWith('notilus://');

  if (isInternalPage || !url || url === 'notilus://speed-dial') {
    return <SpeedDial onNavigate={onNavigate} openTabs={tabs} activeTabId={activeTabId} onSwitchToTab={onSwitchToTab} />;
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
          mosaicState={mosaicState}
          mosaicRootTile={mosaicRootTile}
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
