import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DevConsole } from './devtools/DevConsole';
import { DevNetwork } from './devtools/DevNetwork';
import { DevElements } from './devtools/DevElements';
import { DevPerformance } from './devtools/DevPerformance';
import { DevApplication } from './devtools/DevApplication';
import { DevSources } from './devtools/DevSources';

interface DevToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  height: number;
  onHeightChange: (h: number) => void;
}

const TABS = [
  { id: 'elements', label: 'Elements' },
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'performance', label: 'Performance' },
  { id: 'application', label: 'Application' },
  { id: 'sources', label: 'Sources' },
];

export function DevToolsPanel({
  isOpen,
  onClose,
  height,
  onHeightChange,
}: DevToolsPanelProps) {
  const [activeTab, setActiveTab] = useState('console');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleMouseDown = () => {
    setIsDragging(true);
    const handleMouseMove = (e: MouseEvent) => {
      const newH = window.innerHeight - e.clientY;
      onHeightChange(Math.max(150, Math.min(600, newH)));
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="shrink-0 border-t border-border bg-card flex flex-col" style={{ height }}>
      <div
        onMouseDown={handleMouseDown}
        className={cn("h-1 cursor-row-resize hover:bg-primary/30 transition-colors duration-fast", isDragging && "bg-primary/50")}
      />

      <div className="flex items-center h-8 bg-card border-b border-border px-1 gap-0.5 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-2.5 h-7 rounded-md text-[10px] font-display uppercase tracking-wider transition-all duration-fast",
              activeTab === tab.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-fast">
          <Trash2 size={11} />
        </button>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-fast">
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'console' && <DevConsole />}
        {activeTab === 'network' && <DevNetwork />}
        {activeTab === 'elements' && <DevElements />}
        {activeTab === 'performance' && <DevPerformance />}
        {activeTab === 'application' && <DevApplication />}
        {activeTab === 'sources' && <DevSources />}
      </div>
    </div>
  );
}
