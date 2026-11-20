<script lang="ts" setup>
import type { NotificationItem } from '@operon/layouts';

import { computed, watch } from 'vue';
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

import DaemonStatusPill from '#/components/common/daemon-status-pill.vue';
import LocalBridgeNotice from '#/components/common/local-bridge-notice.vue';
import TenantSelector from '#/components/common/tenant-selector.vue';
import { $t } from '#/locales';
import { useAuthStore, useNotificationStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const notificationStore = useNotificationStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();

const notifications = computed(() => notificationStore.items);
const showDot = computed(() => notificationStore.hasUnread);

const menus = computed(() => {
  const baseMenus = [
    {
      handler: () => {
        router.push({ name: 'Welcome' });
      },
      icon: 'lucide:sparkles',
      text: $t('page.welcome.title'),
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
  ];

  if (isAuthenticated.value) {
    return [
      {
        handler: () => {
          router.push({ name: 'Profile' });
        },
        icon: 'lucide:user',
        text: $t('page.auth.profile'),
      },
      ...baseMenus,
    ];
  }

  return baseMenus;
});

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

const isAuthenticated = computed(() => Boolean(accessStore.accessToken));

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notificationStore.clear();
}

function markRead(id: number | string) {
  notificationStore.markRead(id);
}

function remove(id: number | string) {
  notificationStore.remove(id);
}

function handleMakeAll() {
  notificationStore.markAllRead();
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
    :avatar="isAuthenticated ? avatar : undefined"
    :text="isAuthenticated ? userStore.userInfo?.realName : undefined"
    @clear-preferences-and-logout="handleLogout"
    @logout="handleLogout"
  >
    <template #tenant-selector="{ collapsed }">
      <TenantSelector :collapsed="Boolean(collapsed)" />
    </template>
    <template #sidebar-footer="{ collapsed }">
      <DaemonStatusPill :collapsed="collapsed" />
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar="isAuthenticated ? avatar : undefined"
        :avatar-dot="isAuthenticated"
        :menus
        :show-label="isAuthenticated"
        :text="
          isAuthenticated
            ? userStore.userInfo?.realName
            : $t('authentication.localOperator') || 'Local Operator'
        "
        :description="
          isAuthenticated
            ? userStore.userInfo?.username || ''
            : $t('authentication.notLoggedIn') || 'Local Session'
        "
        :tag-text="isAuthenticated ? 'ID' : undefined"
        :show-logout="isAuthenticated"
        @clear-preferences-and-logout="handleLogout"
        @logout="handleLogout"
      />
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
      <LocalBridgeNotice />
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
        :title="
          isAuthenticated ? undefined : $t('authentication.cloudSignInTitle')
        "
        :sub-title="
          isAuthenticated ? undefined : $t('authentication.cloudSignInSubTitle')
        "
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
