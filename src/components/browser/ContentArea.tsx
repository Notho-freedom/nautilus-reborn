import { SpeedDial } from './SpeedDial';
import type { RefObject } from 'react';

interface ContentAreaProps {
  url: string;
  onNavigate: (url: string) => void;
  isDesktopMode: boolean;
  viewportRef: RefObject<HTMLDivElement>;
}

export function ContentArea({ url, onNavigate, isDesktopMode, viewportRef }: ContentAreaProps) {
  const isInternalPage = url.startsWith('notilus://');

  if (isInternalPage || !url || url === 'notilus://speed-dial') {
    return <SpeedDial onNavigate={onNavigate} />;
  }

  if (isDesktopMode) {
    return (
      <div className="flex-1 relative">
        <div
          ref={viewportRef}
          data-testid="electron-viewport"
          className="absolute inset-0 bg-black"
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
