// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import AuthLayout from '../../../layouts/auth.vue';

const isDarkRef = ref(true);

vi.mock('@operon/preferences', () => ({
  preferences: {
    app: { name: 'Specter' },
    logo: { source: '/logo.svg', sourceDark: '/logo-dark.svg' },
  },
  usePreferences: () => ({
    isDark: isDarkRef,
  }),
}));

vi.mock('@operon/layouts', () => ({
  AuthPageLayout: defineComponent({
    name: 'AuthPageLayoutStub',
    setup(_props, { slots }) {
      return () => h('div', { class: 'auth-layout-stub' }, slots.slogan?.());
    },
  }),
}));

vi.mock('#/components/common/spline-robot-banner.vue', () => ({
  default: defineComponent({
    name: 'SplineRobotBannerStub',
    setup() {
      return () => h('div', { class: 'spline-robot-banner-stub' }, 'robot-3d');
    },
  }),
}));

vi.mock('#/components/common/hairline-phone-banner.vue', () => ({
  default: defineComponent({
    name: 'HairlinePhoneBannerStub',
    setup() {
      return () => h('div', { class: 'hairline-phone-banner-stub' }, 'phone');
    },
  }),
}));

describe('auth banner theme switching', () => {
  it('renders 3D robot banner in dark mode and switches to phone in light mode', async () => {
    isDarkRef.value = true;
    const container = document.createElement('div');
    document.body.append(container);
    const app = createApp(AuthLayout);

    try {
      app.mount(container);
      await nextTick();

      // Dark mode: Spline 3D Robot
      expect(
        container.querySelector('.spline-robot-banner-stub'),
      ).not.toBeNull();
      expect(container.querySelector('.hairline-phone-banner-stub')).toBeNull();

      // Switch to light mode
      isDarkRef.value = false;
      await nextTick();

      // Light mode: Hairline Phone
      expect(container.querySelector('.spline-robot-banner-stub')).toBeNull();
      expect(
        container.querySelector('.hairline-phone-banner-stub'),
      ).not.toBeNull();

      // Ensure manual scene switcher buttons are completely gone
      expect(container.querySelectorAll('button').length).toBe(0);
    } finally {
      app.unmount();
      container.remove();
    }
  });
});
