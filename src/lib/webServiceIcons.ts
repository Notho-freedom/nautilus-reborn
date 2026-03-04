import type { WebServiceId } from './settings';

const LOCAL_WEB_SERVICE_ICONS: Partial<Record<WebServiceId, string>> = {
  youtubeMusic: '/web-icons/youtube-music.png',
  youtube: '/web-icons/youtube.png',
  chatgpt: '/web-icons/chatgpt.png',
  deepseek: '/web-icons/deepseek.png',
  whatsapp: '/web-icons/whatsapp.png',
  telegram: '/web-icons/telegram.png',
};

function buildFaviconUrl(url: string, size = 64): string | null {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
  } catch {
    return null;
  }
}

export function getWebServiceIconCandidates(serviceId: WebServiceId, url: string): string[] {
  const candidates: string[] = [];
  const localIcon = LOCAL_WEB_SERVICE_ICONS[serviceId];
  if (localIcon) {
    candidates.push(localIcon);
  }

  const favicon = buildFaviconUrl(url);
  if (favicon && !candidates.includes(favicon)) {
    candidates.push(favicon);
  }

  return candidates;
}

