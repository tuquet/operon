<script lang="ts" setup>
import type { Tenant } from '#/api/core/tenant';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { TENANT_STATUS } from '@operon/constants';
import { preferences, usePreferences } from '@operon/preferences';
import { useAccessStore } from '@operon/stores';

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@operon-core/shadcn-ui';

import {
  Building2,
  Check,
  ChevronsUpDown,
  PlusCircle,
} from '@lucide/vue';

import { $t } from '#/locales';
import { useTenantStore } from '#/store/tenant';

import TenantCreateDialog from './tenant-create-dialog.vue';

defineOptions({ name: 'TenantSelector' });

const props = withDefaults(defineProps<{ collapsed?: boolean }>(), {
  collapsed: false,
});

const router = useRouter();
const accessStore = useAccessStore();
const tenantStore = useTenantStore();
const { isMobile } = usePreferences();

const isAuthenticated = computed(() => Boolean(accessStore.accessToken));
const open = ref(false);
const isCreateModalOpen = ref(false);

const activeTenant = computed(() => tenantStore.activeTenant);
const tenants = computed(() => tenantStore.tenants);
const isLoading = computed(
  () => tenantStore.isLoading && tenants.value.length === 0,
);

const triggerStyle = computed(() => {
  if (
    props.collapsed ||
    isMobile.value ||
    preferences.widget.tenantSelectorButtonPosition !== 'header-left'
  ) {
    return undefined;
  }
  return { minWidth: `${Math.max(160, preferences.sidebar.width - 24)}px` };
});

onMounted(() => {
  void tenantStore.fetchTenants();
});

watch(isAuthenticated, () => {
  void tenantStore.fetchTenants(true);
});

function getTenantPlanLabel(t: Tenant): string {
  if (t.id.startsWith('local-')) {
    return 'local';
  }
  return String(t.metadata?.plan || 'free');
}

function handleSelectTenant(tenant: Tenant) {
  if (tenant.status !== TENANT_STATUS.ACTIVE) {
    return;
  }
  tenantStore.setTenant(tenant.id);
  open.value = false;
}

function openCreateModal() {
  open.value = false;
  isCreateModalOpen.value = true;
}

function openManageTenants() {
  open.value = false;
  void router.push('/tenants');
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        v-if="props.collapsed"
        type="button"
        variant="outline"
        size="icon"
        role="combobox"
        :aria-expanded="open"
        :aria-label="activeTenant?.name || $t('page.tenant.not_selected')"
        data-testid="tenant-selector-trigger-collapsed"
        class="size-9 shrink-0 rounded-md shadow-none"
        :title="
          activeTenant
            ? `${activeTenant.name} (${activeTenant.slug})`
            : $t('page.tenant.not_selected')
        "
      >
        <img
          v-if="activeTenant?.avatar_url"
          :src="activeTenant.avatar_url"
          :alt="activeTenant.name"
          class="size-6 rounded-md object-cover"
        />
        <span
          v-else
          class="flex size-6 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary"
        >
          {{ activeTenant?.name?.charAt(0)?.toUpperCase() || '?' }}
        </span>
      </Button>

      <Button
        v-else
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :aria-label="$t('preferences.widget.tenantSelector')"
        data-testid="tenant-selector-trigger"
        class="h-9 min-w-0 max-w-[240px] flex-1 justify-between gap-2 px-2 font-normal shadow-none"
        :style="triggerStyle"
      >
        <span class="flex min-w-0 items-center gap-2">
          <img
            v-if="activeTenant?.avatar_url"
            :src="activeTenant.avatar_url"
            :alt="activeTenant.name"
            class="size-6 shrink-0 rounded-md object-cover"
          />
          <span
            v-else
            class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary"
          >
            {{ activeTenant?.name?.charAt(0)?.toUpperCase() || '?' }}
          </span>
          <span
            v-if="isLoading"
            class="flex min-w-0 flex-col gap-1 text-left"
          >
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-2.5 w-14" />
          </span>
          <span
            v-else
            class="flex min-w-0 flex-col text-left leading-tight"
          >
            <span class="truncate text-xs font-semibold text-foreground">
              {{ activeTenant?.name || $t('page.tenant.not_selected') }}
            </span>
            <span class="truncate text-[10px] text-muted-foreground">
              {{ activeTenant?.slug || 'local' }}
            </span>
          </span>
        </span>
        <ChevronsUpDown class="size-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      class="z-popup min-w-[240px] p-0 shadow-none"
      align="start"
      :side="props.collapsed ? 'right' : 'bottom'"
      :side-offset="6"
    >
      <Command>
        <CommandInput :placeholder="$t('page.tenant.selector_search')" />
        <CommandList>
          <div v-if="isLoading" class="flex flex-col gap-2 p-2">
            <div v-for="idx in 3" :key="idx" class="flex items-center gap-2">
              <Skeleton class="size-5 rounded-full" />
              <Skeleton class="h-3.5 flex-1" />
            </div>
          </div>
          <template v-else>
            <CommandEmpty>
              {{ $t('page.tenant.no_tenants_found') }}
            </CommandEmpty>
            <CommandGroup
              :heading="
                isAuthenticated
                  ? $t('page.tenant.tenants_label')
                  : $t('page.tenant.local_tenants_label')
              "
            >
              <CommandItem
                v-for="t in tenants"
                :key="t.id"
                :value="`${t.name} ${t.slug} ${getTenantPlanLabel(t)}`"
                :disabled="t.status !== TENANT_STATUS.ACTIVE"
                @select="handleSelectTenant(t)"
              >
                <span
                  class="size-2 shrink-0 rounded-full"
                  :class="
                    t.id === activeTenant?.id
                      ? 'bg-emerald-500'
                      : 'bg-muted-foreground/40'
                  "
                ></span>
                <span class="min-w-0 flex-1 truncate">{{ t.name }}</span>
                <Badge
                  variant="outline"
                  class="ml-1 shrink-0 px-1.5 py-0 text-[10px] capitalize text-muted-foreground"
                >
                  {{ getTenantPlanLabel(t) }}
                </Badge>
                <Check
                  v-if="t.id === activeTenant?.id"
                  class="ml-1 size-4 shrink-0 text-primary"
                />
              </CommandItem>
            </CommandGroup>
          </template>
        </CommandList>
        <CommandSeparator />
        <CommandList>
          <CommandGroup>
            <CommandItem
              data-testid="tenant-selector-create"
              value="create-tenant"
              @select="openCreateModal"
            >
              <PlusCircle class="size-4 shrink-0" />
              <span>{{ $t('page.tenant.create_tenant') }}</span>
            </CommandItem>
            <CommandItem
              data-testid="tenant-selector-manage"
              value="manage-tenants"
              @select="openManageTenants"
            >
              <Building2 class="size-4 shrink-0" />
              <span>{{ $t('page.tenant.manage_tenants') }}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  <TenantCreateDialog v-model:open="isCreateModalOpen" />
</template>
