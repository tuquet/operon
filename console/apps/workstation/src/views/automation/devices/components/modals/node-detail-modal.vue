<script lang="ts" setup>
import type { Device } from '#/api';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@operon-core/shadcn-ui';

import {
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Globe,
  HardDrive,
  Laptop,
  ShieldAlert,
} from '@lucide/vue';

import { VxeForm, VxeFormItem } from '#/adapter/vxe-table';
import { useClipboard, useDateFormat } from '#/composables';
import { $t } from '#/locales';

interface Props {
  node: Device | null;
  open: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'revoke', node: Device): void;
  (e: 'update:open', val: boolean): void;
}>();

const { copyToClipboard, isCopied } = useClipboard();
const { formatDate } = useDateFormat();
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ $t('page.automation_view.node_detail_title') }}
        </DialogTitle>
      </DialogHeader>

      <div v-if="props.node" class="space-y-5 py-2">
        <!-- Header Summary -->
        <div
          class="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground"
            >
              <Laptop class="size-5" />
            </div>
            <div>
              <div class="font-semibold text-foreground text-base">
                {{ props.node.name }}
              </div>
              <div class="text-muted-foreground">
                {{ props.node.hostname }}
              </div>
            </div>
          </div>

          <Badge variant="outline">
            <span
              class="mr-1.5 size-1.5 rounded-full"
              :class="{
                'bg-success': props.node.status === 'idle',
                'bg-primary': props.node.status === 'busy',
                'bg-warning': props.node.status === 'maintenance',
                'bg-destructive': props.node.status === 'disabled',
                'bg-muted-foreground': props.node.status === 'offline',
              }"
            ></span>
            {{
              props.node.status === 'idle'
                ? $t('page.automation_view.device_status_idle')
                : props.node.status === 'busy'
                  ? $t('page.automation_view.device_status_busy')
                  : props.node.status === 'maintenance'
                    ? $t('page.automation_view.device_status_maintenance')
                    : props.node.status === 'disabled'
                      ? $t('common.disabled')
                      : $t('common.offline')
            }}
          </Badge>
        </div>

        <!-- Device Specs & Identity Form via VXE UI Form -->
        <div class="rounded-xl border border-border/60 bg-muted/20 p-4">
          <VxeForm :data="props.node" custom-layout readonly class="w-full">
            <!-- Hardware Specs Group -->
            <VxeFormItem :title="$t('page.automation_view.col_cpu')" span="12">
              <template #default>
                <div
                  class="flex items-center gap-1.5 font-semibold text-foreground"
                >
                  <Cpu class="size-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {{
                      $t('page.automation_view.cpu_cores_unit', [
                        props.node.cpu_cores,
                      ])
                    }}
                  </span>
                </div>
              </template>
            </VxeFormItem>

            <VxeFormItem :title="$t('page.automation_view.col_ram')" span="12">
              <template #default>
                <div
                  class="flex items-center gap-1.5 font-semibold text-foreground"
                >
                  <HardDrive class="size-3.5 text-muted-foreground shrink-0" />
                  <span>{{ props.node.ram_gb }} GB</span>
                </div>
              </template>
            </VxeFormItem>

            <VxeFormItem :title="$t('page.automation_view.col_os')" span="12">
              <template #default>
                <div
                  class="flex items-center gap-1.5 text-foreground capitalize"
                >
                  <Globe class="size-3.5 text-muted-foreground shrink-0" />
                  <span>{{ props.node.os_info }}</span>
                </div>
              </template>
            </VxeFormItem>

            <VxeFormItem
              :title="$t('page.automation_view.col_driver')"
              span="12"
            >
              <template #default>
                <div
                  class="flex items-center gap-1.5 text-foreground capitalize"
                >
                  <CheckCircle2
                    class="size-3.5 text-muted-foreground shrink-0"
                  />
                  <span>{{ props.node.driver_type }}</span>
                </div>
              </template>
            </VxeFormItem>

            <!-- Network & Identity Group -->
            <VxeFormItem
              :title="$t('page.automation_view.device_id_label')"
              span="24"
            >
              <template #default>
                <div class="flex items-center gap-2 text-foreground">
                  <span class="truncate">{{ props.node.id }}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-5 shrink-0 text-muted-foreground hover:text-foreground"
                    @click="
                      copyToClipboard(
                        props.node.id,
                        $t('page.automation_view.device_id_label'),
                      )
                    "
                  >
                    <Check
                      v-if="
                        isCopied($t('page.automation_view.device_id_label'))
                      "
                      class="size-3 text-success"
                    />
                    <Copy v-else class="size-3" />
                  </Button>
                </div>
              </template>
            </VxeFormItem>

            <VxeFormItem :title="$t('page.fleet_view.col_ip')" span="12">
              <template #default>
                <span class="text-foreground">{{ props.node.ip_address }}</span>
              </template>
            </VxeFormItem>

            <VxeFormItem :title="$t('page.fleet_view.col_version')" span="12">
              <template #default>
                <Badge variant="outline">
                  {{ props.node.version || 'v0.8.4' }}
                </Badge>
              </template>
            </VxeFormItem>

            <VxeFormItem :title="$t('page.fleet_view.col_jobs')" span="12">
              <template #default>
                <span class="font-semibold text-foreground">
                  {{
                    $t('page.automation_view.active_jobs_unit', [
                      props.node.active_jobs,
                    ])
                  }}
                </span>
              </template>
            </VxeFormItem>

            <VxeFormItem :title="$t('page.fleet_view.col_last_seen')" span="12">
              <template #default>
                <span class="text-foreground">{{
                  formatDate(props.node.last_heartbeat_at)
                }}</span>
              </template>
            </VxeFormItem>

            <VxeFormItem
              :title="$t('page.automation_view.connected_at_label')"
              span="24"
            >
              <template #default>
                <span class="text-foreground">{{
                  formatDate(props.node.registered_at)
                }}</span>
              </template>
            </VxeFormItem>
          </VxeForm>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2">
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button variant="destructive" class="flex items-center gap-1.5">
                <ShieldAlert class="size-4 shrink-0" />
                <span>{{ $t('page.automation_view.revoke_access_btn') }}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {{ $t('page.automation_view.revoke_device_confirm_title') }}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {{
                    $t('page.automation_view.revoke_device_confirm_desc', {
                      name: props.node.name,
                    })
                  }}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
                <AlertDialogAction @click="emit('revoke', props.node)">
                  {{ $t('page.automation_view.revoke_btn') }}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" @click="emit('update:open', false)">
            {{ $t('common.close') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
