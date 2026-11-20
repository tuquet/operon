<script lang="ts" setup>
import { Spinner } from '@operon-core/shadcn-ui';

import { $t } from '#/locales';

withDefaults(
  defineProps<{
    heightClass?: string;
  }>(),
  {
    heightClass: 'h-52',
  },
);
</script>

<template>
  <div
    class="flex items-center justify-center text-muted-foreground"
    :class="heightClass"
  >
    <div class="flex items-center gap-2">
      <Spinner class="size-5 text-primary" />
      <span>{{ $t('common.loading') }}</span>
    </div>
  </div>
</template>
