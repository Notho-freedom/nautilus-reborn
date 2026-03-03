import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function SettingsPanel() {
  const [adBlock, setAdBlock] = useState(true);
  const [trackerProtection, setTrackerProtection] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [cookies, setCookies] = useState(true);
  const [restoreTabs, setRestoreTabs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTheme, setActiveTheme] = useState('red');
  const themes = [
    { id: 'red', name: 'Rouge Notilus', color: '#FF2D55' },
    { id: 'blue', name: 'Bleu Cyber', color: '#007AFF' },
    { id: 'green', name: 'Vert Matrix', color: '#34C759' },
    { id: 'purple', name: 'Violet Neon', color: '#5856D6' },
    { id: 'orange', name: 'Orange Fire', color: '#FF9500' },
    { id: 'pink', name: 'Rose Cyber', color: '#FF2D92' },
  ];

  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">
        Settings
      </h3>

      {/* Search */}
      <div className="flex items-center gap-2 h-8 rounded-lg bg-notilus-surface-1 border border-border px-2">
        <Search size={12} className="text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <Section title="Appearance">
        <SettingRow label="Dark Mode" description="Enable dark theme">
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </SettingRow>
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Accent Theme</label>
          <div className="grid grid-cols-3 gap-1.5">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[10px] font-body transition-all duration-fast ${
                  activeTheme === t.id
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border bg-notilus-surface-1 text-muted-foreground hover:border-border hover:bg-notilus-surface-2'
                }`}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Home Page">
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Style</label>
          <select className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>Modern</option>
            <option>Notilus Dev</option>
            <option>Frontend</option>
            <option>Backend</option>
            <option>DevOps</option>
            <option>Data Science</option>
            <option>Minimal</option>
            <option>Customizable</option>
          </select>
        </div>
      </Section>

      <Section title="Tabs">
        <SettingRow label="Restore tabs" description="Restore tabs on startup">
          <Switch checked={restoreTabs} onCheckedChange={setRestoreTabs} />
        </SettingRow>
      </Section>

      <Section title="Terminal">
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Terminal Type</label>
          <select className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>Native Terminal</option>
            <option>XTerm.js</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Font Size</label>
          <select className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>12px</option>
            <option>13px</option>
            <option>14px</option>
            <option>16px</option>
          </select>
        </div>
      </Section>

      <Section title="DevTools">
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Position</label>
          <select className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>Bottom</option>
            <option>Right</option>
          </select>
        </div>
      </Section>

      <Section title="Privacy & Security">
        <SettingRow label="Ad Blocker" description="Block ads and popups">
          <Switch checked={adBlock} onCheckedChange={setAdBlock} />
        </SettingRow>
        <SettingRow label="Tracker Protection" description="Block third-party trackers">
          <Switch checked={trackerProtection} onCheckedChange={setTrackerProtection} />
        </SettingRow>
        <SettingRow label="Save History" description="Keep browsing history">
          <Switch checked={saveHistory} onCheckedChange={setSaveHistory} />
        </SettingRow>
        <SettingRow label="Accept Cookies" description="Allow website cookies">
          <Switch checked={cookies} onCheckedChange={setCookies} />
        </SettingRow>
      </Section>

      <Section title="AI Assistant">
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Model</label>
          <select className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>Llama 3.3 70B</option>
            <option>Mixtral 8x7B</option>
            <option>Gemma 2 9B</option>
          </select>
        </div>
      </Section>

      <Section title="General">
        <div className="space-y-1.5">
          <label className="text-[11px] font-body text-muted-foreground">Search Engine</label>
          <select className="w-full h-8 rounded-md bg-notilus-surface-1 text-xs font-body text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>DuckDuckGo</option>
            <option>Google</option>
            <option>Brave Search</option>
          </select>
        </div>
      </Section>

      <Section title="Notifications">
        <SettingRow label="Enable Notifications" description="Show browser notifications">
          <Switch checked={true} onCheckedChange={() => {}} />
        </SettingRow>
      </Section>

      <Section title="About">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-notilus-surface-1 border border-border">
          <div className="w-10 h-10 rounded-lg notilus-gradient flex items-center justify-center animate-glow-breathe">
            <span className="text-sm font-display font-bold text-primary-foreground">N</span>
          </div>
          <div className="text-xs font-body text-muted-foreground space-y-0.5">
            <p className="text-foreground font-display text-[11px] tracking-wider">NOTILUS BROWSER</p>
            <p>Version 2.0.0-beta</p>
            <p>Built with React + Vite</p>
            <p className="text-primary">© 2026 Genesis Company</p>
          </div>
        </div>
      </Section>
    </div>
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
