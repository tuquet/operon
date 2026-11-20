<script setup lang="ts">
import { useSimpleLocale } from '@operon-core/composables';
import { ChevronsLeft, ChevronsRight } from '@operon-core/icons';
import { VbenButton } from '@operon-core/shadcn-ui';

const collapsed = defineModel<boolean>('collapsed');
const { $t } = useSimpleLocale();

function handleCollapsed() {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <VbenButton
    type="button"
    variant="ghost"
    size="icon"
    :aria-label="$t('toggleSidebar')"
    :aria-pressed="collapsed"
    data-layout-action="toggle-sidebar-collapse"
    class="flex-center size-8 shrink-0 rounded-md text-muted-foreground"
    @click.stop="handleCollapsed"
  >
    <ChevronsRight v-if="collapsed" class="size-4" />
    <ChevronsLeft v-else class="size-4" />
  </VbenButton>
</template>
