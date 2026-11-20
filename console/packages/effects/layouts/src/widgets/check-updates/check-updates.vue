<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { $t } from '@operon/locales';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@operon-core/shadcn-ui';

interface Props {
  // Polling interval in minutes
  checkUpdatesInterval?: number;
  // Update check URL
  checkUpdateUrl?: string;
}

defineOptions({ name: 'CheckUpdates' });

const props = withDefaults(defineProps<Props>(), {
  checkUpdatesInterval: 1,
  checkUpdateUrl: import.meta.env.BASE_URL || '/',
});

let isCheckingUpdates = false;
const currentVersionTag = ref('');
const lastVersionTag = ref('');
const timer = ref<ReturnType<typeof setInterval>>();

const open = ref(false);
async function refresh() {
  lastVersionTag.value = currentVersionTag.value;
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.error('Failed to notify waiting service worker:', error);
    }
  }
  window.location.reload();
}

async function getVersionTag() {
  try {
    if (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1'
    ) {
      return null;
    }
    const response = await fetch(props.checkUpdateUrl, {
      cache: 'no-cache',
      method: 'HEAD',
      redirect: 'manual',
    });

    return (
      response.headers.get('etag') || response.headers.get('last-modified')
    );
  } catch {
    console.error('Failed to fetch version tag');
    return null;
  }
}

async function checkForUpdates() {
  const versionTag = await getVersionTag();
  if (!versionTag) {
    return;
  }

  // Do not prompt update on first run
  if (!lastVersionTag.value) {
    lastVersionTag.value = versionTag;
    return;
  }

  if (lastVersionTag.value !== versionTag && versionTag) {
    clearInterval(timer.value);
    handleNotice(versionTag);
  }
}
function handleNotice(versionTag: string) {
  currentVersionTag.value = versionTag;
  open.value = true;
}

function start() {
  if (props.checkUpdatesInterval <= 0) {
    return;
  }

  // Check every checkUpdatesInterval (default 1 min) minutes
  timer.value = setInterval(
    checkForUpdates,
    props.checkUpdatesInterval * 60 * 1000,
  );
}

function handleVisibilitychange() {
  if (document.hidden) {
    stop();
  } else {
    if (!isCheckingUpdates) {
      isCheckingUpdates = true;
      checkForUpdates().finally(() => {
        isCheckingUpdates = false;
        start();
      });
    }
  }
}

function stop() {
  clearInterval(timer.value);
}

onMounted(() => {
  start();
  document.addEventListener('visibilitychange', handleVisibilitychange);
});

onUnmounted(() => {
  stop();
  document.removeEventListener('visibilitychange', handleVisibilitychange);
});
</script>
<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent :open="open" centered>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ $t('ui.widgets.checkUpdatesTitle') }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t('ui.widgets.checkUpdatesDescription') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="refresh">
          {{ $t('common.refresh') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
