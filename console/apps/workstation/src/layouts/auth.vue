<script lang="ts" setup>
import { computed, ref } from 'vue';

import { AuthPageLayout } from '@operon/layouts';
import { preferences, usePreferences } from '@operon/preferences';

import { isTauriEnvironment } from '#/adapter/desktop';
import HairlinePhoneBanner from '#/components/common/hairline-phone-banner.vue';
import SplineRobotBanner from '#/components/common/spline-robot-banner.vue';
import DesktopTitlebar from '#/layouts/widgets/desktop-titlebar.vue';

const isDesktop = ref(isTauriEnvironment());
const { isDark } = usePreferences();

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);
const logoDark = computed(() => preferences.logo.sourceDark);
</script>

<template>
  <div
    :class="
      isDesktop
        ? 'flex h-screen w-full flex-col overflow-hidden bg-background'
        : 'contents'
    "
  >
    <DesktopTitlebar v-if="isDesktop" />
    <div :class="isDesktop ? 'relative flex-1 overflow-hidden' : 'contents'">
      <AuthPageLayout :app-name="appName" :logo="logo" :logo-dark="logoDark">
        <template #slogan>
          <div class="relative flex size-full items-center justify-center">
            <!-- High-performance theme adaptive banners with KeepAlive caching -->
            <KeepAlive>
              <SplineRobotBanner v-if="isDark" key="robot" />
              <HairlinePhoneBanner v-else key="phone" />
            </KeepAlive>
          </div>
        </template>
      </AuthPageLayout>
    </div>
  </div>
</template>
