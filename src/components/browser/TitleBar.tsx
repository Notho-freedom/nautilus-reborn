import { useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import {
  desktopCloseWindow,
  desktopGetWindowState,
  desktopMinimizeWindow,
  desktopToggleMaximizeWindow,
  isDesktopRuntime,
  onDesktopWindowStateChanged,
} from '@/lib/electronBridge';

export function TitleBar() {
  const desktopMode = isDesktopRuntime();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!desktopMode) return;

    let mounted = true;
    void desktopGetWindowState().then(state => {
      if (!mounted || !state) return;
      setIsMaximized(state.isMaximized);
    });

    const unsubscribe = onDesktopWindowStateChanged(state => {
      if (!mounted) return;
      setIsMaximized(state.isMaximized);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [desktopMode]);

  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;
  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;

  return (
    <div
      className="flex items-center justify-between h-8 bg-background border-b border-border px-3 select-none shrink-0"
      style={dragStyle}
      onDoubleClick={() => {
        if (!desktopMode) return;
        void desktopToggleMaximizeWindow();
      }}
    >
      <div className="flex items-center gap-2">
        <img
          src="/notilus-logo.png"
          alt="Notilus"
          className="w-5 h-5 object-contain"
          style={noDragStyle}
        />
        <span className="text-xs font-display text-muted-foreground tracking-wider">NOTILUS</span>
        <span className="text-[9px] font-body text-muted-foreground/50">v2.0</span>
      </div>
      <div className="flex items-center">
        <button
          style={noDragStyle}
          onClick={() => {
            if (desktopMode) {
              void desktopMinimizeWindow();
            }
          }}
          className="h-8 w-10 flex items-center justify-center hover:bg-muted transition-colors duration-fast"
        >
          <Minus size={14} className="text-muted-foreground" />
        </button>
        <button
          style={noDragStyle}
          onClick={() => {
            if (desktopMode) {
              void desktopToggleMaximizeWindow();
            }
          }}
          className="h-8 w-10 flex items-center justify-center hover:bg-muted transition-colors duration-fast"
        >
          {isMaximized ? (
            <Copy size={11} className="text-muted-foreground" />
          ) : (
            <Square size={11} className="text-muted-foreground" />
          )}
        </button>
        <button
          style={noDragStyle}
          onClick={() => {
            if (desktopMode) {
              void desktopCloseWindow();
            }
          }}
          className="h-8 w-10 flex items-center justify-center hover:bg-destructive transition-colors duration-fast group"
        >
          <X size={14} className="text-muted-foreground group-hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
}
