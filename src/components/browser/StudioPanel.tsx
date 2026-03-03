import { useState } from 'react';
import { Monitor, Camera, Code2, Video, Image, Smartphone, Tablet, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'responsive', label: 'Responsive', icon: Monitor },
  { id: 'screenshot', label: 'Screenshot', icon: Camera },
  { id: 'liveedit', label: 'Live Edit', icon: Code2 },
  { id: 'recorder', label: 'Recorder', icon: Video },
  { id: 'mockup', label: 'Mockup', icon: Image },
];

const DEVICES = [
  { name: 'iPhone 15', w: 393, h: 852, icon: Smartphone },
  { name: 'iPad Pro', w: 1024, h: 1366, icon: Tablet },
  { name: 'MacBook', w: 1440, h: 900, icon: Laptop },
  { name: 'Desktop', w: 1920, h: 1080, icon: Monitor },
];

export function StudioPanel() {
  const [activeTab, setActiveTab] = useState('responsive');

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
      <h3 className="text-xs font-display font-semibold text-primary uppercase tracking-widest">Studio</h3>

      {/* Tabs */}
      <div className="flex gap-0.5 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-body transition-all duration-fast",
              activeTab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <t.icon size={11} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'responsive' && (
        <div className="space-y-2">
          <p className="text-[10px] font-body text-muted-foreground">Device Presets</p>
          {DEVICES.map(d => (
            <button key={d.name} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-notilus-surface-1 border border-border text-xs font-body text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast">
              <d.icon size={14} className="text-muted-foreground" />
              <span className="flex-1 text-left">{d.name}</span>
              <span className="text-[10px] text-muted-foreground">{d.w}×{d.h}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'screenshot' && (
        <div className="space-y-3">
          <button className="w-full h-9 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast">
            Capture Viewport
          </button>
          <button className="w-full h-9 rounded-lg bg-notilus-surface-1 border border-border text-xs font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast">
            Capture Full Page
          </button>
          <p className="text-[10px] font-body text-muted-foreground text-center">No captures yet</p>
        </div>
      )}

      {activeTab === 'liveedit' && (
        <div className="space-y-3">
          <div className="flex gap-1">
            <button className="flex-1 h-7 rounded-md bg-primary/15 text-primary text-[10px] font-display">CSS</button>
            <button className="flex-1 h-7 rounded-md bg-notilus-surface-1 text-muted-foreground text-[10px] font-display hover:bg-notilus-surface-2">HTML</button>
          </div>
          <textarea
            placeholder="/* Inject CSS here */&#10;body { }&#10;"
            className="w-full h-32 rounded-lg bg-notilus-surface-1 border border-border p-2 text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50"
          />
          <button className="w-full h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast">
            Apply
          </button>
        </div>
      )}

      {activeTab === 'recorder' && (
        <div className="space-y-3 text-center">
          <div className="flex gap-2 justify-center">
            <button className="h-9 px-4 rounded-lg bg-error text-primary-foreground text-xs font-display tracking-wider hover:bg-error/80 transition-colors duration-fast">
              ● Record
            </button>
          </div>
          <p className="text-[10px] font-body text-muted-foreground">Record user interactions and export to Playwright, Cypress, Puppeteer or Selenium</p>
          <div className="space-y-1">
            {['Playwright', 'Cypress', 'Puppeteer', 'Selenium'].map(f => (
              <button key={f} className="w-full h-7 rounded-md bg-notilus-surface-1 border border-border text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-colors duration-fast">
                Export as {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'mockup' && (
        <div className="space-y-3 text-center">
          <button className="w-full h-9 rounded-lg border-2 border-dashed border-border text-xs font-body text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors duration-fast">
            Import Mockup Image
          </button>
          <div className="flex gap-2">
            <button className="flex-1 h-7 rounded-md bg-primary/15 text-primary text-[10px] font-display">Overlay</button>
            <button className="flex-1 h-7 rounded-md bg-notilus-surface-1 text-muted-foreground text-[10px] font-display hover:bg-notilus-surface-2">Diff</button>
          </div>
          <p className="text-[10px] font-body text-muted-foreground">Compare your implementation against design mockups</p>
        </div>
      )}
    </div>
  );
}
