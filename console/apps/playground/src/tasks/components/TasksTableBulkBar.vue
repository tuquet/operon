<script setup lang="ts">
import type { Task } from '../data/schema';

import { onBeforeUnmount, onMounted } from 'vue';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
  Separator,
} from '@operon-core/shadcn-ui';

import {
  CheckCircle2,
  Download,
  FileJson,
  Flame,
  Trash2,
  UserCheck,
  X,
} from '@lucide/vue';

import { assignees, priorities, statuses } from '../data/data';

interface TasksTableBulkBarProps {
  selectedTasks: Task[];
}

const props = defineProps<TasksTableBulkBarProps>();

const emit = defineEmits<{
  bulkDelete: [];
  bulkUpdate: [
    patch: Partial<Pick<Task, 'assignee' | 'label' | 'priority' | 'status'>>,
  ];
  clear: [];
  exportCsv: [];
  exportJson: [];
}>();

type BulkField = 'assignee' | 'priority' | 'status';

interface BulkMenuOption {
  icon?: unknown;
  label: string;
  value: string;
}

interface BulkMenuConfig {
  field: BulkField;
  icon: unknown;
  iconClass: string;
  items: readonly BulkMenuOption[];
  label: string;
  menuLabel: string;
  widthClass: string;
}

const bulkMenus: BulkMenuConfig[] = [
  {
    field: 'status',
    icon: CheckCircle2,
    iconClass: 'text-sky-500',
    items: statuses,
    label: 'Status',
    menuLabel: 'Set status',
    widthClass: 'w-[160px]',
  },
  {
    field: 'priority',
    icon: Flame,
    iconClass: 'text-amber-500',
    items: priorities,
    label: 'Priority',
    menuLabel: 'Set priority',
    widthClass: 'w-[150px]',
  },
  {
    field: 'assignee',
    icon: UserCheck,
    iconClass: 'text-emerald-500',
    items: assignees,
    label: 'Assign',
    menuLabel: 'Assign owner',
    widthClass: 'w-[175px]',
  },
];

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.selectedTasks.length > 0) {
    if (document.querySelector('[data-state="open"][role="dialog"]')) return;
    emit('clear');
  }
}

onMounted(() => window.addEventListener('keydown', handleEsc));
onBeforeUnmount(() => window.removeEventListener('keydown', handleEsc));
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0 scale-95"
    enter-to-class="translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100 scale-100"
    leave-to-class="translate-y-4 opacity-0 scale-95"
  >
    <div
      v-if="selectedTasks.length > 0"
      class="border-border bg-popover/95 text-popover-foreground fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 shadow-xl backdrop-blur-md"
    >
      <div class="flex items-center gap-2 pr-1">
        <Badge variant="default" class="font-mono text-xs">
          {{ selectedTasks.length }}
        </Badge>
        <span class="text-xs font-medium whitespace-nowrap">selected</span>
      </div>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <DropdownMenu v-for="menu in bulkMenus" :key="menu.field">
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="h-8 text-xs">
            <component
              :is="menu.icon"
              class="mr-1.5 size-3.5"
              :class="menu.iconClass"
            />
            {{ menu.label }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" :class="menu.widthClass">
          <DropdownMenuLabel class="text-xs">
            {{ menu.menuLabel }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              v-for="item in menu.items"
              :key="item.value"
              @select="emit('bulkUpdate', { [menu.field]: item.value })"
            >
              <component
                :is="item.icon"
                v-if="item.icon"
                class="text-muted-foreground mr-2 size-3.5"
              />
              {{ item.label }}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <Button
        variant="ghost"
        size="sm"
        class="h-8 text-xs"
        @click="emit('exportCsv')"
      >
        <Download class="mr-1.5 size-3.5" />
        CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 text-xs"
        @click="emit('exportJson')"
      >
        <FileJson class="mr-1.5 size-3.5" />
        JSON
      </Button>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <Button
        variant="ghost"
        size="sm"
        class="h-8 text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
        @click="emit('bulkDelete')"
      >
        <Trash2 class="mr-1.5 size-3.5" />
        Delete
      </Button>

      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground h-8 gap-1.5 px-2 text-xs"
        @click="emit('clear')"
      >
        <X class="size-3.5" />
        <Kbd class="text-[10px]">Esc</Kbd>
      </Button>
    </div>
  </Transition>
</template>
