import { cn } from '@/lib/utils';

interface DOMNode {
  tag: string;
  attrs?: Record<string, string>;
  children?: DOMNode[];
  text?: string;
}

const MOCK_DOM: DOMNode = {
  tag: 'html', attrs: { lang: 'en' }, children: [
    { tag: 'head', children: [
      { tag: 'meta', attrs: { charset: 'utf-8' } },
      { tag: 'title', text: 'Notilus Browser' },
      { tag: 'link', attrs: { rel: 'stylesheet', href: '/styles/main.css' } },
    ]},
    { tag: 'body', attrs: { class: 'dark' }, children: [
      { tag: 'div', attrs: { id: 'root', class: 'app-shell' }, children: [
        { tag: 'header', attrs: { class: 'title-bar' }, children: [
          { tag: 'div', attrs: { class: 'logo' }, text: 'N' },
          { tag: 'nav', attrs: { class: 'tab-bar' }, children: [
            { tag: 'button', attrs: { class: 'tab active' }, text: 'Speed Dial' },
          ]},
        ]},
        { tag: 'main', attrs: { class: 'content-area' }, children: [
          { tag: 'div', attrs: { class: 'speed-dial' }, children: [
            { tag: 'h1', text: 'Notilus' },
            { tag: 'input', attrs: { type: 'search', placeholder: 'Search...' } },
          ]},
        ]},
      ]},
    ]},
  ],
};

function RenderNode({ node, depth = 0 }: { node: DOMNode; depth?: number }) {
  const attrStr = node.attrs
    ? Object.entries(node.attrs).map(([k, v]) => (
        <span key={k}> <span className="text-yellow-400">{k}</span>=<span className="text-green-400">"{v}"</span></span>
      ))
    : null;

  const hasChildren = node.children && node.children.length > 0;
  const isSelfClose = !hasChildren && !node.text;

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="flex items-start py-0.5 hover:bg-muted/20 rounded px-1 cursor-pointer group">
        <span className="text-muted-foreground">&lt;</span>
        <span className="text-blue-400">{node.tag}</span>
        {attrStr}
        <span className="text-muted-foreground">{isSelfClose ? ' />' : '>'}</span>
        {node.text && <span className="text-foreground ml-0.5">{node.text}</span>}
        {node.text && <span className="text-muted-foreground">&lt;/<span className="text-blue-400">{node.tag}</span>&gt;</span>}
      </div>
      {hasChildren && (
        <>
          {node.children!.map((child, i) => (
            <RenderNode key={i} node={child} depth={depth + 1} />
          ))}
          <div style={{ paddingLeft: depth * 16 }} className="py-0.5 px-1">
            <span className="text-muted-foreground">&lt;/<span className="text-blue-400">{node.tag}</span>&gt;</span>
          </div>
        </>
      )}
    </div>
  );
}

const MOCK_STYLES = [
  { prop: 'display', value: 'flex' },
  { prop: 'flex-direction', value: 'column' },
  { prop: 'height', value: '100vh' },
  { prop: 'background', value: '#0a0a0f' },
  { prop: 'color', value: '#d4d4e0' },
  { prop: 'font-family', value: "'Inter', sans-serif" },
  { prop: 'font-size', value: '14px' },
  { prop: 'margin', value: '0' },
  { prop: 'padding', value: '0' },
];

export function DevElements() {
  return (
    <div className="flex h-full text-[11px] font-mono">
      {/* DOM Tree */}
      <div className="flex-1 overflow-auto scrollbar-thin p-2 border-r border-border">
        <RenderNode node={MOCK_DOM} />
      </div>

      {/* Styles panel */}
      <div className="w-48 overflow-y-auto scrollbar-thin p-2 shrink-0">
        <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Computed Styles</div>
        {MOCK_STYLES.map(s => (
          <div key={s.prop} className="flex justify-between py-0.5 border-b border-border/30">
            <span className="text-purple-400">{s.prop}</span>
            <span className="text-foreground">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
