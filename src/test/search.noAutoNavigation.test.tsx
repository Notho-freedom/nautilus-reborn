import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationBar } from '@/components/browser/NavigationBar';
import { SpeedDial } from '@/components/browser/SpeedDial';
import { TopChromeBar } from '@/components/browser/TopChromeBar';
import { GitHubReposPanel } from '@/components/browser/GitHubReposPanel';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/lib/githubRepos', () => ({
  getGitHubConnectionConfig: vi.fn(() => ({ token: 'token', username: 'bobim' })),
  updateGitHubConnectionConfig: vi.fn(config => config),
  fetchGitHubRepos: vi.fn(async () => [
    {
      id: 'repo-1',
      name: 'notilus',
      fullName: 'bobim/notilus',
      description: 'Notilus Browser',
      stars: 12,
      forks: 2,
      language: 'TypeScript',
      languageColor: '#3178c6',
      isPrivate: false,
      updatedAt: new Date().toISOString(),
      htmlUrl: 'https://github.com/bobim/notilus',
    },
  ]),
  formatRelativeDate: vi.fn(() => 'now'),
}));

function renderNavigationBar(onNavigate: ReturnType<typeof vi.fn>) {
  render(
    <TooltipProvider>
      <NavigationBar
        url="https://example.com"
        onNavigate={onNavigate}
        onHome={vi.fn()}
        onBack={vi.fn()}
        onForward={vi.fn()}
        onReload={vi.fn()}
        canGoBack
        canGoForward
        isLoading={false}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
        onTogglePin={vi.fn()}
        isPinned={false}
        onSnapshotVisible={vi.fn()}
        onSnapshotFullPage={vi.fn()}
        onSendToFlou={vi.fn()}
        adBlockEnabled
        onToggleAdBlock={vi.fn()}
        onToggleAI={vi.fn()}
      />
    </TooltipProvider>
  );
}

describe('Search regression - no auto navigation while typing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('navigation bar only navigates after explicit Enter submit', () => {
    const onNavigate = vi.fn();
    renderNavigationBar(onNavigate);

    const input = screen.getByPlaceholderText('https://example.com');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'github.com' } });

    expect(onNavigate).not.toHaveBeenCalled();

    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.submit(form!);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('https://github.com');
  });

  it('speed dial search does not navigate on typing only', () => {
    const onNavigate = vi.fn();
    render(<SpeedDial onNavigate={onNavigate} />);

    const input = screen.getByPlaceholderText(/Search with .* or enter URL\.\.\./);
    fireEvent.change(input, { target: { value: 'notilus browser' } });

    expect(onNavigate).not.toHaveBeenCalled();

    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.submit(form!);

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('top chrome search dialog does not trigger tab action on Enter in search field', async () => {
    const onSelectTab = vi.fn();
    const onReopenClosedTab = vi.fn();

    render(
      <TooltipProvider>
        <TopChromeBar
          tabs={[
            { id: 'tab-1', title: 'Alpha', url: 'https://alpha.example' },
            { id: 'tab-2', title: 'Beta', url: 'https://beta.example' },
          ]}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={vi.fn()}
          onAddTab={vi.fn()}
          onDuplicateTab={vi.fn()}
          onTogglePinTab={vi.fn()}
          recentlyClosedTabs={[
            {
              id: 'closed-1',
              title: 'Closed docs',
              url: 'https://docs.example',
              closedAt: new Date().toISOString(),
            },
          ]}
          onReopenClosedTab={onReopenClosedTab}
          onClearClosedTabs={vi.fn()}
        />
      </TooltipProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search tabs' }));

    const input = await screen.findByPlaceholderText('Search by title or domain...');
    fireEvent.change(input, { target: { value: 'docs' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelectTab).not.toHaveBeenCalled();
    expect(onReopenClosedTab).not.toHaveBeenCalled();
  });

  it('github panel typing filters only; navigation happens only on explicit repo click', async () => {
    const onNavigate = vi.fn();
    render(<GitHubReposPanel onNavigate={onNavigate} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('bobim/notilus')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search repos...');
    fireEvent.change(searchInput, { target: { value: 'noti' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('bobim/notilus'));
    expect(onNavigate).toHaveBeenCalledWith('https://github.com/bobim/notilus');
  });
});
