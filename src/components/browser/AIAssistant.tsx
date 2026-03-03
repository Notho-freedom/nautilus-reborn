import { useState } from 'react';
import { X, Send, Sparkles, FileText, Code, HelpCircle } from 'lucide-react';
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
  { icon: FileText, label: 'Summarize page' },
  { icon: Code, label: 'Analyze code' },
  { icon: HelpCircle, label: 'Ask a question' },
];

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m Notilus AI. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('llama-3.3-70b');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'assistant', content: `I received your message: "${input}". This is a simulated response. In production, this would connect to Groq's ${model} model.` },
    ]);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 h-full border-l border-border bg-card flex flex-col animate-slide-in-right shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs font-mono font-semibold text-foreground">AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Model selector */}
      <div className="px-3 py-2 border-b border-border">
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          className="w-full h-6 rounded bg-secondary text-[10px] font-mono text-foreground px-1.5 border border-border outline-none focus:border-primary/50"
        >
          <option value="llama-3.3-70b">Llama 3.3 70B</option>
          <option value="mixtral-8x7b">Mixtral 8x7B</option>
          <option value="gemma-2-9b">Gemma 2 9B</option>
        </select>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 px-3 py-2 border-b border-border">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/60 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <action.icon size={10} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-xs",
              msg.role === 'user'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-1.5 p-2 border-t border-border"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 h-7 rounded bg-secondary px-2 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary/50"
        />
        <button
          type="submit"
          className="h-7 w-7 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
