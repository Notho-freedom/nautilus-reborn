import { app, type Session } from 'electron';

const configuredSessions = new WeakSet<Session>();

export function buildChromeUserAgent(): string | null {
  const chromeVersion = process.versions.chrome;
  if (!chromeVersion) return null;
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

export function buildAcceptLanguage(): string {
  const locale = (typeof app.getLocale === 'function' ? app.getLocale() : 'en-US') || 'en-US';
  const normalized = locale.replace('_', '-');
  const base = normalized.split('-')[0] || normalized;
  if (base.toLowerCase() === normalized.toLowerCase()) {
    return `${normalized},en;q=0.8`;
  }
  return `${normalized},${base};q=0.9,en;q=0.8`;
}

export function applyUserAgentOverrides(
  targetSession: Session,
  userAgent: string,
  acceptLanguage: string
): void {
  if (configuredSessions.has(targetSession)) return;
  configuredSessions.add(targetSession);

  try {
    targetSession.setUserAgent(userAgent, acceptLanguage);
  } catch {
    // ignore
  }

  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (lower === 'user-agent' || lower === 'accept-language') {
        delete headers[key];
        continue;
      }
      if (lower.startsWith('sec-ch-ua')) {
        delete headers[key];
      }
    }

    headers['User-Agent'] = userAgent;
    headers['Accept-Language'] = acceptLanguage;

    callback({ requestHeaders: headers });
  });
}

export function ensureUserAgentCompatForSession(targetSession: Session): void {
  const userAgent = buildChromeUserAgent();
  if (!userAgent) return;
  const acceptLanguage = buildAcceptLanguage();
  applyUserAgentOverrides(targetSession, userAgent, acceptLanguage);
}
