import type { StudioRecordedEvent } from '../../shared/browser-contract';
import {
  desktopStudioApplyCss,
  desktopStudioCaptureFullPage,
  desktopStudioCaptureViewport,
  desktopStudioClearCss,
  desktopStudioGetRecording,
  desktopStudioResizeWindow,
  desktopStudioRunScript,
  desktopStudioStartRecording,
  desktopStudioStopRecording,
  isDesktopRuntime,
} from './electronBridge';

export interface StudioDevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: 'smartphone' | 'tablet' | 'laptop' | 'monitor';
}

export const STUDIO_DEVICE_PRESETS: StudioDevicePreset[] = [
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, icon: 'smartphone' },
  { id: 'ipad-pro', name: 'iPad Pro', width: 1024, height: 1366, icon: 'tablet' },
  { id: 'macbook', name: 'MacBook', width: 1440, height: 900, icon: 'laptop' },
  { id: 'desktop', name: 'Desktop', width: 1920, height: 1080, icon: 'monitor' },
];

export async function studioResizeToPreset(preset: StudioDevicePreset): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopStudioResizeWindow({
    width: preset.width,
    height: preset.height,
  });
}

export async function studioCaptureViewport() {
  if (!isDesktopRuntime()) return null;
  return desktopStudioCaptureViewport();
}

export async function studioCaptureFullPage() {
  if (!isDesktopRuntime()) return null;
  return desktopStudioCaptureFullPage();
}

export async function studioApplyCss(css: string): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopStudioApplyCss(css);
}

export async function studioClearCss(): Promise<void> {
  if (!isDesktopRuntime()) return;
  await desktopStudioClearCss();
}

export async function studioRunScript(script: string): Promise<string> {
  if (!isDesktopRuntime()) return 'Studio actions require desktop mode.';
  const result = await desktopStudioRunScript(script);
  return result?.output ?? '';
}

export async function studioStartRecording() {
  if (!isDesktopRuntime()) {
    return { isRecording: false, startedAt: null, events: [] };
  }
  return desktopStudioStartRecording();
}

export async function studioStopRecording() {
  if (!isDesktopRuntime()) {
    return { isRecording: false, startedAt: null, events: [] };
  }
  return desktopStudioStopRecording();
}

export async function studioGetRecording() {
  if (!isDesktopRuntime()) {
    return { isRecording: false, startedAt: null, events: [] };
  }
  return desktopStudioGetRecording();
}

export function exportRecordingAsPlaywright(events: StudioRecordedEvent[]): string {
  const lines = [
    "import { test, expect } from '@playwright/test';",
    '',
    "test('recorded flow', async ({ page }) => {",
    '  await page.goto("https://example.com");',
  ];

  for (const event of events) {
    if (event.type === 'click' && event.selector) {
      lines.push(`  await page.click(${JSON.stringify(event.selector)});`);
      continue;
    }
    if (event.type === 'input' && event.selector) {
      lines.push(
        `  await page.fill(${JSON.stringify(event.selector)}, ${JSON.stringify(event.value || '')});`
      );
      continue;
    }
    if (event.type === 'scroll') {
      const y = Number(event.value || 0) || 0;
      lines.push(`  await page.evaluate(() => window.scrollTo(0, ${Math.max(0, Math.floor(y))}));`);
    }
  }

  lines.push('});');
  return lines.join('\n');
}

export function exportRecordingAsCypress(events: StudioRecordedEvent[]): string {
  const lines = [
    "describe('recorded flow', () => {",
    "  it('replays interactions', () => {",
    '    cy.visit("https://example.com");',
  ];

  for (const event of events) {
    if (event.type === 'click' && event.selector) {
      lines.push(`    cy.get(${JSON.stringify(event.selector)}).click();`);
      continue;
    }
    if (event.type === 'input' && event.selector) {
      lines.push(
        `    cy.get(${JSON.stringify(event.selector)}).clear().type(${JSON.stringify(event.value || '')});`
      );
      continue;
    }
    if (event.type === 'scroll') {
      const y = Number(event.value || 0) || 0;
      lines.push(`    cy.scrollTo(0, ${Math.max(0, Math.floor(y))});`);
    }
  }

  lines.push('  });');
  lines.push('});');
  return lines.join('\n');
}
