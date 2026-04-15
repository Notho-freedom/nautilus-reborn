import { useState } from 'react';
import { X, Send, Sparkles, FileText, Code, Languages, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { icon: FileText, label: 'Summarize', color: 'text-info' },
  { icon: Languages, label: 'Translate', color: 'text-success' },
  { icon: Code, label: 'Explain Code', color: 'text-warning' },
  { icon: Lightbulb, label: 'Simplify', color: 'text-primary' },
];

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm Notilus AI. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('llama-3.3-70b');
  const [mode, setMode] = useState<'chat' | 'console'>('chat');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'assistant', content: `I received your message: "${input}". This is a simulated response from ${model}.` },
    ]);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full border-l border-border bg-card flex flex-col animate-slide-in-right shrink-0 shadow-panel">
      {/* Header */}
      <div className="flex items-center justify-between h-11 px-4 border-b border-border bg-gradient-to-r from-primary/8 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg notilus-gradient flex items-center justify-center shadow-sm">
            <Sparkles size={12} className="text-primary-foreground" />
          </div>
          <span className="text-xs font-display font-semibold text-foreground tracking-wider">HYPER AI</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive/15 transition-all">
          <X size={14} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 px-3 py-2 border-b border-border">
        {(['console', 'chat'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 h-7 rounded-lg text-[10px] font-display uppercase tracking-wider transition-all",
              mode === m ? "bg-primary/15 text-primary shadow-xs" : "bg-notilus-surface-1 text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div className="px-3 py-2 border-b border-border">
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="w-full h-8 rounded-lg bg-notilus-surface-1 text-[11px] font-body text-foreground px-2 border border-border outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
        >
          <option value="llama-3.3-70b">Llama 3.3 70B</option>
          <option value="mixtral-8x7b">Mixtral 8x7B</option>
          <option value="gemma-2-9b">Gemma 2 9B</option>
        </select>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2 border-b border-border">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-notilus-surface-1 text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-notilus-surface-2 transition-all border border-transparent hover:border-border"
          >
            <action.icon size={12} className={action.color} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              "max-w-[90%] px-3 py-2 text-xs font-body",
              msg.role === 'user'
                ? "notilus-gradient text-primary-foreground rounded-2xl rounded-br-md shadow-sm"
                : "bg-notilus-surface-2 text-foreground border border-border rounded-2xl rounded-bl-md"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 p-3 border-t border-border"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 h-9 rounded-lg bg-notilus-surface-1 px-3 text-xs font-body text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
        />
        <button
          type="submit"
          className="h-9 w-9 flex items-center justify-center rounded-lg notilus-gradient text-primary-foreground hover:opacity-90 transition-all shadow-sm hover:shadow-glow"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
