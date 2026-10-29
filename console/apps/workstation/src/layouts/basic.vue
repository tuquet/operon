<script lang="ts" setup>
import type { NotificationItem } from '@operon/layouts';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@operon/common-ui';
import { useWatermark } from '@operon/hooks';
import { BookOpenText, SvgGithubIcon } from '@operon/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@operon/layouts';
import { preferences, usePreferences } from '@operon/preferences';
import { useAccessStore, useUserStore } from '@operon/stores';
import { openWindow } from '@operon/utils';

import WorkspaceSelector from '#/components/common/workspace-selector.vue';
import WindowControls from '#/layouts/widgets/window-controls.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const notifications = ref<NotificationItem[]>([
  {
    avatar: 'https://operon.com/icons/cli.svg',
    date: '10m ago',
    id: 1,
    isRead: true,
    message: 'System performance reports are now available.',
    title: 'Received 14 new reports',
  },
  {
    avatar: 'https://operon.com/icons/cli.svg',
    date: '1h ago',
    id: 2,
    isRead: false,
    message: 'Mentioned you in fleet cluster status.',
    title: 'Alex replied to your thread',
  },
  {
    id: 3,
    avatar: 'https://avatar.vercel.sh/1',
    date: '2024-01-01',
    isRead: false,
    message: 'Reviewed your recent configuration changes.',
    title: 'Sarah commented on your workspace',
  },
  {
    id: 4,
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1 day ago',
    isRead: false,
    message: 'Node healthcheck scheduled for this evening.',
    title: 'Scheduled maintenance reminder',
  },
  {
    id: 5,
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1 day ago',
    isRead: false,
    message: 'Quick link to overview workspace dashboard.',
    title: 'Navigate to Workspace',
    link: '/workspace',
  },
  {
    id: 6,
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1 day ago',
    isRead: false,
    message: 'Explore documentation and operational guides.',
    title: 'Documentation',
    link: 'https://docs.operon.com',
  },
]);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();

const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
  {
    handler: () => {
      openWindow('https://docs.operon.com', {
        target: '_blank',
      });
    },
    icon: BookOpenText,
    text: $t('common.documentation'),
  },
  {
    handler: () => {
      openWindow('https://github.com/operon/console', {
        target: '_blank',
      });
    },
    icon: SvgGithubIcon,
    text: 'GitHub',
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

const viewAll = () => {};

const handleClick = (item: NotificationItem) => {
  // If notification item has a link, navigate on click
  if (item.link) {
    navigateTo(item.link, item.query, item.state);
  }
};

function navigateTo(
  link: string,
  query?: Record<string, any>,
  state?: Record<string, any>,
) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    // External link: open in new tab
    window.open(link, '_blank');
  } else {
    // Internal route: support query params and navigation state
    router.push({
      path: link,
      query: query || {},
      state,
    });
  }
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout
    :avatar
    :text="userStore.userInfo?.realName"
    @clear-preferences-and-logout="handleLogout"
    @logout="handleLogout"
  >
    <template #logo="{ collapsed }">
      <WorkspaceSelector :collapsed="collapsed" />
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="admin@operon.com"
        tag-text="ID"
        @clear-preferences-and-logout="handleLogout"
        @logout="handleLogout"
      />
    </template>
    <template #window-controls>
      <WindowControls />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="viewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
