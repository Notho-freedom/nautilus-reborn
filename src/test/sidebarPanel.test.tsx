import { render, screen } from '@testing-library/react';
import { Music } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarPanel } from '@/components/browser/SidebarPanel';

const stats = {
  cpu: 20,
  ram: 40,
  gpu: 30,
  gpuTemp: 55,
  networkUp: 1.2,
  networkDown: 12.4,
  battery: 80,
  batteryCharging: true,
  networkOnline: true,
  networkLatency: 12,
  networkJitter: 3,
  networkPacketLoss: 0,
  networkInterface: 'Wi-Fi',
  networkQuality: 'good' as const,
  updatedAt: Date.now(),
};

describe('SidebarPanel web service integration', () => {
  it('renders web-service through the shared shell without URL input field', () => {
    render(
      <SidebarPanel
        panel="web-service"
        stats={stats}
        webService={{
          id: 'youtubeMusic',
          label: 'YouTube Music',
          url: 'https://music.youtube.com',
          fallbackIcon: Music,
        }}
        onOpenWebServiceInTab={vi.fn()}
        onClosePanel={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText('YouTube Music')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

