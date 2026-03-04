import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
  });
}

const webviewPrototype = HTMLElement.prototype as Record<string, unknown>;

if (typeof webviewPrototype.getWebContentsId !== 'function') {
  webviewPrototype.getWebContentsId = () => 1;
}
if (typeof webviewPrototype.getURL !== 'function') {
  webviewPrototype.getURL = function getURL(this: HTMLElement) {
    return this.getAttribute('src') ?? '';
  };
}
if (typeof webviewPrototype.getTitle !== 'function') {
  webviewPrototype.getTitle = () => '';
}
if (typeof webviewPrototype.isLoading !== 'function') {
  webviewPrototype.isLoading = () => false;
}
if (typeof webviewPrototype.canGoBack !== 'function') {
  webviewPrototype.canGoBack = () => false;
}
if (typeof webviewPrototype.canGoForward !== 'function') {
  webviewPrototype.canGoForward = () => false;
}
if (typeof webviewPrototype.loadURL !== 'function') {
  webviewPrototype.loadURL = async function loadURL(this: HTMLElement, url: string) {
    this.setAttribute('src', url);
  };
}
if (typeof webviewPrototype.goBack !== 'function') {
  webviewPrototype.goBack = () => {};
}
if (typeof webviewPrototype.goForward !== 'function') {
  webviewPrototype.goForward = () => {};
}
if (typeof webviewPrototype.reload !== 'function') {
  webviewPrototype.reload = () => {};
}
