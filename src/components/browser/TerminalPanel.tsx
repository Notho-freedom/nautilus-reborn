import { useEffect, useRef, useState } from 'react';
import { Monitor, Terminal } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';
import { getSettings, subscribeToSettingsUpdates } from '@/lib/settings';
import {
  closeTerminalSession,
  openTerminalSession,
  resizeTerminalSession,
  sendTerminalInput,
  subscribeTerminalData,
  subscribeTerminalExit,
} from '@/lib/terminal';
import { isDesktopRuntime } from '@/lib/electronBridge';

type XTermInstance = import('xterm').Terminal;
type FitAddonInstance = import('xterm-addon-fit').FitAddon;

interface TerminalPanelProps {
  onClose?: () => void;
}

export function TerminalPanel({ onClose }: TerminalPanelProps = {}) {
  const terminalRootRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTermInstance | null>(null);
  const fitAddonRef = useRef<FitAddonInstance | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [terminalType, setTerminalType] = useState(getSettings().terminalType);
  const [fontSize, setFontSize] = useState(getSettings().terminalFontSize);
  const [statusText, setStatusText] = useState('Idle');

  useEffect(() => {
    return subscribeToSettingsUpdates(() => {
      const settings = getSettings();
      setTerminalType(settings.terminalType);
      setFontSize(settings.terminalFontSize);
    });
  }, []);

  useEffect(() => {
    if (!isDesktopRuntime()) {
      setStatusText('Desktop mode required');
      return;
    }
    if (terminalType !== 'xterm') {
      setStatusText('Switch terminal type to Xterm in settings');
      return;
    }

    const container = terminalRootRef.current;
    if (!container) return;

    let mounted = true;
    let disposeDataListener = () => {};
    let disposeExitListener = () => {};
    let resizeObserver: ResizeObserver | null = null;
    let inputDisposable: { dispose: () => void } | null = null;
    let terminal: XTermInstance | null = null;
    let fitAddon: FitAddonInstance | null = null;

    const connect = async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit'),
      ]);
      await import('xterm/css/xterm.css');
      if (!mounted) return;

      fitAddon = new FitAddon();
      terminal = new XTerm({
        convertEol: true,
        cursorBlink: true,
        fontSize,
        fontFamily: 'Consolas, "Cascadia Mono", monospace',
        theme: {
          background: '#09090b',
          foreground: '#f4f4f5',
          cursor: '#f4f4f5',
          selectionBackground: 'rgba(255, 45, 85, 0.25)',
        },
      });
      terminal.loadAddon(fitAddon);
      terminal.open(container);
      fitAddon.fit();
      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      setStatusText('Connecting...');

      const openResult = await openTerminalSession({
        cols: Math.max(40, terminal.cols),
        rows: Math.max(10, terminal.rows),
      });
      if (!mounted || !openResult) {
        setStatusText('Failed to open terminal session');
        return;
      }
      sessionIdRef.current = openResult.sessionId;
      setStatusText('Connected');
      terminal.focus();

      disposeDataListener = subscribeTerminalData(event => {
        if (!terminal) return;
        if (event.sessionId !== sessionIdRef.current) return;
        terminal.write(event.data);
      });
      disposeExitListener = subscribeTerminalExit(event => {
        if (event.sessionId !== sessionIdRef.current) return;
        setStatusText(`Exited${event.code === null ? '' : ` (${event.code})`}`);
      });

      inputDisposable = terminal.onData(data => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) return;
        void sendTerminalInput(sessionId, data);
      });

      resizeObserver = new ResizeObserver(() => {
        if (!terminal || !fitAddon) return;
        fitAddon.fit();
        const sessionId = sessionIdRef.current;
        if (!sessionId) return;
        void resizeTerminalSession(sessionId, terminal.cols, terminal.rows);
      });
      resizeObserver.observe(container);
    };

    void connect();

    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      inputDisposable?.dispose();
      disposeDataListener();
      disposeExitListener();
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        void closeTerminalSession(sessionId);
      }
      sessionIdRef.current = null;
      terminal?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [fontSize, terminalType]);

  const isXTermReady = terminalType === 'xterm' && isDesktopRuntime();

  return (
    <SidebarPanelShell
      title="Terminal"
      icon={Terminal}
      onClose={onClose ?? (() => {})}
      menuItems={[
        {
          label: 'Clear',
          onClick: () => {
            terminalRef.current?.clear();
          },
        },
      ]}
      footer={`Mode: ${terminalType.toUpperCase()} • ${statusText}`}
    >
      {isXTermReady ? (
        <div className="flex h-full flex-col p-2">
          <div className="mb-2 flex h-8 items-center justify-between rounded-md border border-border bg-notilus-surface-1 px-2 text-[10px] text-muted-foreground">
            <span>Shell session</span>
            <span>{statusText}</span>
          </div>
          <div
            ref={terminalRootRef}
            className="h-full min-h-0 w-full overflow-hidden rounded-md border border-border bg-black/70 p-1"
          />
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
          <Monitor size={30} className="text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Terminal runtime is available in desktop mode with terminal type set to Xterm.
          </p>
        </div>
      )}
    </SidebarPanelShell>
  );
}
