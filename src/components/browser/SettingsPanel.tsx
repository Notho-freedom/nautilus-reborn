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
  const scrollRef = useRef<HTMLDivElement>(null);
  const desktopImportSupported = isBrowserImportSupported();

  useEffect(() => {
    setSettings(getSettings());
    return subscribeToSettingsUpdates(() => setSettings(getSettings()));
  }, []);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = scrollRef.current?.querySelector(`[data-section="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <nav className="w-[120px] shrink-0 border-r border-border/40 py-2 overflow-y-auto no-scrollbar">
          {NAV_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-body transition-colors text-left',
                activeSection === section.id
                  ? 'text-primary bg-primary/10 border-r-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              <section.icon size={12} />
              <span className="truncate">{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Right content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Appearance */}
          <Section id="appearance" title="Appearance" icon={Palette}>
            <SettingRow label="Dark Mode" description="Enable dark theme">
              <Switch
                checked={settings.darkMode}
                onCheckedChange={checked => updateSettings({ darkMode: checked })}
              />
            </SettingRow>
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Accent Color</label>
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateSettings({ accentTheme: theme.id })}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-body transition-all',
                      settings.accentTheme === theme.id
                        ? 'bg-primary/15 text-foreground ring-1 ring-primary/40'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <div
                      className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border/30"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Home Page */}
          <Section id="home" title="Home Page" icon={Home}>
            <SelectRow
              label="Style"
              value={settings.homePageStyle}
              onChange={v => updateSettings({ homePageStyle: v as BrowserSettings['homePageStyle'] })}
            >
              <option value="modern">Modern</option>
              <option value="notilus_dev">Notilus Dev</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="devops">DevOps</option>
              <option value="data_science">Data Science</option>
              <option value="minimal">Minimal</option>
              <option value="customizable">Customizable</option>
            </SelectRow>
            <SelectRow
              label="Wallpaper interval"
              value={String(settings.wallpaperInterval)}
              onChange={v => updateSettings({ wallpaperInterval: Number(v) })}
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
            </SelectRow>
          </Section>

          {/* Tabs */}
          <Section id="tabs" title="Tabs" icon={Layers}>
            <SettingRow label="Restore tabs" description="Restore previous session on startup">
              <Switch
                checked={settings.restoreTabs}
                onCheckedChange={checked => updateSettings({ restoreTabs: checked })}
              />
            </SettingRow>
          </Section>

          {/* Terminal */}
          <Section id="terminal" title="Terminal" icon={Terminal}>
            <SelectRow
              label="Runtime"
              value={settings.terminalType}
              onChange={v => updateSettings({ terminalType: v as BrowserSettings['terminalType'] })}
            >
              <option value="native">Native Terminal</option>
              <option value="xterm">XTerm.js</option>
            </SelectRow>
            <SelectRow
              label="Font size"
              value={String(settings.terminalFontSize)}
              onChange={v => updateSettings({ terminalFontSize: Number(v) as BrowserSettings['terminalFontSize'] })}
            >
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
            </SelectRow>
          </Section>

          {/* Privacy */}
          <Section id="privacy" title="Privacy & Security" icon={Shield}>
            <SettingRow label="Ad blocker" description="Block ads and known popup patterns">
              <Switch checked={settings.adBlock} onCheckedChange={checked => updateSettings({ adBlock: checked })} />
            </SettingRow>
            <SettingRow label="Tracker protection" description="Block third-party trackers">
              <Switch
                checked={settings.trackerProtection}
                onCheckedChange={checked => updateSettings({ trackerProtection: checked })}
              />
            </SettingRow>
            <SettingRow label="Save history" description="Keep local browsing history">
              <Switch
                checked={settings.saveHistory}
                onCheckedChange={checked => updateSettings({ saveHistory: checked })}
              />
            </SettingRow>
            <SettingRow label="Accept cookies" description="Allow website cookies">
              <Switch
                checked={settings.acceptCookies}
                onCheckedChange={checked => updateSettings({ acceptCookies: checked })}
              />
            </SettingRow>
            <SettingRow
              label="Import browser data"
              description="Merge history and favorites from installed browsers"
            >
              <button
                type="button"
                onClick={() => setImportDialogOpen(true)}
                disabled={!desktopImportSupported}
                className={cn(
                  'h-7 rounded-md border px-2 text-[10px] font-body transition-colors',
                  desktopImportSupported
                    ? 'border-secondary/45 text-foreground hover:bg-muted/40'
                    : 'border-border/40 text-muted-foreground cursor-not-allowed'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Download size={11} />
                  Import
                </span>
              </button>
            </SettingRow>
          </Section>

          {/* Web Services */}
          <Section id="web-services" title="Web Services" icon={Globe}>
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

          {/* AI */}
          <Section id="ai" title="AI Assistant" icon={Sparkles}>
            <SelectRow
              label="Model"
              value={settings.aiModel}
              onChange={v => updateSettings({ aiModel: v as BrowserSettings['aiModel'] })}
            >
              <option value="llama-3.3-70b">Llama 3.3 70B</option>
              <option value="mixtral-8x7b">Mixtral 8x7B</option>
              <option value="gemma-2-9b">Gemma 2 9B</option>
            </SelectRow>
          </Section>

          {/* General */}
          <Section id="general" title="General" icon={Settings}>
            <SelectRow
              label="Search engine"
              value={settings.searchEngine}
              onChange={v => updateSettings({ searchEngine: v as BrowserSettings['searchEngine'] })}
            >
              <option value="duckduckgo">DuckDuckGo</option>
              <option value="google">Google</option>
              <option value="brave">Brave Search</option>
            </SelectRow>
          </Section>

          {/* Notifications */}
          <Section id="notifications" title="Notifications" icon={Bell}>
            <SettingRow label="Enable notifications" description="Show browser notifications">
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={checked => updateSettings({ notificationsEnabled: checked })}
              />
            </SettingRow>
          </Section>

          {/* About */}
          <Section id="about" title="About" icon={Info}>
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-4 border border-border/30">
              <img src="/logo_n_no_bg.png" alt="Notilus" className="h-12 w-12 object-contain" />
              <div className="space-y-0.5">
                <p className="text-xs font-display tracking-wider text-foreground">NOTILUS BROWSER</p>
                <p className="text-[10px] font-body text-muted-foreground">Version 2.0.0-beta</p>
                <p className="text-[10px] font-body text-muted-foreground">Built with React + Electron</p>
                <p className="text-[10px] font-body text-primary">© 2026 Genesis Company</p>
              </div>
            </div>
          </Section>
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
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}) {
  return (
    <div data-section={id} className="space-y-3 rounded-xl border border-border/30 bg-card/40 p-4">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-primary" />
        <h3 className="text-[11px] font-display uppercase tracking-widest text-primary">{title}</h3>
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
        className="h-7 w-full rounded-lg border border-border/50 bg-muted/30 px-2 text-[11px] font-body text-foreground outline-none focus:border-primary/50 transition-colors"
      >
        {children}
      </select>
    </div>
  );
}
