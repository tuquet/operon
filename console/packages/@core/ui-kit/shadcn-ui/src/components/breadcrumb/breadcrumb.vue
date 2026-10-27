<script lang="ts" setup>
import type { BreadcrumbProps } from './types';

import { ChevronDown } from '@operon-core/icons';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui';
import { VbenIcon } from '../icon';

interface Props extends BreadcrumbProps {}

defineOptions({ name: 'Breadcrumb' });
withDefaults(defineProps<Props>(), {
  showIcon: false,
});

const emit = defineEmits<{ select: [string] }>();

function handleClick(path?: string) {
  if (!path) {
    return;
  }
  emit('select', path);
}
</script>
<template>
  <Breadcrumb>
    <BreadcrumbList>
      <TransitionGroup name="breadcrumb-transition">
        <template
          v-for="(item, index) in breadcrumbs"
          :key="`${item.path}-${item.title}-${index}`"
        >
          <BreadcrumbItem>
            <div v-if="item.items?.length ?? 0 > 0">
              <DropdownMenu>
                <DropdownMenuTrigger class="inline-flex items-center gap-1.5">
                  <VbenIcon
                    v-if="showIcon && item.icon"
                    :icon="item.icon"
                    class="size-4 shrink-0 align-middle"
                  />
                  <span class="leading-none">{{ item.title }}</span>
                  <ChevronDown class="size-3.5 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <template
                    v-for="menuItem in item.items"
                    :key="`sub-${menuItem.path}`"
                  >
                    <DropdownMenuItem @click.stop="handleClick(menuItem.path)">
                      {{ menuItem.title }}
                    </DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <BreadcrumbLink
              v-else-if="index !== breadcrumbs.length - 1"
              href="javascript:void 0"
              @click.stop="handleClick(item.path)"
            >
              <span class="inline-flex items-center">
                <VbenIcon
                  v-if="showIcon && item.icon"
                  :class="{ 'size-4.5': item.isHome, 'size-4': !item.isHome }"
                  :icon="item.icon"
                  class="mr-1.5 shrink-0"
                />
                <span class="leading-normal">{{ item.title }}</span>
              </span>
            </BreadcrumbLink>
            <BreadcrumbPage v-else>
              <span class="inline-flex items-center">
                <VbenIcon
                  v-if="showIcon && item.icon"
                  :class="{ 'size-4.5': item.isHome, 'size-4': !item.isHome }"
                  :icon="item.icon"
                  class="mr-1.5 shrink-0"
                />
                <span class="leading-normal">{{ item.title }}</span>
              </span>
            </BreadcrumbPage>
            <BreadcrumbSeparator
              v-if="index < breadcrumbs.length - 1 && !item.isHome"
            />
          </BreadcrumbItem>
        </template>
      </TransitionGroup>
    </BreadcrumbList>
  </Breadcrumb>
</template>
