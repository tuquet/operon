<script lang="ts" setup>
import type { Workflow } from '#/api';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@operon-core/shadcn-ui';

import { Check, Copy, GitBranch } from '@lucide/vue';

import { useClipboard, useDateFormat } from '#/composables';
import { getStatusToneMeta, WORKFLOW_STATUS_META } from '#/constants';
import { $t } from '#/locales';

interface Props {
  open: boolean;
  workflow: null | Workflow;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const { copyToClipboard, isCopied } = useClipboard();
const { formatDate } = useDateFormat();

function getStatusDotClass(status: string): string {
  return getStatusToneMeta(status, WORKFLOW_STATUS_META).dotClass;
}

function getStatusLabel(status: string): string {
  const meta = getStatusToneMeta(status, WORKFLOW_STATUS_META);
  return meta.labelKey ? $t(meta.labelKey) : (meta.fallbackLabel ?? status);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ $t('page.workflows_view.detail_title') }}
        </DialogTitle>
      </DialogHeader>

      <div v-if="props.workflow" class="space-y-4 py-1">
        <!-- Header Summary -->
        <div
          class="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:items-center sm:p-4"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
            >
              <GitBranch class="size-5" />
            </div>
            <div class="min-w-0">
              <div class="truncate text-base font-semibold text-foreground">
                {{ props.workflow.name }}
              </div>
              <div class="mt-0.5 flex items-center gap-1.5">
                <Badge variant="outline" class="text-2xs">
                  v{{ props.workflow.version }}
                </Badge>
              </div>
            </div>
          </div>

          <Badge variant="outline" class="shrink-0">
            <span
              class="mr-1.5 size-1.5 rounded-full"
              :class="getStatusDotClass(props.workflow.status)"
            ></span>
            {{ getStatusLabel(props.workflow.status) }}
          </Badge>
        </div>

        <!-- Description -->
        <div
          class="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3.5"
        >
          <div class="text-muted-foreground">
            {{ $t('page.workflows_view.description_label') }}
          </div>
          <div class="leading-relaxed text-foreground break-words">
            {{
              props.workflow.description ||
              $t('page.workflows_view.no_description')
            }}
          </div>
        </div>

        <!-- Specifications Grid (Mobile-First 1 -> 2 Columns) -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <!-- Workflow ID -->
          <div
            class="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-3 sm:col-span-2"
          >
            <div class="text-muted-foreground">
              {{ $t('page.workflows_view.workflow_id') }}
            </div>
            <div
              class="flex items-center justify-between gap-2 text-foreground"
            >
              <span class="break-all">{{ props.workflow.id }}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-6 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                :title="$t('page.workflows_view.workflow_id')"
                :aria-label="$t('page.workflows_view.workflow_id')"
                @click="
                  copyToClipboard(
                    props.workflow.id,
                    $t('page.workflows_view.workflow_id'),
                  )
                "
              >
                <Check
                  v-if="isCopied($t('page.workflows_view.workflow_id'))"
                  class="size-3.5 text-success"
                />
                <Copy v-else class="size-3.5" />
              </Button>
            </div>
          </div>

          <!-- Workspace ID -->
          <div
            class="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-3 sm:col-span-2"
          >
            <div class="text-muted-foreground">
              {{ $t('page.workflows_view.workspace_id') }}
            </div>
            <div
              class="flex items-center justify-between gap-2 text-foreground"
            >
              <span class="break-all">{{ props.workflow.tenant_id }}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="size-6 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                :title="$t('page.workflows_view.workspace_id')"
                @click="
                  copyToClipboard(
                    props.workflow.tenant_id,
                    $t('page.workflows_view.workspace_id'),
                  )
                "
              >
                <Check
                  v-if="isCopied($t('page.workflows_view.workspace_id'))"
                  class="size-3.5 text-success"
                />
                <Copy v-else class="size-3.5" />
              </Button>
            </div>
          </div>

          <!-- Created At -->
          <div
            class="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-3"
          >
            <div class="text-muted-foreground">
              {{ $t('page.workflows_view.col_created_at') }}
            </div>
            <div class="text-foreground">
              {{ formatDate(props.workflow.created_at) }}
            </div>
          </div>

          <!-- Updated At -->
          <div
            class="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-3"
          >
            <div class="text-muted-foreground">
              {{ $t('page.workflows_view.col_updated_at') }}
            </div>
            <div class="text-foreground">
              {{ formatDate(props.workflow.updated_at) }}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end pt-1">
          <Button variant="outline" @click="emit('update:open', false)">
            {{ $t('common.close') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
