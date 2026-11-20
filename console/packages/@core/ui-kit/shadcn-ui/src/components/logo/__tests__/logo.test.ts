import { createApp, h } from 'vue';

import { describe, expect, it } from 'vitest';

import VbenLogo from '../logo.vue';

function mountLogo(props: Record<string, unknown>) {
  const container = document.createElement('div');
  const app = createApp({
    render: () => h(VbenLogo, props as any),
  });
  app.mount(container);
  return {
    container,
    unmount: () => app.unmount(),
  };
}

describe('VbenLogo — Built-in Theme Inline SVG & Fallback', () => {
  it('renders an inline theme-reactive SVG when src is default /logo.svg or empty', () => {
    const { container, unmount } = mountLogo({
      src: '/logo.svg',
      text: 'Admin',
      logoSize: 32,
    });

    const svg = container.querySelector('svg[data-specter-logo="true"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');

    const html = svg?.outerHTML ?? '';
    expect(html).toContain('#52525B');
    expect(html).toContain('#3F3F46');
    expect(html).toContain('#FAFAFA');
    expect(html).toContain('hsl(var(--primary) / 0.22)');
    expect(container.textContent).toContain('Admin');
    unmount();
  });

  it('renders dark high-contrast palette when theme is dark', () => {
    const { container, unmount } = mountLogo({
      src: '/logo.svg',
      text: 'Admin',
      theme: 'dark',
    });

    const svg = container.querySelector('svg[data-specter-logo="true"]');
    expect(svg).not.toBeNull();
    const html = svg?.outerHTML ?? '';
    expect(html).toContain('#FFFFFF');
    expect(html).toContain('#E4E4E7');
    expect(html).toContain('#09090B');
    expect(html).toContain('rgb(228 228 231 / 0.16)');
    unmount();
  });

  it('renders inline SVG for /logo-app.svg as well', () => {
    const { container, unmount } = mountLogo({
      src: '/logo-app.svg',
      text: 'Specter',
    });

    expect(
      container.querySelector('svg[data-specter-logo="true"]'),
    ).not.toBeNull();
    unmount();
  });

  it('falls back to VbenAvatar when a custom external image URL is passed', () => {
    const { container, unmount } = mountLogo({
      src: 'https://example.com/custom-brand.png',
      text: 'Custom Brand',
    });

    expect(container.querySelector('svg[data-specter-logo="true"]')).toBeNull();
    unmount();
  });

  it('hides logo text when collapsed is true', () => {
    const { container, unmount } = mountLogo({
      src: '/logo.svg',
      text: 'Admin',
      collapsed: true,
    });

    expect(
      container.querySelector('svg[data-specter-logo="true"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain('Admin');
    unmount();
  });
});
