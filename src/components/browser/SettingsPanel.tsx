import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';
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

const SETTING_SECTIONS = [
  { id: 'appearance', title: 'Appearance', keywords: ['theme', 'accent', 'dark mode', 'ui'] },
  { id: 'home', title: 'Home Page', keywords: ['speed dial', 'wallpaper', 'style'] },
  { id: 'tabs', title: 'Tabs', keywords: ['restore', 'startup', 'session'] },
  { id: 'terminal', title: 'Terminal', keywords: ['xterm', 'font', 'shell'] },
  { id: 'privacy', title: 'Privacy & Security', keywords: ['adblock', 'tracker', 'cookies', 'history'] },
  { id: 'web-services', title: 'Web Services', keywords: ['youtube', 'chatgpt', 'sidebar'] },
  { id: 'ai', title: 'AI Assistant', keywords: ['model', 'assistant'] },
  { id: 'general', title: 'General', keywords: ['search', 'engine'] },
  { id: 'notifications', title: 'Notifications', keywords: ['alerts', 'desktop'] },
  { id: 'about', title: 'About', keywords: ['version', 'build', 'notilus'] },
] as const;

type SectionId = (typeof SETTING_SECTIONS)[number]['id'];

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<BrowserSettings>(() => getSettings());
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  useEffect(() => {
    setSettings(getSettings());
    return subscribeToSettingsUpdates(() => {
      setSettings(getSettings());
    });
  }, []);

  const query = searchQuery.trim().toLowerCase();

  const isSectionVisible = useMemo(() => {
    return (sectionId: SectionId) => {
      const section = SETTING_SECTIONS.find(entry => entry.id === sectionId);
      if (!section) return false;
      if (activeSection && activeSection !== sectionId) return false;
      if (!query) return true;
      return [section.title, ...section.keywords].join(' ').toLowerCase().includes(query);
    };
  }, [activeSection, query]);

  const visibleSectionCount = useMemo(
    () => SETTING_SECTIONS.filter(section => isSectionVisible(section.id)).length,
    [isSectionVisible]
  );

  return (
    <SidebarPanelShell
      title="Settings"
      icon={Settings}
      searchable
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search settings..."
      filters={SETTING_SECTIONS.map(section => ({ label: section.title, value: section.id }))}
      activeFilter={activeSection}
      onFilterChange={value => setActiveSection((value as SectionId | null) ?? null)}
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
      footer={`${visibleSectionCount} section${visibleSectionCount === 1 ? '' : 's'} visible`}
      contentClassName="px-3 py-3"
    >
      <div className="space-y-3">
        {isSectionVisible('appearance') && (
          <Card title="Appearance">
            <SettingRow label="Dark Mode" description="Enable dark theme">
              <Switch
                checked={settings.darkMode}
                onCheckedChange={checked => updateSettings({ darkMode: checked })}
              />
            </SettingRow>
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-muted-foreground">Accent Theme</label>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateSettings({ accentTheme: theme.id })}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-body transition-all duration-fast ${
                      settings.accentTheme === theme.id
                        ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                        : 'bg-notilus-surface-1 text-muted-foreground hover:bg-notilus-surface-2'
                    }`}
                  >
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: theme.color }} />
                    <span className="truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {isSectionVisible('home') && (
          <Card title="Home Page">
            <SelectRow
              label="Style"
              value={settings.homePageStyle}
              onChange={value =>
                updateSettings({ homePageStyle: value as BrowserSettings['homePageStyle'] })
              }
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
          </Card>
        )}

        {isSectionVisible('tabs') && (
          <Card title="Tabs">
            <SettingRow label="Restore tabs" description="Restore tab session on startup">
              <Switch
                checked={settings.restoreTabs}
                onCheckedChange={checked => updateSettings({ restoreTabs: checked })}
              />
            </SettingRow>
          </Card>
        )}

        {isSectionVisible('terminal') && (
          <Card title="Terminal">
            <SelectRow
              label="Runtime"
              value={settings.terminalType}
              onChange={value => updateSettings({ terminalType: value as BrowserSettings['terminalType'] })}
            >
              <option value="native">Native Terminal</option>
              <option value="xterm">XTerm.js</option>
            </SelectRow>
            <SelectRow
              label="Font size"
              value={String(settings.terminalFontSize)}
              onChange={value =>
                updateSettings({ terminalFontSize: Number(value) as BrowserSettings['terminalFontSize'] })
              }
            >
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
            </SelectRow>
          </Card>
        )}

        {isSectionVisible('privacy') && (
          <Card title="Privacy & Security">
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
          </Card>
        )}

        {isSectionVisible('web-services') && (
          <Card title="Web Services">
            {WEB_SERVICE_IDS.map(serviceId => (
              <SettingRow key={serviceId} label={WEB_SERVICE_LABELS[serviceId]} description="Show service shortcut in sidebar">
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
          </Card>
        )}

        {isSectionVisible('ai') && (
          <Card title="AI Assistant">
            <SelectRow
              label="Model"
              value={settings.aiModel}
              onChange={value => updateSettings({ aiModel: value as BrowserSettings['aiModel'] })}
            >
              <option value="llama-3.3-70b">Llama 3.3 70B</option>
              <option value="mixtral-8x7b">Mixtral 8x7B</option>
              <option value="gemma-2-9b">Gemma 2 9B</option>
            </SelectRow>
          </Card>
        )}

        {isSectionVisible('general') && (
          <Card title="General">
            <SelectRow
              label="Search engine"
              value={settings.searchEngine}
              onChange={value => updateSettings({ searchEngine: value as BrowserSettings['searchEngine'] })}
            >
              <option value="duckduckgo">DuckDuckGo</option>
              <option value="google">Google</option>
              <option value="brave">Brave Search</option>
            </SelectRow>
          </Card>
        )}

        {isSectionVisible('notifications') && (
          <Card title="Notifications">
            <SettingRow label="Enable notifications" description="Show browser notifications">
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={checked => updateSettings({ notificationsEnabled: checked })}
              />
            </SettingRow>
          </Card>
        )}

        {isSectionVisible('about') && (
          <Card title="About">
            <div className="flex items-center gap-3 rounded-lg bg-notilus-surface-1 p-3">
              <img src="/logo_n_no_bg.png" alt="Notilus" className="h-10 w-10 object-contain" />
              <div className="space-y-0.5 text-xs font-body text-muted-foreground">
                <p className="text-[11px] font-display tracking-wider text-foreground">NOTILUS BROWSER</p>
                <p>Version 2.0.0-beta</p>
                <p>Built with React + Electron</p>
                <p className="text-primary">© 2026 Genesis Company</p>
              </div>
            </div>
          </Card>
        )}

        {visibleSectionCount === 0 && (
          <PanelEmptyState
            icon={RotateCcw}
            title="No matching settings"
            hint="Try another keyword or clear the active filter."
          />
        )}
      </div>
    </SidebarPanelShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 rounded-xl border border-border/50 bg-notilus-surface-1/50 p-3">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-primary">{title}</h4>
      {children}
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
    <div className="flex items-center justify-between gap-3">
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
      <label className="text-[11px] font-body text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-body text-foreground outline-none focus:border-primary/50"
      >
        {children}
      </select>
    </div>
  );
}

