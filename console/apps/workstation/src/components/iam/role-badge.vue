<script lang="ts" setup>
import { computed } from 'vue';

import { $t } from '@operon/locales';

import { Badge } from '@operon-core/shadcn-ui';

interface RoleConfig {
  class: string;
  label: string;
}

interface Props {
  role: string;
  uppercase?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  uppercase: false,
});

const roleConfig = computed<RoleConfig>(() => {
  const roleMap: Record<string, RoleConfig> = {
    admin: {
      class: 'bg-secondary text-secondary-foreground border-border',
      label: $t('common.roleAdmin'),
    },
    developer: {
      class: 'bg-secondary text-secondary-foreground border-border',
      label: $t('common.roleDeveloper'),
    },
    member: {
      class: 'bg-muted text-muted-foreground border-border',
      label: $t('common.roleMember'),
    },
    owner: {
      class: 'bg-primary/10 text-primary border-primary/20',
      label: $t('common.roleOwner'),
    },
    read_only: {
      class: 'bg-muted text-muted-foreground border-border',
      label: $t('common.roleReadOnly'),
    },
    viewer: {
      class: 'bg-muted text-muted-foreground border-border',
      label: $t('common.roleViewer'),
    },
  };

  return (
    roleMap[props.role.toLowerCase()] || {
      class: 'bg-muted text-muted-foreground border-border',
      label: props.role,
    }
  );
});
</script>

<template>
  <Badge
    variant="outline"
    class="px-2 py-0.5 border"
    :class="[roleConfig.class, props.uppercase ? 'uppercase' : '']"
  >
    {{ roleConfig.label }}
  </Badge>
</template>
