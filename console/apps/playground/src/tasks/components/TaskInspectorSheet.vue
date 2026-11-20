<script setup lang="ts">
import type { Task, TaskDraft } from '../data/schema';

import { computed, reactive, ref, watch } from 'vue';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { Star, Trash2 } from '@lucide/vue';

import { assignees, labels, priorities, statuses } from '../data/data';

interface TaskInspectorSheetProps {
  mode: 'create' | 'edit';
  open: boolean;
  task: null | Task;
}

const props = defineProps<TaskInspectorSheetProps>();

const emit = defineEmits<{
  create: [draft: TaskDraft];
  delete: [id: string];
  save: [id: string, draft: TaskDraft];
  'update:open': [value: boolean];
}>();

const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

const touched = ref(false);

const DEFAULT_FORM: TaskDraft = {
  assignee: 'linh',
  favorite: false,
  label: 'feature',
  priority: 'medium',
  progress: 50,
  status: 'in progress',
  title: '',
};

const form = reactive<TaskDraft>({ ...DEFAULT_FORM });

const selectedStatus = computed(() =>
  statuses.find((item) => item.value === form.status),
);

const selectedAssignee = computed(() =>
  assignees.find((person) => person.value === form.assignee),
);

function snapToStep(val: number): number {
  let closest = 0;
  let minDiff = Infinity;
  for (const step of PROGRESS_STEPS) {
    const diff = Math.abs(step - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = step;
    }
  }
  return closest;
}

watch(
  () => [props.open, props.task, props.mode] as const,
  ([isOpen, currentTask, currentMode]) => {
    if (!isOpen) return;
    touched.value = false;
    if (currentMode === 'edit' && currentTask) {
      Object.assign(form, {
        assignee: currentTask.assignee,
        favorite: currentTask.favorite,
        label: currentTask.label,
        priority: currentTask.priority,
        progress: snapToStep(currentTask.progress),
        status: currentTask.status,
        title: currentTask.title,
      });
    } else {
      Object.assign(form, DEFAULT_FORM);
    }
  },
  { immediate: true },
);

const isValid = computed(() => form.title.trim().length > 0);

function handleStatusChange(nextStatus: unknown) {
  const value = String(nextStatus);
  form.status = value;
  if (value === 'done') form.progress = 100;
  else if (value === 'canceled' || value === 'backlog') form.progress = 0;
  else if (value === 'todo' && form.progress > 25) form.progress = 25;
  else if (
    value === 'in progress' &&
    (form.progress === 0 || form.progress === 100)
  ) {
    form.progress = 50;
  }
}

function handleProgressChange(raw: unknown) {
  if (raw === undefined || raw === '') return;
  const next = Number(raw);
  form.progress = next;
  if (next === 100 && form.status !== 'done') {
    form.status = 'done';
  } else if (next < 100 && form.status === 'done') {
    form.status = 'in progress';
  }
}

function handleTitleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

function handleSubmit() {
  touched.value = true;
  if (!isValid.value) return;
  const payload: TaskDraft = {
    title: form.title.trim(),
    status: form.status,
    priority: form.priority,
    label: form.label,
    assignee: form.assignee,
    favorite: form.favorite,
    progress: form.progress,
  };
  if (props.mode === 'edit' && props.task) {
    emit('save', props.task.id, payload);
  } else {
    emit('create', payload);
  }
  emit('update:open', false);
}

function handleDelete() {
  if (!props.task) return;
  emit('delete', props.task.id);
  emit('update:open', false);
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      :open="open"
      modal
      side="right"
      class="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]"
    >
      <!-- Single-Row Compact Header (~48px instead of 108px) -->
      <SheetHeader
        class="border-border flex shrink-0 flex-row items-center justify-between gap-2 border-b px-5 py-3 pr-11"
      >
        <div class="flex min-w-0 items-center gap-2">
          <SheetTitle class="text-sm font-semibold tracking-tight">
            {{ mode === 'edit' ? 'Task Details' : 'New Task' }}
          </SheetTitle>
          <template v-if="mode === 'edit' && task">
            <Badge
              variant="outline"
              class="rounded-sm px-1.5 py-0 font-mono text-[11px] font-normal"
            >
              {{ task.id }}
            </Badge>
            <span class="text-muted-foreground truncate text-[11px]">
              · {{ task.updatedAt }}
            </span>
          </template>
        </div>
        <SheetDescription class="sr-only">
          {{
            mode === 'edit'
              ? 'Edit task properties and execution progress.'
              : 'Create a new engineering task.'
          }}
        </SheetDescription>
      </SheetHeader>

      <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="handleSubmit">
        <div
          class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
        >
          <!-- Multi-line Wrapping Title -->
          <div class="flex flex-col gap-1.5">
            <Label for="task-title" class="text-xs font-medium">
              Title <span class="text-destructive">*</span>
            </Label>
            <Textarea
              id="task-title"
              v-model="form.title"
              rows="2"
              class="min-h-[56px] resize-none text-[13px] leading-snug"
              placeholder="e.g. Harden TLS handshake timeout on edge proxy"
              :aria-invalid="touched && !isValid"
              @blur="touched = true"
              @keydown="handleTitleKeydown"
            />
            <p v-if="touched && !isValid" class="text-destructive text-[11px]">
              Task title is required.
            </p>
          </div>

          <!-- Status & Assignee (Full-width 2-col grid with custom SelectValue slots) -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-medium">Status</Label>
              <Select
                :model-value="form.status"
                @update:model-value="handleStatusChange"
              >
                <SelectTrigger class="h-9 w-full text-xs">
                  <SelectValue placeholder="Select status">
                    <div
                      v-if="selectedStatus"
                      class="flex items-center gap-2 truncate"
                    >
                      <component
                        :is="selectedStatus.icon"
                        class="text-muted-foreground size-3.5 shrink-0"
                      />
                      <span class="truncate">{{ selectedStatus.label }}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="item in statuses"
                      :key="item.value"
                      :value="item.value"
                      class="text-xs"
                    >
                      <div class="flex items-center gap-2">
                        <component
                          :is="item.icon"
                          class="text-muted-foreground size-3.5 shrink-0"
                        />
                        <span>{{ item.label }}</span>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-medium">Assignee</Label>
              <Select
                :model-value="form.assignee"
                @update:model-value="(val) => (form.assignee = String(val))"
              >
                <SelectTrigger class="h-9 w-full text-xs">
                  <SelectValue placeholder="Select owner">
                    <div
                      v-if="selectedAssignee"
                      class="flex items-center gap-2 truncate"
                    >
                      <Avatar class="size-4 shrink-0 text-[9px]">
                        <AvatarFallback
                          :class="
                            cn('font-semibold', selectedAssignee.avatarClass)
                          "
                        >
                          {{ selectedAssignee.initials }}
                        </AvatarFallback>
                      </Avatar>
                      <span class="truncate">{{ selectedAssignee.label }}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="person in assignees"
                      :key="person.value"
                      :value="person.value"
                      class="text-xs"
                    >
                      <div class="flex items-center gap-2">
                        <Avatar class="size-4 shrink-0 text-[9px]">
                          <AvatarFallback
                            :class="cn('font-semibold', person.avatarClass)"
                          >
                            {{ person.initials }}
                          </AvatarFallback>
                        </Avatar>
                        <span>{{ person.label }}</span>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Priority -->
          <div class="flex flex-col gap-1.5">
            <Label class="text-xs font-medium">Priority</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              class="w-full"
              :model-value="form.priority"
              @update:model-value="
                (val) => val && (form.priority = String(val))
              "
            >
              <ToggleGroupItem
                v-for="priority in priorities"
                :key="priority.value"
                :value="priority.value"
                class="data-[state=on]:border-foreground/25 data-[state=on]:bg-accent flex-1 text-xs data-[state=on]:font-medium"
              >
                <component :is="priority.icon" class="mr-1.5 size-3.5" />
                {{ priority.label }}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <!-- Category Label -->
          <div class="flex flex-col gap-1.5">
            <Label class="text-xs font-medium">Category</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              class="w-full"
              :model-value="form.label"
              @update:model-value="(val) => val && (form.label = String(val))"
            >
              <ToggleGroupItem
                v-for="item in labels"
                :key="item.value"
                :value="item.value"
                class="data-[state=on]:border-foreground/25 data-[state=on]:bg-accent flex-1 text-xs data-[state=on]:font-medium"
              >
                {{ item.label }}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <!-- Execution Progress -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-medium">Progress</Label>
              <span class="font-mono text-xs font-semibold">
                {{ form.progress }}%
              </span>
            </div>
            <Progress :model-value="form.progress" class="h-1.5" />
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              class="w-full"
              :model-value="String(form.progress)"
              @update:model-value="handleProgressChange"
            >
              <ToggleGroupItem
                v-for="step in PROGRESS_STEPS"
                :key="step"
                :value="String(step)"
                class="data-[state=on]:border-foreground/25 data-[state=on]:bg-accent flex-1 font-mono text-xs data-[state=on]:font-semibold"
              >
                {{ step }}%
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <!-- Pin to Favorites Setting Row (No redundant Separator above) -->
          <div
            class="border-border/70 bg-muted/20 flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5"
          >
            <div class="flex items-center gap-2.5">
              <Star
                class="size-4 shrink-0 transition-colors"
                :class="
                  form.favorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground'
                "
              />
              <div class="flex flex-col">
                <Label
                  for="task-favorite"
                  class="cursor-pointer text-xs font-medium"
                >
                  Pin to favorites
                </Label>
                <span class="text-muted-foreground text-[11px]">
                  Surface quickly via the Pinned filter
                </span>
              </div>
            </div>
            <Switch id="task-favorite" v-model="form.favorite" />
          </div>
        </div>

        <SheetFooter
          class="border-border bg-muted/25 flex shrink-0 items-center justify-between border-t px-5 py-3"
        >
          <Button
            v-if="mode === 'edit' && task"
            type="button"
            variant="ghost"
            size="sm"
            class="text-destructive hover:bg-destructive/10 hover:text-destructive -ml-2 h-8 px-2 text-xs"
            @click="handleDelete"
          >
            <Trash2 class="mr-1.5 size-3.5" />
            Delete
          </Button>
          <div v-else></div>

          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-xs"
              @click="emit('update:open', false)"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              class="h-8 text-xs font-medium"
              :disabled="!isValid"
            >
              {{ mode === 'edit' ? 'Save Changes' : 'Create Task' }}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
