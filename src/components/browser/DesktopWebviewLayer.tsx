import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { BrowserTab } from '@/hooks/useBrowserState';
import { subscribeToExtensionsUpdates } from '@/lib/extensions';
import {
  assignTabsToMosaicLeaves,
  closeMosaicTile,
  moveMosaicTile,
  resizeMosaicTiles,
  setMosaicTileContent,
  setMosaicTileTab,
  splitMosaicTile,
} from '@/lib/mosaic';
import {
  MOSAIC_TILE_LABELS,
  type DropZone,
  type MosaicState,
  type MosaicTile,
  type MosaicTileType,
} from '@/types/mosaic';
import { webSurfaceManagerApi } from '@/lib/webSurfaceManager';

interface DesktopWebviewLayerProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onCreateTab: (url: string) => void;
  zoom: number;
  studioViewport: { width: number; height: number } | null;
  mosaicState: MosaicState;
  mosaicRootTile: MosaicTile | null;
}

interface MosaicLeafFrame {
  tileId: string;
  type: MosaicTileType;
  tabId: string | null;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MosaicSplitterFrame {
  parentId: string;
  childIndex: number;
  direction: 'horizontal' | 'vertical';
  left: number;
  top: number;
  width: number;
  height: number;
}

const TILE_TYPE_OPTIONS: MosaicTileType[] = [
  'web',
  'terminal',
  'devtools',
  'backendLab',
  'studio',
  'github',
  'bookmarks',
  'history',
  'downloads',
  'settings',
  'lighthouse',
  'widgets',
  'documentation',
  'empty',
];

function collectMosaicLeafFrames(tile: MosaicTile, rect: Rect, output: MosaicLeafFrame[]) {
  if (!tile.children || tile.children.length === 0 || !tile.splitDirection) {
    output.push({
      tileId: tile.id,
      type: tile.type,
      tabId: tile.tabId,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
    return;
  }

  const totalFlex = tile.children.reduce((sum, child) => sum + Math.max(0.01, child.flexFactor || 1), 0);
  let cursor = 0;

  tile.children.forEach(child => {
    const ratio = Math.max(0.01, child.flexFactor || 1) / totalFlex;
    if (tile.splitDirection === 'horizontal') {
      const childWidth = rect.width * ratio;
      collectMosaicLeafFrames(
        child,
        {
          left: rect.left + cursor,
          top: rect.top,
          width: childWidth,
          height: rect.height,
        },
        output
      );
      cursor += childWidth;
      return;
    }

    const childHeight = rect.height * ratio;
    collectMosaicLeafFrames(
      child,
      {
        left: rect.left,
        top: rect.top + cursor,
        width: rect.width,
        height: childHeight,
      },
      output
    );
    cursor += childHeight;
  });
}

function collectMosaicSplitterFrames(tile: MosaicTile, rect: Rect, output: MosaicSplitterFrame[]) {
  if (!tile.children || tile.children.length <= 1 || !tile.splitDirection) return;

  const totalFlex = tile.children.reduce((sum, child) => sum + Math.max(0.01, child.flexFactor || 1), 0);
  let cursor = 0;

  tile.children.forEach((child, childIndex) => {
    const ratio = Math.max(0.01, child.flexFactor || 1) / totalFlex;
    if (tile.splitDirection === 'horizontal') {
      const childWidth = rect.width * ratio;
      const childRect: Rect = {
        left: rect.left + cursor,
        top: rect.top,
        width: childWidth,
        height: rect.height,
      };
      if (childIndex < tile.children!.length - 1) {
        output.push({
          parentId: tile.id,
          childIndex,
          direction: 'horizontal',
          left: childRect.left + childRect.width,
          top: rect.top,
          width: 0,
          height: rect.height,
        });
      }
      collectMosaicSplitterFrames(child, childRect, output);
      cursor += childWidth;
      return;
    }

    const childHeight = rect.height * ratio;
    const childRect: Rect = {
      left: rect.left,
      top: rect.top + cursor,
      width: rect.width,
      height: childHeight,
    };
    if (childIndex < tile.children!.length - 1) {
      output.push({
        parentId: tile.id,
        childIndex,
        direction: 'vertical',
        left: rect.left,
        top: childRect.top + childRect.height,
        width: rect.width,
        height: 0,
      });
    }
    collectMosaicSplitterFrames(child, childRect, output);
    cursor += childHeight;
  });
}

function computeDropZone(localX: number, localY: number, width: number, height: number): DropZone {
  const centerLeft = width * 0.3;
  const centerRight = width * 0.7;
  const centerTop = height * 0.3;
  const centerBottom = height * 0.7;
  if (localX >= centerLeft && localX <= centerRight && localY >= centerTop && localY <= centerBottom) {
    return 'center';
  }
  if (localX < centerLeft) return 'left';
  if (localX > centerRight) return 'right';
  if (localY < centerTop) return 'top';
  if (localY > centerBottom) return 'bottom';
  return 'center';
}

export function DesktopWebviewLayer({
  tabs,
  activeTabId,
  onCreateTab,
  zoom,
  studioViewport,
  mosaicState,
  mosaicRootTile,
}: DesktopWebviewLayerProps) {
  const externalTabs = useMemo(
    () => tabs.filter(tab => tab.kind === 'external' && tab.renderMode !== 'native'),
    [tabs]
  );
  const preferredTabIds = useMemo(() => {
    const activeIndex = externalTabs.findIndex(tab => tab.id === activeTabId);
    if (activeIndex < 0) return externalTabs.map(tab => tab.id);
    return [
      externalTabs[activeIndex],
      ...externalTabs.filter((_, index) => index !== activeIndex),
    ].map(tab => tab.id);
  }, [activeTabId, externalTabs]);

  const mosaicEnabled = Boolean(
    !studioViewport &&
      mosaicState.isActive &&
      mosaicState.isVisible &&
      mosaicRootTile
  );

  const assignedMosaicRoot = useMemo(() => {
    if (!mosaicEnabled || !mosaicRootTile) return null;
    return assignTabsToMosaicLeaves(mosaicRootTile, preferredTabIds).rootTile;
  }, [mosaicEnabled, mosaicRootTile, preferredTabIds]);

  const mosaicLeafFrames = useMemo(() => {
    if (!assignedMosaicRoot) return [] as MosaicLeafFrame[];
    const output: MosaicLeafFrame[] = [];
    collectMosaicLeafFrames(assignedMosaicRoot, { left: 0, top: 0, width: 100, height: 100 }, output);
    return output;
  }, [assignedMosaicRoot]);

  const webFramesByTabId = useMemo(() => {
    const map = new Map<string, MosaicLeafFrame>();
    for (const frame of mosaicLeafFrames) {
      if (frame.type !== 'web' || !frame.tabId || map.has(frame.tabId)) continue;
      map.set(frame.tabId, frame);
    }
    return map;
  }, [mosaicLeafFrames]);

  const nonWebFrames = useMemo(
    () => mosaicLeafFrames.filter(frame => frame.type !== 'web'),
    [mosaicLeafFrames]
  );
  const mosaicSplitters = useMemo(() => {
    if (!assignedMosaicRoot) return [] as MosaicSplitterFrame[];
    const output: MosaicSplitterFrame[] = [];
    collectMosaicSplitterFrames(assignedMosaicRoot, { left: 0, top: 0, width: 100, height: 100 }, output);
    return output;
  }, [assignedMosaicRoot]);

  const layerRef = useRef<HTMLDivElement | null>(null);
  const [extensionsRevision, setExtensionsRevision] = useState(0);
  const [dragSourceTileId, setDragSourceTileId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ tileId: string; zone: DropZone } | null>(null);

  const handleSetTileType = useCallback(
    (tileId: string, nextType: MosaicTileType, currentTabId: string | null) => {
      if (nextType === 'web') {
        setMosaicTileContent(tileId, 'web', { tabId: currentTabId ?? preferredTabIds[0] ?? null });
        return;
      }
      setMosaicTileContent(tileId, nextType, { tabId: null, serviceId: null });
    },
    [preferredTabIds]
  );

  const beginSplitterResize = useCallback((splitter: MosaicSplitterFrame, event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const host = layerRef.current;
    if (!host) return;
    const hostSize = splitter.direction === 'horizontal' ? host.clientWidth : host.clientHeight;
    if (!hostSize || hostSize <= 0) return;

    const startPos = splitter.direction === 'horizontal' ? event.clientX : event.clientY;
    let lastDelta = 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const cursor = splitter.direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = (cursor - startPos) / hostSize;
      const incremental = delta - lastDelta;
      if (incremental === 0) return;
      resizeMosaicTiles(splitter.parentId, splitter.childIndex, incremental);
      lastDelta = delta;
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.body.style.cursor = splitter.direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleTileDragStart = useCallback((tileId: string, event: ReactDragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tileId);
    setDragSourceTileId(tileId);
    setDragTarget(null);
  }, []);

  const handleTileDragEnd = useCallback(() => {
    setDragSourceTileId(null);
    setDragTarget(null);
  }, []);

  const handleTileDragOver = useCallback(
    (tileId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (!dragSourceTileId || dragSourceTileId === tileId) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const zone = computeDropZone(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height
      );
      setDragTarget({ tileId, zone });
      event.dataTransfer.dropEffect = 'move';
    },
    [dragSourceTileId]
  );

  const handleTileDrop = useCallback(
    (tileId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (!dragSourceTileId || dragSourceTileId === tileId) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const zone =
        dragTarget?.tileId === tileId
          ? dragTarget.zone
          : computeDropZone(
              event.clientX - rect.left,
              event.clientY - rect.top,
              rect.width,
              rect.height
            );
      moveMosaicTile(dragSourceTileId, tileId, zone);
      setDragSourceTileId(null);
      setDragTarget(null);
    },
    [dragSourceTileId, dragTarget]
  );

  useEffect(() => subscribeToExtensionsUpdates(() => setExtensionsRevision(prev => prev + 1)), []);

  useEffect(() => {
    webSurfaceManagerApi.setOnCreateTab(onCreateTab);
    return () => {
      webSurfaceManagerApi.setOnCreateTab(null);
    };
  }, [onCreateTab]);

  useEffect(() => {
    webSurfaceManagerApi.syncTabs(tabs, activeTabId, zoom);
  }, [tabs, activeTabId, zoom]);

  useEffect(() => {
    webSurfaceManagerApi.setZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    if (extensionsRevision === 0) return;
    webSurfaceManagerApi.refreshExtensions(activeTabId);
  }, [extensionsRevision, activeTabId]);

  return (
    <div
      ref={layerRef}
      data-testid="desktop-webview-layer"
      className="absolute inset-0"
      style={
        studioViewport
          ? {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
            }
          : undefined
      }
    >
      {externalTabs.map(tab => {
        const frame = mosaicEnabled ? webFramesByTabId.get(tab.id) : null;
        const shouldShow = studioViewport
          ? tab.id === activeTabId
          : mosaicEnabled
            ? Boolean(frame)
            : tab.id === activeTabId;

        const paneStyle: CSSProperties = studioViewport
          ? {
              position: 'relative',
              height: `${studioViewport.height}px`,
              width: `${studioViewport.width}px`,
              maxHeight: '100%',
              maxWidth: '100%',
            }
          : mosaicEnabled && frame
            ? {
                position: 'absolute',
                left: `${frame.left}%`,
                top: `${frame.top}%`,
                width: `${frame.width}%`,
                height: `${frame.height}%`,
              }
            : {
                position: 'absolute',
                inset: 0,
              };

        const paneClasses = [
          'transition-opacity',
          'duration-200',
          studioViewport || mosaicEnabled ? 'rounded-lg border border-border/35 overflow-hidden' : 'rounded-none',
        ].join(' ');

        return (
          <div
            key={tab.id}
            ref={element => webSurfaceManagerApi.registerTabContainer(tab.id, element)}
            className={paneClasses}
            style={{
              visibility: shouldShow ? 'visible' : 'hidden',
              pointerEvents: shouldShow ? 'auto' : 'none',
              ...paneStyle,
            }}
            data-tab-id={tab.id}
            data-active={tab.id === activeTabId ? 'true' : 'false'}
            data-visible={shouldShow ? 'true' : 'false'}
            data-testid={`desktop-webview-${tab.id}`}
          />
        );
      })}

      {mosaicEnabled &&
        nonWebFrames.map(frame => (
          <div
            key={frame.tileId}
            className="absolute rounded-lg border border-border/35 bg-card/80 backdrop-blur-sm"
            style={{
              left: `${frame.left}%`,
              top: `${frame.top}%`,
              width: `${frame.width}%`,
              height: `${frame.height}%`,
            }}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-lg">
              <div className="flex items-center justify-between border-b border-border/30 bg-secondary/35 px-2 py-1">
                <span
                  draggable
                  onDragStart={event => handleTileDragStart(frame.tileId, event)}
                  onDragEnd={handleTileDragEnd}
                  className="cursor-grab truncate text-[10px] font-display uppercase tracking-wider text-foreground"
                >
                  {MOSAIC_TILE_LABELS[frame.type]}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => splitMosaicTile(frame.tileId, 'horizontal')}
                    className="rounded border border-border/30 px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Split horizontal"
                  >
                    H
                  </button>
                  <button
                    type="button"
                    onClick={() => splitMosaicTile(frame.tileId, 'vertical')}
                    className="rounded border border-border/30 px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Split vertical"
                  >
                    V
                  </button>
                  <button
                    type="button"
                    onClick={() => closeMosaicTile(frame.tileId)}
                    className="rounded border border-border/30 px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Close tile"
                  >
                    X
                  </button>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center p-2 text-center">
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Tile {MOSAIC_TILE_LABELS[frame.type]}</p>
                  <select
                    value={frame.type}
                    onChange={event =>
                      handleSetTileType(frame.tileId, event.target.value as MosaicTileType, frame.tabId)
                    }
                    className="h-7 min-w-[150px] rounded border border-border/35 bg-background/40 px-2 text-[10px] text-foreground outline-none"
                  >
                    {TILE_TYPE_OPTIONS.map(option => (
                      <option key={`${frame.tileId}-${option}`} value={option}>
                        {MOSAIC_TILE_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}

      {mosaicEnabled &&
        mosaicLeafFrames
          .filter(frame => frame.type === 'web')
          .map(frame => (
            <div
              key={`${frame.tileId}-chrome`}
              className="pointer-events-none absolute"
              style={{
                left: `${frame.left}%`,
                top: `${frame.top}%`,
                width: `${frame.width}%`,
                height: `${frame.height}%`,
              }}
            >
              <div className="pointer-events-auto m-1 rounded border border-border/35 bg-background/70 px-1 py-1 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    draggable
                    onDragStart={event => handleTileDragStart(frame.tileId, event)}
                    onDragEnd={handleTileDragEnd}
                    className="h-6 rounded border border-border/30 px-1 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Drag tile"
                  >
                    ⇅
                  </button>
                  <select
                    value={frame.type}
                    onChange={event =>
                      handleSetTileType(frame.tileId, event.target.value as MosaicTileType, frame.tabId)
                    }
                    className="h-6 max-w-[120px] rounded border border-border/35 bg-background/40 px-1 text-[9px] text-foreground outline-none"
                    title="Type"
                  >
                    {TILE_TYPE_OPTIONS.map(option => (
                      <option key={`${frame.tileId}-web-${option}`} value={option}>
                        {MOSAIC_TILE_LABELS[option]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={frame.tabId ?? ''}
                    onChange={event => {
                      const nextTabId = event.target.value;
                      if (!nextTabId) return;
                      setMosaicTileTab(frame.tileId, nextTabId);
                    }}
                    className="h-6 min-w-[120px] flex-1 rounded border border-border/35 bg-background/40 px-1 text-[9px] text-foreground outline-none"
                    title="Tab"
                  >
                    {externalTabs.length === 0 ? <option value="">Aucun onglet</option> : null}
                    {externalTabs.map(tab => (
                      <option key={`${frame.tileId}-tab-${tab.id}`} value={tab.id}>
                        {tab.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => splitMosaicTile(frame.tileId, 'horizontal')}
                    className="h-6 rounded border border-border/30 px-1 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Split horizontal"
                  >
                    H
                  </button>
                  <button
                    type="button"
                    onClick={() => splitMosaicTile(frame.tileId, 'vertical')}
                    className="h-6 rounded border border-border/30 px-1 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Split vertical"
                  >
                    V
                  </button>
                  <button
                    type="button"
                    onClick={() => closeMosaicTile(frame.tileId)}
                    className="h-6 rounded border border-border/30 px-1 text-[9px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    title="Close tile"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))}

      {mosaicEnabled &&
        dragSourceTileId &&
        mosaicLeafFrames.map(frame => {
          if (frame.tileId === dragSourceTileId) return null;
          const activeZone = dragTarget?.tileId === frame.tileId ? dragTarget.zone : null;
          return (
            <div
              key={`${frame.tileId}-drop-zone`}
              className="absolute z-50"
              style={{
                left: `${frame.left}%`,
                top: `${frame.top}%`,
                width: `${frame.width}%`,
                height: `${frame.height}%`,
              }}
              onDragOver={event => handleTileDragOver(frame.tileId, event)}
              onDrop={event => handleTileDrop(frame.tileId, event)}
              onDragLeave={() => {
                if (dragTarget?.tileId === frame.tileId) {
                  setDragTarget(null);
                }
              }}
            >
              {activeZone ? (
                <div
                  className="absolute border border-primary/70 bg-primary/15"
                  style={
                    activeZone === 'left'
                      ? { left: 0, top: 0, bottom: 0, width: '40%' }
                      : activeZone === 'right'
                        ? { right: 0, top: 0, bottom: 0, width: '40%' }
                        : activeZone === 'top'
                          ? { left: 0, top: 0, right: 0, height: '40%' }
                          : activeZone === 'bottom'
                            ? { left: 0, bottom: 0, right: 0, height: '40%' }
                            : { left: '30%', top: '30%', width: '40%', height: '40%' }
                  }
                />
              ) : null}
            </div>
          );
        })}

      {mosaicEnabled &&
        mosaicSplitters.map(splitter => (
          <div
            key={`${splitter.parentId}-${splitter.childIndex}-${splitter.direction}`}
            onMouseDown={event => beginSplitterResize(splitter, event)}
            className="absolute z-40 bg-transparent hover:bg-primary/20"
            style={
              splitter.direction === 'horizontal'
                ? {
                    left: `calc(${splitter.left}% - 3px)`,
                    top: `${splitter.top}%`,
                    width: '6px',
                    height: `${splitter.height}%`,
                    cursor: 'col-resize',
                  }
                : {
                    left: `${splitter.left}%`,
                    top: `calc(${splitter.top}% - 3px)`,
                    width: `${splitter.width}%`,
                    height: '6px',
                    cursor: 'row-resize',
                  }
            }
          />
        ))}
    </div>
  );
}
