import { ipcRenderer } from 'electron';
import { BrowserIpcChannels } from '../../shared/browser-contract';
import type {
  ExternalOverlay,
  ExternalOverlayDialog,
  ExternalOverlayEvent,
  ExternalOverlayMenu,
  ExternalOverlayState,
} from '../../shared/overlay-contract';

const ROOT_ID = 'notilus-external-overlay-root';
const STYLE = `
:host{all:initial}
#container{
  position:fixed;
  inset:0;
  z-index:2147483647;
  pointer-events:none;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
}
.backdrop{
  position:fixed; inset:0; background:rgba(8,8,12,.42); pointer-events:auto;
}
.panel{
  position:fixed;
  pointer-events:auto;
  background:rgba(18,18,24,.96);
  color:#f5f5f7;
  border:1px solid rgba(255,255,255,.12);
  border-radius:10px;
  box-shadow:0 18px 42px rgba(0,0,0,.35);
  backdrop-filter: blur(8px);
}
.menu-item{
  width:100%;
  display:block;
  border:none;
  background:transparent;
  color:inherit;
  text-align:left;
  font-size:12px;
  padding:8px 10px;
  cursor:pointer;
}
.menu-item:hover{ background:rgba(255,255,255,.08);}
.menu-item[data-tone="danger"]{ color:#ff6b7a; }
.menu-item:disabled{ opacity:.45; cursor:not-allowed; }
.dialog-title{
  font-size:12px;
  letter-spacing:.1em;
  text-transform:uppercase;
  color:rgba(255,255,255,.72);
  margin-bottom:8px;
}
.dialog-input{
  width:100%;
  box-sizing:border-box;
  height:34px;
  border-radius:8px;
  border:1px solid rgba(255,255,255,.16);
  background:rgba(10,10,14,.76);
  color:#fff;
  padding:0 10px;
  font-size:12px;
  outline:none;
}
.dialog-input:focus{
  border-color:rgba(255,96,128,.72);
}
.section-head{
  margin-top:10px;
  margin-bottom:6px;
  font-size:10px;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:rgba(255,255,255,.55);
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.tiny-link{
  border:none;
  background:transparent;
  color:rgba(255,96,128,.9);
  font-size:10px;
  cursor:pointer;
}
.row{
  width:100%;
  border:none;
  background:transparent;
  color:#fff;
  text-align:left;
  padding:8px;
  border-radius:8px;
  cursor:pointer;
}
.row:hover{ background:rgba(255,255,255,.08); }
.row-title{
  font-size:12px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.row-domain{
  font-size:10px;
  color:rgba(255,255,255,.62);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.close-btn{
  position:absolute;
  top:8px;
  right:8px;
  border:none;
  background:transparent;
  color:rgba(255,255,255,.7);
  cursor:pointer;
  font-size:14px;
  line-height:1;
}
`;

let root: HTMLDivElement | null = null;
let shadowHost: HTMLDivElement | null = null;
let shadowContainer: HTMLDivElement | null = null;
let currentState: ExternalOverlayState = {
  tabId: null,
  overlays: [],
  blocking: false,
};

function ensureRoot(): HTMLDivElement {
  if (root) return root;
  shadowHost = document.createElement('div');
  shadowHost.id = ROOT_ID;
  shadowHost.style.position = 'fixed';
  shadowHost.style.inset = '0';
  shadowHost.style.zIndex = '2147483647';
  shadowHost.style.pointerEvents = 'none';

  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  shadowContainer = document.createElement('div');
  shadowContainer.id = 'container';
  shadowRoot.append(style, shadowContainer);
  document.documentElement.appendChild(shadowHost);
  root = shadowContainer;
  return root;
}

function emitOverlayEvent(payload: Omit<ExternalOverlayEvent, 'tabId'>): void {
  ipcRenderer.send(BrowserIpcChannels.overlayEvent, {
    tabId: currentState.tabId ?? '',
    ...payload,
  });
}

function createBackdrop(overlayId: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = 'backdrop';
  node.addEventListener('click', () => {
    emitOverlayEvent({ overlayId, action: 'close' });
  });
  return node;
}

function createMenuOverlay(overlay: ExternalOverlayMenu): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'panel';
  menu.style.left = `${Math.max(8, Math.floor(overlay.anchor.x))}px`;
  menu.style.top = `${Math.max(8, Math.floor(overlay.anchor.y + overlay.anchor.height + 6))}px`;
  menu.style.width = `${Math.max(180, Math.floor(overlay.width ?? 220))}px`;
  menu.style.padding = '6px';

  for (const item of overlay.items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-item';
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    if (item.tone) {
      button.dataset.tone = item.tone;
    }
    button.addEventListener('click', () => {
      emitOverlayEvent({
        overlayId: overlay.id,
        action: item.id,
      });
    });
    menu.appendChild(button);
  }

  return menu;
}

function splitRows(rows: ExternalOverlayDialog['rows']) {
  const open = rows.filter(row => row.section === 'open');
  const recent = rows.filter(row => row.section === 'recent');
  return { open, recent };
}

function createDialogRows(
  overlay: ExternalOverlayDialog,
  rows: ExternalOverlayDialog['rows'],
  action: string
): HTMLElement {
  const wrapper = document.createElement('div');
  for (const row of rows) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'row';
    button.addEventListener('click', () => {
      emitOverlayEvent({
        overlayId: overlay.id,
        action,
        value: row.id,
      });
    });

    const title = document.createElement('div');
    title.className = 'row-title';
    title.textContent = row.title;
    const domain = document.createElement('div');
    domain.className = 'row-domain';
    domain.textContent = row.domain;
    button.append(title, domain);
    wrapper.appendChild(button);
  }
  return wrapper;
}

function createDialogOverlay(overlay: ExternalOverlayDialog): HTMLElement {
  const dialog = document.createElement('div');
  dialog.className = 'panel';
  dialog.style.left = `${Math.max(12, Math.floor(overlay.frame.x))}px`;
  dialog.style.top = `${Math.max(12, Math.floor(overlay.frame.y))}px`;
  dialog.style.width = `${Math.max(320, Math.floor(overlay.frame.width))}px`;
  dialog.style.maxHeight = `${Math.max(280, Math.floor(overlay.frame.height))}px`;
  dialog.style.overflow = 'auto';
  dialog.style.padding = '12px';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close-btn';
  close.textContent = '×';
  close.addEventListener('click', () => {
    emitOverlayEvent({ overlayId: overlay.id, action: 'close' });
  });

  const title = document.createElement('div');
  title.className = 'dialog-title';
  title.textContent = overlay.title;

  const input = document.createElement('input');
  input.className = 'dialog-input';
  input.value = overlay.query;
  input.placeholder = overlay.placeholder ?? 'Search...';
  input.addEventListener('input', () => {
    emitOverlayEvent({
      overlayId: overlay.id,
      action: 'query-change',
      value: input.value,
    });
  });

  const { open, recent } = splitRows(overlay.rows);
  const openHeader = document.createElement('div');
  openHeader.className = 'section-head';
  openHeader.textContent = 'Open tabs';

  const recentHeader = document.createElement('div');
  recentHeader.className = 'section-head';
  const label = document.createElement('span');
  label.textContent = 'Recently closed';
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'tiny-link';
  clearButton.textContent = 'Clear';
  clearButton.addEventListener('click', () => {
    emitOverlayEvent({
      overlayId: overlay.id,
      action: 'clear-recent',
    });
  });
  recentHeader.append(label, clearButton);

  dialog.append(close, title, input, openHeader, createDialogRows(overlay, open, 'select-open'));
  if (recent.length > 0) {
    dialog.append(recentHeader, createDialogRows(overlay, recent, 'select-recent'));
  }
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);
  return dialog;
}

function renderOverlays(overlays: ExternalOverlay[]): void {
  const container = ensureRoot();
  container.innerHTML = '';
  if (currentState.blocking) {
    const primary = overlays[0];
    if (primary) {
      container.appendChild(createBackdrop(primary.id));
    }
  }

  for (const overlay of overlays) {
    let node: HTMLElement | null = null;
    if (overlay.kind === 'menu') {
      node = createMenuOverlay(overlay);
    } else if (overlay.kind === 'dialog') {
      node = createDialogOverlay(overlay);
    }
    if (node) {
      container.appendChild(node);
    }
  }
}

function applyOverlayState(state: ExternalOverlayState): void {
  currentState = state;
  renderOverlays(state.overlays);
}

ipcRenderer.on(
  BrowserIpcChannels.overlayRender,
  (_event, payload: ExternalOverlayState) => {
    applyOverlayState(payload);
  }
);

window.addEventListener(
  'keydown',
  event => {
    if (event.key !== 'Escape') return;
    if (!currentState.overlays.length) return;
    const top = currentState.overlays[0];
    emitOverlayEvent({
      overlayId: top.id,
      action: 'close',
    });
  },
  true
);
