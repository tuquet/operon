<script setup lang="ts">
import { useRouter } from 'vue-router';

import { $t } from '@operon/locales';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { Building2 } from '@lucide/vue';

import CliSnippetCard from '#/components/common/cli-snippet-card.vue';

defineOptions({ name: 'ProfileTenantTab' });

defineProps<{
  activeTenantId: string;
}>();

const router = useRouter();
</script>

<template>
  <div class="max-w-2xl flex flex-col gap-5 pt-1">
    <div>
      <h3 class="text-base font-semibold text-foreground">
        {{ $t('profile.activeTenantTitle') }}
      </h3>
      <p class="text-muted-foreground">
        {{ $t('profile.activeTenantDesc') }}
      </p>
    </div>

    <div
      class="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Building2 class="size-4.5 text-primary" />
          <span class="font-semibold text-foreground">{{
            $t('profile.currentTenant')
          }}</span>
        </div>
        <Badge
          variant="outline"
          class="bg-primary/10 text-primary border-primary/30"
        >
          {{ $t('common.active') }}
        </Badge>
      </div>
      <div class="text-muted-foreground">
        ID: {{ activeTenantId || $t('profile.noTenantSelected') }}
      </div>
      <div class="pt-2">
        <Button size="sm" variant="outline" @click="router.push('/tenants')">
          {{ $t('profile.viewAllTenants') }}
        </Button>
      </div>
    </div>

    <!-- CLI Command -->
    <CliSnippetCard
      command="operon login"
      :label="$t('profile.cliPairingCommand')"
    />
  </div>
</template>
