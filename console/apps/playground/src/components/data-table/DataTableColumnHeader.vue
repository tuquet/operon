<script setup lang="ts">
import type { DataTableSortableColumn } from './types';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from '@lucide/vue';

interface DataTableColumnHeaderProps {
  column: DataTableSortableColumn;
  title: string;
}

defineOptions({ inheritAttrs: false });

defineProps<DataTableColumnHeaderProps>();
</script>

<template>
  <div
    v-if="column.getCanSort()"
    :class="cn('flex items-center gap-2', ($attrs.class as string) ?? '')"
  >
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="data-[state=open]:bg-accent -ml-3 h-8"
        >
          <span>{{ title }}</span>
          <ArrowDown
            v-if="column.getIsSorted() === 'desc'"
            class="ml-1.5 size-3.5"
          />
          <ArrowUp
            v-else-if="column.getIsSorted() === 'asc'"
            class="ml-1.5 size-3.5"
          />
          <ChevronsUpDown
            v-else
            class="text-muted-foreground/70 ml-1.5 size-3.5"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem @click="column.toggleSorting(false)">
            <ArrowUp class="text-muted-foreground/70 mr-2 size-3.5" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem @click="column.toggleSorting(true)">
            <ArrowDown class="text-muted-foreground/70 mr-2 size-3.5" />
            Desc
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <template v-if="column.getCanHide()">
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem @click="column.toggleVisibility(false)">
              <EyeOff class="text-muted-foreground/70 mr-2 size-3.5" />
              Hide
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <div v-else :class="($attrs.class as string) ?? ''">
    {{ title }}
  </div>
</template>
