import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ExternalBrowserProfile,
  ImportDataset,
  ImportPreviewResult,
  ImportRunResult,
} from '../../shared/browser-contract';
import {
  isBrowserImportSupported,
  listBrowserImportProfiles,
  previewBrowserImport,
  runBrowserImport,
} from '@/lib/browserImport';

interface UseBrowserImportOptions {
  open: boolean;
  defaultDatasets?: ImportDataset[];
}

export function useBrowserImport({ open, defaultDatasets }: UseBrowserImportOptions) {
  const [profiles, setProfiles] = useState<ExternalBrowserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedDatasets, setSelectedDatasets] = useState<ImportDataset[]>(
    () => defaultDatasets ?? ['history', 'bookmarks']
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const isDesktopSupported = isBrowserImportSupported();

  const selectedProfile = useMemo(
    () => profiles.find(profile => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const loadProfiles = useCallback(async () => {
    if (!open) return;

    setIsLoadingProfiles(true);
    try {
      const response = await listBrowserImportProfiles();
      setProfiles(response.profiles);
      setWarnings(response.warnings);

      setSelectedProfileId(current => {
        if (current && response.profiles.some(profile => profile.id === current)) {
          return current;
        }
        return response.profiles[0]?.id ?? '';
      });
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void loadProfiles();
  }, [open, loadProfiles]);

  useEffect(() => {
    if (!open) return;
    if (!defaultDatasets || defaultDatasets.length === 0) return;
    setSelectedDatasets(Array.from(new Set(defaultDatasets)));
  }, [defaultDatasets, open]);

  useEffect(() => {
    if (!selectedProfile) return;
    setSelectedDatasets(current => {
      const filtered = current.filter(dataset =>
        selectedProfile.availableDatasets.includes(dataset)
      );
      if (filtered.length > 0) return filtered;
      return [...selectedProfile.availableDatasets];
    });
  }, [selectedProfile]);

  const toggleDataset = useCallback((dataset: ImportDataset) => {
    setSelectedDatasets(current => {
      if (current.includes(dataset)) {
        if (current.length === 1) return current;
        return current.filter(item => item !== dataset);
      }
      return [...current, dataset];
    });
  }, []);

  const runPreview = useCallback(async () => {
    if (!selectedProfileId) return null;
    setIsPreviewing(true);
    try {
      const response = await previewBrowserImport({
        profileId: selectedProfileId,
        datasets: selectedDatasets,
      });
      setPreview(response);
      if (response.warnings.length > 0) {
        setWarnings(response.warnings);
      }
      return response;
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedProfileId, selectedDatasets]);

  const runImport = useCallback(async (): Promise<ImportRunResult | null> => {
    if (!selectedProfileId) return null;
    setIsImporting(true);
    try {
      const result = await runBrowserImport({
        profileId: selectedProfileId,
        datasets: selectedDatasets,
      });
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      setPreview({
        profile: result.profile,
        counts: result.counts,
        warnings: result.warnings,
      });
      return result;
    } finally {
      setIsImporting(false);
    }
  }, [selectedProfileId, selectedDatasets]);

  return {
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
    setSelectedDatasets,
    toggleDataset,
    loadProfiles,
    runPreview,
    runImport,
  };
}
