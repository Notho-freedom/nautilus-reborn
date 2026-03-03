import { useState } from 'react';
import { X, Minus, Maximize2 } from 'lucide-react';
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
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'elements', label: 'Elements' },
  { id: 'performance', label: 'Performance' },
  { id: 'application', label: 'Application' },
  { id: 'sources', label: 'Sources' },
];

export function DevToolsPanel({ isOpen, onClose, height, onHeightChange }: DevToolsPanelProps) {
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
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn("h-1 cursor-row-resize hover:bg-primary/30 transition-colors", isDragging && "bg-primary/50")}
      />

      {/* Tab bar */}
      <div className="flex items-center h-7 bg-card border-b border-border px-1 gap-0.5 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-2 h-6 rounded text-[10px] font-mono transition-colors",
              activeTab === tab.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Content */}
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
