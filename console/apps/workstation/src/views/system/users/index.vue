<script lang="ts" setup>
import type { PlatformUser } from '#/api';

import { ref } from 'vue';

import { Page } from '@operon/common-ui';
import { usePreferences } from '@operon/preferences';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
} from '@operon-core/shadcn-ui';

import { Building2, RefreshCw, Users } from '@lucide/vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { filterPlatformUsers, listPlatformUsers } from '#/api';
import RoleBadge from '#/components/iam/role-badge.vue';
import { $t } from '#/locales';
import { paginateArray } from '#/utils/pagination';

defineOptions({ name: 'SystemUsers' });

const { isMobile } = usePreferences();

const allUsers = ref<PlatformUser[]>([]);
const usersLoaded = ref(false);
const loadingUsers = ref(false);

let loadUsersPromise: null | Promise<void> = null;

async function ensureUsersLoaded(force = false): Promise<void> {
  if (usersLoaded.value && !force) {
    return;
  }
  if (loadUsersPromise && !force) {
    return loadUsersPromise;
  }

  loadingUsers.value = true;
  loadUsersPromise = (async () => {
    try {
      allUsers.value = await listPlatformUsers();
      usersLoaded.value = true;
    } finally {
      loadingUsers.value = false;
      loadUsersPromise = null;
    }
  })();

  return loadUsersPromise;
}

function getInitials(name: null | string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColumns() {
  return [
    {
      field: 'full_name',
      title: $t('term.user'),
      align: 'left' as const,
      slots: { default: 'user-cell' },
    },
    {
      field: 'primary_role',
      title: $t('page.system_view.users_col_primary_role'),
      align: 'left' as const,
      slots: { default: 'role-cell' },
    },
    {
      field: 'tenant_count',
      title: $t('page.system_view.users_col_organizations'),
      align: 'left' as const,
      slots: { default: 'tenant-cell' },
    },
    {
      field: 'id',
      title: $t('page.system_view.users_col_id'),
      align: 'left' as const,
      cellRender: { name: 'CellIdCopy' },
    },
    {
      field: 'created_at',
      title: $t('page.system_view.users_col_joined_at'),
      align: 'left' as const,
      cellRender: { name: 'CellDate' },
    },
  ];
}

const [Grid, gridApi] = useVbenVxeGrid<PlatformUser>({
  separator: false,
  detailSheetOptions: {
    resource: 'public.profiles',
    subtitleField: 'primary_role',
    titleField: 'full_name',
    onSaved: async () => {
      await ensureUsersLoaded(true);
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
        fieldName: 'tenant_filter',
        label: () => $t('page.system_view.users_filter_org'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.system_view.users_org_all'),
          options: [
            { label: $t('page.system_view.users_org_all'), value: 'all' },
            {
              label: $t('page.system_view.users_org_has_tenants'),
              value: 'has_tenants',
            },
            {
              label: $t('page.system_view.users_org_no_tenants'),
              value: 'no_tenants',
            },
          ],
        }),
      },
      {
        component: 'Select',
        fieldName: 'role_filter',
        label: () => $t('term.role'),
        defaultValue: 'all',
        componentProps: () => ({
          placeholder: $t('page.system_view.roles_all'),
          options: [
            { label: $t('page.system_view.roles_all'), value: 'all' },
            { label: $t('page.system_view.role_owner'), value: 'owner' },
            { label: $t('page.system_view.role_admin'), value: 'admin' },
            { label: $t('page.system_view.role_member'), value: 'member' },
            { label: $t('page.system_view.role_viewer'), value: 'viewer' },
          ],
        }),
      },
      {
        component: 'Input',
        fieldName: 'search',
        formItemClass: 'col-span-2 sm:col-span-1',
        label: () => $t('common.search'),
        componentProps: () => ({
          placeholder: $t('page.system_view.users_search_placeholder'),
          clearable: true,
        }),
      },
    ],
  },
  gridOptions: {
    cellConfig: {
      height: 58,
    },
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async (
          { page }: { page?: { currentPage?: number; pageSize?: number } },
          formValues: Record<string, any>,
        ) => {
          await ensureUsersLoaded();

          const filtered = filterPlatformUsers(allUsers.value, {
            role_filter: formValues?.role_filter,
            search: formValues?.search,
            tenant_filter: formValues?.tenant_filter,
          });

          return paginateArray(filtered, page);
        },
      },
    },
    columns: getColumns,
  },
});

async function handleRefresh() {
  await ensureUsersLoaded(true);
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    content-class="p-2.5 sm:p-4 flex flex-col min-h-0"
    :title="$t('page.system.users')"
    :description="$t('page.system.users_desc')"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.users') }}
        </h1>
        <Badge variant="secondary" class="shrink-0">
          {{ allUsers.length }}
        </Badge>
      </div>
    </template>

    <template #extra>
      <Button
        variant="outline"
        size="icon"
        class="size-8 shrink-0"
        :disabled="loadingUsers"
        :title="$t('common.refresh')"
        @click="handleRefresh"
      >
        <RefreshCw
          class="size-3.5 shrink-0"
          :class="{ 'animate-spin': loadingUsers }"
        />
      </Button>
    </template>

    <!-- Main Container: VXE Grid at Level 1 -->
    <Grid class="users-vxe-grid flex-1 min-h-0 overflow-hidden">
      <template #user-cell="{ row }">
        <div class="flex items-center gap-2.5 sm:gap-3">
          <Avatar
            class="size-8 shrink-0 rounded-lg border border-border/50 sm:size-9"
          >
            <AvatarImage
              v-if="row.avatar_url"
              :src="row.avatar_url"
              :alt="row.full_name || ''"
            />
            <AvatarFallback
              class="rounded-lg bg-muted font-semibold text-foreground"
            >
              {{ getInitials(row.full_name) }}
            </AvatarFallback>
          </Avatar>
          <div class="flex min-w-0 flex-col text-left leading-snug">
            <span class="truncate font-semibold text-foreground">
              {{ row.full_name || $t('page.system_view.users_anonymous') }}
            </span>
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <span class="truncate">
                {{ row.email || $t('page.system_view.users_no_email') }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template #role-cell="{ row }">
        <RoleBadge
          v-if="row.primary_role"
          :role="row.primary_role"
          :uppercase="true"
        />
        <span v-else class="text-muted-foreground">{{
          $t('page.system_view.users_unassigned_role')
        }}</span>
      </template>

      <template #tenant-cell="{ row }">
        <div class="flex items-center gap-2 min-w-0">
          <Badge
            :variant="row.tenant_count > 0 ? 'outline' : 'secondary'"
            class="shrink-0 gap-1"
          >
            <Building2 class="size-3 text-muted-foreground shrink-0" />
            <span>{{
              $t('page.system_view.users_orgs_count', [row.tenant_count])
            }}</span>
          </Badge>
          <span
            v-if="row.workspaces?.[0]?.tenant_name"
            class="truncate text-muted-foreground"
            :title="row.workspaces[0].tenant_name"
          >
            {{ row.workspaces[0].tenant_name }}
          </span>
        </div>
      </template>

      <template #empty>
        <div
          class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
        >
          <Users class="size-10 stroke-[1.5] text-muted-foreground/60 mb-3" />
          <p class="text-foreground">
            {{ $t('page.system_view.users_empty_title') }}
          </p>
          <p class="text-muted-foreground max-w-sm mt-1">
            {{ $t('page.system_view.users_empty_desc') }}
          </p>
        </div>
      </template>
    </Grid>
  </Page>
</template>
