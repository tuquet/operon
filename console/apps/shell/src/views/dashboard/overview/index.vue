<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@operon/common-ui';
import {
  getLocalBridgeInstallInfo,
  useLocalBridgeHeartbeat,
} from '@operon/kernel';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Separator,
  Skeleton,
  toast,
} from '@operon-core/shadcn-ui';

import {
  Activity,
  AreaChart,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  Layers,
  Loader2,
  RefreshCw,
  Users,
  WifiOff,
  Zap,
} from '@lucide/vue';

import { $t } from '#/locales';

defineOptions({ name: 'DashboardOverview' });

const router = useRouter();
const bridge = useLocalBridgeHeartbeat({ intervalMs: 5000 });
const installInfo = getLocalBridgeInstallInfo();
const copiedCommand = ref(false);
const hasInitiatedInstall = ref(false);

const isHealthy = computed(() => bridge.status.value === 'healthy');
const isChecking = computed(() => bridge.status.value === 'checking');
const isInitialChecking = bridge.isInitialChecking;

async function copyInstallCommand() {
  try {
    await navigator.clipboard.writeText(installInfo.command);
    copiedCommand.value = true;
    hasInitiatedInstall.value = true;
    toast.success($t('page.overview.installCopied'));
    setTimeout(() => {
      copiedCommand.value = false;
    }, 2000);
  } catch {
    toast.error($t('page.overview.installCopyFailed'));
  }
}

interface ModuleItem {
  description: string;
  icon: any;
  name: string;
  path: string;
  requiresBridge: boolean;
  requiresCloud: boolean;
}

const modules = computed<ModuleItem[]>(() => [
  {
    description: $t('page.overview.moduleAnalyticsDesc'),
    icon: AreaChart,
    name: $t('page.dashboard.analytics'),
    path: '/dashboard/analytics',
    requiresBridge: true,
    requiresCloud: false,
  },
  {
    description: $t('page.automation.overview_desc'),
    icon: Zap,
    name: $t('page.automation.title'),
    path: '/automation/overview',
    requiresBridge: true,
    requiresCloud: false,
  },
  {
    description: $t('page.overview.modulePlaygroundDesc'),
    icon: FlaskConical,
    name: $t('page.playground.title'),
    path: '/playground',
    requiresBridge: true,
    requiresCloud: false,
  },
  {
    description: $t('page.overview.moduleTenantsDesc'),
    icon: Users,
    name: $t('page.tenants.title'),
    path: '/tenants',
    requiresBridge: false,
    requiresCloud: true,
  },
  {
    description: $t('page.system.overview_desc'),
    icon: Layers,
    name: $t('page.system.title'),
    path: '/system',
    requiresBridge: false,
    requiresCloud: true,
  },
]);

const checklistSteps = computed(() => [
  {
    done: hasInitiatedInstall.value || isHealthy.value,
    label: $t('page.overview.checklistStep1'),
  },
  {
    done: isHealthy.value,
    label: $t('page.overview.checklistStep2'),
  },
  {
    done: isHealthy.value,
    label: $t('page.overview.checklistStep3'),
  },
]);

const checklistProgress = computed(() =>
  Math.round(
    (checklistSteps.value.filter((step) => step.done).length /
      checklistSteps.value.length) *
      100,
  ),
);

function openModule(mod: ModuleItem) {
  if (mod.requiresBridge && !isHealthy.value) return;
  void router.push(mod.path);
}

function isLocked(mod: ModuleItem) {
  return mod.requiresBridge && !isHealthy.value;
}
</script>

<template>
  <Page
    :auto-content-height="false"
    :description="$t('page.overview.description')"
    :loading="isInitialChecking"
    :title="$t('page.overview.title')"
    content-class="flex flex-col gap-4 p-3 sm:gap-6 sm:p-5"
    header-class="border-b-0 bg-transparent px-3 pt-3 pb-0 sm:px-5 sm:pt-5"
  >
    <template #loading>
      <!-- Daemon Status Card Skeleton -->
      <Card class="border-border/60 shadow-xs">
        <CardHeader class="pb-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <Loader2 class="size-4 animate-spin" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Skeleton class="h-4 w-32" />
                <Skeleton class="h-3 w-40" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="outline" class="text-muted-foreground">
                {{ $t('page.overview.daemonChecking') }}
              </Badge>
              <Skeleton class="h-8 w-20 rounded-md" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <!-- Checklist Card Skeleton -->
        <Card class="border-border/60 shadow-xs">
          <CardHeader class="pb-3">
            <Skeleton class="h-4 w-28" />
          </CardHeader>
          <CardContent class="flex flex-col gap-3 pt-0">
            <div v-for="idx in 3" :key="idx" class="flex items-center gap-2.5">
              <Skeleton class="size-4 shrink-0 rounded-full" />
              <Skeleton class="h-3.5 w-full max-w-[210px]" />
            </div>
            <Skeleton class="mt-1 h-1.5 w-full rounded-full" />
          </CardContent>
        </Card>

        <!-- Modules Grid Skeleton -->
        <div class="lg:col-span-2">
          <Skeleton class="mb-3 h-3.5 w-24" />
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="idx in 5"
              :key="idx"
              class="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <Skeleton class="size-7 rounded-lg" />
                <Skeleton class="h-5 w-20 rounded-full" />
              </div>
              <div class="flex flex-col gap-1.5">
                <Skeleton class="h-4 w-28" />
                <Skeleton class="h-3 w-full" />
                <Skeleton class="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Daemon Status Card -->
    <Card
      class="border-border/60 shadow-xs"
      :class="{
        'border-success/40 bg-success/5': isHealthy,
        'border-amber-500/40 bg-amber-500/5': !isHealthy && !isChecking,
      }"
    >
      <CardHeader class="pb-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div
              class="flex size-8 shrink-0 items-center justify-center rounded-lg"
              :class="
                isHealthy
                  ? 'bg-success/10 text-success'
                  : 'bg-amber-500/10 text-amber-500'
              "
            >
              <Activity v-if="isHealthy" class="size-4" />
              <WifiOff v-else-if="!isChecking" class="size-4" />
              <Loader2 v-else class="size-4 animate-spin" />
            </div>
            <div>
              <CardTitle class="text-sm font-semibold">
                {{ $t('page.overview.daemonStatus') }}
              </CardTitle>
              <p class="text-xs text-muted-foreground">
                {{ $t('page.overview.daemonPort') }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Badge
              :variant="isHealthy ? 'secondary' : 'outline'"
              :class="
                isHealthy
                  ? 'text-success bg-success/10'
                  : isChecking
                    ? 'text-muted-foreground'
                    : 'border-amber-500/40 text-amber-500'
              "
            >
              <span v-if="isChecking">{{
                $t('page.overview.daemonChecking')
              }}</span>
              <span v-else-if="isHealthy">{{
                $t('page.overview.daemonHealthy')
              }}</span>
              <span v-else>{{ $t('page.overview.daemonOffline') }}</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              class="h-8 gap-1.5 px-2.5 shadow-none"
              :disabled="isChecking"
              @click="bridge.checkNow()"
            >
              <RefreshCw
                class="size-3.5"
                :class="{ 'animate-spin': isChecking }"
              />
              {{ $t('page.overview.retryCheck') }}
            </Button>
          </div>
        </div>
      </CardHeader>

      <!-- Install guide — only when offline -->
      <CardContent v-if="!isHealthy && !isChecking" class="pt-0">
        <Separator class="mb-4" />
        <div>
          <p class="mb-2 text-xs font-medium text-foreground">
            {{ $t('page.overview.installTitle') }}
          </p>
          <p class="mb-3 text-xs text-muted-foreground">
            {{ $t('page.overview.installDesc') }}
          </p>

          <!-- Install command -->
          <div
            class="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2"
          >
            <code class="truncate font-mono text-[11px] text-foreground">
              {{ installInfo.command }}
            </code>
            <Button
              size="sm"
              variant="ghost"
              class="h-7 shrink-0 px-2 text-xs"
              @click="copyInstallCommand"
            >
              <Copy class="mr-1 size-3" />
              {{
                copiedCommand
                  ? $t('page.overview.installCopied')
                  : $t('page.overview.installCopy')
              }}
            </Button>
          </div>

          <!-- Download link -->
          <div class="mt-3 flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              as="a"
              :href="installInfo.releasesUrl"
              target="_blank"
              rel="noreferrer"
              class="h-8 gap-1.5 text-xs"
              @click="hasInitiatedInstall = true"
            >
              <Download class="size-3.5" />
              {{ $t('page.overview.installDownload') }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Checklist -->
      <Card class="border-border/60 shadow-xs">
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-semibold">
            {{ $t('page.overview.checklistTitle') }}
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <div class="flex flex-col gap-3">
            <div
              v-for="(step, idx) in checklistSteps"
              :key="idx"
              class="flex items-start gap-2.5"
            >
              <CheckCircle2
                v-if="step.done"
                class="mt-0.5 size-4 shrink-0 text-success"
              />
              <Circle
                v-else
                class="mt-0.5 size-4 shrink-0 text-muted-foreground/50"
              />
              <span
                class="text-xs"
                :class="
                  step.done
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                "
              >
                {{ step.label }}
              </span>
            </div>
          </div>
          <Progress
            :model-value="checklistProgress"
            class="mt-4 h-1.5 transition-all duration-500"
          />
        </CardContent>
      </Card>

      <!-- Modules grid -->
      <div class="lg:col-span-2">
        <p
          class="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          {{ $t('page.overview.modulesTitle') }}
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Button
            v-for="mod in modules"
            :key="mod.path"
            type="button"
            variant="outline"
            class="group relative h-auto flex-col items-stretch justify-start gap-2 rounded-xl p-4 text-left whitespace-normal transition-all"
            :class="
              isLocked(mod)
                ? 'border-border/40 bg-muted/20 opacity-60'
                : 'border-border/60 bg-card hover:border-border hover:bg-card hover:shadow-sm'
            "
            :disabled="isLocked(mod)"
            @click="openModule(mod)"
          >
            <div class="flex items-center justify-between gap-2">
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-lg"
                :class="
                  isLocked(mod)
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary/10 text-primary'
                "
              >
                <component :is="mod.icon" class="size-3.5" />
              </div>
              <Badge
                v-if="mod.requiresCloud"
                variant="outline"
                class="text-[10px] text-muted-foreground"
              >
                {{ $t('page.overview.moduleRequiresCloud') }}
              </Badge>
              <Badge
                v-else-if="!isHealthy"
                variant="outline"
                class="text-[10px] text-amber-500 border-amber-500/30"
              >
                {{ $t('page.overview.moduleRequiresBridge') }}
              </Badge>
              <ExternalLink
                v-else
                class="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <div>
              <p class="text-sm font-semibold text-foreground">
                {{ mod.name }}
              </p>
              <p class="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                {{ mod.description }}
              </p>
            </div>
          </Button>
        </div>
        <p class="mt-3 text-[11px] text-muted-foreground">
          {{ $t('page.overview.modulesDesc') }}
        </p>
      </div>
    </div>
  </Page>
</template>
