import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadScript } from '../resources';

describe('loadScript', () => {
  beforeEach(() => {
    // Clear head before each test to ensure clean environment
    document.head.innerHTML = '';
  });

  it('should resolve when the script loads successfully', async () => {
    // happy-dom v20+ auto-fires 'load' via handleDisabledFileLoadingAsSuccess
    const promise = loadScript('/test-script.js');

    const script = document.querySelector(
      'script[src="/test-script.js"]',
    ) as HTMLScriptElement;
    expect(script).toBeTruthy();

    await expect(promise).resolves.toBeUndefined();
  });

  it('should not insert duplicate script and resolve immediately if already loaded', async () => {
    // Manually insert script with same src first
    const existing = document.createElement('script');
    existing.src = 'bar.js';
    document.head.append(existing);

    // Invoke again
    const promise = loadScript('bar.js');

    // Resolve immediately
    await expect(promise).resolves.toBeUndefined();

    // Retain only one in head
    const scripts = document.head.querySelectorAll('script[src="bar.js"]');
    expect(scripts).toHaveLength(1);
  });

  it('should reject when the script fails to load', async () => {
    const captured: { script?: HTMLScriptElement } = {};

    // Intercept append and capture script element without inserting into DOM,
    // preventing happy-dom v20+ from auto-firing load event
    const appendSpy = vi
      .spyOn(document.head, 'append')
      .mockImplementation((...nodes) => {
        for (const node of nodes) {
          if (node instanceof HTMLScriptElement) {
            captured.script = node;
          }
        }
      });

    const promise = loadScript('error.js');

    appendSpy.mockRestore();

    expect(captured.script).toBeTruthy();
    if (!captured.script) {
      throw new Error('Expected the captured script element to exist');
    }
    captured.script.dispatchEvent(new Event('error'));

    await expect(promise).rejects.toThrow('Failed to load script: error.js');
  });

  it('should handle multiple concurrent calls and only insert one script tag', async () => {
    const p1 = loadScript('/test-script.js');
    const p2 = loadScript('/test-script.js');

    // happy-dom v20+ auto-fires 'load'; both promises should resolve
    await expect(p1).resolves.toBeUndefined();
    await expect(p2).resolves.toBeUndefined();

    // Insert only once
    const scripts = document.head.querySelectorAll(
      'script[src="/test-script.js"]',
    );
    expect(scripts).toHaveLength(1);
  });
});
