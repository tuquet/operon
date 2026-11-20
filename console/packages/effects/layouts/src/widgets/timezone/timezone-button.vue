<script setup lang="ts">
import { ref } from 'vue';

import { Check, Globe } from '@operon/icons';
import { $t } from '@operon/locales';
import { useTimezoneStore } from '@operon/stores';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  toast,
} from '@operon-core/shadcn-ui';

withDefaults(defineProps<{ showButton?: boolean }>(), { showButton: true });

const timezoneStore = useTimezoneStore();
const isOpen = ref(false);
const loading = ref(false);
const saving = ref(false);
const selectedTimezone = ref<string>();
const timezoneOptions = ref<{ label: string; value: string }[]>([]);

async function open() {
  selectedTimezone.value = timezoneStore.timezone;
  isOpen.value = true;
  loading.value = true;
  timezoneOptions.value = [];
  try {
    timezoneOptions.value = await timezoneStore.getTimezoneOptions();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : $t('common.error'));
  } finally {
    loading.value = false;
  }
}

async function confirm() {
  if (!selectedTimezone.value || saving.value) return;
  saving.value = true;
  try {
    await timezoneStore.setTimezone(selectedTimezone.value);
    isOpen.value = false;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : $t('common.error'));
  } finally {
    saving.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <div class="inline-flex empty:hidden">
    <Button
      v-if="showButton"
      type="button"
      variant="ghost"
      size="icon"
      :title="$t('ui.widgets.timezone.setTimezone')"
      :aria-label="$t('ui.widgets.timezone.setTimezone')"
      @click="open"
    >
      <Globe />
    </Button>
    <Dialog v-model:open="isOpen">
      <DialogContent
        :open="isOpen"
        modal
        :aria-describedby="undefined"
        class="gap-0 overflow-hidden p-0"
        :close-disabled="saving"
        @close="!saving && (isOpen = false)"
        @escape-key-down="saving && $event.preventDefault()"
        @interact-outside="saving && $event.preventDefault()"
      >
        <DialogHeader class="px-6 py-4">
          <DialogTitle>{{ $t('ui.widgets.timezone.setTimezone') }}</DialogTitle>
        </DialogHeader>
        <div
          v-if="loading"
          role="status"
          class="flex items-center justify-center gap-2 p-6"
        >
          <Spinner />
          {{ $t('common.loading') }}
        </div>
        <Command v-else :key="String(isOpen)">
          <CommandInput :placeholder="$t('ui.widgets.timezone.setTimezone')" />
          <CommandList class="max-h-[50vh]">
            <CommandEmpty>{{ $t('common.noData') }}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                v-for="item in timezoneOptions"
                :key="item.value"
                :value="item.value"
                :disabled="saving"
                @select="selectedTimezone = item.value"
              >
                <span class="min-w-0 flex-1">{{ item.label }}</span>
                <Check v-if="selectedTimezone === item.value" />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter class="border-t border-border px-6 py-3">
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="isOpen = false"
          >
            {{ $t('common.cancel') }}
          </Button>
          <Button
            type="button"
            :disabled="
              loading || saving || !selectedTimezone || !timezoneOptions.length
            "
            @click="confirm"
          >
            <Spinner v-if="saving" data-icon="inline-start" />
            {{ $t('common.confirm') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
