<script lang="ts" setup>
import { useRouter } from 'vue-router';

import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@operon-core/shadcn-ui';

import { ExternalLink, RefreshCw, Terminal } from '@lucide/vue';

import CliSnippetCard from '#/components/common/cli-snippet-card.vue';
import { $t } from '#/locales';

interface Props {
  loopbackOnline: boolean;
  loopbackPort: number;
  open: boolean;
  probing?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  probing: false,
});

const emit = defineEmits<{
  (e: 'reprobe'): void;
  (e: 'update:open', val: boolean): void;
}>();

const router = useRouter();

function handleOpenAuthBridge() {
  emit('update:open', false);
  router.push('/auth/desktop');
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ $t('page.fleet_view.connect_btn') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <!-- Status Badge -->
        <div
          class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3.5"
        >
          <div class="flex items-center gap-2">
            <Terminal class="size-4 text-primary shrink-0" />
            <span class="text-foreground">
              {{ $t('page.fleet_view.metric_loopback_port') }}
            </span>
            <Badge variant="outline"> :{{ props.loopbackPort }} </Badge>
          </div>
          <div class="flex items-center gap-2">
            <Badge
              variant="outline"
              :class="
                props.loopbackOnline
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-muted text-muted-foreground'
              "
            >
              {{
                props.loopbackOnline
                  ? $t('common.online')
                  : $t('page.automation_view.daemon_not_detected')
              }}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              class="flex items-center gap-1 h-7 px-2"
              :disabled="props.probing"
              @click="emit('reprobe')"
            >
              <RefreshCw
                class="size-3 shrink-0"
                :class="{ 'animate-spin': props.probing }"
              />
              <span>{{ $t('page.automation_view.probe_btn') }}</span>
            </Button>
          </div>
        </div>

        <!-- Step 1 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
            >
              1
            </span>
            <span class="font-semibold text-foreground">
              {{ $t('page.automation_view.connect_step1_title') }}
            </span>
          </div>
          <p class="text-muted-foreground ml-7">
            {{ $t('page.automation_view.connect_step1_desc') }}
          </p>
          <div class="ml-7">
            <CliSnippetCard
              command="opn login"
              :label="$t('page.automation_view.cli_login_cmd_label')"
              :copied-label="$t('page.automation_view.cli_login_copied_label')"
            />
          </div>
        </div>

        <!-- Step 2 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
            >
              2
            </span>
            <span class="font-semibold text-foreground">
              {{ $t('page.automation_view.connect_step2_title') }}
            </span>
          </div>
          <p class="text-muted-foreground ml-7">
            {{ $t('page.automation_view.connect_step2_desc') }}
          </p>
          <div class="ml-7">
            <Button
              class="flex items-center gap-1.5"
              @click="handleOpenAuthBridge"
            >
              <ExternalLink class="size-3.5 shrink-0" />
              <span>{{ $t('page.automation_view.open_desktop_sso_btn') }}</span>
            </Button>
          </div>
        </div>

        <!-- Footer Note -->
        <Alert class="rounded-lg border-border bg-muted/50 p-3">
          <AlertDescription class="text-muted-foreground">
            <strong class="text-foreground"
              >{{ $t('page.automation_view.tip_label') }}:</strong
            >
            {{ $t('page.automation_view.connect_tip_desc') }}
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter class="pt-2">
        <Button variant="outline" @click="emit('update:open', false)">
          {{ $t('common.close') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
