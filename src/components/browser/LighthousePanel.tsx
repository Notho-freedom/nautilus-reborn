import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  label: string;
  score: number;
}

function ScoreGauge({ label, score }: ScoreGaugeProps) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? 'text-green-500' : score >= 50 ? 'text-accent' : 'text-destructive';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            className={color}
            stroke="currentColor" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-lg font-mono font-bold", color)}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
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

export function LighthousePanel() {
  return (
    <div className="p-3 space-y-4 overflow-y-auto scrollbar-thin">
      <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider">
        Lighthouse Audit
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <ScoreGauge label="Performance" score={92} />
        <ScoreGauge label="Accessibility" score={87} />
        <ScoreGauge label="Best Practices" score={95} />
        <ScoreGauge label="SEO" score={78} />
      </div>
      <div className="border-t border-border pt-3">
        <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Quick Wins</h4>
        <div className="space-y-1.5">
          {QUICK_WINS.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={cn(
                "shrink-0 px-1 py-0.5 rounded font-mono text-[9px] uppercase",
                item.impact === 'High' ? 'bg-destructive/15 text-destructive' :
                item.impact === 'Medium' ? 'bg-accent/15 text-accent' :
                'bg-muted text-muted-foreground'
              )}>
                {item.impact}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
