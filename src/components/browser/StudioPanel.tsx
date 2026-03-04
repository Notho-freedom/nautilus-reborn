import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Code2,
  Copy,
  Image,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDesktopRuntime } from '@/lib/electronBridge';
import {
  exportRecordingAsCypress,
  exportRecordingAsPlaywright,
  STUDIO_DEVICE_PRESETS,
  studioApplyCss,
  studioCaptureFullPage,
  studioCaptureViewport,
  studioClearCss,
  studioGetRecording,
  studioResizeToPreset,
  studioRunScript,
  studioStartRecording,
  studioStopRecording,
  type StudioDevicePreset,
} from '@/lib/studio';
import type { StudioRecordedEvent } from '../../../shared/browser-contract';

const TABS = [
  { id: 'responsive', label: 'Responsive', icon: Monitor },
  { id: 'screenshot', label: 'Screenshot', icon: Camera },
  { id: 'liveedit', label: 'Live Edit', icon: Code2 },
  { id: 'recorder', label: 'Recorder', icon: Video },
  { id: 'mockup', label: 'Mockup', icon: Image },
] as const;

const DEVICE_ICONS = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
} as const;

interface StudioCaptureEntry {
  mode: 'viewport' | 'fullpage';
  filePath: string;
  capturedAt: string;
}

export function StudioPanel() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('responsive');
  const [captures, setCaptures] = useState<StudioCaptureEntry[]>([]);
  const [liveTab, setLiveTab] = useState<'css' | 'js'>('css');
  const [cssText, setCssText] = useState('body { outline: 1px solid rgba(255,45,85,0.5); }');
  const [jsText, setJsText] = useState('document.title');
  const [scriptOutput, setScriptOutput] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingEvents, setRecordingEvents] = useState<StudioRecordedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const desktopMode = isDesktopRuntime();

  useEffect(() => {
    if (!desktopMode) return;
    void studioGetRecording().then(snapshot => {
      if (!snapshot) return;
      setRecording(Boolean(snapshot.isRecording));
      setRecordingEvents(snapshot.events ?? []);
    });
  }, [desktopMode]);

  const recorderStats = useMemo(
    () => ({
      clicks: recordingEvents.filter(event => event.type === 'click').length,
      inputs: recordingEvents.filter(event => event.type === 'input').length,
      scrolls: recordingEvents.filter(event => event.type === 'scroll').length,
    }),
    [recordingEvents]
  );

  const runBusy = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard might be unavailable in some contexts.
    }
  };

  const handleCapture = async (mode: 'viewport' | 'fullpage') => {
    await runBusy(async () => {
      const result = mode === 'viewport' ? await studioCaptureViewport() : await studioCaptureFullPage();
      if (!result) return;
      setCaptures(prev => [
        {
          mode,
          filePath: result.filePath,
          capturedAt: result.capturedAt,
        },
        ...prev,
      ]);
    });
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">Studio</h3>

      <div className="flex gap-0.5 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-body transition-all duration-fast',
              activeTab === tab.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <tab.icon size={11} /> {tab.label}
          </button>
        ))}
      </div>

      {!desktopMode && (
        <div className="text-[10px] font-body text-warning bg-warning/10 border border-warning/30 rounded-md p-2">
          Studio runtime actions are available in desktop mode only.
        </div>
      )}

      {activeTab === 'responsive' && (
        <div className="space-y-2">
          <p className="text-[10px] font-body text-muted-foreground">Resize App Window</p>
          {STUDIO_DEVICE_PRESETS.map((preset: StudioDevicePreset) => {
            const Icon = DEVICE_ICONS[preset.icon];
            return (
              <button
                key={preset.id}
                disabled={!desktopMode || busy}
                onClick={() => void runBusy(async () => studioResizeToPreset(preset))}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-notilus-surface-1 border border-border text-xs font-body text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast disabled:opacity-50"
              >
                <Icon size={14} className="text-muted-foreground" />
                <span className="flex-1 text-left">{preset.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {preset.width}x{preset.height}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'screenshot' && (
        <div className="space-y-3">
          <button
            disabled={!desktopMode || busy}
            onClick={() => void handleCapture('viewport')}
            className="w-full h-9 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast disabled:opacity-50"
          >
            Capture Viewport
          </button>
          <button
            disabled={!desktopMode || busy}
            onClick={() => void handleCapture('fullpage')}
            className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-border text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast disabled:opacity-50"
          >
            Capture Full Page
          </button>
          <div className="space-y-1.5">
            {captures.map(capture => (
              <div key={`${capture.filePath}-${capture.capturedAt}`} className="p-2 rounded-md bg-notilus-surface-1 border border-border">
                <div className="text-[10px] font-body text-foreground">
                  {capture.mode === 'viewport' ? 'Viewport' : 'Full Page'}
                </div>
                <div className="text-[9px] font-body text-muted-foreground break-all">{capture.filePath}</div>
                <button
                  onClick={() => void copyText(capture.filePath)}
                  className="mt-1 text-[9px] font-body text-primary hover:text-primary/80"
                >
                  Copy path
                </button>
              </div>
            ))}
            {captures.length === 0 && (
              <p className="text-[10px] font-body text-muted-foreground text-center">No captures yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'liveedit' && (
        <div className="space-y-3">
          <div className="flex gap-1">
            <button
              onClick={() => setLiveTab('css')}
              className={cn(
                'flex-1 h-7 rounded-md text-[10px] font-display',
                liveTab === 'css'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-notilus-surface-1 text-muted-foreground hover:bg-notilus-surface-2'
              )}
            >
              CSS
            </button>
            <button
              onClick={() => setLiveTab('js')}
              className={cn(
                'flex-1 h-7 rounded-md text-[10px] font-display',
                liveTab === 'js'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-notilus-surface-1 text-muted-foreground hover:bg-notilus-surface-2'
              )}
            >
              JS
            </button>
          </div>
          {liveTab === 'css' ? (
            <>
              <textarea
                value={cssText}
                onChange={event => setCssText(event.target.value)}
                className="w-full h-32 rounded-lg bg-notilus-surface-1 border border-border p-2 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!desktopMode || busy}
                  onClick={() => void runBusy(async () => studioApplyCss(cssText))}
                  className="h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast disabled:opacity-50"
                >
                  Apply CSS
                </button>
                <button
                  disabled={!desktopMode || busy}
                  onClick={() => void runBusy(async () => studioClearCss())}
                  className="h-8 rounded-lg bg-notilus-surface-1 border border-border text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast disabled:opacity-50"
                >
                  Clear CSS
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                value={jsText}
                onChange={event => setJsText(event.target.value)}
                className="w-full h-32 rounded-lg bg-notilus-surface-1 border border-border p-2 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50"
              />
              <button
                disabled={!desktopMode || busy}
                onClick={() =>
                  void runBusy(async () => {
                    const output = await studioRunScript(jsText);
                    setScriptOutput(output);
                  })
                }
                className="w-full h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast disabled:opacity-50"
              >
                Run Script
              </button>
              <textarea
                value={scriptOutput}
                readOnly
                className="w-full h-24 rounded-lg bg-notilus-surface-1 border border-border p-2 text-[10px] font-mono text-muted-foreground outline-none resize-none"
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'recorder' && (
        <div className="space-y-3 text-center">
          <div className="flex gap-2 justify-center">
            <button
              disabled={!desktopMode || busy}
              onClick={() =>
                void runBusy(async () => {
                  if (!recording) {
                    const snapshot = await studioStartRecording();
                    setRecording(Boolean(snapshot?.isRecording));
                    setRecordingEvents(snapshot?.events ?? []);
                    return;
                  }
                  const snapshot = await studioStopRecording();
                  setRecording(Boolean(snapshot?.isRecording));
                  setRecordingEvents(snapshot?.events ?? []);
                })
              }
              className={cn(
                'h-9 px-4 rounded-lg text-xs font-display tracking-wider transition-colors duration-fast disabled:opacity-50',
                recording
                  ? 'bg-error text-primary-foreground hover:bg-error/80'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-body text-muted-foreground">
            <div className="rounded-md bg-notilus-surface-1 border border-border p-2">
              Clicks
              <div className="text-foreground">{recorderStats.clicks}</div>
            </div>
            <div className="rounded-md bg-notilus-surface-1 border border-border p-2">
              Inputs
              <div className="text-foreground">{recorderStats.inputs}</div>
            </div>
            <div className="rounded-md bg-notilus-surface-1 border border-border p-2">
              Scrolls
              <div className="text-foreground">{recorderStats.scrolls}</div>
            </div>
          </div>
          <div className="space-y-1">
            <button
              disabled={recordingEvents.length === 0}
              onClick={() => void copyText(exportRecordingAsPlaywright(recordingEvents))}
              className="w-full h-7 rounded-md bg-notilus-surface-1 border border-border text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1">
                <Copy size={10} /> Copy Playwright
              </span>
            </button>
            <button
              disabled={recordingEvents.length === 0}
              onClick={() => void copyText(exportRecordingAsCypress(recordingEvents))}
              className="w-full h-7 rounded-md bg-notilus-surface-1 border border-border text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1">
                <Copy size={10} /> Copy Cypress
              </span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'mockup' && (
        <div className="space-y-3 text-center">
          <button className="w-full h-9 rounded-lg border-2 border-dashed border-border text-xs font-body text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors duration-fast">
            Import Mockup Image
          </button>
          <div className="flex gap-2">
            <button className="flex-1 h-7 rounded-md bg-primary/15 text-primary text-[10px] font-display">
              Overlay
            </button>
            <button className="flex-1 h-7 rounded-md bg-notilus-surface-1 text-muted-foreground text-[10px] font-display hover:bg-notilus-surface-2">
              Diff
            </button>
          </div>
          <p className="text-[10px] font-body text-muted-foreground">
            Compare your implementation against design mockups
          </p>
        </div>
      )}
    </div>
  );
}
