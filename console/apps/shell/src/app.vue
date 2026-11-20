<script lang="ts" setup>
import { onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  KERNEL_INJECTION_KEY,
  useLocalBridgeHeartbeat,
} from '@operon/kernel';
import { usePreferences } from '@operon/preferences';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  toast,
  Toaster,
} from '@operon-core/shadcn-ui';

import {
  initDesktopAuthHandling,
  isTauriEnvironment,
  restoreZoom,
  revealWindow,
} from '#/adapter/desktop';
import { useAppUpdater } from '#/composables/use-app-updater';
import { useGlobalShortcuts } from '#/composables/use-global-shortcuts';
import { createHostKernel } from '#/kernel/host-kernel';
import DesktopShell from '#/layouts/widgets/desktop-shell.vue';
import { $t } from '#/locales';
import {
  buildWelcomeLocation,
  hasLocalBridgeSeen,
  markLocalBridgeSeen,
  saveWelcomeRedirect,
} from '#/utils/welcome';

defineOptions({ name: 'App' });

const route = useRoute();
const router = useRouter();
const hostKernel = createHostKernel(router);
provide(KERNEL_INJECTION_KEY, hostKernel);

const { isDark } = usePreferences();
const isDesktop = isTauriEnvironment();
const bridge = useLocalBridgeHeartbeat({ intervalMs: 5000 });

const hasConnectedInSession = ref(false);
const wasOfflinePrompted = ref(false);
const disconnectPromptOpen = ref(false);
const disconnectPromptDismissed = ref(false);

useGlobalShortcuts(isDesktop);

watch(
  [bridge.status, () => route.path],
  ([status, currentPath]) => {
    if (status === 'healthy') {
      markLocalBridgeSeen();
      if (wasOfflinePrompted.value) {
        toast.success($t('page.localBridge.reconnected'));
      }
      hasConnectedInSession.value = true;
      wasOfflinePrompted.value = false;
      disconnectPromptOpen.value = false;
      disconnectPromptDismissed.value = false;
      return;
    }

    if (
      isDesktop ||
      status !== 'offline' ||
      currentPath === '/welcome' ||
      currentPath.startsWith('/auth')
    ) {
      return;
    }

    // First-time visitor who has never connected to local Operon -> redirect & cache destination
    if (!hasLocalBridgeSeen() && !hasConnectedInSession.value) {
      saveWelcomeRedirect(route.fullPath);
      void router.replace(buildWelcomeLocation(route.fullPath));
      return;
    }

    // Returning / active user whose daemon stopped -> ask before leaving current view
    wasOfflinePrompted.value = true;
    if (!disconnectPromptDismissed.value && !disconnectPromptOpen.value) {
      disconnectPromptOpen.value = true;
    }
  },
  { immediate: true },
);

function handleStayAndRetry() {
  disconnectPromptOpen.value = false;
  disconnectPromptDismissed.value = true;
  void bridge.checkNow();
}

function handleOpenSetupPage() {
  disconnectPromptOpen.value = false;
  disconnectPromptDismissed.value = true;
  saveWelcomeRedirect(route.fullPath);
  void router.push(buildWelcomeLocation(route.fullPath));
}

onMounted(async () => {
  if (isDesktop) {
    await revealWindow();
    await initDesktopAuthHandling();
    await restoreZoom();

    // Silent background check for updates after window is initialized
    setTimeout(() => {
      useAppUpdater().checkForUpdates(true);
    }, 2500);
  }
});
</script>

<template>
  <DesktopShell v-if="isDesktop">
    <RouterView />
  </DesktopShell>
  <RouterView v-else />
  <AlertDialog v-model:open="disconnectPromptOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ $t('page.localBridge.disconnectTitle') }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('page.localBridge.disconnectDescription') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleStayAndRetry">
          {{ $t('page.localBridge.disconnectStay') }}
        </AlertDialogCancel>
        <AlertDialogAction @click="handleOpenSetupPage">
          {{ $t('page.localBridge.disconnectOpenSetup') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  <Toaster
    position="top-right"
    :theme="isDark ? 'dark' : 'light'"
    rich-colors
  />
</template>
