import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

export function SettingsPanel() {
  const [adBlock, setAdBlock] = useState(true);
  const [trackerProtection, setTrackerProtection] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin">
      <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
        Settings
      </h3>

      <Section title="Appearance">
        <SettingRow label="Dark Mode" description="Enable dark theme">
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </SettingRow>
      </Section>

      <Section title="Privacy & Security">
        <SettingRow label="Ad Blocker" description="Block ads and popups">
          <Switch checked={adBlock} onCheckedChange={setAdBlock} />
        </SettingRow>
        <SettingRow label="Tracker Protection" description="Block third-party trackers">
          <Switch checked={trackerProtection} onCheckedChange={setTrackerProtection} />
        </SettingRow>
      </Section>

      <Section title="AI Assistant">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Model</label>
          <select className="w-full h-7 rounded bg-secondary text-xs text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>Llama 3.3 70B</option>
            <option>Mixtral 8x7B</option>
            <option>Gemma 2 9B</option>
          </select>
        </div>
      </Section>

      <Section title="General">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Search Engine</label>
          <select className="w-full h-7 rounded bg-secondary text-xs text-foreground px-2 border border-border outline-none focus:border-primary/50">
            <option>DuckDuckGo</option>
            <option>Google</option>
            <option>Brave Search</option>
          </select>
        </div>
      </Section>

      <Section title="About">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Notilus Browser v2.0.0-beta</p>
          <p>Built with React + Vite</p>
          <p className="text-primary">© 2026 Genesis Company</p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3 space-y-2.5">
      <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
