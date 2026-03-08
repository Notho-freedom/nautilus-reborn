import { useMemo } from 'react';
import type { ImportDataset } from '../../shared/browser-contract';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useBrowserImport } from '@/hooks/useBrowserImport';
import { mergeImportedHistory } from '@/lib/history';
import { mergeImportedBookmarks } from '@/lib/bookmarks';
import { toast } from '@/hooks/use-toast';

interface BrowserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDatasets?: ImportDataset[];
}

const DATASET_LABELS: Record<ImportDataset, string> = {
  history: 'History',
  bookmarks: 'Favorites',
};

function formatBrowserLabel(browser: string): string {
  if (!browser) return 'Unknown';
  return browser.charAt(0).toUpperCase() + browser.slice(1);
}

export function BrowserImportDialog({
  open,
  onOpenChange,
  defaultDatasets,
}: BrowserImportDialogProps) {
  const {
    isDesktopSupported,
    profiles,
    selectedProfile,
    selectedProfileId,
    selectedDatasets,
    warnings,
    preview,
    isLoadingProfiles,
    isPreviewing,
    isImporting,
    setSelectedProfileId,
    toggleDataset,
    runPreview,
    runImport,
  } = useBrowserImport({
    open,
    defaultDatasets,
  });

  const hasProfile = Boolean(selectedProfileId);
  const profileDatasetSet = useMemo(
    () => new Set(selectedProfile?.availableDatasets ?? []),
    [selectedProfile?.availableDatasets]
  );

  const importDisabled =
    !isDesktopSupported || !hasProfile || selectedDatasets.length === 0 || isImporting;

  const handlePreview = async () => {
    const response = await runPreview();
    if (!response) {
      toast({
        title: 'Preview unavailable',
        description: 'Select a browser profile first.',
      });
      return;
    }

    if (response.warnings.length > 0) {
      toast({
        title: 'Preview completed with warnings',
        description: response.warnings[0],
      });
    }
  };

  const handleImport = async () => {
    const result = await runImport();
    if (!result) {
      toast({
        title: 'Import unavailable',
        description: 'Select a browser profile first.',
      });
      return;
    }

    const historyMerge = selectedDatasets.includes('history')
      ? mergeImportedHistory(result.history)
      : { inserted: 0, updated: 0, skipped: 0 };

    const bookmarksMerge = selectedDatasets.includes('bookmarks')
      ? mergeImportedBookmarks(result.bookmarks)
      : { inserted: 0, updated: 0, skipped: 0 };

    const importedTotal =
      historyMerge.inserted +
      historyMerge.updated +
      bookmarksMerge.inserted +
      bookmarksMerge.updated;

    if (importedTotal === 0) {
      toast({
        title: 'Nothing new to import',
        description: 'All selected items are already present.',
      });
    } else {
      toast({
        title: 'Import completed',
        description: `${historyMerge.inserted + historyMerge.updated} history, ${bookmarksMerge.inserted + bookmarksMerge.updated} favorites merged.`,
      });
    }

    if (result.warnings.length > 0) {
      toast({
        title: 'Import completed with warnings',
        description: result.warnings[0],
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border border-secondary/45 bg-notilus-surface-1">
        <DialogHeader>
          <DialogTitle className="text-sm font-display uppercase tracking-widest text-primary">
            Import Browser Data
          </DialogTitle>
          <DialogDescription className="text-xs font-body text-muted-foreground">
            Import local history and favorites from Chrome, Edge, Brave or Firefox.
          </DialogDescription>
        </DialogHeader>

        {!isDesktopSupported ? (
          <div className="rounded-md border border-secondary/45 bg-muted/20 p-3 text-xs text-muted-foreground">
            Desktop only: this feature is available in Electron runtime.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-body text-foreground">Browser profile</Label>
              <select
                value={selectedProfileId}
                onChange={event => setSelectedProfileId(event.target.value)}
                disabled={isLoadingProfiles || profiles.length === 0}
                className="h-8 w-full rounded-md border border-secondary/40 bg-notilus-surface-2 px-2 text-xs text-foreground outline-none"
              >
                {profiles.length === 0 ? (
                  <option value="">No profile detected</option>
                ) : null}
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {formatBrowserLabel(profile.browser)} - {profile.name}
                    {profile.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-md border border-secondary/35 bg-notilus-surface-2/40 p-3">
              <Label className="text-[11px] font-body text-foreground">Datasets</Label>
              <div className="space-y-1.5">
                {(['history', 'bookmarks'] as ImportDataset[]).map(dataset => {
                  const isAvailable = profileDatasetSet.has(dataset);
                  return (
                    <label
                      key={dataset}
                      className="flex items-center gap-2 text-xs text-foreground"
                    >
                      <Checkbox
                        checked={selectedDatasets.includes(dataset)}
                        onCheckedChange={() => toggleDataset(dataset)}
                        disabled={!isAvailable}
                      />
                      <span>{DATASET_LABELS[dataset]}</span>
                      {!isAvailable ? (
                        <span className="text-[10px] text-muted-foreground">Unavailable</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-secondary/35 bg-notilus-surface-2/20 p-3 text-xs text-muted-foreground">
              <div className="font-body text-foreground">Preview</div>
              <div className="mt-1 text-[11px]">
                History: {preview?.counts.history ?? 0} | Favorites: {preview?.counts.bookmarks ?? 0}
              </div>
            </div>

            {warnings.length > 0 ? (
              <div className="max-h-28 overflow-y-auto rounded-md border border-secondary/35 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                {warnings.map((warning, index) => (
                  <div key={`${warning}-${index}`}>{warning}</div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!isDesktopSupported || !hasProfile || isPreviewing || isImporting}
            className="h-8 border-secondary/45 text-xs"
          >
            {isPreviewing ? 'Previewing...' : 'Preview'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importDisabled}
            className="h-8 text-xs"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
