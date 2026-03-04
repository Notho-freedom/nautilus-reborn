import { useEffect, useMemo, useState } from 'react';
import { Search, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  getSettings,
  subscribeToSettingsUpdates,
  updateSettings,
  WEB_SERVICE_IDS,
  type BrowserSettings,
  type WebServiceId,
} from '@/lib/settings';
import { SidebarPanelShell } from './SidebarPanelShell';

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

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<BrowserSettings>(() => getSettings());

  useEffect(() => {
    setSettings(getSettings());
    return subscribeToSettingsUpdates(() => {
      setSettings(getSettings());
    });
  }, []);

  const sections = useMemo(
    () => ['Appearance', 'Home Page', 'Tabs', 'Terminal', 'DevTools', 'Privacy & Security', 'Web Services', 'AI Assistant', 'General', 'Notifications', 'About'],
    []
  );

  const query = searchQuery.trim().toLowerCase();
  const shouldShowSection = (title: string) => !query || title.toLowerCase().includes(query);

  return (
    <SidebarPanelShell
      title="Settings"
      icon={Settings}
      searchable
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search settings..."
      onClose={onClose ?? (() => {})}
    >
      <div className="p-3 space-y-4">
        {shouldShowSection('Appearance') && (
          <Section title="Appearance">
            <SettingRow label="Dark Mode" description="Enable dark theme">
              <Switch checked={settings.darkMode} onCheckedChange={checked => updateSettings({ darkMode: checked })} />
            </SettingRow>
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Accent Theme</label>
              <div className="grid grid-cols-3 gap-1.5">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => updateSettings({ accentTheme: theme.id })}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[10px] font-body transition-all duration-fast ${
                      settings.accentTheme === theme.id
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-notilus-surface-1 text-muted-foreground hover:border-border hover:bg-notilus-surface-2'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>
        )}

        {shouldShowSection('Home Page') && (
          <Section title="Home Page">
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Style</label>
              <select value={settings.homePageStyle} onChange={event => updateSettings({ homePageStyle: event.target.value as BrowserSettings['homePageStyle'] })} className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
                <option value="modern">Modern</option>
                <option value="notilus_dev">Notilus Dev</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="devops">DevOps</option>
                <option value="data_science">Data Science</option>
                <option value="minimal">Minimal</option>
                <option value="customizable">Customizable</option>
              </select>
            </div>
          </Section>
        )}

        {shouldShowSection('Tabs') && (
          <Section title="Tabs">
            <SettingRow label="Restore tabs" description="Restore tabs on startup">
              <Switch checked={settings.restoreTabs} onCheckedChange={checked => updateSettings({ restoreTabs: checked })} />
            </SettingRow>
          </Section>
        )}

        {shouldShowSection('Terminal') && (
          <Section title="Terminal">
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Terminal Type</label>
              <select value={settings.terminalType} onChange={event => updateSettings({ terminalType: event.target.value as BrowserSettings['terminalType'] })} className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
                <option value="native">Native Terminal</option>
                <option value="xterm">XTerm.js</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Font Size</label>
              <select value={String(settings.terminalFontSize)} onChange={event => updateSettings({ terminalFontSize: Number(event.target.value) as BrowserSettings['terminalFontSize'] })} className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
                <option value="12">12px</option>
                <option value="13">13px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
              </select>
            </div>
          </Section>
        )}

        {shouldShowSection('DevTools') && (
          <Section title="DevTools">
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Position</label>
              <select value={settings.devToolsPosition} onChange={event => updateSettings({ devToolsPosition: event.target.value as BrowserSettings['devToolsPosition'] })} className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
                <option value="bottom">Bottom</option>
                <option value="right">Right</option>
                <option value="detached">Detached</option>
              </select>
            </div>
          </Section>
        )}

        {shouldShowSection('Privacy & Security') && (
          <Section title="Privacy & Security">
            <SettingRow label="Ad Blocker" description="Block ads and popups">
              <Switch checked={settings.adBlock} onCheckedChange={checked => updateSettings({ adBlock: checked })} />
            </SettingRow>
            <SettingRow label="Tracker Protection" description="Block third-party trackers">
              <Switch checked={settings.trackerProtection} onCheckedChange={checked => updateSettings({ trackerProtection: checked })} />
            </SettingRow>
            <SettingRow label="Save History" description="Keep browsing history">
              <Switch checked={settings.saveHistory} onCheckedChange={checked => updateSettings({ saveHistory: checked })} />
            </SettingRow>
            <SettingRow label="Accept Cookies" description="Allow website cookies">
              <Switch checked={settings.acceptCookies} onCheckedChange={checked => updateSettings({ acceptCookies: checked })} />
            </SettingRow>
          </Section>
        )}

        {shouldShowSection('Web Services') && (
          <Section title="Web Services">
            <div className="space-y-2">
              {WEB_SERVICE_IDS.map(serviceId => (
                <SettingRow key={serviceId} label={WEB_SERVICE_LABELS[serviceId]} description="Show in sidebar web section">
                  <Switch
                    checked={settings.enabledWebServices.includes(serviceId)}
                    onCheckedChange={checked =>
                      updateSettings(current => {
                        const next = new Set(current.enabledWebServices);
                        if (checked) { next.add(serviceId); } else { next.delete(serviceId); }
                        return { enabledWebServices: next.size > 0 ? (Array.from(next) as BrowserSettings['enabledWebServices']) : [...WEB_SERVICE_IDS] };
                      })
                    }
                  />
                </SettingRow>
              ))}
            </div>
          </Section>
        )}

        {shouldShowSection('AI Assistant') && (
          <Section title="AI Assistant">
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Model</label>
              <select value={settings.aiModel} onChange={event => updateSettings({ aiModel: event.target.value as BrowserSettings['aiModel'] })} className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
                <option value="llama-3.3-70b">Llama 3.3 70B</option>
                <option value="mixtral-8x7b">Mixtral 8x7B</option>
                <option value="gemma-2-9b">Gemma 2 9B</option>
              </select>
            </div>
          </Section>
        )}

        {shouldShowSection('General') && (
          <Section title="General">
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Search Engine</label>
              <select value={settings.searchEngine} onChange={event => updateSettings({ searchEngine: event.target.value as BrowserSettings['searchEngine'] })} className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="google">Google</option>
                <option value="brave">Brave Search</option>
              </select>
            </div>
          </Section>
        )}

        {shouldShowSection('Notifications') && (
          <Section title="Notifications">
            <SettingRow label="Enable Notifications" description="Show browser notifications">
              <Switch checked={settings.notificationsEnabled} onCheckedChange={checked => updateSettings({ notificationsEnabled: checked })} />
            </SettingRow>
          </Section>
        )}

        {shouldShowSection('About') && (
          <Section title="About">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-notilus-surface-1 border border-border">
              <img src="/notilus-logo.png" alt="Notilus" className="w-10 h-10 rounded-lg object-contain" />
              <div className="text-xs font-body text-muted-foreground space-y-0.5">
                <p className="text-foreground font-display text-[11px] tracking-wider">NOTILUS BROWSER</p>
                <p>Version 2.0.0-beta</p>
                <p>Built with React + Electron</p>
                <p className="text-primary">© 2026 Genesis Company</p>
              </div>
            </div>
          </Section>
        )}

        {!sections.some(shouldShowSection) && (
          <div className="p-4 rounded-lg border border-border bg-notilus-surface-1 text-xs font-body text-muted-foreground">No matching settings section.</div>
        )}
      </div>
    </SidebarPanelShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3 space-y-2.5">
      <h4 className="text-[10px] font-display text-muted-foreground uppercase tracking-widest">{title}</h4>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-body text-foreground">{label}</p>
        <p className="text-[10px] font-body text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
