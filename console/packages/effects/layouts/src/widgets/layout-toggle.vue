<script setup lang="ts">
import type { AuthPageLayoutType } from '@operon/types';

import { computed } from 'vue';

import { InspectionPanel, PanelLeft, PanelRight } from '@operon/icons';
import { $t } from '@operon/locales';
import { preferences, updatePreferences } from '@operon/preferences';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@operon-core/shadcn-ui';

defineOptions({
  name: 'AuthenticationLayoutToggle',
});

const menus = computed(() => [
  {
    icon: PanelLeft,
    label: $t('authentication.layout.alignLeft'),
    value: 'panel-left',
  },
  {
    icon: InspectionPanel,
    label: $t('authentication.layout.center'),
    value: 'panel-center',
  },
  {
    icon: PanelRight,
    label: $t('authentication.layout.alignRight'),
    value: 'panel-right',
  },
]);

function handleUpdate(value: string | undefined) {
  if (!value) return;
  updatePreferences({
    app: {
      authPageLayout: value as AuthPageLayoutType,
    },
  });
}
</script>

<template>
  <div class="inline-flex empty:hidden">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :aria-label="$t('preferences.layout')"
          :title="$t('preferences.layout')"
        >
          <InspectionPanel />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          :model-value="preferences.app.authPageLayout"
          @update:model-value="
            (value) => typeof value === 'string' && handleUpdate(value)
          "
        >
          <DropdownMenuRadioItem
            v-for="item in menus"
            :key="item.value"
            :value="String(item.value)"
          >
            <component :is="item.icon" />
            {{ item.label }}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
