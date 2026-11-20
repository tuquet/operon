<script setup lang="ts">
import type { ActionItem, TableActionProps } from './types';

import { computed, ref } from 'vue';

import { Ellipsis } from '@operon-core/icons';
import { cn } from '@operon-core/shared/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui';
import { VbenButton } from '../button';
import { VbenIcon } from '../icon';
import ActionDropdownItemComp from './action-dropdown-item.vue';
import ActionItemComp from './action-item.vue';

defineOptions({ name: 'VbenTableAction' });

const props = withDefaults(defineProps<TableActionProps>(), {
  actions: () => [],
  align: 'end',
  class: undefined,
  divider: false,
  dropdownActions: () => [],
  hasPermission: undefined,
  moreText: undefined,
});

function checkVisible(item: ActionItem): boolean {
  // Permissions
  if (item.auth && props.hasPermission && !props.hasPermission(item.auth)) {
    return false;
  }
  // ifShow
  if (typeof item.ifShow === 'boolean') return item.ifShow;
  if (typeof item.ifShow === 'function') return item.ifShow();
  return true;
}

const visibleActions = computed(() =>
  (props.actions ?? []).filter((item) => checkVisible(item)),
);
const visibleDropdownActions = computed(() =>
  (props.dropdownActions ?? []).filter((item) => checkVisible(item)),
);

const alignClass = computed(
  () =>
    ({ center: 'justify-center', end: 'justify-end', start: 'justify-start' })[
      props.align
    ],
);

// Cache root node class name to avoid executing cn() on every render (internal tailwind-merge has high parse overhead)
const wrapperClass = computed(() =>
  cn('flex items-center gap-1', alignClass.value, props.class),
);

function tooltipSide(action: ActionItem) {
  return typeof action.tooltip === 'object'
    ? (action.tooltip.side ?? 'top')
    : 'top';
}
function tooltipContent(action: ActionItem) {
  return typeof action.tooltip === 'object'
    ? action.tooltip.content
    : action.tooltip;
}

/**
 * Precompute render view model for each primary action:
 * - Render regular buttons directly in this component without wrapping another child component,
 *   significantly reducing component instances for large tables;
 * - Only popConfirm actions delegate to child component to manage standalone popover state;
 * - Class names are calculated and cached once to avoid executing cn() on every render.
 */
const renderedActions = computed(() => {
  const list = visibleActions.value;
  return list.map((action, index) => {
    const hasTooltip = !!action.tooltip && !action.popConfirm;
    return {
      action,
      buttonClass: cn(
        'gap-1 p-2',
        action.danger && 'text-destructive hover:text-destructive',
        action.class,
      ),
      hasTooltip,
      isConfirm: !!action.popConfirm,
      key: action.key ?? index,
      showDivider: props.divider && index < list.length - 1,
      size: action.size ?? 'default',
      tooltipContent: hasTooltip ? tooltipContent(action) : undefined,
      tooltipSide: hasTooltip ? tooltipSide(action) : 'top',
      variant: action.variant ?? 'link',
    };
  });
});

const dropdownOpen = ref(false);

function onActionClick(action: ActionItem) {
  if (action.disabled || action.loading) return;
  action.onClick?.();
}

/**
 * Avoid erroneously closing entire dropdown menu when interacting with popconfirm (Popover).
 * Popover content is rendered outside menu via Portal and would otherwise be considered an outside click.
 */
function onContentInteractOutside(event: Event) {
  const target = (event as CustomEvent).detail?.originalEvent?.target as
    | HTMLElement
    | null
    | undefined;
  if (target?.closest('[data-slot="popover-content"]')) {
    event.preventDefault();
  }
}
</script>

<template>
  <div :class="wrapperClass">
    <!-- All primary actions share one TooltipProvider to avoid instantiating a provider per tooltip -->
    <TooltipProvider v-if="renderedActions.length > 0" :delay-duration="0">
      <template v-for="item in renderedActions" :key="item.key">
        <!-- Popconfirm: requires independent popup state, managed by child component -->
        <ActionItemComp v-if="item.isConfirm" :action="item.action" />

        <!-- Standard button with tooltip -->
        <Tooltip v-else-if="item.hasTooltip">
          <TooltipTrigger as-child tabindex="-1">
            <VbenButton
              :class="item.buttonClass"
              :disabled="item.action.disabled"
              :loading="item.action.loading"
              :size="item.size"
              :variant="item.variant"
              @click="onActionClick(item.action)"
            >
              <VbenIcon
                v-if="item.action.icon"
                :icon="item.action.icon"
                class="size-4"
              />
              <span v-if="item.action.text">{{ item.action.text }}</span>
            </VbenButton>
          </TooltipTrigger>
          <TooltipContent
            :side="item.tooltipSide"
            class="side-content bg-popover text-popover-foreground rounded-md shadow-md"
          >
            {{ item.tooltipContent }}
          </TooltipContent>
        </Tooltip>

        <!-- Standard button -->
        <VbenButton
          v-else
          :class="item.buttonClass"
          :disabled="item.action.disabled"
          :loading="item.action.loading"
          :size="item.size"
          :variant="item.variant"
          @click="onActionClick(item.action)"
        >
          <VbenIcon
            v-if="item.action.icon"
            :icon="item.action.icon"
            class="size-4"
          />
          <span v-if="item.action.text">{{ item.action.text }}</span>
        </VbenButton>

        <Separator v-if="item.showDivider" orientation="vertical" class="h-4" />
      </template>
    </TooltipProvider>

    <DropdownMenu
      v-if="visibleDropdownActions.length > 0"
      v-model:open="dropdownOpen"
    >
      <DropdownMenuTrigger as-child>
        <VbenButton class="gap-1 p-2" variant="link">
          <Ellipsis class="size-4" />
          <span v-if="moreText">{{ moreText }}</span>
        </VbenButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        @interact-outside="onContentInteractOutside"
      >
        <template
          v-for="(item, index) in visibleDropdownActions"
          :key="item.key ?? index"
        >
          <ActionDropdownItemComp
            :action="item"
            @confirm="dropdownOpen = false"
          />
          <DropdownMenuSeparator
            v-if="divider && index < visibleDropdownActions.length - 1"
          />
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
