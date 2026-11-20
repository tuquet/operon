<script setup lang="ts">
import type { Row } from '@tanstack/vue-table';

import type { DataTableFeatures } from '../../components/data-table';
import type { Task } from '../data/schema';

import { computed } from 'vue';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@operon-core/shadcn-ui';

import { Copy, MoreHorizontal, Pencil, Star, Trash2 } from '@lucide/vue';

import { labels, priorities, statuses } from '../data/data';
import { taskSchema } from '../data/schema';

export interface RowActionCallbacks {
  onCopyId: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onInspect: (task: Task) => void;
  onQuickUpdate: (
    id: string,
    patch: Partial<Pick<Task, 'assignee' | 'label' | 'priority' | 'status'>>,
  ) => void;
  onToggleFavorite: (id: string) => void;
}

interface TasksTableRowActionsProps {
  actions: RowActionCallbacks;
  row: Row<DataTableFeatures, Task>;
}

const props = defineProps<TasksTableRowActionsProps>();

const task = computed(() => taskSchema.parse(props.row.original));
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="data-[state=open]:bg-muted flex size-8 p-0"
      >
        <MoreHorizontal class="size-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[180px]">
      <DropdownMenuGroup>
        <DropdownMenuItem @select="actions.onInspect(task)">
          <Pencil class="text-muted-foreground mr-2 size-3.5" />
          Inspect & Edit
        </DropdownMenuItem>
        <DropdownMenuItem @select="actions.onDuplicate(task.id)">
          <Copy class="text-muted-foreground mr-2 size-3.5" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem @select="actions.onToggleFavorite(task.id)">
          <Star
            class="mr-2 size-3.5"
            :class="
              task.favorite
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground'
            "
          />
          {{ task.favorite ? 'Unpin favorite' : 'Pin favorite' }}
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              :model-value="task.status"
              @update:model-value="
                (val) => actions.onQuickUpdate(task.id, { status: String(val) })
              "
            >
              <DropdownMenuRadioItem
                v-for="status in statuses"
                :key="status.value"
                :value="status.value"
              >
                {{ status.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Priority</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              :model-value="task.priority"
              @update:model-value="
                (val) =>
                  actions.onQuickUpdate(task.id, { priority: String(val) })
              "
            >
              <DropdownMenuRadioItem
                v-for="priority in priorities"
                :key="priority.value"
                :value="priority.value"
              >
                {{ priority.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Label</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              :model-value="task.label"
              @update:model-value="
                (val) => actions.onQuickUpdate(task.id, { label: String(val) })
              "
            >
              <DropdownMenuRadioItem
                v-for="label in labels"
                :key="label.value"
                :value="label.value"
              >
                {{ label.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuItem
          class="text-rose-500 focus:text-rose-500"
          @select="actions.onDelete(task.id)"
        >
          <Trash2 class="mr-2 size-3.5" />
          Delete
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
