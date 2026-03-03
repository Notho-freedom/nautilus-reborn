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
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && e.key === 't') { e.preventDefault(); actions.newTab(); }
      else if (ctrl && e.key === 'w') { e.preventDefault(); actions.closeTab(); }
      else if (ctrl && shift && e.key === 'Tab') { e.preventDefault(); actions.prevTab(); }
      else if (ctrl && e.key === 'Tab') { e.preventDefault(); actions.nextTab(); }
      else if (e.key === 'F12' || (ctrl && shift && e.key === 'I')) { e.preventDefault(); actions.toggleDevTools(); }
      else if (ctrl && e.key === 'h') { e.preventDefault(); actions.openHistory(); }
      else if (ctrl && e.key === 'j') { e.preventDefault(); actions.openDownloads(); }
      else if (ctrl && e.key === ',') { e.preventDefault(); actions.openSettings(); }
      else if (ctrl && e.key === 'l') { e.preventDefault(); actions.focusUrlBar(); }
      else if (ctrl && e.key === 'd') { e.preventDefault(); actions.addBookmark(); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions]);
}
