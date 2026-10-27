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
      minWidth: 250,
      align: 'left' as const,
      slots: { default: 'user-cell' },
    },
    {
      field: 'primary_role',
      title: $t('page.system_view.users_col_primary_role'),
      minWidth: 140,
      align: 'left' as const,
      slots: { default: 'role-cell' },
    },
    {
      field: 'tenant_count',
      title: $t('page.system_view.users_col_organizations'),
      minWidth: 210,
      align: 'left' as const,
      slots: { default: 'tenant-cell' },
    },
    {
      field: 'id',
      title: $t('page.system_view.users_col_id'),
      minWidth: 175,
      align: 'left' as const,
      cellRender: { name: 'CellIdCopy' },
    },
    {
      field: 'created_at',
      title: $t('page.system_view.users_col_joined_at'),
      minWidth: 150,
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
    :title="$t('page.system.users')"
    :description="$t('page.system.users_desc')"
    content-class="p-3 sm:p-5"
    header-class="border-b border-border/60 bg-card/60 px-4 py-3 sm:px-6"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <h1
          class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg"
        >
          {{ $t('page.system.users') }}
        </h1>
        <Badge variant="secondary" class="shrink-0 text-2xs font-normal">
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

    <!-- Main Container: VXE Grid -->
    <div
      class="overflow-hidden rounded-xl border border-border/60 bg-card p-3 sm:p-5 shadow-xs"
    >
      <!-- VXE Grid Table -->
      <Grid class="users-vxe-grid">
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
                class="rounded-lg bg-muted text-xs font-semibold text-foreground"
              >
                {{ getInitials(row.full_name) }}
              </AvatarFallback>
            </Avatar>
            <div class="flex min-w-0 flex-col text-left leading-snug">
              <span class="truncate text-xs font-semibold text-foreground">
                {{ row.full_name || $t('page.system_view.users_anonymous') }}
              </span>
              <div
                class="flex items-center gap-1.5 text-2xs text-muted-foreground sm:text-xs"
              >
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
          <span v-else class="text-xs text-muted-foreground">{{
            $t('page.system_view.users_unassigned_role')
          }}</span>
        </template>

        <template #tenant-cell="{ row }">
          <div class="flex items-center gap-2 min-w-0">
            <Badge
              :variant="row.tenant_count > 0 ? 'outline' : 'secondary'"
              class="shrink-0 gap-1 font-normal text-xs"
            >
              <Building2 class="size-3 text-muted-foreground shrink-0" />
              <span>{{
                $t('page.system_view.users_orgs_count', [row.tenant_count])
              }}</span>
            </Badge>
            <span
              v-if="row.workspaces?.[0]?.tenant_name"
              class="truncate text-xs text-muted-foreground"
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
            <p class="text-sm font-medium text-foreground">
              {{ $t('page.system_view.users_empty_title') }}
            </p>
            <p class="text-xs text-muted-foreground max-w-sm mt-1">
              {{ $t('page.system_view.users_empty_desc') }}
            </p>
          </div>
        </template>
      </Grid>
    </div>
  </Page>
</template>
