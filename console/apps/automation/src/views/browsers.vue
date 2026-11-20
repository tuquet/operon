<script lang="ts" setup>
import type { BrowserProfileRecord } from '../api/browsers';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useKernel, useLocalBridgeHeartbeat } from '@operon/kernel';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@operon-core/shadcn-ui';

import {
  CheckCircle2,
  CopyPlus,
  Eye,
  FileSpreadsheet,
  Globe,
  Laptop,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Star,
  Trash2,
  Unlink,
  Wifi,
  WifiOff,
} from '@lucide/vue';

import BrowserDeleteDialog from '../components/browsers/BrowserDeleteDialog.vue';
import BrowserDetailSheet from '../components/browsers/BrowserDetailSheet.vue';
import BrowserFormDialog from '../components/browsers/BrowserFormDialog.vue';
import BrowserImportCsvDialog from '../components/browsers/BrowserImportCsvDialog.vue';
import { $t } from '../locales';
import { useBrowsersStore } from '../stores/browsers';

defineOptions({ name: 'AutomationBrowsersView' });

const kernel = useKernel();
const store = useBrowsersStore();
const bridge = useLocalBridgeHeartbeat({ intervalMs: 5000 });

const formOpen = ref(false);
const formTarget = ref<BrowserProfileRecord | null>(null);
const detailOpen = ref(false);
const importOpen = ref(false);
const deleteOpen = ref(false);
const deleteTargets = ref<BrowserProfileRecord[]>([]);
const deleteLoading = ref(false);

const activeTenantName = computed(
  () => kernel.tenant.activeName || store.activeTenantId,
);

onMounted(() => {
  store.subscribeEvents();
  if (bridge.isHealthy.value) {
    void store.fetchBrowsers();
  }
});

onBeforeUnmount(() => {
  store.unsubscribeEvents();
});

watch(
  () => bridge.isHealthy.value,
  (healthy) => {
    if (healthy) {
      void store.fetchBrowsers();
    }
  },
);

function openCreateModal() {
  formTarget.value = null;
  formOpen.value = true;
}

function openEditModal(profile: BrowserProfileRecord) {
  formTarget.value = profile;
  formOpen.value = true;
}

async function openInspectSheet(profile: BrowserProfileRecord) {
  detailOpen.value = true;
  try {
    await store.inspectBrowser(profile.id);
  } catch {
    store.detailTarget = profile;
  }
}

function openSingleDelete(profile: BrowserProfileRecord) {
  deleteTargets.value = [profile];
  deleteOpen.value = true;
}

function openBatchDelete() {
  if (store.selectedProfiles.length === 0) return;
  deleteTargets.value = [...store.selectedProfiles];
  deleteOpen.value = true;
}

async function handleConfirmDelete(force: boolean) {
  if (deleteTargets.value.length === 0) return;
  deleteLoading.value = true;
  try {
    if (deleteTargets.value.length === 1 && deleteTargets.value[0]) {
      const target = deleteTargets.value[0];
      await store.removeProfile(target.id, force);
      kernel.events.notify(
        'success',
        $t('automation.browsers.deleted_success', { name: target.name }),
      );
    } else {
      const res = await store.batchRemoveSelected(force);
      kernel.events.notify(
        res.deleted.length > 0 ? 'success' : 'warning',
        `${res.deleted.length} deleted, ${res.skipped.length} skipped`,
      );
    }
    deleteOpen.value = false;
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  } finally {
    deleteLoading.value = false;
  }
}

function handleFormSaved(mode: 'create' | 'restart' | 'update', name: string) {
  const key =
    mode === 'create'
      ? 'automation.browsers.created_success'
      : 'automation.browsers.updated_success';
  kernel.events.notify('success', $t(key, { name }));
}

async function handleToggleRun(profile: BrowserProfileRecord) {
  try {
    if (profile.isOnline) {
      await store.stopProfile(profile.id);
      kernel.events.notify(
        'success',
        $t('automation.overview.browser_stopped_profile', {
          name: profile.name,
        }),
      );
    } else {
      await store.launchProfile(profile.id);
      kernel.events.notify(
        'success',
        $t('automation.overview.browser_started_profile', {
          name: profile.name,
        }),
      );
    }
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  }
}

async function handleSetDefault(profile: BrowserProfileRecord) {
  try {
    await store.makeDefaultProfile(profile.id);
    kernel.events.notify(
      'success',
      $t('automation.browsers.default_set_success', { name: profile.name }),
    );
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  }
}

async function handleDuplicate(profile: BrowserProfileRecord) {
  try {
    const cloned = await store.cloneProfile(profile.id);
    kernel.events.notify(
      'success',
      $t('automation.browsers.cloned_success', { name: cloned.name }),
    );
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  }
}

async function handleUnbind(profile: BrowserProfileRecord) {
  try {
    await store.unbindProfile(profile.id);
    kernel.events.notify(
      'success',
      $t('automation.overview.browser_unbind_success', { name: profile.name }),
    );
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_unbind_failed'),
    );
  }
}

async function handleProbeRow(profile: BrowserProfileRecord) {
  if (!profile.proxy) return;
  try {
    const res = await store.probeProxy(profile.proxy);
    kernel.events.notify(
      res.alive ? 'success' : 'error',
      res.alive
        ? $t('automation.browsers.proxy_alive_msg', {
            ip: res.egressIp || res.protocol,
            rtt: res.rttMs,
          })
        : $t('automation.browsers.proxy_dead_msg', {
            error: res.error || 'failed',
          }),
    );
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  }
}

async function handleBatchLaunch() {
  const { started, total } = await store.batchLaunchSelected();
  if (total === 0) {
    kernel.events.notify(
      'info',
      $t('automation.overview.browser_batch_all_running'),
    );
    return;
  }
  kernel.events.notify(
    started > 0 ? 'success' : 'error',
    $t('automation.overview.browser_batch_started', {
      count: started,
      total,
    }),
  );
}

async function handleBatchStop() {
  const { stopped, total } = await store.batchStopSelected();
  if (total === 0) {
    kernel.events.notify(
      'info',
      $t('automation.overview.browser_batch_none_running'),
    );
    return;
  }
  kernel.events.notify(
    stopped > 0 ? 'success' : 'error',
    $t('automation.overview.browser_batch_stopped', {
      count: stopped,
      total,
    }),
  );
}

async function handleAutoDetect() {
  try {
    await store.autoDetect();
  } catch (error: any) {
    kernel.events.notify(
      'error',
      error?.message || $t('automation.overview.browser_action_failed'),
    );
  }
}
</script>

<template>
  <div class="flex flex-col gap-5 p-4 sm:p-6">
    <!-- Top Header -->
    <div
      class="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center"
    >
      <div class="flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <Globe class="size-5 text-primary" />
          <h1 class="text-lg font-semibold tracking-tight text-foreground">
            {{ $t('automation.browsers.title') }}
          </h1>
          <Badge variant="outline" class="font-mono text-[11px]">
            {{ activeTenantName }}
          </Badge>
        </div>
        <p class="text-xs text-muted-foreground sm:text-sm">
          {{ $t('automation.browsers.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-md border border-border bg-muted/30 p-0.5">
          <Button
            type="button"
            size="sm"
            :variant="store.scopeMode === 'tenant' ? 'secondary' : 'ghost'"
            class="h-7 px-2.5 text-xs"
            @click="store.scopeMode = 'tenant'"
          >
            {{ $t('automation.browsers.scope_tenant') }}
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="store.scopeMode === 'all' ? 'secondary' : 'ghost'"
            class="h-7 px-2.5 text-xs"
            @click="store.scopeMode = 'all'"
          >
            {{ $t('automation.browsers.scope_all') }}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 shadow-none"
          :disabled="!bridge.isHealthy.value || store.loading"
          @click="store.fetchBrowsers()"
        >
          <RefreshCw
            class="size-3.5"
            :class="{ 'animate-spin': store.loading }"
          />
          <span>{{ $t('common.refresh') }}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 shadow-none"
          :disabled="!bridge.isHealthy.value"
          @click="importOpen = true"
        >
          <FileSpreadsheet class="size-3.5" />
          <span>{{ $t('automation.browsers.import_csv') }}</span>
        </Button>

        <Button
          size="sm"
          class="gap-1.5"
          :disabled="!bridge.isHealthy.value"
          @click="openCreateModal"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('automation.browsers.new_profile') }}</span>
        </Button>
      </div>
    </div>

    <!-- Loading Skeleton on Initial Heartbeat -->
    <div
      v-if="bridge.isInitialChecking.value"
      class="flex flex-col gap-4"
    >
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card v-for="idx in 4" :key="idx" class="border-border p-4">
          <Skeleton class="h-3.5 w-24" />
          <Skeleton class="mt-2 h-6 w-12" />
        </Card>
      </div>
      <Card class="border-border p-4">
        <Skeleton v-for="idx in 4" :key="idx" class="mb-3 h-10 w-full" />
      </Card>
    </div>

    <!-- Daemon Offline Gate -->
    <Card
      v-else-if="!bridge.isHealthy.value"
      class="flex flex-col items-start justify-between gap-4 border-amber-500/30 bg-amber-500/5 p-6 sm:flex-row sm:items-center"
    >
      <div class="flex items-start gap-3">
        <WifiOff class="mt-0.5 size-6 shrink-0 text-amber-500" />
        <div>
          <h3 class="text-base font-semibold text-foreground">
            {{ $t('automation.browsers.offline_title') }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ $t('automation.browsers.offline_desc') }}
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" @click="bridge.checkNow()">
        {{ $t('common.refresh') }}
      </Button>
    </Card>

    <template v-else>
      <!-- KPI Strip -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card class="border-border bg-card p-4 shadow-none">
          <div class="text-xs text-muted-foreground">
            {{ $t('automation.browsers.kpi_total') }}
          </div>
          <div class="mt-1 text-2xl font-bold text-foreground">
            {{ store.stats.total }}
          </div>
        </Card>
        <Card class="border-border bg-card p-4 shadow-none">
          <div class="text-xs text-muted-foreground">
            {{ $t('automation.browsers.kpi_running') }}
          </div>
          <div class="mt-1 text-2xl font-bold text-emerald-500">
            {{ store.stats.running }}
          </div>
        </Card>
        <Card class="border-border bg-card p-4 shadow-none">
          <div class="text-xs text-muted-foreground">
            {{ $t('automation.browsers.kpi_proxied') }}
          </div>
          <div class="mt-1 text-2xl font-bold text-foreground">
            {{ store.stats.proxied }}
          </div>
        </Card>
        <Card class="border-border bg-card p-4 shadow-none">
          <div class="text-xs text-muted-foreground">
            {{ $t('automation.browsers.kpi_direct') }}
          </div>
          <div class="mt-1 text-2xl font-bold text-muted-foreground">
            {{ store.stats.direct }}
          </div>
        </Card>
      </div>

      <!-- Filters & Batch Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <div class="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search
              class="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
            />
            <Input
              v-model="store.searchQuery"
              :placeholder="$t('automation.browsers.search_placeholder')"
              class="h-9 pl-8"
            />
          </div>

          <Select v-model="store.statusFilter">
            <SelectTrigger class="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {{ $t('automation.browsers.status_all') }}
              </SelectItem>
              <SelectItem value="online">
                {{ $t('automation.browsers.status_online') }}
              </SelectItem>
              <SelectItem value="offline">
                {{ $t('automation.browsers.status_offline') }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="store.proxyFilter">
            <SelectTrigger class="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {{ $t('automation.browsers.proxy_all') }}
              </SelectItem>
              <SelectItem value="proxied">
                {{ $t('automation.overview.browser_filter_proxied') }}
              </SelectItem>
              <SelectItem value="direct">
                {{ $t('automation.overview.browser_filter_direct') }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="store.platformFilter">
            <SelectTrigger class="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OS</SelectItem>
              <SelectItem value="windows">Windows</SelectItem>
              <SelectItem value="macos">macOS</SelectItem>
              <SelectItem value="linux">Linux</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          v-if="store.stats.selected > 0"
          class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5"
        >
          <span class="text-xs font-medium text-primary">
            {{
              $t('automation.browsers.selected_count', {
                count: store.stats.selected,
              })
            }}
          </span>
          <Button size="sm" variant="outline" class="h-7 text-xs" @click="handleBatchLaunch">
            <Play class="mr-1 size-3" />
            <span>{{ $t('automation.overview.browser_batch_run_btn') }}</span>
          </Button>
          <Button size="sm" variant="outline" class="h-7 text-xs" @click="handleBatchStop">
            <Square class="mr-1 size-3" />
            <span>{{ $t('automation.overview.browser_batch_stop_btn') }}</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            class="h-7 text-xs"
            @click="openBatchDelete"
          >
            <Trash2 class="mr-1 size-3" />
            <span>{{ $t('automation.browsers.batch_delete') }}</span>
          </Button>
        </div>
      </div>

      <!-- Empty State -->
      <Card
        v-if="!store.loading && store.filteredItems.length === 0"
        class="flex flex-col items-center justify-center gap-3 border-border p-10 text-center shadow-none"
      >
        <Globe class="size-8 text-muted-foreground/60" />
        <p class="text-sm font-semibold text-foreground">
          {{ $t('automation.browsers.empty_title') }}
        </p>
        <p class="max-w-md text-xs text-muted-foreground">
          {{ $t('automation.browsers.empty_desc') }}
        </p>
        <div class="mt-2 flex flex-wrap justify-center gap-2">
          <Button size="sm" @click="openCreateModal">
            <Plus class="mr-1.5 size-3.5" />
            <span>{{ $t('automation.browsers.new_profile') }}</span>
          </Button>
          <Button size="sm" variant="outline" @click="importOpen = true">
            <FileSpreadsheet class="mr-1.5 size-3.5" />
            <span>{{ $t('automation.browsers.import_csv') }}</span>
          </Button>
          <Button size="sm" variant="outline" @click="handleAutoDetect">
            <Sparkles class="mr-1.5 size-3.5" />
            <span>{{ $t('automation.browsers.auto_detect') }}</span>
          </Button>
        </div>
      </Card>

      <!-- Profiles Table -->
      <Card v-else class="overflow-hidden border-border bg-card shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox
                  :model-value="store.allFilteredSelected"
                  @update:model-value="store.toggleSelectAllFiltered()"
                />
              </TableHead>
              <TableHead>{{ $t('automation.browsers.col_profile') }}</TableHead>
              <TableHead>{{ $t('automation.browsers.col_status') }}</TableHead>
              <TableHead>
                {{ $t('automation.browsers.col_fingerprint') }}
              </TableHead>
              <TableHead>{{ $t('automation.browsers.col_proxy') }}</TableHead>
              <TableHead>
                {{ $t('automation.browsers.col_extensions') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('automation.browsers.col_actions') }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="profile in store.filteredItems" :key="profile.id">
              <TableCell>
                <Checkbox
                  :model-value="store.selectedIds.includes(profile.id)"
                  @update:model-value="store.toggleSelected(profile.id)"
                />
              </TableCell>

              <TableCell>
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      class="font-medium text-foreground hover:underline"
                      @click="openInspectSheet(profile)"
                    >
                      {{ profile.name }}
                    </button>
                    <Badge
                      v-if="profile.isDefault"
                      variant="secondary"
                      class="px-1.5 py-0 text-[10px]"
                    >
                      {{ $t('automation.browsers.default_badge') }}
                    </Badge>
                    <Badge
                      v-if="store.scopeMode === 'all'"
                      variant="outline"
                      class="px-1.5 py-0 font-mono text-[10px]"
                    >
                      {{ profile.tenantId }}
                    </Badge>
                  </div>
                  <div class="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <span>{{ profile.id }}</span>
                    <span v-if="profile.groupName">• {{ profile.groupName }}</span>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div class="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    :class="
                      profile.isOnline
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                        : 'text-muted-foreground'
                    "
                  >
                    <CheckCircle2 v-if="profile.isOnline" class="mr-1 size-3" />
                    {{
                      profile.isOnline
                        ? $t('automation.browsers.running_badge')
                        : $t('automation.browsers.idle_badge')
                    }}
                  </Badge>
                  <span
                    v-if="profile.debuggingPort"
                    class="font-mono text-[11px] text-muted-foreground"
                  >
                    :{{ profile.debuggingPort }}
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Laptop class="size-3.5 shrink-0" />
                  <span class="capitalize">
                    {{ profile.fingerprintConfig?.osPlatform || 'windows' }}
                  </span>
                  <span>·</span>
                  <span>
                    {{ profile.fingerprintConfig?.hardwareConcurrency || 8 }}c /
                    {{ profile.fingerprintConfig?.deviceMemoryGb || 16 }}GB
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <span
                  v-if="profile.proxy"
                  class="font-mono text-xs text-foreground"
                >
                  {{ profile.proxy }}
                </span>
                <Badge v-else variant="outline" class="text-[11px] text-muted-foreground">
                  {{ $t('automation.browsers.direct_badge') }}
                </Badge>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono text-[11px]">
                  {{ profile.extensions.length }}
                </Badge>
              </TableCell>

              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    :variant="profile.isOnline ? 'destructive' : 'outline'"
                    class="h-7 gap-1 px-2.5 text-xs shadow-none"
                    :disabled="store.isMutating(profile.id)"
                    @click="handleToggleRun(profile)"
                  >
                    <Loader2
                      v-if="store.isMutating(profile.id)"
                      class="size-3 animate-spin"
                    />
                    <Square v-else-if="profile.isOnline" class="size-3" />
                    <Play v-else class="size-3" />
                    <span>
                      {{
                        profile.isOnline
                          ? $t('automation.browsers.action_stop')
                          : $t('automation.browsers.action_run')
                      }}
                    </span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button size="icon" variant="ghost" class="size-7">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-44">
                      <DropdownMenuItem @select="openInspectSheet(profile)">
                        <Eye class="mr-2 size-3.5" />
                        <span>{{ $t('automation.browsers.action_inspect') }}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem @select="openEditModal(profile)">
                        <Pencil class="mr-2 size-3.5" />
                        <span>{{ $t('common.edit') }}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="profile.proxy"
                        @select="handleProbeRow(profile)"
                      >
                        <Wifi class="mr-2 size-3.5" />
                        <span>
                          {{ $t('automation.browsers.action_probe_proxy') }}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        :disabled="profile.isDefault"
                        @select="handleSetDefault(profile)"
                      >
                        <Star class="mr-2 size-3.5" />
                        <span>
                          {{ $t('automation.browsers.action_set_default') }}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem @select="handleDuplicate(profile)">
                        <CopyPlus class="mr-2 size-3.5" />
                        <span>
                          {{ $t('automation.browsers.action_duplicate') }}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        :disabled="profile.isOnline"
                        @select="handleUnbind(profile)"
                      >
                        <Unlink class="mr-2 size-3.5" />
                        <span>
                          {{ $t('automation.overview.browser_batch_unbind_btn') }}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        class="text-destructive focus:text-destructive"
                        @select="openSingleDelete(profile)"
                      >
                        <Trash2 class="mr-2 size-3.5" />
                        <span>{{ $t('common.delete') }}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </template>

    <BrowserFormDialog
      v-model:open="formOpen"
      :target="formTarget"
      @saved="handleFormSaved"
    />
    <BrowserDetailSheet
      v-model:open="detailOpen"
      :profile="store.detailTarget"
    />
    <BrowserImportCsvDialog v-model:open="importOpen" />
    <BrowserDeleteDialog
      v-model:open="deleteOpen"
      :targets="deleteTargets"
      :loading="deleteLoading"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
