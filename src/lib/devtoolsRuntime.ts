import type {
  DOMNode,
  InspectedElementDetails,
  PerformanceMetrics,
  RuntimeFlushPayload,
  SourceFile,
  StorageItem,
} from '@/types/devtools';

function scriptResult(body: string): string {
  return `(() => { try { ${body} } catch (error) { return JSON.stringify({ __error: String(error) }); } })();`;
}

function toLiteral(value: string): string {
  return JSON.stringify(value);
}

const INJECTION_RUNTIME_BODY = String.raw`
if (window.__NOTILUS_DEVTOOLS__) return true;

const MAX_LOGS = 1000;
const MAX_PENDING_REQUESTS = 600;

const runtime = {
  logs: [],
  pendingRequests: [],
  requestMap: {},
  inspectedElement: null,
  inspectMode: false,
  overlayNode: null,
  inspectMoveHandler: null,
  inspectClickHandler: null,
  nextId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  },
  toStringSafe(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
      return String(value);
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return Object.prototype.toString.call(value);
    }
  },
  formatArgs(argsLike) {
    try {
      return Array.from(argsLike).map(item => this.toStringSafe(item)).join(' ');
    } catch {
      return '';
    }
  },
  pushLog(entry) {
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.splice(0, this.logs.length - MAX_LOGS);
    }
  },
  addLog(level, args, source, line, column, stack) {
    this.pushLog({
      id: this.nextId('log'),
      level,
      message: this.formatArgs(args),
      timestamp: Date.now(),
      source: source ?? null,
      lineNumber: Number.isFinite(line) ? line : null,
      columnNumber: Number.isFinite(column) ? column : null,
      stackTrace: stack ?? null,
      args: null,
    });
  },
  ensureRequest(id, init) {
    if (!this.requestMap[id]) {
      this.requestMap[id] = {
        id,
        method: 'GET',
        url: '',
        startTime: Date.now(),
        status: 'pending',
        requestHeaders: {},
        ...init,
      };
    }
    return this.requestMap[id];
  },
  addRequest(payload) {
    const record = this.ensureRequest(payload.id, payload);
    Object.assign(record, payload);
    this.pendingRequests.push(record);
    if (this.pendingRequests.length > MAX_PENDING_REQUESTS) {
      this.pendingRequests.splice(0, this.pendingRequests.length - MAX_PENDING_REQUESTS);
    }
  },
  updateRequest(id, updates) {
    const record = this.ensureRequest(id, { id });
    Object.assign(record, updates);
    this.pendingRequests.push({ ...record });
    if (this.pendingRequests.length > MAX_PENDING_REQUESTS) {
      this.pendingRequests.splice(0, this.pendingRequests.length - MAX_PENDING_REQUESTS);
    }
  },
  buildInspectPayload(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const styles = getComputedStyle(element);
    const attrMap = {};
    Array.from(element.attributes).forEach(attr => {
      attrMap[attr.name] = attr.value;
    });

    const toNumber = value => {
      const parsed = Number.parseFloat(value || '0');
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const boxModel = {
      margin: {
        top: toNumber(styles.marginTop),
        right: toNumber(styles.marginRight),
        bottom: toNumber(styles.marginBottom),
        left: toNumber(styles.marginLeft),
      },
      border: {
        top: toNumber(styles.borderTopWidth),
        right: toNumber(styles.borderRightWidth),
        bottom: toNumber(styles.borderBottomWidth),
        left: toNumber(styles.borderLeftWidth),
      },
      padding: {
        top: toNumber(styles.paddingTop),
        right: toNumber(styles.paddingRight),
        bottom: toNumber(styles.paddingBottom),
        left: toNumber(styles.paddingLeft),
      },
    };

    const importantStyles = {
      display: styles.display,
      position: styles.position,
      width: styles.width,
      height: styles.height,
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
      fontFamily: styles.fontFamily,
      fontWeight: styles.fontWeight,
      lineHeight: styles.lineHeight,
      textAlign: styles.textAlign,
      flexDirection: styles.flexDirection,
      justifyContent: styles.justifyContent,
      alignItems: styles.alignItems,
      gap: styles.gap,
      overflow: styles.overflow,
      zIndex: styles.zIndex,
      opacity: styles.opacity,
      transform: styles.transform,
      transition: styles.transition,
    };

    return {
      tagName: String(element.tagName || '').toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      boxModel,
      computedStyles: importantStyles,
      attributes: attrMap,
      outerHTML: (element.outerHTML || '').slice(0, 2000),
      textContent: (element.textContent || '').trim().slice(0, 400),
      childCount: element.children ? element.children.length : 0,
      parentTag: element.parentElement ? String(element.parentElement.tagName).toLowerCase() : null,
    };
  },
  ensureOverlay() {
    if (this.overlayNode) return this.overlayNode;
    const node = document.createElement('div');
    node.id = '__notilus_inspect_overlay';
    node.style.position = 'fixed';
    node.style.pointerEvents = 'none';
    node.style.zIndex = '2147483646';
    node.style.border = '2px solid #f97316';
    node.style.background = 'rgba(249,115,22,0.15)';
    node.style.boxSizing = 'border-box';
    node.style.display = 'none';
    document.documentElement.appendChild(node);
    this.overlayNode = node;
    return node;
  },
  setInspectMode(enabled) {
    if (this.inspectMode === Boolean(enabled)) return;
    this.inspectMode = Boolean(enabled);

    const overlay = this.ensureOverlay();

    if (!this.inspectMode) {
      overlay.style.display = 'none';
      if (this.inspectMoveHandler) {
        document.removeEventListener('mousemove', this.inspectMoveHandler, true);
      }
      if (this.inspectClickHandler) {
        document.removeEventListener('click', this.inspectClickHandler, true);
      }
      this.inspectMoveHandler = null;
      this.inspectClickHandler = null;
      document.documentElement.style.cursor = '';
      return;
    }

    document.documentElement.style.cursor = 'crosshair';

    this.inspectMoveHandler = event => {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (!target || target === overlay || target.id === '__notilus_inspect_overlay') {
        overlay.style.display = 'none';
        return;
      }
      const rect = target.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.left = rect.left + 'px';
      overlay.style.top = rect.top + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
    };

    this.inspectClickHandler = event => {
      event.preventDefault();
      event.stopPropagation();
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (!target || target === overlay || target.id === '__notilus_inspect_overlay') {
        return;
      }
      this.inspectedElement = this.buildInspectPayload(target);
      this.setInspectMode(false);
    };

    document.addEventListener('mousemove', this.inspectMoveHandler, true);
    document.addEventListener('click', this.inspectClickHandler, true);
  },
  flush() {
    const payload = {
      logs: this.logs.slice(),
      requests: this.pendingRequests.slice(),
      inspectedElement: this.inspectedElement,
    };
    this.logs = [];
    this.pendingRequests = [];
    this.inspectedElement = null;
    return payload;
  },
  clearConsole() {
    this.logs = [];
  },
  clearNetwork() {
    this.pendingRequests = [];
    this.requestMap = {};
  },
};

window.__NOTILUS_DEVTOOLS__ = runtime;

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
  console[level] = function patchedConsole(...args) {
    originalConsole[level].apply(console, args);
    runtime.addLog(level, args, null, null, null, level === 'error' ? new Error().stack : null);
  };
});

window.addEventListener('error', event => {
  runtime.addLog('error', [event.message], event.filename, event.lineno, event.colno, event.error ? event.error.stack : null);
});

window.addEventListener('unhandledrejection', event => {
  runtime.addLog('error', ['Unhandled Promise Rejection:', event.reason], null, null, null, event.reason && event.reason.stack ? event.reason.stack : null);
});

const NativeXMLHttpRequest = window.XMLHttpRequest;
window.XMLHttpRequest = function PatchedXMLHttpRequest() {
  const xhr = new NativeXMLHttpRequest();
  const requestId = runtime.nextId('xhr');
  const requestState = {
    id: requestId,
    method: 'GET',
    url: '',
    startTime: 0,
    requestHeaders: {},
  };

  const nativeOpen = xhr.open;
  xhr.open = function patchedOpen(method, url, ...rest) {
    requestState.method = String(method || 'GET').toUpperCase();
    requestState.url = String(url || '');
    return nativeOpen.call(this, method, url, ...rest);
  };

  const nativeSetHeader = xhr.setRequestHeader;
  xhr.setRequestHeader = function patchedSetRequestHeader(name, value) {
    requestState.requestHeaders[String(name)] = String(value);
    return nativeSetHeader.call(this, name, value);
  };

  const nativeSend = xhr.send;
  xhr.send = function patchedSend(body) {
    requestState.startTime = Date.now();
    runtime.addRequest({
      id: requestId,
      method: requestState.method,
      url: requestState.url,
      startTime: requestState.startTime,
      status: 'pending',
      requestHeaders: requestState.requestHeaders,
      requestBody: body == null ? null : String(body).slice(0, 2000),
    });
    return nativeSend.call(this, body);
  };

  xhr.addEventListener('load', () => {
    const duration = Date.now() - requestState.startTime;
    runtime.updateRequest(requestId, {
      endTime: Date.now(),
      duration,
      statusCode: xhr.status,
      statusText: xhr.statusText,
      status: xhr.status >= 200 && xhr.status < 400 ? 'success' : 'error',
      responseHeaders: xhr
        .getAllResponseHeaders()
        .split('\r\n')
        .filter(Boolean)
        .reduce((acc, line) => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            acc[key] = value;
          }
          return acc;
        }, {}),
      responseSize: typeof xhr.responseText === 'string' ? xhr.responseText.length : 0,
      mimeType: xhr.getResponseHeader('content-type'),
    });
  });

  xhr.addEventListener('error', () => {
    runtime.updateRequest(requestId, {
      endTime: Date.now(),
      duration: Date.now() - requestState.startTime,
      status: 'error',
      statusCode: 0,
    });
  });

  return xhr;
};

const nativeFetch = window.fetch;
window.fetch = function patchedFetch(input, init) {
  const requestId = runtime.nextId('fetch');
  const url = typeof input === 'string' ? input : input.url;
  const method = String((init && init.method) || 'GET').toUpperCase();
  const startTime = Date.now();

  let requestHeaders = {};
  try {
    const source = init && init.headers;
    if (source instanceof Headers) {
      source.forEach((value, key) => {
        requestHeaders[key] = value;
      });
    } else if (source && typeof source === 'object') {
      requestHeaders = Object.fromEntries(Object.entries(source));
    }
  } catch {
    requestHeaders = {};
  }

  runtime.addRequest({
    id: requestId,
    method,
    url,
    startTime,
    status: 'pending',
    requestHeaders,
    requestBody: init && init.body != null ? String(init.body).slice(0, 2000) : null,
  });

  return nativeFetch(input, init)
    .then(async response => {
      let responseSize = 0;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        responseSize = text.length;
      } catch {
        responseSize = 0;
      }

      const responseHeaders = {};
      try {
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
      } catch {
        // Ignore header parsing failures.
      }

      runtime.updateRequest(requestId, {
        endTime: Date.now(),
        duration: Date.now() - startTime,
        statusCode: response.status,
        statusText: response.statusText,
        status: response.ok ? 'success' : 'error',
        responseHeaders,
        responseSize,
        mimeType: response.headers.get('content-type'),
      });

      return response;
    })
    .catch(error => {
      runtime.updateRequest(requestId, {
        endTime: Date.now(),
        duration: Date.now() - startTime,
        status: 'error',
        statusCode: 0,
      });
      throw error;
    });
};

runtime.addLog('info', ['Notilus DevTools runtime attached'], 'notilus-runtime', null, null, null);
return true;
`;

export const DEVTOOLS_INJECTION_SCRIPT = scriptResult(INJECTION_RUNTIME_BODY);

export const DEVTOOLS_FLUSH_SCRIPT = scriptResult(
  `if (!window.__NOTILUS_DEVTOOLS__) return null; return JSON.stringify(window.__NOTILUS_DEVTOOLS__.flush());`
);

export const DEVTOOLS_CLEAR_CONSOLE_SCRIPT = scriptResult(
  `if (window.__NOTILUS_DEVTOOLS__) { window.__NOTILUS_DEVTOOLS__.clearConsole(); } return true;`
);

export const DEVTOOLS_CLEAR_NETWORK_SCRIPT = scriptResult(
  `if (window.__NOTILUS_DEVTOOLS__) { window.__NOTILUS_DEVTOOLS__.clearNetwork(); } return true;`
);

export function devtoolsSetInspectModeScript(enabled: boolean): string {
  return scriptResult(
    `if (window.__NOTILUS_DEVTOOLS__) { window.__NOTILUS_DEVTOOLS__.setInspectMode(${enabled ? 'true' : 'false'}); } return true;`
  );
}

export function devtoolsExecuteScriptWrapper(script: string): string {
  const codeLiteral = toLiteral(script);
  return scriptResult(`
    const code = ${codeLiteral};
    const result = (0, eval)(code);
    return JSON.stringify({ success: true, result: String(result), type: typeof result });
  `);
}

export const DEVTOOLS_FETCH_DOM_TREE_SCRIPT = scriptResult(`
  function serializeNode(node, depth) {
    if (!node || node.nodeType !== 1) return null;
    if (depth > 8) return null;

    const element = node;
    const children = [];
    const maxChildren = 80;

    for (let index = 0; index < element.children.length && index < maxChildren; index += 1) {
      const serialized = serializeNode(element.children[index], depth + 1);
      if (serialized) {
        children.push(serialized);
      }
    }

    const attributes = {};
    for (let index = 0; index < element.attributes.length; index += 1) {
      const attribute = element.attributes[index];
      attributes[attribute.name] = attribute.value;
    }

    let textContent = null;
    if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
      textContent = String(element.childNodes[0].textContent || '').trim().slice(0, 120);
    }

    return {
      id: Math.random().toString(36).slice(2, 9),
      tagName: String(element.tagName || '').toLowerCase(),
      nodeId: element.id || null,
      attributes,
      children,
      textContent,
    };
  }

  return JSON.stringify(serializeNode(document.documentElement, 0));
`);

export const DEVTOOLS_FETCH_PERFORMANCE_SCRIPT = scriptResult(`
  const timing = performance.timing;
  const navigation = performance.getEntriesByType('navigation')[0] || {};
  const paintEntries = performance.getEntriesByType('paint');
  const memory = performance.memory || {};

  const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
  const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');

  const payload = {
    pageLoadTime: timing.loadEventEnd ? timing.loadEventEnd - timing.navigationStart : null,
    domContentLoaded: timing.domContentLoadedEventEnd
      ? timing.domContentLoadedEventEnd - timing.navigationStart
      : null,
    firstPaint: firstPaint ? firstPaint.startTime : null,
    firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : null,
    largestContentfulPaint: navigation.largestContentfulPaint || null,
    timeToInteractive: timing.domInteractive ? timing.domInteractive - timing.navigationStart : null,
    totalBlockingTime: null,
    cumulativeLayoutShift: null,
    jsHeapSize: memory.totalJSHeapSize || null,
    usedJsHeapSize: memory.usedJSHeapSize || null,
    domNodes: document.getElementsByTagName('*').length,
    resources: performance.getEntriesByType('resource').length,
    transferSize: performance
      .getEntriesByType('resource')
      .reduce((sum, item) => sum + (item.transferSize || 0), 0),
  };

  return JSON.stringify(payload);
`);

export const DEVTOOLS_FETCH_STORAGE_SCRIPT = scriptResult(`
  const result = {
    localStorage: [],
    sessionStorage: [],
    cookies: [],
  };

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      result.localStorage.push({ key, value: String(localStorage.getItem(key)).slice(0, 2000) });
    }
  } catch {
    // Ignore localStorage access failures.
  }

  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key) continue;
      result.sessionStorage.push({ key, value: String(sessionStorage.getItem(key)).slice(0, 2000) });
    }
  } catch {
    // Ignore sessionStorage access failures.
  }

  try {
    const cookiePairs = document.cookie.split(';').map(item => item.trim()).filter(Boolean);
    cookiePairs.forEach(pair => {
      const delimiterIndex = pair.indexOf('=');
      const key = delimiterIndex >= 0 ? pair.slice(0, delimiterIndex) : pair;
      const value = delimiterIndex >= 0 ? pair.slice(delimiterIndex + 1) : '';
      result.cookies.push({ key, value: value.slice(0, 2000) });
    });
  } catch {
    // Ignore cookies access failures.
  }

  return JSON.stringify(result);
`);

export const DEVTOOLS_FETCH_SOURCES_SCRIPT = scriptResult(`
  const sources = [];
  const nowId = () => Math.random().toString(36).slice(2, 10);

  sources.push({
    id: 'document',
    url: document.location.href,
    mimeType: 'text/html',
    size: document.documentElement ? document.documentElement.outerHTML.length : 0,
  });

  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(node => {
    const src = node.getAttribute('src');
    if (!src) return;
    sources.push({
      id: nowId(),
      url: src,
      mimeType: 'application/javascript',
      size: null,
    });
  });

  const stylesheets = document.querySelectorAll('link[rel="stylesheet"][href]');
  stylesheets.forEach(node => {
    const href = node.getAttribute('href');
    if (!href) return;
    sources.push({
      id: nowId(),
      url: href,
      mimeType: 'text/css',
      size: null,
    });
  });

  return JSON.stringify(sources);
`);

export function devtoolsInspectSelectorScript(selector: string): string {
  return scriptResult(`
    const selector = ${toLiteral(selector)};
    const element = document.querySelector(selector);
    if (!element) {
      return null;
    }

    const runtime = window.__NOTILUS_DEVTOOLS__;
    if (runtime && typeof runtime.buildInspectPayload === 'function') {
      return JSON.stringify(runtime.buildInspectPayload(element));
    }

    const rect = element.getBoundingClientRect();
    return JSON.stringify({
      tagName: String(element.tagName || '').toLowerCase(),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computedStyles: {},
      attributes: {},
    });
  `);
}

export function devtoolsApplyResponsivePresetScript(preset: 'desktop' | 'tablet' | 'mobile'): string {
  const width = preset === 'desktop' ? 1920 : preset === 'tablet' ? 768 : 375;
  return scriptResult(`
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=${width}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');

    document.documentElement.style.maxWidth = '${width}px';
    document.documentElement.style.margin = '0 auto';
    document.documentElement.style.border = '';
    document.documentElement.style.boxSizing = '';
    return true;
  `);
}

export const DEVTOOLS_RESET_RESPONSIVE_SCRIPT = scriptResult(`
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
  }
  document.documentElement.style.maxWidth = '';
  document.documentElement.style.margin = '';
  document.documentElement.style.border = '';
  document.documentElement.style.boxSizing = '';
  return true;
`);

export function parseRuntimeFlushPayload(raw: string | null): RuntimeFlushPayload & {
  inspectedElement?: InspectedElementDetails | null;
} {
  if (!raw) {
    return { logs: [], requests: [], inspectedElement: null };
  }

  try {
    const parsed = JSON.parse(raw) as RuntimeFlushPayload & {
      inspectedElement?: InspectedElementDetails | null;
      __error?: string;
    };

    if (!parsed || parsed.__error) {
      return { logs: [], requests: [], inspectedElement: null };
    }

    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      inspectedElement: parsed.inspectedElement ?? null,
    };
  } catch {
    return { logs: [], requests: [], inspectedElement: null };
  }
}

export function parseJsonPayload<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

export interface StorageSnapshot {
  localStorage: StorageItem[];
  sessionStorage: StorageItem[];
  cookies: StorageItem[];
}

export function normalizeStoragePayload(payload: StorageSnapshot): Record<'localStorage' | 'sessionStorage' | 'cookie', StorageItem[]> {
  return {
    localStorage: payload.localStorage.map(item => ({ ...item, type: 'localStorage' })),
    sessionStorage: payload.sessionStorage.map(item => ({ ...item, type: 'sessionStorage' })),
    cookie: payload.cookies.map(item => ({ ...item, type: 'cookie' })),
  };
}

export type DevtoolsDataPayload = {
  domTree: DOMNode | null;
  performance: PerformanceMetrics | null;
  sources: SourceFile[];
  storage: Record<'localStorage' | 'sessionStorage' | 'cookie', StorageItem[]>;
};
