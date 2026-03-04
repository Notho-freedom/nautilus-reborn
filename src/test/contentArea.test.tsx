import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentArea } from '@/components/browser/ContentArea';
import type { BrowserTab } from '@/hooks/useBrowserState';

const externalTab: BrowserTab = {
  id: 'tab-1',
  title: 'example.com',
  url: 'https://example.com',
  kind: 'external',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
};

describe('ContentArea', () => {
  it('renders internal pages in React shell', () => {
    render(
      <ContentArea
        url="notilus://speed-dial"
        onNavigate={() => {}}
        isDesktopMode
        tabs={[externalTab]}
        activeTabId="tab-1"
        onCreateTab={() => {}}
      />
    );

    expect(screen.queryByTitle('Web content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('desktop-webview-layer')).not.toBeInTheDocument();
  });

  it('renders iframe in web mode for external urls', () => {
    render(
      <ContentArea
        url="https://example.com"
        onNavigate={() => {}}
        isDesktopMode={false}
        tabs={[externalTab]}
        activeTabId="tab-1"
        onCreateTab={() => {}}
      />
    );

    expect(screen.getByTitle('Web content')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-webview-layer')).not.toBeInTheDocument();
  });

  it('renders desktop webview layer in desktop mode', () => {
    render(
      <ContentArea
        url="https://example.com"
        onNavigate={() => {}}
        isDesktopMode
        tabs={[externalTab]}
        activeTabId="tab-1"
        onCreateTab={() => {}}
      />
    );

    expect(screen.getByTestId('desktop-webview-layer')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-webview-tab-1')).toBeInTheDocument();
    expect(screen.queryByTitle('Web content')).not.toBeInTheDocument();
  });
});
