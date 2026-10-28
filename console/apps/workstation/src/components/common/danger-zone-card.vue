<script lang="ts" setup>
import { computed } from 'vue';

import { $t } from '@operon/locales';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from '@operon-core/shadcn-ui';

import { ShieldAlert, Trash2 } from '@lucide/vue';

interface Props {
  buttonText: string;
  description: string;
  loading?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  title: undefined,
});

const emit = defineEmits<{
  trigger: [];
}>();

const resolvedTitle = computed(() => props.title || $t('common.dangerZone'));
</script>

<template>
  <Alert
    variant="destructive"
    class="flex flex-col gap-3 rounded-xl border-destructive/25 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 [&>svg]:static [&>svg~*]:pl-0"
  >
    <div class="space-y-0.5">
      <div class="flex items-center gap-1.5 text-destructive">
        <ShieldAlert class="size-4 shrink-0" />
        <AlertTitle class="mb-0 font-semibold text-foreground">
          {{ resolvedTitle }}
        </AlertTitle>
      </div>
      <AlertDescription class="text-muted-foreground">
        {{ props.description }}
      </AlertDescription>
    </div>
    <Button
      variant="outline"
      size="sm"
      class="flex h-8 shrink-0 items-center gap-1.5 self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
      :disabled="props.loading"
      @click="emit('trigger')"
    >
      <Trash2 class="size-3.5" />
      <span>{{ props.buttonText }}</span>
    </Button>
  </Alert>
</template>
