<script lang="ts" setup>
import type { BreadcrumbStyleType } from '@operon/types';

import type { IBreadcrumb } from '@operon-core/shadcn-ui';

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { $t } from '@operon/locales';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  VbenIcon,
} from '@operon-core/shadcn-ui';

import { resolveBreadcrumbMatches } from './breadcrumb-routes';

interface Props {
  hideWhenOnlyOne?: boolean;
  showHome?: boolean;
  showIcon?: boolean;
  type?: BreadcrumbStyleType;
}

const props = withDefaults(defineProps<Props>(), {
  showHome: false,
  showIcon: false,
  type: 'normal',
});

const route = useRoute();
const router = useRouter();

const breadcrumbs = computed((): IBreadcrumb[] => {
  const matched = resolveBreadcrumbMatches(route, (path) =>
    router.resolve(path),
  );

  const resultBreadcrumb: IBreadcrumb[] = [];

  for (const match of matched) {
    const { meta, path } = match;
    const { hideChildrenInMenu, hideInBreadcrumb, icon, name, title } =
      meta || {};
    if (hideInBreadcrumb || hideChildrenInMenu || !path) {
      continue;
    }

    resultBreadcrumb.push({
      icon,
      path: path || route.path,
      title: title ? $t((title || name) as string) : '',
    });
  }
  if (props.showHome) {
    resultBreadcrumb.unshift({
      icon: 'lucide:home',
      isHome: true,
      path: '/',
    });
  }
  if (props.hideWhenOnlyOne && resultBreadcrumb.length === 1) {
    return [];
  }

  return resultBreadcrumb;
});

function handleSelect(path: string) {
  router.push(path);
}
</script>
<template>
  <Breadcrumb class="ml-2" :data-style="type">
    <BreadcrumbList>
      <template v-for="(item, index) in breadcrumbs" :key="item.path">
        <BreadcrumbSeparator v-if="index > 0" />
        <BreadcrumbItem>
          <BreadcrumbPage v-if="index === breadcrumbs.length - 1">
            <VbenIcon v-if="showIcon && item.icon" :icon="item.icon" />
            {{ item.title || $t('common.home') }}
          </BreadcrumbPage>
          <BreadcrumbLink
            v-else
            :href="item.path"
            class="inline-flex items-center gap-1"
            @click.prevent="item.path && handleSelect(item.path)"
          >
            <VbenIcon v-if="showIcon && item.icon" :icon="item.icon" />
            {{ item.title || $t('common.home') }}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
