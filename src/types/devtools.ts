export type DevtoolsConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'table';

export interface ConsoleEntry {
  id: string;
  level: DevtoolsConsoleLevel;
  message: string;
  timestamp: number;
  source?: string | null;
  lineNumber?: number | null;
  columnNumber?: number | null;
  stackTrace?: string | null;
  args?: unknown[] | null;
}

export type RequestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE'
  | 'OTHER';

export type NetworkRequestStatus = 'pending' | 'success' | 'error' | 'cancelled';

export interface NetworkRequest {
  id: string;
  method: RequestMethod;
  url: string;
  startTime: number;
  endTime?: number;
  statusCode?: number;
  statusText?: string;
  status: NetworkRequestStatus;
  requestSize?: number;
  responseSize?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string | null;
  responseBody?: string | null;
  mimeType?: string | null;
  initiator?: string | null;
  duration?: number;
}

export interface DOMNode {
  id: string;
  tagName: string;
  nodeId?: string | null;
  attributes: Record<string, string>;
  children: DOMNode[];
  textContent?: string | null;
}

export interface PerformanceMetrics {
  pageLoadTime?: number;
  domContentLoaded?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  jsHeapSize?: number;
  usedJsHeapSize?: number;
  domNodes?: number;
  resources?: number;
  transferSize?: number;
}

export type StorageType = 'localStorage' | 'sessionStorage' | 'cookie' | 'indexedDB';

export interface StorageItem {
  key: string;
  value: string;
  type: StorageType;
}

export interface SourceFile {
  id: string;
  url: string;
  content?: string | null;
  mimeType?: string | null;
  size?: number;
}

export interface InspectedElementDetails {
  tagName: string;
  id?: string;
  className?: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  boxModel?: {
    margin: Record<string, number>;
    border: Record<string, number>;
    padding: Record<string, number>;
  };
  computedStyles?: Record<string, string>;
  attributes?: Record<string, string>;
  outerHTML?: string;
  textContent?: string;
  childCount?: number;
  parentTag?: string | null;
}

export interface RuntimeFlushPayload {
  logs: ConsoleEntry[];
  requests: NetworkRequest[];
}
