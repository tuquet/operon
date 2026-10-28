<script lang="ts" setup>
import type { TenantAuditLog } from '#/api';

import { onMounted, ref, watch } from 'vue';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@operon-core/shadcn-ui';

import { History, RefreshCw, ShieldCheck, User } from '@lucide/vue';

import { listTenantAuditLogs } from '#/api';
import { useDateFormat } from '#/composables';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

interface Props {
  tenantId: string;
}

const props = defineProps<Props>();
const { formatDate } = useDateFormat();

const loading = ref(true);
const logs = ref<TenantAuditLog[]>([]);

async function loadAuditLogs() {
  if (!props.tenantId) return;
  loading.value = true;
  try {
    logs.value = await listTenantAuditLogs(props.tenantId);
  } catch (error: any) {
    captureError(error, { action: 'loadAuditLogs', view: 'WorkspaceAuditTab' });
    toast.error(error.message || $t('page.tenants_view.audit_load_failed'));
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.tenantId,
  () => {
    loadAuditLogs();
  },
);

onMounted(() => {
  loadAuditLogs();
});
</script>

<template>
  <div class="space-y-3 sm:space-y-4">
    <!-- Header with Action -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm sm:p-4"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <ShieldCheck class="size-4.5" />
        </div>
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-foreground">
            {{ $t('page.tenants_view.audit_title') }}
          </h3>
          <p class="line-clamp-1 text-muted-foreground">
            {{ $t('page.tenants_view.audit_desc') }}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        class="h-8 shrink-0 flex items-center gap-1.5"
        :disabled="loading"
        @click="loadAuditLogs"
      >
        <RefreshCw class="size-3.5" :class="{ 'animate-spin': loading }" />
        <span class="hidden sm:inline">{{ $t('common.refresh') }}</span>
      </Button>
    </div>

    <!-- Scrollable Audit Logs Table -->
    <div
      class="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[170px] whitespace-nowrap">
              {{ $t('page.tenants_view.audit_col_time') }}
            </TableHead>
            <TableHead class="min-w-[220px] whitespace-nowrap">
              {{ $t('page.tenants_view.audit_col_actor') }}
            </TableHead>
            <TableHead class="min-w-[160px] whitespace-nowrap">
              {{ $t('common.action') }}
            </TableHead>
            <TableHead class="min-w-[220px] whitespace-nowrap">
              {{ $t('page.tenants_view.audit_col_target') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="log in logs" :key="log.id">
            <TableCell class="whitespace-nowrap text-muted-foreground">
              {{ formatDate(log.created_at) }}
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div
                  class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                >
                  <User class="size-3" />
                </div>
                <div>
                  <div class="text-foreground">
                    {{
                      log.actor_name ||
                      log.actor_email ||
                      $t('page.system.title')
                    }}
                  </div>
                  <div
                    v-if="log.actor_name && log.actor_email"
                    class="text-muted-foreground"
                  >
                    {{ log.actor_email }}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <Badge variant="outline">
                {{ log.action }}
              </Badge>
            </TableCell>
            <TableCell class="whitespace-nowrap">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground"
                  >{{ log.entity_type }}:</span
                >
                <span class="text-foreground">{{ log.entity_id }}</span>
              </div>
            </TableCell>
          </TableRow>

          <TableRow v-if="logs.length === 0 && !loading">
            <TableCell
              colspan="4"
              class="h-32 text-center text-muted-foreground"
            >
              <div class="flex flex-col items-center justify-center gap-2">
                <History class="size-8 text-muted-foreground/60" />
                <p>{{ $t('page.tenants_view.audit_empty') }}</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
