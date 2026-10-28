<script lang="ts" setup>
import type { Tenant } from '#/api';

import { computed } from 'vue';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
} from '@operon-core/shadcn-ui';

import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  Settings,
  Terminal,
} from '@lucide/vue';

import { useDateFormat } from '#/composables';
import { $t } from '#/locales';

interface Props {
  isCurrentActive: boolean;
  loading?: boolean;
  tenant: Tenant;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  connectCli: [];
  openSettings: [];
  refresh: [];
  setActive: [];
}>();

const { formatDateOnly } = useDateFormat();

const tenantInitials = computed(() => {
  return (props.tenant.name || 'W').slice(0, 2).toUpperCase();
});

const planName = computed(() => {
  return props.tenant.metadata?.plan || 'Pro';
});
</script>

<template>
  <Card class="p-3.5 sm:p-5 shadow-sm">
    <div
      class="flex flex-col gap-3.5 md:flex-row md:flex-wrap md:items-center md:justify-between"
    >
      <!-- Left: Avatar & Basic Information -->
      <div class="flex min-w-0 items-start gap-3 sm:items-center sm:gap-3.5">
        <Avatar
          class="size-11 shrink-0 rounded-xl border border-primary/20 bg-primary/10 font-semibold text-primary sm:size-13 sm:text-base"
        >
          <AvatarFallback
            class="bg-transparent font-semibold text-primary sm:text-base"
          >
            {{ tenantInitials }}
          </AvatarFallback>
        </Avatar>

        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1
              class="max-w-full truncate text-base font-bold tracking-tight text-foreground sm:text-xl"
            >
              {{ props.tenant.name }}
            </h1>
            <Badge variant="secondary" class="px-2 py-0.5 capitalize">
              {{ planName }}
            </Badge>
            <Badge variant="outline" class="px-2 py-0.5">
              <span
                class="mr-1.5 size-1.5 rounded-full"
                :class="
                  props.tenant.status === 'active'
                    ? 'bg-success'
                    : 'bg-muted-foreground'
                "
              ></span>
              {{
                props.tenant.status === 'active'
                  ? $t('common.active')
                  : $t('common.suspended')
              }}
            </Badge>
            <Badge
              v-if="props.isCurrentActive"
              variant="secondary"
              data-testid="hero-current-workspace-badge"
              class="inline-flex items-center gap-1 border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary"
            >
              <CheckCircle2 class="size-3 shrink-0 text-primary" />
              <span>{{ $t('page.workspace.current_workspace') }}</span>
            </Badge>
          </div>

          <div
            class="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground"
          >
            <Badge variant="secondary"> /{{ props.tenant.slug }} </Badge>
            <span class="text-muted-foreground/40">·</span>
            <span>
              {{ props.tenant.id.slice(0, 8) }}
            </span>
            <span class="text-muted-foreground/40">·</span>
            <span class="inline-flex items-center gap-1">
              <Calendar class="size-3 shrink-0" />
              <span>{{ formatDateOnly(props.tenant.created_at) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Action Buttons -->
      <div
        class="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 md:border-t-0 md:pt-0"
      >
        <Button
          v-if="!props.isCurrentActive"
          variant="outline"
          size="sm"
          class="h-8 flex-1 justify-center gap-1.5 md:flex-initial"
          @click="emit('setActive')"
        >
          <CheckCircle2 class="size-3.5 shrink-0" />
          <span class="truncate">{{
            $t('page.tenants_view.set_primary')
          }}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="h-8 flex-1 justify-center gap-1.5 md:flex-initial"
          @click="emit('connectCli')"
        >
          <Terminal class="size-3.5 shrink-0" />
          <span class="truncate">{{ $t('page.tenants_view.pair_cli') }}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          class="h-8 flex-1 justify-center gap-1.5 md:flex-initial"
          @click="emit('openSettings')"
        >
          <Settings class="size-3.5 shrink-0" />
          <span class="truncate">{{ $t('page.tenants_view.settings') }}</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :disabled="props.loading"
          :title="$t('common.refresh')"
          @click="emit('refresh')"
        >
          <RefreshCw
            class="size-3.5"
            :class="{ 'animate-spin': props.loading }"
          />
        </Button>
      </div>
    </div>
  </Card>
</template>
