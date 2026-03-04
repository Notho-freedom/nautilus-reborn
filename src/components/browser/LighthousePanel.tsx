import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { SidebarPanelShell } from './SidebarPanelShell';

interface ScoreGaugeProps {
  label: string;
  score: number;
}

function ScoreGauge({ label, score }: ScoreGaugeProps) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--notilus-surface-2))" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            className={color}
            stroke="currentColor" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-lg font-display font-bold", color)}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-display text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

const QUICK_WINS = [
  { text: 'Serve images in next-gen formats', impact: 'High' },
  { text: 'Eliminate render-blocking resources', impact: 'High' },
  { text: 'Reduce unused JavaScript', impact: 'Medium' },
  { text: 'Add meta descriptions', impact: 'Medium' },
  { text: 'Use passive event listeners', impact: 'Low' },
];

const TABS = ['Overview', 'Issues', 'Recommendations', 'History', 'AI Advisor'];

interface LighthousePanelProps {
  onClose?: () => void;
}

export function LighthousePanel({ onClose }: LighthousePanelProps = {}) {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <SidebarPanelShell title="Lighthouse" icon={Gauge} onClose={onClose ?? (() => {})}>
      <div className="p-3 space-y-3">
        <div className="flex gap-0.5 flex-wrap">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-display uppercase tracking-wider transition-all duration-fast",
                activeTab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ScoreGauge label="Performance" score={92} />
              <ScoreGauge label="Accessibility" score={87} />
              <ScoreGauge label="Best Practices" score={95} />
              <ScoreGauge label="SEO" score={78} />
            </div>
            <button className="w-full h-8 rounded-lg bg-primary/10 text-primary text-xs font-display tracking-wider hover:bg-primary/20 transition-colors duration-fast">
              Run Audit
            </button>
          </>
        )}

        {activeTab === 'Recommendations' && (
          <div className="space-y-1.5">
            {QUICK_WINS.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-body">
                <span className={cn(
                  "shrink-0 px-1.5 py-0.5 rounded-md font-display text-[9px] uppercase tracking-wider",
                  item.impact === 'High' ? 'bg-error/15 text-error' :
                  item.impact === 'Medium' ? 'bg-warning/15 text-warning' :
                  'bg-muted text-muted-foreground'
                )}>
                  {item.impact}
                </span>
                <span className="text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'AI Advisor' && (
          <div className="space-y-3">
            <p className="text-xs font-body text-muted-foreground">AI-powered performance recommendations based on your audit results.</p>
            <div className="glass rounded-xl p-3 space-y-2">
              <p className="text-xs font-body text-foreground">💡 Your LCP could be improved by lazy-loading below-the-fold images and preloading critical resources.</p>
            </div>
            <div className="glass rounded-xl p-3 space-y-2">
              <p className="text-xs font-body text-foreground">🎯 Consider implementing dynamic imports for route-based code splitting to reduce initial bundle size.</p>
            </div>
          </div>
        )}

        {(activeTab === 'Issues' || activeTab === 'History') && (
          <p className="text-xs font-body text-muted-foreground text-center py-4">No data yet. Run an audit first.</p>
        )}
      </div>
    </SidebarPanelShell>
  );
}
