<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  getLocalBridgeInstallInfo,
  useKernel,
  useLocalBridgeHeartbeat,
} from '@operon/kernel';

import { Badge, Button, Skeleton, toast } from '@operon-core/shadcn-ui';

import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Copy,
  Cpu,
  Download,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  WifiOff,
} from '@lucide/vue';

import { useSampleStore } from '../stores/sample';

defineOptions({ name: 'AutomationStarterView' });

const router = useRouter();
const kernel = useKernel();
const sampleStore = useSampleStore();
const bridge = useLocalBridgeHeartbeat({ intervalMs: 5000 });
const isChecking = computed(() => bridge.status.value === 'checking');
const isInitialChecking = bridge.isInitialChecking;
const hasOverviewRoute = computed(
  () => router.resolve('/dashboard/overview').matched.length > 0,
);

const isCloud = computed(() => kernel.auth.hasCloudAuth);
const installInfo = getLocalBridgeInstallInfo();
const installCommand = computed(() => installInfo.command);
const releasesUrl = installInfo.releasesUrl;

async function copyInstallCommand() {
  try {
    await navigator.clipboard.writeText(installCommand.value);
    toast.success('Copied install command to clipboard');
  } catch {
    toast.error('Failed to copy command');
  }
}

function handleNotify() {
  const msg = `Notification triggered from Micro-App! Counter: ${sampleStore.counter}`;
  kernel.events.notify('success', msg);
  toast.success(msg);
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5"
    >
      <div>
        <div class="flex items-center gap-2.5">
          <Layers class="size-6 text-primary" />
          <h2 class="text-xl font-semibold tracking-tight">Automation</h2>
          <Badge
            variant="outline"
            :class="
              isCloud
                ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                : 'border-zinc-500/30 text-zinc-400 bg-zinc-500/10'
            "
            class="text-xs px-2 py-0.5"
          >
            <Cloud v-if="isCloud" class="size-3 mr-1" />
            <Cpu v-else class="size-3 mr-1" />
            {{ isCloud ? 'Cloud Synced' : 'Local / Standalone Mode' }}
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          Manage and run your browser automation tasks.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button size="sm" variant="outline" @click="handleNotify">
          <Sparkles class="size-3.5 mr-1.5" />
          Test Shell Toast
        </Button>
      </div>
    </div>

    <!-- Local Bridge Heartbeat Gate -->
    <Transition name="automation-fade" mode="out-in">
      <div
        v-if="isInitialChecking"
        key="automation-loading"
        class="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        <div
          class="md:col-span-2 flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
        >
          <div class="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Loader2 class="size-4 animate-spin text-primary" />
            <span>Checking local Operon service...</span>
          </div>
          <Skeleton class="h-7 w-16 rounded-md" />
        </div>
        <div
          v-for="idx in 2"
          :key="idx"
          class="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5"
        >
          <div class="flex items-center justify-between">
            <Skeleton class="h-4 w-32" />
            <Skeleton class="size-4 rounded-full" />
          </div>
          <Skeleton class="h-3.5 w-full" />
          <Skeleton class="h-3.5 w-4/5" />
          <Skeleton class="h-3.5 w-3/5" />
        </div>
      </div>

      <div
        v-else-if="!bridge.isHealthy.value"
        key="automation-offline"
        class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-xs"
      >
      <div class="flex flex-col gap-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div class="flex items-start gap-3">
            <WifiOff class="size-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 class="text-base font-semibold text-foreground">
                Operon Offline
              </h3>
              <p class="text-sm text-muted-foreground mt-1">
                Operon is not running on your computer. Install and start Operon
                to unlock automation controls.
              </p>
              <p
                v-if="bridge.error.value"
                class="text-xs text-amber-500/90 mt-1.5 font-mono"
              >
                Last probe: {{ bridge.error.value }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              v-if="hasOverviewRoute"
              size="sm"
              variant="default"
              @click="router.push('/dashboard/overview')"
            >
              <ArrowLeft class="size-3.5 mr-1.5" />
              Getting Started
            </Button>
            <Button
              size="sm"
              variant="outline"
              as="a"
              :href="releasesUrl"
              target="_blank"
              rel="noreferrer"
            >
              <Download class="size-3.5 mr-1.5" />
              Download Operon
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="isChecking"
              @click="bridge.checkNow()"
            >
              <RefreshCw
                class="size-3.5 mr-1.5"
                :class="{ 'animate-spin': isChecking }"
              />
              Retry
            </Button>
          </div>
        </div>
        <div
          class="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2"
        >
          <code class="text-xs font-mono text-foreground truncate">{{
            installCommand
          }}</code>
          <Button
            size="sm"
            variant="ghost"
            class="shrink-0 h-7 px-2"
            @click="copyInstallCommand"
          >
            <Copy class="size-3.5 mr-1" />
            Copy
          </Button>
        </div>
      </div>
    </div>

    <!-- Cards Grid (rendered only when Local Bridge is healthy) -->
    <div
      v-else
      key="automation-healthy"
      class="grid grid-cols-1 md:grid-cols-2 gap-5"
    >
      <!-- Local Bridge Status Banner -->
      <div
        class="md:col-span-2 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3"
      >
        <div class="flex items-center gap-2.5 text-xs">
          <CheckCircle2 class="size-4 text-emerald-500" />
          <span class="font-medium text-foreground"> Operon Connected </span>
          <Badge
            v-if="bridge.health.value?.version"
            variant="secondary"
            class="text-[11px] font-mono"
          >
            v{{ bridge.health.value.version }}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          :disabled="isChecking"
          @click="bridge.checkNow()"
        >
          <RefreshCw
            class="size-3.5 mr-1"
            :class="{ 'animate-spin': isChecking }"
          />
          Check
        </Button>
      </div>
      <!-- Kernel Context Card -->
      <div class="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between pb-3">
          <h3 class="text-sm font-semibold text-foreground">Kernel Context</h3>
          <CheckCircle2 class="size-4 text-emerald-500" />
        </div>
        <div class="flex flex-col gap-2 text-xs text-muted-foreground">
          <div class="flex justify-between py-1 border-b border-border/30">
            <span>User ID:</span>
            <span class="font-mono text-foreground">{{
              kernel.auth.userId || 'N/A'
            }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-border/30">
            <span>Username:</span>
            <span class="font-mono text-foreground">{{
              kernel.auth.username || 'operator'
            }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-border/30">
            <span>Cloud Auth:</span>
            <span
              :class="isCloud ? 'text-emerald-500' : 'text-zinc-400'"
              class="font-medium"
            >
              {{ isCloud ? 'Authenticated' : 'Offline / Local' }}
            </span>
          </div>
          <div class="flex justify-between py-1">
            <span>Roles:</span>
            <span class="font-mono text-foreground">{{
              kernel.auth.roles?.join(', ') || 'local_operator'
            }}</span>
          </div>
        </div>
      </div>

      <!-- Local Pinia Store Card -->
      <div class="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div class="flex items-center justify-between pb-3">
          <h3 class="text-sm font-semibold text-foreground">
            Local Micro-Store (Pinia)
          </h3>
          <Badge variant="secondary" class="text-xs font-mono">
            automation:sample
          </Badge>
        </div>
        <p class="text-xs text-muted-foreground mb-4">
          State is completely isolated and namespaced. When embedded, it joins
          the Shell Pinia tree without ID collisions.
        </p>
        <div class="flex items-center gap-3">
          <div
            class="text-2xl font-bold font-mono px-3 py-1 bg-muted rounded-md"
          >
            {{ sampleStore.counter }}
          </div>
          <Button size="sm" @click="sampleStore.increment"> Increment </Button>
          <Button size="sm" variant="ghost" @click="sampleStore.reset">
            Reset
          </Button>
        </div>
      </div>
    </div>
    </Transition>
  </div>
</template>

<style scoped>
.automation-fade-enter-active,
.automation-fade-leave-active {
  transition: opacity 150ms ease;
}

.automation-fade-enter-from,
.automation-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .automation-fade-enter-active,
  .automation-fade-leave-active {
    transition-duration: 0ms;
  }
}
</style>
