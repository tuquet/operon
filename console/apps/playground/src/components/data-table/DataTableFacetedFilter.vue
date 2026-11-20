<script setup lang="ts" generic="TData extends RowData">
import type { Column, RowData } from '@tanstack/vue-table';

import type { DataTableFeatures } from './features';
import type { DataTableFacetOption } from './types';

import { computed } from 'vue';

import {
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from '@operon-core/shadcn-ui';
import { cn } from '@operon-core/shared/utils';

import { Check, PlusCircle } from '@lucide/vue';

interface DataTableFacetedFilterProps {
  column?: Column<DataTableFeatures, TData, any>;
  options: DataTableFacetOption[];
  title?: string;
}

const props = defineProps<DataTableFacetedFilterProps>();

const facets = computed(() => props.column?.getFacetedUniqueValues());
const selectedValues = computed(
  () => new Set(props.column?.getFilterValue() as string[] | undefined),
);

function toggleOption(value: string) {
  const next = new Set(selectedValues.value);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  const filterValues = [...next];
  props.column?.setFilterValue(
    filterValues.length > 0 ? filterValues : undefined,
  );
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        :class="
          cn(
            'h-8 border-dashed text-xs font-normal transition-colors',
            selectedValues.size > 0
              ? 'border-primary/40 bg-primary/5 text-foreground font-medium'
              : 'border-border/80 text-muted-foreground hover:text-foreground',
          )
        "
      >
        <PlusCircle class="mr-1.5 size-3.5 opacity-70" />
        {{ title }}
        <template v-if="selectedValues.size > 0">
          <Separator orientation="vertical" class="mx-2 h-3.5" />
          <Badge
            variant="secondary"
            class="rounded-sm px-1 font-mono text-[11px] font-normal lg:hidden"
          >
            {{ selectedValues.size }}
          </Badge>
          <div class="hidden items-center gap-1 lg:flex">
            <Badge
              v-if="selectedValues.size > 2"
              variant="secondary"
              class="rounded-sm px-1 font-mono text-[11px] font-normal"
            >
              {{ selectedValues.size }} selected
            </Badge>

            <template v-else>
              <Badge
                v-for="option in options.filter((opt) =>
                  selectedValues.has(opt.value),
                )"
                :key="option.value"
                variant="secondary"
                class="rounded-sm px-1.5 text-[11px] font-normal"
              >
                {{ option.label }}
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-[210px] p-0" align="start">
      <Command>
        <CommandInput :placeholder="title" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="option in options"
              :key="option.value"
              :value="option.label"
              @select="toggleOption(option.value)"
            >
              <div
                :class="
                  cn(
                    'border-primary mr-2 flex size-4 items-center justify-center rounded-sm border',
                    selectedValues.has(option.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible',
                  )
                "
              >
                <Check class="size-3.5" />
              </div>
              <component
                :is="option.icon"
                v-if="option.icon"
                class="text-muted-foreground mr-2 size-4"
              />
              <span>{{ option.label }}</span>
              <span
                v-if="facets?.get(option.value)"
                class="text-muted-foreground ml-auto flex size-4 items-center justify-center font-mono text-xs"
              >
                {{ facets.get(option.value) }}
              </span>
            </CommandItem>
          </CommandGroup>

          <template v-if="selectedValues.size > 0">
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="clear-filters"
                class="justify-center text-center"
                @select="column?.setFilterValue(undefined)"
              >
                Clear filters
              </CommandItem>
            </CommandGroup>
          </template>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
