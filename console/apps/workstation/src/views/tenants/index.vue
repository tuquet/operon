<script lang="ts" setup>
import type { Tenant } from '#/api';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import { Badge, Button, Card } from '@operon-core/shadcn-ui';

import { Building2, Check, Eye, Plus, RefreshCw, Terminal } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { createTenant, listTenants } from '#/api';
import { FILTER_ALL, TENANT_PLAN, TENANT_STATUS } from '#/constants';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

import { useTenantManagement } from './composables/use-tenant-management';
import { getTenantPlanBadge, getWorkspaceColumns } from './config/columns';

defineOptions({ name: 'Workspace' });

const { isMobile } = usePreferences();
const {
  activeTenant,
  activeTenantId,
  connectCli,
  selectTenant,
  setActiveTenant,
  tenants,
} = useTenantManagement();

const [Grid, gridApi] = useVbenVxeGrid<Tenant>({
  separator: false,
  gridClass: 'p-0',
  detailSheetOptions: {
    resource: 'public.tenants',
    subtitleField: 'slug',
    titleField: 'name',
    onCreate: async ({ formData }) => {
      return await createTenant({
        name: String(formData.name || '').trim(),
        plan: String(formData.plan || 'starter'),
        slug: String(formData.slug || '').trim(),
      });
    },
    onCreated: (created) => {
      if (created?.id) {
        setActiveTenant(created.id);
      }
    },
  },
  formOptions: {
    commonConfig: {
      componentProps: {
        class: 'w-full',
      },
      hideLabel: isMobile.value,
    },
    schema: [
      {
        component: 'Select',
        fieldName: 'plan',
        label: () => $t('page.tenants_view.filter_plan'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.tenants_view.plan_all'),
          options: [
            { label: $t('page.tenants_view.plan_all'), value: FILTER_ALL },
            { label: 'Free', value: TENANT_PLAN.FREE },
            { label: 'Pro', value: TENANT_PLAN.PRO },
            { label: 'Enterprise', value: TENANT_PLAN.ENTERPRISE },
          ],
        }),
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: () => $t('common.status'),
        defaultValue: FILTER_ALL,
        componentProps: () => ({
          placeholder: $t('page.tenants_view.status_all'),
          options: [
            { label: $t('page.tenants_view.status_all'), value: FILTER_ALL },
            { label: $t('common.active'), value: TENANT_STATUS.ACTIVE },
            { label: $t('common.suspended'), value: TENANT_STATUS.SUSPENDED },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          clearable: true,
          placeholder: $t('page.tenants_view.search_placeholder'),
        }),
      },
    ],
  },
  gridOptions: {
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          const list = await listTenants();
          tenants.value = list;
          if (list.length > 0 && !activeTenantId.value) {
            setActiveTenant(list[0]?.id || '');
          }

          let filtered = list;
          if (formValues?.plan && formValues.plan !== FILTER_ALL) {
            filtered = filtered.filter(
              (t) =>
                (t.metadata?.plan || TENANT_PLAN.PRO).toLowerCase() ===
                formValues.plan.toLowerCase(),
            );
          }

          if (formValues?.status && formValues.status !== FILTER_ALL) {
            filtered = filtered.filter(
              (t) =>
                (t.status || TENANT_STATUS.ACTIVE).toLowerCase() ===
                formValues.status.toLowerCase(),
            );
          }

          if (formValues?.search) {
            const kw = String(formValues.search).toLowerCase().trim();
            filtered = filtered.filter(
              (t) =>
                t.name.toLowerCase().includes(kw) ||
                t.slug.toLowerCase().includes(kw) ||
                t.id.toLowerCase().includes(kw),
            );
          }

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getWorkspaceColumns,
  },
});
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0 space-y-3 sm:space-y-4"
    :title="$t('page.workspace.title')"
    :description="$t('page.workspace.subtitle')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.workspace.title') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ tenants.length }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          @click="() => gridApi.reload()"
        >
          <RefreshCw class="size-3.5" />
        </Button>
        <Button
          size="sm"
          class="h-8 gap-1.5 px-2.5 sm:px-3"
          @click="() => gridApi.openCreateSheet()"
        >
          <Plus class="size-3.5" />
          <span>{{ $t('common.createRecord') }}</span>
        </Button>
      </div>
    </template>

    <!-- Compact Active Workspace Strip (shrink-0) -->
    <Card
      class="shrink-0 flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 shadow-xs sm:px-4 sm:py-3"
    >
      <div class="flex min-w-0 items-center gap-2.5">
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Building2 class="size-4" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="truncate font-semibold text-foreground">
              {{ activeTenant?.name || $t('page.workspace.not_selected') }}
            </span>
            <Badge variant="outline" class="hidden sm:inline-flex">
              /{{ activeTenant?.slug || 'none' }}
            </Badge>
          </div>
          <p class="truncate text-muted-foreground">
            ID: {{ activeTenant?.id || '—' }}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        class="h-7 shrink-0 gap-1.5 px-2.5"
        @click="connectCli(activeTenant || undefined)"
      >
        <Terminal class="size-3.5" />
        <span class="hidden sm:inline">{{
          $t('page.workspace.connect_cli')
        }}</span>
        <span class="sm:hidden">CLI</span>
      </Button>
    </Card>

    <!-- Main Content: Tenants Workspace Grid at Level 1 -->
    <Grid class="tenants-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2 whitespace-nowrap">
          <span class="text-foreground">
            {{ row.name }}
          </span>
          <Badge
            v-if="row.id === activeTenantId"
            variant="secondary"
            class="shrink-0 px-1.5 py-0"
          >
            {{ $t('page.workspace.action_selected') }}
          </Badge>
        </div>
      </template>

      <template #slug-cell="{ row }">
        <Badge variant="secondary">
          {{ row.slug }}
        </Badge>
      </template>

      <template #plan-cell="{ row }">
        <Badge variant="outline">
          {{ getTenantPlanBadge(row.metadata?.plan).label }}
        </Badge>
      </template>

      <template #status-cell="{ row }">
        <Badge variant="outline">
          <span
            class="mr-1.5 size-1.5 rounded-full"
            :class="
              row.status === 'active' ? 'bg-success' : 'bg-muted-foreground'
            "
          ></span>
          {{
            row.status === 'active'
              ? $t('common.active')
              : $t('common.suspended')
          }}
        </Badge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Button
            size="sm"
            :variant="row.id === activeTenantId ? 'secondary' : 'default'"
            class="h-7 shrink-0 px-2.5 gap-1"
            @click.stop="selectTenant(row)"
          >
            <Check v-if="row.id === activeTenantId" class="size-3 shrink-0" />
            <span>
              {{
                row.id === activeTenantId
                  ? $t('page.workspace.action_selected')
                  : $t('page.workspace.action_activate')
              }}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 shrink-0 px-2.5 gap-1"
            @click.stop="connectCli(row)"
          >
            <Eye class="size-3 shrink-0" />
            <span>{{ $t('page.workspace.action_detail') }}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 shrink-0 px-2 gap-1"
            :title="$t('page.workspace.action_connect')"
            @click.stop="connectCli(row)"
          >
            <Terminal class="size-3 shrink-0" />
            <span>CLI</span>
          </Button>
        </div>
      </template>
    </Grid>
  </Page>
</template>
