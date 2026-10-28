<script lang="ts" setup>
import type { WorkspaceMember, WorkspaceMemberRole } from '#/api';

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
} from '@operon-core/shadcn-ui';

import { VxeForm, VxeFormItem } from '#/adapter/vxe-table';
import { $t } from '#/locales';

interface Props {
  loading?: boolean;
  member: null | WorkspaceMember;
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
  (
    e: 'submit',
    payload: {
      roleId: string;
      status: 'active' | 'invited' | 'suspended';
    },
  ): void;
  (e: 'update:open', val: boolean): void;
}>();

const selectedRoleId = ref('');
const status = ref<'active' | 'invited' | 'suspended'>('active');

watch(
  () => props.member,
  (m) => {
    if (m) {
      selectedRoleId.value = m.role?.id || '';
      status.value = m.status;
    }
  },
  { immediate: true },
);

function handleOk() {
  emit('submit', {
    roleId: selectedRoleId.value,
    status: status.value,
  });
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ $t('page.tenants_view.edit_member_modal_title') }}
        </DialogTitle>
      </DialogHeader>

      <div class="py-2">
        <VxeForm
          :data="{ selectedRoleId, status }"
          custom-layout
          class="w-full space-y-3"
        >
          <VxeFormItem
            :title="$t('page.tenants_view.member_email_label')"
            span="24"
          >
            <template #default>
              <Input
                :model-value="props.member?.email"
                disabled
                class="bg-muted/40 h-10"
              />
            </template>
          </VxeFormItem>

          <VxeFormItem
            :title="$t('page.tenants_view.display_name_label')"
            span="24"
          >
            <template #default>
              <Input
                :model-value="props.member?.full_name || props.member?.email"
                disabled
                class="bg-muted/40 h-10"
              />
            </template>
          </VxeFormItem>

          <VxeFormItem
            :title="$t('page.tenants_view.iam_role_label')"
            span="24"
          >
            <template #default>
              <Select
                v-model="selectedRoleId"
                :disabled="props.member?.role?.name === 'owner'"
              >
                <SelectTrigger class="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-if="props.member?.role?.name === 'owner'"
                    :value="props.member.role.id"
                  >
                    {{ $t('page.tenants_view.role_owner_immutable') }}
                  </SelectItem>
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

          <VxeFormItem :title="$t('common.status')" span="24">
            <template #default>
              <Select
                v-model="status"
                :disabled="props.member?.role?.name === 'owner'"
              >
                <SelectTrigger class="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    {{ $t('common.active') }}
                  </SelectItem>
                  <SelectItem value="suspended">
                    {{ $t('common.suspended') }}
                  </SelectItem>
                  <SelectItem value="invited">
                    {{ $t('page.tenants_view.status_invited') }}
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
          {{ $t('common.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
