import { useEffect, useMemo, useState } from 'react';
import type { WebServiceItem } from './DevToolsSidebar';
import { SidebarPanelShell } from './SidebarPanelShell';
import { WebServiceIcon } from './WebServiceIcon';
import { isDesktopRuntime } from '@/lib/electronBridge';

interface WebServicePanelProps {
  service: WebServiceItem | null;
  onOpenInTab: (url: string, label: string) => void;
  onClose: () => void;
}

export function WebServicePanel({ service, onOpenInTab, onClose }: WebServicePanelProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const isDesktop = isDesktopRuntime();

  useEffect(() => {
    setReloadKey(0);
  }, [service?.id]);

  const menuItems = useMemo(() => {
    if (!service) return [];
    return [
      {
        label: 'Reload',
        onClick: () => setReloadKey(prev => prev + 1),
      },
      {
        label: 'Open in tab',
        onClick: () => onOpenInTab(service.url, service.label),
      },
      {
        label: 'Copy URL',
        onClick: () => {
          void navigator.clipboard?.writeText(service.url);
        },
      },
      {
        label: 'Open in browser',
        onClick: () => {
          window.open(service.url, '_blank', 'noopener,noreferrer');
        },
      },
    ];
  }, [onOpenInTab, service]);

  if (!service) {
    return (
      <SidebarPanelShell title="Web Panel" onClose={onClose}>
        <div className="p-3 text-xs font-body text-muted-foreground">
          Select a web service from the sidebar.
        </div>
      </SidebarPanelShell>
    );
  }

  const titleIcon = (
    <WebServiceIcon
      serviceId={service.id}
      serviceUrl={service.url}
      serviceLabel={service.label}
      size={12}
      fallbackIcon={service.fallbackIcon}
    />
  );

  return (
    <SidebarPanelShell
      title={service.label}
      titleIcon={titleIcon}
      onClose={onClose}
      menuItems={menuItems}
    >
      <div className="flex h-full min-h-0 bg-notilus-surface-1">
        {isDesktop ? (
          <webview
            key={`${service.id}-${reloadKey}`}
            src={service.url}
            className="w-full h-full border-0"
            partition="persist:notilus-default"
            allowpopups={"true" as unknown as boolean}
            data-testid={`web-service-${service.id}`}
          />
        ) : (
          <iframe
            key={`${service.id}-${reloadKey}`}
            src={service.url}
            title={service.label}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>
    </SidebarPanelShell>
  );
}
