<script lang="ts" setup>
import type { Tenant } from '#/api';

import { ref, watch } from 'vue';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from '@operon-core/shadcn-ui';

import { VxeForm, VxeFormItem } from '#/adapter/vxe-table';
import { $t } from '#/locales';

interface Props {
  loading?: boolean;
  open: boolean;
  tenant: null | Tenant;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: 'submit', payload: { name: string; slug: string }): void;
  (e: 'update:open', val: boolean): void;
}>();

const name = ref('');
const slug = ref('');

watch(
  () => props.tenant,
  (t) => {
    if (t) {
      name.value = t.name || '';
      slug.value = t.slug || '';
    }
  },
  { immediate: true },
);

function handleOk() {
  if (!name.value.trim() || !slug.value.trim()) {
    toast.warning($t('page.tenants_view.workspace_name_slug_required'));
    return;
  }
  emit('submit', {
    name: name.value.trim(),
    slug: slug.value.trim(),
  });
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ $t('page.tenants_view.edit_modal_title') }}
        </DialogTitle>
      </DialogHeader>

      <div class="py-2">
        <VxeForm :data="{ name, slug }" custom-layout class="w-full space-y-3">
          <VxeFormItem :title="$t('page.workspace.col_name')" span="24">
            <template #default>
              <Input
                v-model="name"
                :placeholder="$t('page.tenants_view.name_placeholder')"
                class="h-10"
              />
            </template>
          </VxeFormItem>

          <VxeFormItem :title="$t('page.workspace.col_slug')" span="24">
            <template #default>
              <Input
                v-model="slug"
                :placeholder="$t('page.tenants_view.slug_placeholder')"
                class="h-10"
              />
            </template>
          </VxeFormItem>
        </VxeForm>
      </div>

      <DialogFooter class="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="outline"
          :disabled="props.loading"
          @click="emit('update:open', false)"
        >
          {{ $t('common.cancel') }}
        </Button>
        <Button :disabled="props.loading" @click="handleOk">
          {{ $t('common.update') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
