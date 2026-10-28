<script lang="ts" setup>
import type { WorkspaceMemberRole } from '#/api';

import { ref, watch } from 'vue';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@operon-core/shadcn-ui';

import { VxeForm, VxeFormItem } from '#/adapter/vxe-table';
import { $t } from '#/locales';

interface Props {
  loading?: boolean;
  open: boolean;
  roles?: WorkspaceMemberRole[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  roles: () => [
    {
      display_name: $t('page.workspace.administrator'),
      id: '00000000-0000-0000-0000-000000000002',
      name: 'admin',
    },
    {
      display_name: $t('term.member'),
      id: '00000000-0000-0000-0000-000000000003',
      name: 'member',
    },
    {
      display_name: $t('page.tenants_view.role_viewer'),
      id: '00000000-0000-0000-0000-000000000004',
      name: 'viewer',
    },
  ],
});

const emit = defineEmits<{
  (e: 'submit', payload: { email: string; roleId: string }): void;
  (e: 'update:open', val: boolean): void;
}>();

const email = ref('');
const selectedRoleId = ref('00000000-0000-0000-0000-000000000003');

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      email.value = '';
      const defaultRole =
        props.roles.find((r) => r.name === 'member')?.id ||
        props.roles[0]?.id ||
        '';
      selectedRoleId.value = defaultRole;
    }
  },
);

function handleOk() {
  if (!email.value || !email.value.includes('@')) {
    toast.warning($t('page.tenants_view.invalid_email_warning'));
    return;
  }
  emit('submit', { email: email.value.trim(), roleId: selectedRoleId.value });
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ $t('page.tenants_view.invite_modal_title') }}
        </DialogTitle>
      </DialogHeader>

      <div class="py-2">
        <VxeForm
          :data="{ email, selectedRoleId }"
          custom-layout
          class="w-full space-y-3"
        >
          <VxeFormItem
            :title="$t('page.tenants_view.member_email_label')"
            span="24"
          >
            <template #default>
              <Input
                v-model="email"
                placeholder="dev@operon.com"
                type="email"
                class="h-10"
              />
            </template>
          </VxeFormItem>

          <VxeFormItem
            :title="$t('page.tenants_view.iam_role_label')"
            span="24"
          >
            <template #default>
              <Select v-model="selectedRoleId">
                <SelectTrigger class="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="role in props.roles"
                    :key="role.id"
                    :value="role.id"
                  >
                    {{ role.display_name }} · {{ role.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
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
          {{ $t('page.tenants_view.send_invite_btn') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
