import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentArea } from '@/components/browser/ContentArea';

describe('ContentArea', () => {
  it('renders internal pages in React shell', () => {
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <ContentArea
        url="notilus://speed-dial"
        onNavigate={() => {}}
        isDesktopMode
        viewportRef={viewportRef}
      />
    );

    expect(screen.queryByTitle('Web content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('electron-viewport')).not.toBeInTheDocument();
  });

  it('renders iframe in web mode for external urls', () => {
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <ContentArea
        url="https://example.com"
        onNavigate={() => {}}
        isDesktopMode={false}
        viewportRef={viewportRef}
      />
    );

    expect(screen.getByTitle('Web content')).toBeInTheDocument();
    expect(screen.queryByTestId('electron-viewport')).not.toBeInTheDocument();
  });

  it('renders dedicated electron viewport in desktop mode', () => {
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <ContentArea
        url="https://example.com"
        onNavigate={() => {}}
        isDesktopMode
        viewportRef={viewportRef}
      />
    );

    expect(screen.getByTestId('electron-viewport')).toBeInTheDocument();
    expect(screen.queryByTitle('Web content')).not.toBeInTheDocument();
  });
});

