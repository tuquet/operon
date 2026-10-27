<script lang="ts" setup>
import type { MenuRecordRaw } from '@operon/types';

import type { NormalMenuProps } from '@operon-core/menu-ui';

import { onBeforeMount, watch } from 'vue';
import { useRoute } from 'vue-router';

import { findMenuByPath } from '@operon/utils';

import { NormalMenu } from '@operon-core/menu-ui';

interface Props extends NormalMenuProps {}

const props = defineProps<Props>();

const emit = defineEmits<{
  defaultSelect: [MenuRecordRaw, MenuRecordRaw?];
  enter: [MenuRecordRaw];
  select: [MenuRecordRaw];
}>();

const route = useRoute();

function emitDefaultSelect() {
  const menu = findMenuByPath(props.menus || [], route.path);
  if (menu) {
    const rootMenu = (props.menus || []).find(
      (item) => item.path === menu.parents?.[0],
    );
    emit('defaultSelect', menu, rootMenu);
  }
}

onBeforeMount(() => {
  emitDefaultSelect();
});

watch(
  () => [props.menus, route.path] as const,
  () => {
    emitDefaultSelect();
  },
  { deep: false },
);
</script>

<template>
  <NormalMenu
    :active-path="activePath"
    :collapse="collapse"
    :menus="menus"
    :rounded="rounded"
    :theme="theme"
    @enter="(menu) => emit('enter', menu)"
    @select="(menu) => emit('select', menu)"
  />
</template>
