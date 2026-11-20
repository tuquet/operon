<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useKernel } from '@operon/kernel';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@operon-core/shadcn-ui';

import { ArrowRight, Bell, Table2 } from '@lucide/vue';

import { $t } from '../locales';

defineOptions({ name: 'PlaygroundOverview' });

const router = useRouter();
const kernel = useKernel();

const existingDemos = computed(() => [
  {
    actionLabel: $t('playground.overview_card_action_view'),
    badge: 'apps/playground/src/tasks',
    description: $t('playground.overview_card_datatable_desc'),
    icon: Table2,
    onClick: openTasksDemo,
    title: $t('playground.overview_card_datatable_title'),
  },
  {
    actionLabel: $t('playground.overview_card_action_toast'),
    badge: '@operon/kernel',
    description: $t('playground.overview_card_toast_desc'),
    icon: Bell,
    onClick: triggerDemoToast,
    title: $t('playground.overview_card_toast_title'),
  },
]);

function openTasksDemo() {
  void router.push('/playground/tasks');
}

function triggerDemoToast() {
  kernel.events.notify('success', $t('playground.overview_toast_message'));
}
</script>

<template>
  <div class="flex flex-col gap-5 p-4 sm:p-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-lg font-semibold tracking-tight text-foreground">
        {{ $t('playground.overview_title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ $t('playground.overview_description') }}
      </p>
    </div>

    <!-- Implemented Demos -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card
        v-for="item in existingDemos"
        :key="item.title"
        class="cursor-pointer border-border/60 shadow-xs transition-colors hover:border-border"
        @click="item.onClick()"
      >
        <CardHeader class="pb-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <component :is="item.icon" class="size-4" />
              </div>
              <CardTitle class="text-sm font-semibold">
                {{ item.title }}
              </CardTitle>
            </div>
            <Badge variant="outline" class="font-mono text-[10px]">
              {{ item.badge }}
            </Badge>
          </div>
          <CardDescription class="pt-1.5 text-xs leading-relaxed">
            {{ item.description }}
          </CardDescription>
        </CardHeader>
        <CardContent class="pt-0">
          <span
            class="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            {{ item.actionLabel }}
            <ArrowRight class="size-3" />
          </span>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
