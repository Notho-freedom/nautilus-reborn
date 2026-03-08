import { useEffect } from 'react';

interface ShortcutActions {
  newTab: () => void;
  closeTab: () => void;
  nextTab: () => void;
  prevTab: () => void;
  toggleDevTools: () => void;
  openHistory: () => void;
  openDownloads: () => void;
  openSettings: () => void;
  focusUrlBar: () => void;
  addBookmark: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    };

    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (ctrl && key === 't') { e.preventDefault(); actions.newTab(); }
      else if (ctrl && key === 'w') { e.preventDefault(); actions.closeTab(); }
      else if (ctrl && shift && e.key === 'Tab') { e.preventDefault(); actions.prevTab(); }
      else if (ctrl && e.key === 'Tab') { e.preventDefault(); actions.nextTab(); }
      else if (e.key === 'F12' || (ctrl && shift && key === 'i')) { e.preventDefault(); actions.toggleDevTools(); }
      else if (ctrl && key === 'h') { e.preventDefault(); actions.openHistory(); }
      else if (ctrl && key === 'j' && !shift) { e.preventDefault(); actions.openDownloads(); }
      else if (ctrl && key === ',') { e.preventDefault(); actions.openSettings(); }
      else if (ctrl && key === 'l') { e.preventDefault(); actions.focusUrlBar(); }
      else if (ctrl && key === 'd') { e.preventDefault(); actions.addBookmark(); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
