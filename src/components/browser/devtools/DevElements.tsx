import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type { DOMNode, InspectedElementDetails } from '@/types/devtools';

interface DevElementsProps {
  domTree: DOMNode | null;
  inspectedElement: InspectedElementDetails | null;
  onRefresh: () => void;
  onInspectSelector: (selector: string) => Promise<void> | void;
}

function RenderNode({ node, depth = 0 }: { node: DOMNode; depth?: number }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const attrs = Object.entries(node.attributes || {});

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <div className="group flex cursor-default items-start rounded px-1 py-0.5 hover:bg-muted/20">
        <span className="text-muted-foreground">&lt;</span>
        <span className="text-blue-400">{node.tagName}</span>
        {attrs.map(([key, value]) => (
          <span key={key}>
            {' '}
            <span className="text-yellow-400">{key}</span>
            =
            <span className="text-green-400">"{value}"</span>
          </span>
        ))}
        <span className="text-muted-foreground">{hasChildren || node.textContent ? '>' : ' />'}</span>
        {node.textContent ? <span className="ml-1 truncate text-foreground">{node.textContent}</span> : null}
      </div>
      {hasChildren
        ? node.children.map(child => (
            <RenderNode key={child.id} node={child} depth={depth + 1} />
          ))
        : null}
      {hasChildren ? (
        <div style={{ paddingLeft: depth * 14 }} className="px-1 py-0.5 text-muted-foreground">
          &lt;/<span className="text-blue-400">{node.tagName}</span>&gt;
        </div>
      ) : null}
    </div>
  );
}

function formatBoxValue(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '0';
  return String(Math.round(value));
}

function BoxValue({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{formatBoxValue(value)}</span>
    </div>
  );
}

export function DevElements({
  domTree,
  inspectedElement,
  onRefresh,
  onInspectSelector,
}: DevElementsProps) {
  const [selector, setSelector] = useState('body');

  const styleEntries = useMemo(() => {
    if (!inspectedElement?.computedStyles) return [] as Array<[string, string]>;
    return Object.entries(inspectedElement.computedStyles).filter(([, value]) => {
      if (!value) return false;
      const normalized = String(value).trim().toLowerCase();
      return normalized !== '' && normalized !== 'none' && normalized !== 'normal';
    });
  }, [inspectedElement?.computedStyles]);

  return (
    <div className="flex h-full text-[11px] font-mono">
      <div className="flex flex-1 flex-col border-r border-border/35">
        <div className="flex items-center gap-2 border-b border-border/35 px-2 py-1">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <RefreshCw size={11} />
            Refresh DOM
          </button>
          <form
            className="ml-auto flex items-center gap-1"
            onSubmit={event => {
              event.preventDefault();
              const next = selector.trim();
              if (!next) return;
              void onInspectSelector(next);
            }}
          >
            <div className="flex h-6 items-center gap-1 rounded bg-secondary/60 px-2">
              <Search size={10} className="text-muted-foreground" />
              <input
                value={selector}
                onChange={event => setSelector(event.target.value)}
                placeholder="Selector"
                className="w-28 bg-transparent text-[10px] text-foreground outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-6 rounded px-2 text-[10px] text-primary transition-colors hover:bg-primary/10"
            >
              Inspect
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-auto p-2 scrollbar-thin">
          {domTree ? <RenderNode node={domTree} /> : <div className="text-muted-foreground">No DOM tree available.</div>}
        </div>
      </div>

      <div className="w-72 shrink-0 overflow-y-auto p-2 scrollbar-thin">
        <div className="mb-2 text-[9px] uppercase tracking-wider text-muted-foreground">Inspector</div>

        {inspectedElement ? (
          <div className="space-y-3">
            <div className="rounded border border-border/35 bg-card/50 p-2">
              <div className="text-[10px] text-primary">
                &lt;{inspectedElement.tagName}
                {inspectedElement.id ? <span className="text-blue-400">#{inspectedElement.id}</span> : null}
                {inspectedElement.className ? (
                  <span className="text-yellow-400">.{inspectedElement.className.split(' ').filter(Boolean).join('.')}</span>
                ) : null}
                &gt;
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {Math.round(inspectedElement.rect.width)} × {Math.round(inspectedElement.rect.height)} px
              </div>
            </div>

            <div className="rounded border border-border/35 bg-card/50 p-2">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Box Model</div>
              <div className="space-y-1">
                <BoxValue label="margin-top" value={inspectedElement.boxModel?.margin.top} />
                <BoxValue label="margin-right" value={inspectedElement.boxModel?.margin.right} />
                <BoxValue label="margin-bottom" value={inspectedElement.boxModel?.margin.bottom} />
                <BoxValue label="margin-left" value={inspectedElement.boxModel?.margin.left} />
                <BoxValue label="padding-top" value={inspectedElement.boxModel?.padding.top} />
                <BoxValue label="padding-right" value={inspectedElement.boxModel?.padding.right} />
                <BoxValue label="padding-bottom" value={inspectedElement.boxModel?.padding.bottom} />
                <BoxValue label="padding-left" value={inspectedElement.boxModel?.padding.left} />
              </div>
            </div>

            <div className="rounded border border-border/35 bg-card/50 p-2">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Computed Styles</div>
              <div className="max-h-60 space-y-0.5 overflow-y-auto scrollbar-thin">
                {styleEntries.map(([property, value]) => (
                  <div key={property} className="flex items-start justify-between gap-2 border-b border-border/20 py-0.5">
                    <span className="text-purple-400">{property}</span>
                    <span className="text-right text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">
            Select an element (inspect mode or selector) to view box model and computed styles.
          </div>
        )}
      </div>
    </div>
  );
}
