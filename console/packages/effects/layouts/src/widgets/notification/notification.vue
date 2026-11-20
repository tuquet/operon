<script lang="ts" setup>
import type { NotificationItem } from './types';

import { Bell, CircleCheckBig, CircleX, MailCheck } from '@operon/icons';
import { $t } from '@operon/locales';

import {
  Button,
  Empty,
  EmptyHeader,
  EmptyTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
} from '@operon-core/shadcn-ui';

import { useToggle } from '@vueuse/core';

defineOptions({ name: 'NotificationPopup' });

withDefaults(
  defineProps<{
    /** Show dot indicator */
    dot?: boolean;
    /** Notification list */
    notifications?: NotificationItem[];
  }>(),
  {
    dot: false,
    notifications: () => [],
  },
);

const emit = defineEmits<{
  clear: [];
  makeAll: [];
  onClick: [NotificationItem];
  read: [NotificationItem];
  remove: [NotificationItem];
  viewAll: [];
}>();

const [open, toggle] = useToggle();

const close = () => {
  open.value = false;
};

function handleViewAll() {
  emit('viewAll');
  close();
}

function handleMakeAll() {
  emit('makeAll');
}

function handleClear() {
  emit('clear');
}

defineExpose({ toggle });
</script>
<template>
  <div class="inline-flex empty:hidden">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <slot name="trigger">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="bell-button relative"
            :title="$t('ui.widgets.notifications')"
            :aria-label="$t('ui.widgets.notifications')"
          >
            <span
              v-if="dot"
              class="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary"
              aria-hidden="true"
            ></span>
            <Bell />
          </Button>
        </slot>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        class="w-90 max-w-[calc(100vw-1rem)] p-0"
        :aria-label="$t('ui.widgets.notifications')"
      >
        <div class="flex items-center justify-between gap-2 px-4 py-3">
          <h2 class="text-sm font-semibold">
            {{ $t('ui.widgets.notifications') }}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :disabled="!notifications.length"
            :title="$t('ui.widgets.markAllAsRead')"
            :aria-label="$t('ui.widgets.markAllAsRead')"
            @click="handleMakeAll"
          >
            <MailCheck />
          </Button>
        </div>
        <Separator />
        <ScrollArea v-if="notifications.length" class="h-90 max-h-[50vh]">
          <ul class="w-full">
            <li
              v-for="(item, index) in notifications"
              :key="item.id ?? item.title"
            >
              <Separator v-if="index > 0" />
              <div class="flex items-start gap-2 p-3">
                <slot name="content" :item="item">
                  <Button
                    type="button"
                    variant="ghost"
                    class="h-auto min-w-0 flex-1 flex-col items-start justify-start gap-1 whitespace-normal text-left"
                    @click="emit('onClick', item)"
                  >
                    <span class="flex items-center gap-2 text-sm font-medium">
                      <span
                        v-if="!item.isRead"
                        class="size-2 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      ></span>
                      {{ item.title }}
                    </span>
                    <span class="line-clamp-2 text-sm text-muted-foreground">
                      {{ item.message }}
                    </span>
                    <span class="text-xs text-muted-foreground">{{
                      item.date
                    }}</span>
                  </Button>
                  <div class="flex shrink-0 gap-1">
                    <slot name="action" :item="item">
                      <slot name="action-prepend" :item="item"></slot>
                      <Button
                        v-if="!item.isRead"
                        type="button"
                        variant="ghost"
                        size="icon"
                        :title="$t('ui.widgets.markAllAsRead')"
                        :aria-label="$t('ui.widgets.markAllAsRead')"
                        @click="emit('read', item)"
                      >
                        <CircleCheckBig />
                      </Button>
                      <Button
                        v-else
                        type="button"
                        variant="ghost"
                        size="icon"
                        :title="$t('common.delete')"
                        :aria-label="$t('common.delete')"
                        @click="emit('remove', item)"
                      >
                        <CircleX />
                      </Button>
                      <slot name="action-append" :item="item"></slot>
                    </slot>
                  </div>
                </slot>
              </div>
            </li>
          </ul>
        </ScrollArea>
        <Empty v-else class="py-8">
          <EmptyHeader>
            <EmptyTitle>{{ $t('common.noData') }}</EmptyTitle>
          </EmptyHeader>
        </Empty>
        <Separator />
        <div class="flex items-center justify-between gap-2 px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            :disabled="!notifications.length"
            @click="handleClear"
          >
            {{ $t('ui.widgets.clearNotifications') }}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            @click="handleViewAll"
          >
            {{ $t('ui.widgets.viewAll') }}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>
