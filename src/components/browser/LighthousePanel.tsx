import { useMemo, useState } from 'react';
import { Gauge, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarPanelShell } from './SidebarPanelShell';

interface ScoreGaugeProps {
  label: string;
  score: number;
}

interface AuditSnapshot {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  metrics: {
    ttfbMs: number;
    domContentLoadedMs: number;
    loadMs: number;
    resources: number;
  };
}

const TABS = ['Overview', 'Issues', 'Recommendations', 'History', 'AI Advisor'];

const INITIAL_AUDIT: AuditSnapshot = {
  performance: 0,
  accessibility: 0,
  bestPractices: 0,
  seo: 0,
  metrics: {
    ttfbMs: 0,
    domContentLoadedMs: 0,
    loadMs: 0,
    resources: 0,
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromTiming(valueMs: number, good: number, medium: number): number {
  if (valueMs <= good) return 100;
  if (valueMs <= medium) return 70;
  if (valueMs <= medium * 2) return 45;
  return 20;
}

async function collectAuditSnapshot(): Promise<AuditSnapshot> {
  const activeWebview = document.querySelector(
    'webview[data-active="true"]'
  ) as (HTMLElement & { executeJavaScript?: <T = unknown>(code: string, userGesture?: boolean) => Promise<T> }) | null;

  const collectScript = `
    (() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const start = nav?.startTime ?? 0;
      const ttfb = Math.max(0, (nav?.responseStart ?? 0) - start);
      const dcl = Math.max(0, (nav?.domContentLoadedEventEnd ?? 0) - start);
      const load = Math.max(0, (nav?.loadEventEnd ?? 0) - start);
      const resources = performance.getEntriesByType('resource').length;
      const images = Array.from(document.images || []);
      const withAlt = images.filter(img => Boolean(img.getAttribute('alt'))).length;
      const hasMetaDescription = Boolean(document.querySelector('meta[name="description"]'));
      const hasTitle = Boolean(document.title && document.title.trim());
      const isHttps = location.protocol === 'https:';
      return {
        metrics: { ttfbMs: ttfb, domContentLoadedMs: dcl, loadMs: load, resources },
        signals: {
          imageAltRatio: images.length === 0 ? 1 : withAlt / images.length,
          hasMetaDescription,
          hasTitle,
          isHttps
        }
      };
    })();
  `;

  let raw: {
    metrics: AuditSnapshot['metrics'];
    signals: {
      imageAltRatio: number;
      hasMetaDescription: boolean;
      hasTitle: boolean;
      isHttps: boolean;
    };
  } | null = null;

  if (activeWebview?.executeJavaScript) {
    raw = await activeWebview.executeJavaScript(collectScript, true).catch(() => null);
  }

  if (!raw) {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const metrics = {
      ttfbMs: Math.max(0, (navEntry?.responseStart ?? 0) - (navEntry?.startTime ?? 0)),
      domContentLoadedMs: Math.max(
        0,
        (navEntry?.domContentLoadedEventEnd ?? 0) - (navEntry?.startTime ?? 0)
      ),
      loadMs: Math.max(0, (navEntry?.loadEventEnd ?? 0) - (navEntry?.startTime ?? 0)),
      resources: performance.getEntriesByType('resource').length,
    };
    raw = {
      metrics,
      signals: {
        imageAltRatio: 1,
        hasMetaDescription: true,
        hasTitle: true,
        isHttps: location.protocol === 'https:',
      },
    };
  }

  const performanceScore =
    scoreFromTiming(raw.metrics.loadMs, 1600, 3000) * 0.55 +
    scoreFromTiming(raw.metrics.domContentLoadedMs, 900, 1800) * 0.25 +
    scoreFromTiming(raw.metrics.ttfbMs, 350, 900) * 0.2;

  const accessibilityScore = clampScore(50 + raw.signals.imageAltRatio * 50);
  const bestPracticesScore = clampScore(
    (raw.signals.isHttps ? 55 : 20) + scoreFromTiming(raw.metrics.ttfbMs, 350, 900) * 0.45
  );
  const seoScore = clampScore(
    (raw.signals.hasTitle ? 45 : 0) +
      (raw.signals.hasMetaDescription ? 40 : 0) +
      (raw.signals.isHttps ? 15 : 0)
  );

  return {
    performance: clampScore(performanceScore),
    accessibility: accessibilityScore,
    bestPractices: bestPracticesScore,
    seo: seoScore,
    metrics: {
      ...raw.metrics,
      ttfbMs: Math.round(raw.metrics.ttfbMs),
      domContentLoadedMs: Math.round(raw.metrics.domContentLoadedMs),
      loadMs: Math.round(raw.metrics.loadMs),
    },
  };
}

function ScoreGauge({ label, score }: ScoreGaugeProps) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--notilus-surface-2))" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className={color}
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-lg font-display font-bold', color)}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

interface LighthousePanelProps {
  onClose?: () => void;
}

export function LighthousePanel({ onClose }: LighthousePanelProps = {}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditSnapshot>(INITIAL_AUDIT);

  const recommendations = useMemo(() => {
    const next: Array<{ text: string; impact: 'High' | 'Medium' | 'Low' }> = [];
    if (audit.metrics.ttfbMs > 900) {
      next.push({ text: 'Optimize server response time (TTFB).', impact: 'High' });
    }
    if (audit.metrics.loadMs > 3000) {
      next.push({ text: 'Reduce critical-path assets to improve page load.', impact: 'High' });
    }
    if (audit.metrics.resources > 180) {
      next.push({ text: 'Reduce resource count via bundling and lazy loading.', impact: 'Medium' });
    }
    if (audit.seo < 75) {
      next.push({ text: 'Add title/meta description and HTTPS for SEO baseline.', impact: 'Medium' });
    }
    if (audit.accessibility < 80) {
      next.push({ text: 'Improve image alt coverage and semantic HTML.', impact: 'Low' });
    }
    return next;
  }, [audit]);

  const runAudit = async () => {
    setBusy(true);
    try {
      const snapshot = await collectAuditSnapshot();
      setAudit(snapshot);
      setActiveTab('Overview');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SidebarPanelShell title="Lighthouse" icon={Gauge} onClose={onClose ?? (() => {})}>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-md px-2 py-1 text-[10px] font-display uppercase tracking-wider transition-all',
                activeTab === tab
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ScoreGauge label="Performance" score={audit.performance} />
              <ScoreGauge label="Accessibility" score={audit.accessibility} />
              <ScoreGauge label="Best Practices" score={audit.bestPractices} />
              <ScoreGauge label="SEO" score={audit.seo} />
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-notilus-surface-1 p-2 text-[10px]">
              <div className="text-muted-foreground">TTFB: <span className="text-foreground">{audit.metrics.ttfbMs} ms</span></div>
              <div className="text-muted-foreground">DCL: <span className="text-foreground">{audit.metrics.domContentLoadedMs} ms</span></div>
              <div className="text-muted-foreground">Load: <span className="text-foreground">{audit.metrics.loadMs} ms</span></div>
              <div className="text-muted-foreground">Resources: <span className="text-foreground">{audit.metrics.resources}</span></div>
            </div>
            <button
              onClick={() => void runAudit()}
              disabled={busy}
              className="h-8 w-full rounded-lg bg-primary/10 text-xs font-display tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
            >
              {busy ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Running audit...
                </span>
              ) : (
                'Run audit'
              )}
            </button>
          </>
        )}

        {activeTab === 'Recommendations' && (
          <div className="space-y-1.5">
            {recommendations.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Run an audit to generate recommendations.
              </p>
            ) : (
              recommendations.map(item => (
                <div key={item.text} className="flex items-start gap-2 text-xs">
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-display uppercase tracking-wider',
                      item.impact === 'High'
                        ? 'bg-error/15 text-error'
                        : item.impact === 'Medium'
                          ? 'bg-warning/15 text-warning'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {item.impact}
                  </span>
                  <span className="text-foreground">{item.text}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'Issues' && (
          <div className="space-y-1.5 text-xs">
            {audit.performance < 70 && (
              <div className="rounded-md border border-error/30 bg-error/10 p-2 text-error">
                Performance budget exceeded (score below 70).
              </div>
            )}
            {audit.seo < 70 && (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-warning">
                SEO baseline missing metadata or secure context.
              </div>
            )}
            {audit.accessibility < 70 && (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-warning">
                Accessibility score is low. Review semantics and media labels.
              </div>
            )}
            {audit.performance >= 70 && audit.seo >= 70 && audit.accessibility >= 70 && (
              <p className="py-3 text-center text-muted-foreground">No major issues detected.</p>
            )}
          </div>
        )}

        {activeTab === 'History' && (
          <p className="py-3 text-center text-xs text-muted-foreground">
            History tracking for audits is scheduled for the next lot.
          </p>
        )}

        {activeTab === 'AI Advisor' && (
          <div className="space-y-2 rounded-lg border border-border bg-notilus-surface-1 p-3 text-xs">
            <div className="inline-flex items-center gap-1 font-display text-primary">
              <Sparkles size={12} />
              AI hints
            </div>
            <p className="text-muted-foreground">
              Prioritize lowering load time and TTFB first. These two metrics currently have the
              highest impact on your performance score.
            </p>
            <p className="text-muted-foreground">
              Keep resource count under 120 for complex pages and ensure metadata coverage for SEO.
            </p>
          </div>
        )}
      </div>
    </SidebarPanelShell>
  );
}
