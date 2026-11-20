<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DEFAULT_HOME_PATH } from '@operon/constants';
import {
  getLocalBridgeInstallInfo,
  useLocalBridgeHeartbeat,
} from '@operon/kernel';
import { preferences, usePreferences } from '@operon/preferences';
import { openWindow } from '@operon/utils';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Progress,
  Separator,
  Skeleton,
  toast,
} from '@operon-core/shadcn-ui';

import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Laptop,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Terminal,
  Zap,
} from '@lucide/vue';

import {
  clearWelcomeRedirect,
  hasPendingWelcomeRedirect,
  markLocalBridgeSeen,
  resolveWelcomeRedirect,
} from '#/utils/welcome';

defineOptions({ name: 'Welcome' });

const AUTO_REDIRECT_DURATION_MS = 1600;

const route = useRoute();
const router = useRouter();
const { isDark } = usePreferences();
const bridge = useLocalBridgeHeartbeat({ intervalMs: 5000 });
const installInfo = getLocalBridgeInstallInfo();

const copiedCommand = ref(false);
const wasOffline = ref(bridge.status.value === 'offline');
const autoRedirectPending = ref(false);
const autoRedirectCancelled = ref(false);
const redirectProgress = ref(0);

let redirectTimer: null | ReturnType<typeof setInterval> = null;

const isHealthy = computed(() => bridge.status.value === 'healthy');
const isChecking = computed(() => bridge.status.value === 'checking');
const isInitialChecking = bridge.isInitialChecking;

const targetRedirectPath = computed(() =>
  resolveWelcomeRedirect(route.query.redirect, DEFAULT_HOME_PATH),
);

const shouldAutoRedirectOnConnect = computed(
  () =>
    wasOffline.value ||
    Boolean(route.query.redirect) ||
    hasPendingWelcomeRedirect(),
);

const targetLabel = computed(() =>
  targetRedirectPath.value === DEFAULT_HOME_PATH
    ? 'your console'
    : targetRedirectPath.value,
);

function stopAutoRedirect() {
  if (redirectTimer) {
    clearInterval(redirectTimer);
    redirectTimer = null;
  }
  autoRedirectPending.value = false;
}

function cancelAutoRedirect() {
  autoRedirectCancelled.value = true;
  redirectProgress.value = 0;
  stopAutoRedirect();
}

function openConsole() {
  stopAutoRedirect();
  const target = targetRedirectPath.value;
  clearWelcomeRedirect();
  void router.replace(target);
}

function startGentleAutoRedirect() {
  if (autoRedirectPending.value || autoRedirectCancelled.value) {
    return;
  }
  stopAutoRedirect();
  autoRedirectPending.value = true;
  redirectProgress.value = 8;
  const startedAt = Date.now();

  redirectTimer = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const progress = Math.min(
      100,
      Math.round((elapsed / AUTO_REDIRECT_DURATION_MS) * 100),
    );
    redirectProgress.value = progress;

    if (elapsed >= AUTO_REDIRECT_DURATION_MS) {
      openConsole();
    }
  }, 50);
}

watch(
  bridge.status,
  (status) => {
    if (status === 'offline') {
      wasOffline.value = true;
      autoRedirectCancelled.value = false;
      redirectProgress.value = 0;
      stopAutoRedirect();
      return;
    }

    if (status === 'healthy') {
      markLocalBridgeSeen();
      if (shouldAutoRedirectOnConnect.value) {
        startGentleAutoRedirect();
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopAutoRedirect();
});

const downloadLabel = computed(() =>
  installInfo.platform === 'windows'
    ? 'Download for Windows'
    : 'Download for Mac / Linux',
);

const terminalLabel = computed(() =>
  installInfo.platform === 'windows' ? 'PowerShell' : 'Terminal',
);

const logoSrc = computed(() =>
  isDark.value ? preferences.logo.sourceDark : preferences.logo.source,
);

const steps = [
  {
    description:
      'Download the small Operon app or run the install command in your terminal.',
    icon: Download,
    number: '01',
    title: 'Install Operon',
  },
  {
    description:
      'Start Operon on your computer so browser tasks run safely on your own machine.',
    icon: Play,
    number: '02',
    title: 'Run it locally',
  },
  {
    description:
      'This page detects Operon automatically and unlocks the full console for you.',
    icon: CheckCircle2,
    number: '03',
    title: 'Open the console',
  },
];

const highlights = [
  {
    description:
      'Browser profiles, cookies, and saved logins stay on your own computer.',
    icon: Lock,
    title: 'Private by default',
  },
  {
    description:
      'Start, pause, and monitor browser tasks directly from this web app.',
    icon: Zap,
    title: 'Fast local speed',
  },
  {
    description:
      'Use everything locally right away. Sign in only when you want team sync.',
    icon: Laptop,
    title: 'No account required',
  },
];

async function copyInstallCommand() {
  try {
    await navigator.clipboard.writeText(installInfo.command);
    copiedCommand.value = true;
    toast.success('Install command copied');
    setTimeout(() => {
      copiedCommand.value = false;
    }, 2000);
  } catch {
    toast.error('Could not copy command');
  }
}
</script>

<template>
  <div
    class="flex min-h-dvh w-full flex-col overflow-y-auto bg-background text-foreground"
  >
    <!-- Standalone Top Navigation -->
    <header
      class="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md"
    >
      <div
        class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <div class="flex items-center gap-2.5">
          <img
            :src="logoSrc"
            alt="Operon"
            class="size-6 shrink-0 rounded-md object-contain"
          />
          <span class="text-sm font-semibold tracking-tight text-foreground">
            {{ preferences.app.name || 'Operon' }}
          </span>
          <Badge variant="outline" class="hidden text-[11px] sm:inline-flex">
            Local Runner
          </Badge>
        </div>

        <div class="flex items-center gap-2.5">
          <Badge
            :variant="isHealthy ? 'secondary' : 'outline'"
            :class="
              isHealthy
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : 'text-muted-foreground'
            "
            class="gap-1.5 text-xs font-normal"
          >
            <Activity v-if="isHealthy" class="size-3" />
            <Loader2
              v-else-if="isChecking"
              class="size-3 animate-spin text-primary"
            />
            <span
              v-else
              class="size-1.5 rounded-full bg-amber-500"
            ></span>
            <span v-if="isInitialChecking">Checking device…</span>
            <span v-else-if="isHealthy">
              Connected{{
                bridge.health.value?.version
                  ? ` v${bridge.health.value.version}`
                  : ''
              }}
            </span>
            <span v-else>App not detected</span>
          </Badge>

          <Button
            v-if="isHealthy"
            size="sm"
            class="h-8 gap-1.5"
            @click="openConsole"
          >
            <span>Open Console</span>
            <ArrowRight class="size-3.5" />
          </Button>
          <Button
            v-else
            size="sm"
            variant="outline"
            class="h-8 gap-1.5 shadow-none"
            :disabled="isChecking"
            @click="bridge.checkNow()"
          >
            <RefreshCw
              class="size-3.5"
              :class="{ 'animate-spin': isChecking }"
            />
            <span>Check Again</span>
          </Button>
        </div>
      </div>
    </header>

    <!-- Main Landing Content -->
    <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <!-- Hero Section -->
      <section class="mx-auto flex max-w-2xl flex-col items-center text-center">
        <Badge
          variant="outline"
          class="mb-5 gap-1.5 rounded-full border-border/80 bg-card px-3 py-1 text-xs font-normal text-muted-foreground"
        >
          <Laptop class="size-3.5 text-primary" />
          <span>Runs safely on your own computer</span>
        </Badge>

        <h1
          class="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          Browser automation, right on your machine.
        </h1>

        <p
          class="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Use this web console to organize and run browser tasks. Download the
          small Operon app on your computer so everything runs fast and stays
          private.
        </p>

        <!-- Action / Detection Block -->
        <Transition name="landing-fade" mode="out-in">
          <!-- Initial check skeleton -->
          <div
            v-if="isInitialChecking"
            key="landing-checking"
            class="mt-8 flex w-full max-w-xl flex-col items-center gap-4"
          >
            <div class="flex flex-wrap items-center justify-center gap-3">
              <Skeleton class="h-10 w-44 rounded-lg" />
              <Skeleton class="h-10 w-32 rounded-lg" />
            </div>
            <div
              class="w-full rounded-xl border border-border/60 bg-card p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <Skeleton class="h-3.5 w-32" />
                <Skeleton class="h-6 w-16 rounded-md" />
              </div>
              <Skeleton class="mt-3 h-9 w-full rounded-lg" />
            </div>
          </div>

          <!-- Connected state -->
          <div
            v-else-if="isHealthy"
            key="landing-connected"
            class="mt-8 flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6"
          >
            <div
              class="flex items-center gap-2 text-sm font-medium text-emerald-500"
            >
              <CheckCircle2 class="size-4" />
              <span>Operon is running on this computer</span>
            </div>
            <p class="text-xs text-muted-foreground">
              <template v-if="autoRedirectPending">
                Taking you to {{ targetLabel }} in a moment…
              </template>
              <template v-else>
                Your browser is connected and ready. Open the console to manage
                tasks and workflows.
              </template>
            </p>
            <Progress
              v-if="autoRedirectPending"
              :model-value="redirectProgress"
              class="h-1.5 w-full max-w-xs transition-all duration-150"
            />
            <div class="flex flex-wrap items-center justify-center gap-2.5">
              <Button size="lg" class="gap-2" @click="openConsole">
                <span>{{
                  autoRedirectPending ? 'Open Now' : 'Open Console'
                }}</span>
                <ArrowRight class="size-4" />
              </Button>
              <Button
                v-if="autoRedirectPending"
                size="lg"
                variant="ghost"
                @click="cancelAutoRedirect"
              >
                Stay on this page
              </Button>
            </div>
          </div>

          <!-- Download & Install state -->
          <div
            v-else
            key="landing-offline"
            class="mt-8 flex w-full max-w-xl flex-col items-center gap-5"
          >
            <div class="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                as="a"
                :href="installInfo.releasesUrl"
                target="_blank"
                rel="noreferrer"
                class="gap-2"
              >
                <Download class="size-4" />
                <span>{{ downloadLabel }}</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                class="gap-2 shadow-none"
                :disabled="isChecking"
                @click="bridge.checkNow()"
              >
                <RefreshCw
                  class="size-4"
                  :class="{ 'animate-spin': isChecking }"
                />
                <span>Check Again</span>
              </Button>
            </div>

            <!-- Quick Install Terminal Box -->
            <Card class="w-full border-border/70 bg-card/80 text-left shadow-none">
              <CardContent class="flex flex-col gap-3 p-4">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <Terminal class="size-3.5 text-primary" />
                    <span class="font-medium text-foreground">
                      Or install with one command
                    </span>
                    <Badge variant="outline" class="text-[10px]">
                      {{ terminalLabel }}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-7 gap-1.5 px-2 text-xs"
                    @click="copyInstallCommand"
                  >
                    <Check
                      v-if="copiedCommand"
                      class="size-3.5 text-emerald-500"
                    />
                    <Copy v-else class="size-3.5" />
                    <span>{{ copiedCommand ? 'Copied' : 'Copy' }}</span>
                  </Button>
                </div>

                <div
                  class="overflow-x-auto rounded-lg border border-border/60 bg-background px-3 py-2.5"
                >
                  <code class="whitespace-nowrap font-mono text-xs text-foreground">
                    {{ installInfo.command }}
                  </code>
                </div>

                <p class="text-xs text-muted-foreground">
                  Already installed? Start it with
                  <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    opn worker start
                  </code>
                  — this page checks every 5 seconds.
                </p>
              </CardContent>
            </Card>
          </div>
        </Transition>
      </section>

      <Separator />

      <!-- How It Works -->
      <section class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 text-center">
          <h2 class="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            How it works
          </h2>
          <p class="text-xs text-muted-foreground sm:text-sm">
            Get up and running in less than a minute.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card
            v-for="step in steps"
            :key="step.number"
            class="border-border/60 bg-card/60 shadow-none"
          >
            <CardContent class="flex flex-col gap-3 p-5">
              <div class="flex items-center justify-between">
                <div
                  class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <component :is="step.icon" class="size-4" />
                </div>
                <span class="font-mono text-xs text-muted-foreground">
                  {{ step.number }}
                </span>
              </div>
              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-semibold text-foreground">
                  {{ step.title }}
                </h3>
                <p class="text-xs leading-relaxed text-muted-foreground">
                  {{ step.description }}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <!-- Key Highlights -->
      <section class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          v-for="item in highlights"
          :key="item.title"
          class="flex items-start gap-3 rounded-xl border border-border/50 bg-card/30 p-4"
        >
          <div
            class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          >
            <component :is="item.icon" class="size-4" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="text-sm font-medium text-foreground">
              {{ item.title }}
            </h3>
            <p class="text-xs leading-relaxed text-muted-foreground">
              {{ item.description }}
            </p>
          </div>
        </div>
      </section>
    </main>

    <!-- Minimal Landing Footer -->
    <footer class="border-t border-border/60">
      <div
        class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:px-6"
      >
        <span>Operon • Connects locally on port {{ bridge.port }}</span>
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            @click="openWindow('https://docs.operon.com', { target: '_blank' })"
          >
            <span>Docs</span>
            <ExternalLink class="size-3" />
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            @click="openWindow(installInfo.releasesUrl, { target: '_blank' })"
          >
            <span>Releases</span>
            <ExternalLink class="size-3" />
          </button>
          <button
            type="button"
            class="transition-colors hover:text-foreground"
            @click="router.push('/auth/login')"
          >
            <span>Sign in</span>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-fade-enter-active,
.landing-fade-leave-active {
  transition: opacity 150ms ease;
}

.landing-fade-enter-from,
.landing-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .landing-fade-enter-active,
  .landing-fade-leave-active {
    transition-duration: 0ms;
  }
}
</style>
