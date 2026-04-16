import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Home,
  Layers,
  Lock,
  Monitor,
  Palette,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  Bell,
  Info,
  Globe,
  Download,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  getSettings,
  resetSettings,
  subscribeToSettingsUpdates,
  updateSettings,
  WEB_SERVICE_IDS,
  type BrowserSettings,
  type WebServiceId,
} from '@/lib/settings';
import { SidebarPanelShell } from './SidebarPanelShell';
import { PanelEmptyState } from './PanelEmptyState';
import { cn } from '@/lib/utils';
import { BrowserImportDialog } from './BrowserImportDialog';
import { isBrowserImportSupported } from '@/lib/browserImport';

const THEMES = [
  { id: 'red', name: 'Rouge Notilus', color: '#FF2D55' },
  { id: 'blue', name: 'Bleu Cyber', color: '#007AFF' },
  { id: 'green', name: 'Vert Matrix', color: '#34C759' },
  { id: 'purple', name: 'Violet Neon', color: '#5856D6' },
  { id: 'orange', name: 'Orange Fire', color: '#FF9500' },
  { id: 'pink', name: 'Rose Cyber', color: '#FF2D92' },
] as const;

const WEB_SERVICE_LABELS: Record<WebServiceId, string> = {
  youtubeMusic: 'YouTube Music',
  youtube: 'YouTube',
  chatgpt: 'ChatGPT',
  deepseek: 'DeepSeek',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

type SectionId =
  | 'appearance'
  | 'home'
  | 'tabs'
  | 'terminal'
  | 'privacy'
  | 'web-services'
  | 'ai'
  | 'general'
  | 'notifications'
  | 'about';

const NAV_SECTIONS: Array<{ id: SectionId; label: string; icon: React.ComponentType<any> }> = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'home', label: 'Home Page', icon: Home },
  { id: 'tabs', label: 'Tabs', icon: Layers },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'web-services', label: 'Web Services', icon: Globe },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'about', label: 'About', icon: Info },
];

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps = {}) {
  const [settings, setSettings] = useState<BrowserSettings>(() => getSettings());
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const desktopImportSupported = isBrowserImportSupported();

  useEffect(() => {
    setSettings(getSettings());
    return subscribeToSettingsUpdates(() => setSettings(getSettings()));
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <Section title="Appearance" icon={Palette}>
            <SettingRow label="Dark Mode" description="Enable dark theme">
              <Switch
                checked={settings.darkMode}
                onCheckedChange={checked => updateSettings({ darkMode: checked })}
              />
            </SettingRow>
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Accent Color</label>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateSettings({ accentTheme: theme.id })}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-body transition-all',
                      settings.accentTheme === theme.id
                        ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: theme.color }} />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>
        );
      case 'home':
        return (
          <Section title="Home Page" icon={Home}>
            <SelectRow label="Style" value={settings.homePageStyle} onChange={v => updateSettings({ homePageStyle: v as BrowserSettings['homePageStyle'] })}>
              <option value="modern">Modern</option>
              <option value="notilus_dev">Notilus Dev</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="devops">DevOps</option>
              <option value="data_science">Data Science</option>
              <option value="minimal">Minimal</option>
              <option value="customizable">Customizable</option>
            </SelectRow>
            <SelectRow label="Wallpaper interval" value={String(settings.wallpaperInterval)} onChange={v => updateSettings({ wallpaperInterval: Number(v) })}>
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
            </SelectRow>
          </Section>
        );
      case 'tabs':
        return (
          <Section title="Tabs" icon={Layers}>
            <SettingRow label="Restore tabs" description="Restore previous session on startup">
              <Switch checked={settings.restoreTabs} onCheckedChange={checked => updateSettings({ restoreTabs: checked })} />
            </SettingRow>
            <SelectRow label="Rendering profile" value={settings.renderingProfile} onChange={v => updateSettings({ renderingProfile: v as BrowserSettings['renderingProfile'] })}>
              <option value="flow">Flow — smooth overlays</option>
              <option value="balance">Balance — hybrid perf</option>
              <option value="isolate">Isolate — max performance</option>
            </SelectRow>
            <SelectRow label="Swap inactive tabs" value={String(settings.nativeSwapDelayMinutes)} onChange={v => updateSettings({ nativeSwapDelayMinutes: Number(v) })}>
              <option value="2">After 2 minutes</option>
              <option value="5">After 5 minutes</option>
              <option value="10">After 10 minutes</option>
            </SelectRow>
          </Section>
        );
      case 'terminal':
        return (
          <Section title="Terminal" icon={Terminal}>
            <SelectRow label="Runtime" value={settings.terminalType} onChange={v => updateSettings({ terminalType: v as BrowserSettings['terminalType'] })}>
              <option value="native">Native Terminal</option>
              <option value="xterm">XTerm.js</option>
            </SelectRow>
            <SelectRow label="Font size" value={String(settings.terminalFontSize)} onChange={v => updateSettings({ terminalFontSize: Number(v) as BrowserSettings['terminalFontSize'] })}>
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
            </SelectRow>
          </Section>
        );
      case 'privacy':
        return (
          <Section title="Privacy & Security" icon={Shield}>
            <SettingRow label="Ad blocker" description="Block ads and known popup patterns">
              <Switch checked={settings.adBlock} onCheckedChange={checked => updateSettings({ adBlock: checked })} />
            </SettingRow>
            <SettingRow label="Tracker protection" description="Block third-party trackers">
              <Switch checked={settings.trackerProtection} onCheckedChange={checked => updateSettings({ trackerProtection: checked })} />
            </SettingRow>
            <SettingRow label="Save history" description="Keep local browsing history">
              <Switch checked={settings.saveHistory} onCheckedChange={checked => updateSettings({ saveHistory: checked })} />
            </SettingRow>
            <SettingRow label="Accept cookies" description="Allow website cookies">
              <Switch checked={settings.acceptCookies} onCheckedChange={checked => updateSettings({ acceptCookies: checked })} />
            </SettingRow>
            <SettingRow label="Import browser data" description="Merge history and favorites from installed browsers">
              <button
                type="button"
                onClick={() => setImportDialogOpen(true)}
                disabled={!desktopImportSupported}
                className={cn(
                  'h-7 rounded-md px-2.5 text-[10px] font-body transition-colors inline-flex items-center gap-1.5',
                  desktopImportSupported
                    ? 'bg-muted/40 text-foreground hover:bg-muted/60'
                    : 'bg-muted/20 text-muted-foreground cursor-not-allowed'
                )}
              >
                <Download size={11} strokeWidth={1.5} />
                Import
              </button>
            </SettingRow>
          </Section>
        );
      case 'web-services':
        return (
          <Section title="Web Services" icon={Globe}>
            <div className="space-y-1">
              {WEB_SERVICE_IDS.map(serviceId => (
                <SettingRow key={serviceId} label={WEB_SERVICE_LABELS[serviceId]} description="Show in sidebar">
                  <Switch
                    checked={settings.enabledWebServices.includes(serviceId)}
                    onCheckedChange={checked =>
                      updateSettings(current => {
                        const next = new Set(current.enabledWebServices);
                        if (checked) next.add(serviceId);
                        else next.delete(serviceId);
                        return {
                          enabledWebServices:
                            next.size > 0
                              ? (Array.from(next) as BrowserSettings['enabledWebServices'])
                              : [...WEB_SERVICE_IDS],
                        };
                      })
                    }
                  />
                </SettingRow>
              ))}
            </div>
          </Section>
        );
      case 'ai':
        return (
          <Section title="AI Assistant" icon={Sparkles}>
            <SelectRow label="Model" value={settings.aiModel} onChange={v => updateSettings({ aiModel: v as BrowserSettings['aiModel'] })}>
              <option value="llama-3.3-70b">Llama 3.3 70B</option>
              <option value="mixtral-8x7b">Mixtral 8x7B</option>
              <option value="gemma-2-9b">Gemma 2 9B</option>
            </SelectRow>
          </Section>
        );
      case 'general':
        return (
          <Section title="General" icon={Settings}>
            <SelectRow label="Search engine" value={settings.searchEngine} onChange={v => updateSettings({ searchEngine: v as BrowserSettings['searchEngine'] })}>
              <option value="duckduckgo">DuckDuckGo</option>
              <option value="google">Google</option>
              <option value="brave">Brave Search</option>
            </SelectRow>
            <SettingRow label="Close panels on outside click" description="Close side panels when clicking outside them">
              <Switch checked={settings.panelCloseOnOutsideClick} onCheckedChange={checked => updateSettings({ panelCloseOnOutsideClick: checked })} />
            </SettingRow>
          </Section>
        );
      case 'notifications':
        return (
          <Section title="Notifications" icon={Bell}>
            <SettingRow label="Enable notifications" description="Show browser notifications">
              <Switch checked={settings.notificationsEnabled} onCheckedChange={checked => updateSettings({ notificationsEnabled: checked })} />
            </SettingRow>
          </Section>
        );
      case 'about':
        return (
          <Section title="About" icon={Info}>
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-4">
              <img src="/logo_n_no_bg.png" alt="Notilus" className="h-12 w-12 object-contain" />
              <div className="space-y-0.5">
                <p className="text-xs font-display tracking-wider text-foreground">NOTILUS BROWSER</p>
                <p className="text-[10px] font-body text-muted-foreground">Version 2.0.0-beta</p>
                <p className="text-[10px] font-body text-muted-foreground">Built with React + Electron</p>
                <p className="text-[10px] font-body text-primary">© 2026 Genesis Company</p>
              </div>
            </div>
          </Section>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarPanelShell
      title="Settings"
      icon={Settings}
      menuItems={[
        {
          label: 'Reset to defaults',
          onClick: () => {
            const next = resetSettings();
            setSettings(next);
          },
        },
      ]}
      onClose={onClose ?? (() => {})}
      contentClassName="p-0"
    >
      <div className="flex h-full overflow-hidden">
        {/* Left nav */}
        <nav className="w-[140px] shrink-0 py-2 overflow-y-auto no-scrollbar">
          {NAV_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-[11px] font-body transition-colors text-left',
                activeSection === section.id
                  ? 'text-primary bg-primary/10 border-r-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              <section.icon size={13} strokeWidth={1.5} />
              <span className="truncate">{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Right content — single page per tab */}
        <div className="flex-1 overflow-y-auto px-5 py-4 animate-fade-in">
          {renderSection()}
        </div>
      </div>
      <BrowserImportDialog
        open={isImportDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </SidebarPanelShell>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2">
        <Icon size={14} strokeWidth={1.5} className="text-primary" />
        <h3 className="text-xs font-display uppercase tracking-widest text-primary">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-xs font-body text-foreground">{label}</p>
        <p className="text-[10px] font-body text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-body text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-8 w-full rounded-lg bg-muted/30 px-2 text-[11px] font-body text-foreground outline-none border-0 focus:bg-muted/50 transition-colors"
      >
        {children}
      </select>
    </div>
  );
}
