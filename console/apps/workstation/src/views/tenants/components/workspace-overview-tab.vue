<script lang="ts" setup>
import type { Tenant, WorkspaceSubscription } from '#/api';

import { useRouter } from 'vue-router';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { Check, Copy, ExternalLink, Layers } from '@lucide/vue';

import DangerZoneCard from '#/components/common/danger-zone-card.vue';
import { useClipboard } from '#/composables';
import { $t } from '#/locales';

interface Props {
  activeDevicesCount: number;
  isCurrentActive: boolean;
  membersCount: number;
  subscription: null | WorkspaceSubscription;
  tenant: Tenant;
  totalDevicesCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  connectCli: [];
  deleteWorkspace: [];
  editWorkspace: [];
  setActive: [];
}>();

const router = useRouter();
const { copyToClipboard, isCopied } = useClipboard();

function copyTenantId() {
  copyToClipboard(props.tenant.id, $t('page.tenants_view.tenant_id'));
}

function navigateToFleet() {
  router.push(`/automation/devices?tenant=${props.tenant.id}`);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Operational Workspace Specifications Grid (3 Non-Redundant Cards) -->
    <div
      class="rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-4"
    >
      <div
        class="flex items-center justify-between border-b border-border/40 pb-3"
      >
        <div class="flex items-center gap-2">
          <Layers class="size-4 text-muted-foreground" />
          <h2 class="font-semibold text-foreground">
            {{ $t('page.tenants_view.workspace_details') }}
          </h2>
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3"
      >
        <!-- 1. Tenant ID (Full UUID + Copy Action) -->
        <div
          data-testid="overview-card-tenant-id"
          class="rounded-lg border border-border/50 bg-muted/20 p-3.5 space-y-1.5 min-w-0"
        >
          <div class="text-muted-foreground">
            {{ $t('page.tenants_view.tenant_id') }}
          </div>
          <div class="flex items-center justify-between gap-2 text-foreground">
            <span class="truncate">{{ tenant.id }}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              :title="$t('page.tenants_view.copy_tenant_id')"
              @click="copyTenantId"
            >
              <Check
                v-if="isCopied($t('page.tenants_view.tenant_id'))"
                class="size-3.5 text-success"
              />
              <Copy v-else class="size-3.5" />
            </Button>
          </div>
        </div>

        <!-- 2. Service Plan & Monthly Rate -->
        <div
          data-testid="overview-card-service-plan"
          class="rounded-lg border border-border/50 bg-muted/20 p-3.5 space-y-1.5"
        >
          <div class="text-muted-foreground">
            {{ $t('page.workspace.service_plan') }}
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="default" class="capitalize">
              {{
                subscription?.plan?.name || $t('page.tenants_view.free_starter')
              }}
            </Badge>
            <span class="text-muted-foreground">
              ${{ subscription?.plan?.price_monthly_usd || 0 }}/{{
                $t('page.tenants_view.per_month')
              }}
            </span>
          </div>
        </div>

        <!-- 3. Device Infrastructure -->
        <div
          data-testid="overview-card-device-infra"
          class="rounded-lg border border-border/50 bg-muted/20 p-3.5 space-y-1.5"
        >
          <div class="text-muted-foreground">
            {{ $t('page.tenants_view.device_infra') }}
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-baseline gap-1">
              <span class="font-semibold text-foreground">{{
                activeDevicesCount
              }}</span>
              <span class="text-muted-foreground">
                / {{ totalDevicesCount }}
                {{ $t('page.tenants_view.devices_online') }}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 px-2 gap-1 text-primary hover:text-primary"
              @click="navigateToFleet"
            >
              <span>{{ $t('page.tenants_view.view_devices') }}</span>
              <ExternalLink class="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Workspace Lifecycle / Danger Zone Card -->
    <DangerZoneCard
      :button-text="$t('page.tenants_view.archive_or_delete')"
      :description="$t('page.tenants_view.delete_modal_warning')"
      :title="$t('page.tenants_view.admin_actions')"
      @trigger="emit('deleteWorkspace')"
    />
  </div>
</template>
