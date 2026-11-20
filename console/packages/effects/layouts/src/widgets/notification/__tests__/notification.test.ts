import type { App } from 'vue';

import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import Notification from '../notification.vue';

let activeApp: App | undefined;

afterEach(() => {
  activeApp?.unmount();
  activeApp = undefined;
  document.body.innerHTML = '';
});

describe('notification popup', () => {
  it('renders the notification status indicator as a circle', () => {
    const host = document.createElement('div');
    document.body.append(host);

    activeApp = createApp({
      render: () => h(Notification, { dot: true }),
    });
    activeApp.mount(host);

    const indicator = host.querySelector<HTMLElement>('.bell-button > span');

    expect(indicator).not.toBeNull();
    expect(indicator?.classList).toContain('rounded-full');
    expect(indicator?.classList).not.toContain('rounded-sm');
  });

  it('renders notification text without fetching avatar images', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const notification = ref<InstanceType<typeof Notification>>();
    activeApp = createApp({
      render: () =>
        h(Notification, {
          ref: notification,
          notifications: [
            {
              id: 1,
              title: 'New report',
              message: 'Ready to review',
              date: 'Now',
              avatar: 'https://example.com/avatar.png',
              isRead: false,
            },
          ],
        }),
    });
    activeApp.mount(host);
    notification.value?.toggle();
    await nextTick();
    const popup = document.querySelector('[data-slot="popover-content"]');
    expect(popup?.textContent).toContain('New report');
    expect(popup?.textContent).toContain('Ready to review');
    expect(popup?.querySelector('img')).toBeNull();
  });
});
