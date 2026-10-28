<script lang="ts" setup>
import type { ExecutionLog, Job } from '#/api';

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  Progress,
  toast,
} from '@operon-core/shadcn-ui';

import {
  AlertCircle,
  ArrowLeft,
  Clock,
  GitBranch,
  Laptop,
  PlayCircle,
  RefreshCw,
  Terminal,
  XCircle,
} from '@lucide/vue';

import {
  calculateProgressPercentage,
  cancelJob,
  getJob,
  isRunActive,
  listExecutionLogs,
} from '#/api';
import { useDateFormat } from '#/composables';
import { getStatusToneMeta, JOB_STATUS_META } from '#/constants';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

defineOptions({ name: 'AutomationJobDetail' });

const route = useRoute();
const router = useRouter();
const { formatDate } = useDateFormat();

const runId = computed(() => route.params.id as string);
const loading = ref(true);
const canceling = ref(false);
const run = ref<Job | null>(null);
const logs = ref<ExecutionLog[]>([]);
const consoleRef = ref<HTMLElement | null>(null);

let pollTimer: null | ReturnType<typeof setInterval> = null;

const isActive = computed(() =>
  run.value ? isRunActive(run.value.status) : false,
);

const progressPct = computed(() => {
  if (!run.value) return 0;
  return calculateProgressPercentage(
    run.value.completed_tasks,
    run.value.total_tasks,
  );
});

function getRunStatusDotClass(status: string): string {
  const meta = getStatusToneMeta(status, JOB_STATUS_META);
  return `${meta.dotClass}${meta.pulse ? ' animate-pulse' : ''}`;
}

function getRunStatusLabel(status: string): string {
  const meta = getStatusToneMeta(status, JOB_STATUS_META);
  return meta.labelKey ? $t(meta.labelKey) : (meta.fallbackLabel ?? status);
}

function formatDuration(
  start: null | string | undefined,
  end: null | string | undefined,
): string {
  if (!start) return '—';
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((endTime - startTime) / 1000));

  if (diffSec < 60) return `${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}m ${secs}s`;
}

function scrollToBottom() {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
    }
  });
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function fetchRunAndLogs() {
  if (!runId.value) return;
  try {
    const detail = await getJob(runId.value);
    if (detail) {
      run.value = detail;
    }

    const latestId =
      logs.value.length > 0 ? logs.value[logs.value.length - 1]?.id : undefined;
    const newLogs = await listExecutionLogs(runId.value, {
      limit: 200,
      sinceId: latestId,
    });

    if (newLogs.length > 0) {
      logs.value = [...logs.value, ...newLogs];
      scrollToBottom();
    }

    if (run.value && !isRunActive(run.value.status)) {
      stopPolling();
    }
  } catch (error: any) {
    captureError(error, {
      action: 'fetchRunAndLogs',
      runId: runId.value,
      view: 'AutomationRunDetail',
    });
  }
}

function startPolling() {
  stopPolling();
  if (isActive.value) {
    pollTimer = setInterval(() => {
      fetchRunAndLogs();
    }, 3000);
  }
}

async function handleCancelRun() {
  if (!runId.value) return;
  canceling.value = true;
  try {
    await cancelJob(runId.value);
    toast.success($t('page.automation_view.cancel_run_success'));
    await fetchRunAndLogs();
  } catch (error: any) {
    captureError(error, {
      action: 'handleCancelRun',
      runId: runId.value,
      view: 'AutomationRunDetail',
    });
    toast.error(error.message || $t('page.automation_view.cancel_run_failed'));
  } finally {
    canceling.value = false;
  }
}

function handleGoBack() {
  router.push('/automation/jobs');
}

onMounted(async () => {
  loading.value = true;
  try {
    await fetchRunAndLogs();
    startPolling();
  } catch (error: any) {
    captureError(error, {
      action: 'onMounted',
      runId: runId.value,
      view: 'AutomationRunDetail',
    });
    toast.error(error.message || $t('page.automation_view.load_run_failed'));
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="space-y-3 p-3 sm:space-y-4 sm:p-5">
    <!-- Mobile-First Navigation & Action Header -->
    <div
      class="flex flex-wrap items-start justify-between gap-2 sm:items-center"
    >
      <div class="flex min-w-0 items-start gap-2.5 sm:items-center">
        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          :title="$t('common.back')"
          @click="handleGoBack"
        >
          <ArrowLeft class="size-4" />
        </Button>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1
              class="truncate text-base font-semibold tracking-tight text-foreground sm:text-xl"
            >
              {{ run?.name || $t('page.automation.jobDetail') }}
            </h1>
            <Badge v-if="run" variant="outline" class="shrink-0">
              <span
                class="mr-1.5 size-1.5 rounded-full"
                :class="getRunStatusDotClass(run.status)"
              ></span>
              {{ getRunStatusLabel(run.status) }}
            </Badge>
          </div>
          <div class="truncate text-muted-foreground">
            {{ $t('page.automation_view.run_id_label') }}: {{ runId }}
          </div>
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
        <!-- Live Polling Indicator -->
        <Badge
          v-if="isActive"
          variant="outline"
          class="hidden items-center gap-1.5 rounded-full border-border/60 bg-muted/30 px-2.5 py-1 text-muted-foreground sm:inline-flex"
        >
          <span class="size-2 animate-pulse rounded-full bg-success"></span>
          <span>{{ $t('page.automation_view.live_polling_3s') }}</span>
        </Badge>

        <AlertDialog v-if="isActive">
          <AlertDialogTrigger as-child>
            <Button
              variant="destructive"
              size="sm"
              :disabled="canceling"
              class="h-8 gap-1.5 px-2.5"
            >
              <XCircle class="size-3.5 shrink-0" />
              <span class="hidden sm:inline">
                {{ $t('page.automation_view.cancel_run_btn') }}
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {{ $t('page.automation_view.cancel_run_confirm_title') }}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {{ $t('page.automation_view.cancel_run_confirm_desc') }}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{{ $t('common.close') }}</AlertDialogCancel>
              <AlertDialogAction @click="handleCancelRun">
                {{ $t('page.automation_view.confirm_cancel_btn') }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="outline"
          size="icon"
          :disabled="loading"
          class="size-8 shrink-0"
          :title="$t('common.refresh')"
          @click="fetchRunAndLogs"
        >
          <RefreshCw
            class="size-3.5 shrink-0"
            :class="{ 'animate-spin': loading }"
          />
        </Button>
      </div>
    </div>

    <!-- Mobile-First Run Specifications Grid (2 -> 2 -> 4 Columns) -->
    <div
      v-if="run"
      class="space-y-2.5 rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:space-y-3 sm:p-4"
    >
      <div class="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <!-- 1. Workflow -->
        <div
          class="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3"
        >
          <div class="text-muted-foreground">
            {{ $t('term.workflow') }}
          </div>
          <div class="flex items-center gap-2">
            <GitBranch class="size-4 shrink-0 text-muted-foreground" />
            <span class="truncate text-foreground">
              {{
                run.workflow
                  ? run.workflow.name
                  : $t('page.jobs_view.unassigned_workflow')
              }}
            </span>
          </div>
        </div>

        <!-- 2. Worker Device -->
        <div
          class="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3"
        >
          <div class="text-muted-foreground">
            {{ $t('page.jobs_view.col_runner') }}
          </div>
          <div class="flex items-center gap-2">
            <Laptop class="size-4 shrink-0 text-muted-foreground" />
            <span class="truncate text-foreground">
              {{
                run.worker
                  ? run.worker.name
                  : $t('page.jobs_view.auto_dispatch')
              }}
            </span>
          </div>
        </div>

        <!-- 3. Duration & Started At -->
        <div
          class="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3"
        >
          <div class="text-muted-foreground">
            {{ $t('page.jobs_view.duration') }}
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <Clock class="size-4 shrink-0 text-muted-foreground" />
            <span class="font-semibold text-foreground">
              {{ formatDuration(run.started_at, run.ended_at) }}
            </span>
            <span class="font-sans text-muted-foreground">
              &bull; {{ formatDate(run.started_at) }}
            </span>
          </div>
        </div>

        <!-- 4. Task Progress -->
        <div
          class="space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">
              {{ $t('page.automation_view.task_progress') }}
            </span>
            <span class="text-foreground">
              {{
                $t('page.automation_view.tasks_progress_count', [
                  run.completed_tasks,
                  run.total_tasks,
                ])
              }}
              ({{ progressPct }}%)
            </span>
          </div>
          <Progress :model-value="progressPct" class="h-2" />
        </div>
      </div>

      <!-- Error Message Banner -->
      <Alert v-if="run.error_message" variant="destructive">
        <AlertCircle class="size-4" />
        <AlertDescription class="leading-relaxed break-all">
          {{ run.error_message }}
        </AlertDescription>
      </Alert>
    </div>

    <!-- Execution Logs Console Section -->
    <div
      class="space-y-3 rounded-xl border border-border/60 bg-card p-3 shadow-xs sm:p-4"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5"
      >
        <div class="flex items-center gap-2">
          <Terminal class="size-4 text-muted-foreground" />
          <span class="font-semibold text-foreground">
            {{ $t('page.automation_view.execution_logs') }}
          </span>
          <Badge variant="outline" class=" ">
            {{ $t('page.automation_view.logs_line_count', [logs.length]) }}
          </Badge>
        </div>

        <div class="text-muted-foreground">
          {{
            isActive
              ? $t('page.automation_view.logs_live_updating')
              : $t('page.automation_view.logs_finished')
          }}
        </div>
      </div>

      <!-- Terminal Output Window -->
      <div
        ref="consoleRef"
        class="max-h-[460px] min-h-[260px] space-y-1.5 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-neutral-300 sm:p-4"
      >
        <div
          v-for="log in logs"
          :key="log.id"
          class="flex flex-col gap-1 rounded px-1 py-1 transition-colors hover:bg-neutral-900/50 sm:flex-row sm:items-start sm:gap-2 sm:py-0.5"
        >
          <div class="flex flex-wrap items-center gap-1.5 sm:shrink-0">
            <span class="shrink-0 text-neutral-500 select-none">
              {{ formatDate(log.logged_at) }}
            </span>
            <span
              class="shrink-0 rounded px-1 py-0.5 font-semibold uppercase"
              :class="{
                'bg-success/20 text-success': log.level === 'info',
                'bg-warning/20 text-warning': log.level === 'warn',
                'bg-destructive/20 text-destructive':
                  log.level === 'error' || log.level === 'fatal',
                'bg-primary/20 text-primary':
                  log.level === 'debug' || log.level === 'trace',
              }"
            >
              {{ log.level }}
            </span>
            <span
              v-if="log.step_name"
              class="shrink-0 font-semibold text-neutral-400"
            >
              [{{ log.step_name }}]
            </span>
          </div>
          <span class="flex-1 leading-relaxed text-neutral-200 break-all">
            {{ log.message }}
          </span>
        </div>

        <!-- Empty Logs State -->
        <Empty
          v-if="logs.length === 0 && !loading"
          class="h-48 border-none text-neutral-500"
        >
          <EmptyHeader>
            <EmptyMedia variant="icon" class="bg-neutral-900 text-neutral-500">
              <PlayCircle class="size-5" />
            </EmptyMedia>
            <EmptyDescription class="text-neutral-500">
              {{ $t('page.automation_view.logs_empty') }}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  </div>
</template>
