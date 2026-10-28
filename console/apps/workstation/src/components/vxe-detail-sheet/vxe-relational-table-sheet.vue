<script lang="ts" setup>
import type {
  SupabaseRelationalColumn,
  SupabaseRelationalTableDescriptor,
} from '#/api/core/supabase-schema-registry';

import { computed, ref, watch } from 'vue';

import { usePreferences } from '@operon/preferences';

import {
  Badge,
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@operon-core/shadcn-ui';

import { ArrowRight, Check, Copy, Database, Search, Table2 } from '@lucide/vue';

import { useClipboard, useDateFormat } from '#/composables';
import { $t } from '#/locales';

interface Props {
  isSuperadmin?: boolean;
  open: boolean;
  parentResource?: string;
  parentTitle?: string;
  relation: null | SupabaseRelationalTableDescriptor;
}

const props = withDefaults(defineProps<Props>(), {
  isSuperadmin: false,
  parentResource: '',
  parentTitle: '',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const { isMobile } = usePreferences();
const { copyToClipboard, isCopied } = useClipboard();
const { formatDate } = useDateFormat();

const searchQuery = ref('');

watch(
  () => [props.open, props.relation] as const,
  ([isOpen]) => {
    if (isOpen) {
      searchQuery.value = '';
    }
  },
);

const filteredRows = computed<Array<Record<string, any>>>(() => {
  const rows = props.relation?.rows ?? [];
  const keyword = searchQuery.value.trim().toLowerCase();
  if (!keyword) {
    return rows;
  }
  const cols = props.relation?.columns ?? [];
  return rows.filter((item) =>
    cols.some((col) =>
      String(item?.[col.field] ?? '')
        .toLowerCase()
        .includes(keyword),
    ),
  );
});

function formatCellValue(
  row: Record<string, any>,
  col: SupabaseRelationalColumn,
): string {
  const raw = row?.[col.field];
  if (raw === undefined || raw === null || raw === '') {
    return '—';
  }
  if (col.type === 'datetime') {
    return formatDate(String(raw));
  }
  if (col.type === 'boolean') {
    return raw ? $t('common.yes') : $t('common.no');
  }
  if (col.type === 'number' && typeof raw === 'number') {
    return raw.toLocaleString();
  }
  return String(raw);
}

function getRowCopyValue(row: Record<string, any>, index: number): string {
  const key = props.relation?.copyKey || 'id';
  const val = row?.[key] ?? Object.values(row)[0] ?? index;
  return String(val);
}
</script>

<template>
  <Sheet :open="props.open" @update:open="(val) => emit('update:open', val)">
    <SheetContent
      :side="isMobile ? 'bottom' : 'right'"
      :style="{ zIndex: 1070 }"
      :class="
        isMobile
          ? 'vxe-relational-sheet-content z-[1070] flex max-h-[92dvh] w-full flex-col rounded-t-[20px] border-t border-border/80 bg-background/95 backdrop-blur-md p-0 shadow-2xl'
          : 'vxe-relational-sheet-content inset-y-0 right-0 z-[1070] flex h-dvh w-full flex-col border-l border-border/80 p-0 sm:max-w-xl'
      "
    >
      <!-- Relational Table Drawer Header -->
      <SheetHeader
        v-if="props.relation"
        class="shrink-0 space-y-1.5 border-b border-border/60 bg-muted/20 px-4 py-3.5 text-left sm:px-5"
      >
        <div class="flex items-center gap-2 pr-6">
          <SheetTitle class="truncate text-base font-semibold tracking-tight">
            {{ props.relation.title }}
          </SheetTitle>

          <Badge variant="secondary" class="shrink-0">
            {{ filteredRows.length }} / {{ props.relation.rows.length }}
          </Badge>

          <!-- Superadmin-Only Relational Table Schema Popover -->
          <Popover v-if="props.isSuperadmin">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="size-6 shrink-0 rounded-md border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                data-testid="vxe-superadmin-relation-schema-trigger"
              >
                <Database class="size-3.5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              class="z-[1080] w-72 space-y-1.5 p-3"
              :style="{ zIndex: 1080 }"
            >
              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  v-if="props.parentResource"
                  class="inline-flex items-center gap-1 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-muted-foreground"
                >
                  <Database class="size-3 shrink-0" />
                  {{ props.parentResource }}
                </span>
                <ArrowRight
                  v-if="props.parentResource"
                  class="size-3 shrink-0 text-muted-foreground"
                />
                <span
                  class="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary"
                >
                  <Table2 class="size-3 shrink-0" />
                  {{ props.relation.targetResource }}
                </span>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <SheetDescription class="truncate text-muted-foreground">
          {{
            $t('common.relationalTableDescription', {
              title: props.parentTitle || props.relation.title,
            })
          }}
        </SheetDescription>
      </SheetHeader>

      <!-- Search Filter Bar -->
      <div
        v-if="props.relation"
        class="shrink-0 border-b border-border/60 bg-background px-4 py-2.5 sm:px-5"
      >
        <InputGroup class="h-8">
          <InputGroupAddon>
            <Search class="size-3.5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            v-model="searchQuery"
            class="h-8"
            data-testid="vxe-relational-sheet-search"
            :placeholder="$t('common.searchRelationalRecords')"
          />
        </InputGroup>
      </div>

      <!-- Structured Supabase-Style Relational Table Body -->
      <div
        v-if="props.relation"
        class="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5"
        data-testid="vxe-relational-table-body"
      >
        <div
          class="overflow-x-auto rounded-lg border border-border/70 bg-background"
        >
          <Table class="w-full text-left">
            <TableHeader
              class="sticky top-0 z-10 border-b border-border/70 bg-muted/60 backdrop-blur-xs"
            >
              <TableRow>
                <TableHead
                  class="w-10 px-3 py-2 text-center font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                >
                  #
                </TableHead>
                <TableHead
                  v-for="col in props.relation.columns"
                  :key="col.field"
                  class="px-3 py-2 font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                >
                  {{ col.title }}
                </TableHead>
                <TableHead
                  class="w-12 px-3 py-2 text-right font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                >
                  {{ $t('common.copy') }}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody
              v-if="filteredRows.length > 0"
              class="divide-y divide-border/50"
            >
              <TableRow
                v-for="(relRow, idx) in filteredRows"
                :key="idx"
                class="transition-colors hover:bg-muted/30"
              >
                <TableCell
                  class="px-3 py-2 text-center whitespace-nowrap text-muted-foreground"
                >
                  {{ idx + 1 }}
                </TableCell>

                <TableCell
                  v-for="col in props.relation.columns"
                  :key="col.field"
                  class="px-3 py-2 align-middle whitespace-nowrap"
                >
                  <Badge v-if="col.type === 'badge'" variant="outline">
                    {{ formatCellValue(relRow, col) }}
                  </Badge>

                  <span
                    v-else-if="
                      col.type === 'mono' ||
                      col.type === 'number' ||
                      col.type === 'datetime'
                    "
                    class="text-foreground"
                  >
                    {{ formatCellValue(relRow, col) }}
                  </span>

                  <span v-else class="text-foreground">
                    {{ formatCellValue(relRow, col) }}
                  </span>
                </TableCell>

                <TableCell
                  class="px-3 py-2 text-right align-middle whitespace-nowrap"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    :title="$t('common.copy')"
                    @click="
                      copyToClipboard(
                        getRowCopyValue(relRow, idx),
                        `${props.relation.field}-${idx}`,
                      )
                    "
                  >
                    <Check
                      v-if="isCopied(`${props.relation.field}-${idx}`)"
                      class="size-3.5 text-emerald-500"
                    />
                    <Copy v-else class="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>

            <TableBody v-else>
              <TableRow>
                <TableCell
                  :colspan="props.relation.columns.length + 2"
                  class="px-4 py-8 text-center text-muted-foreground"
                >
                  {{ $t('common.noMatchingRecords') }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Relational Table Drawer Footer -->
      <SheetFooter
        class="shrink-0 flex-row items-center justify-end border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5"
      >
        <Button
          variant="outline"
          size="sm"
          class="h-9 px-3.5"
          data-testid="vxe-relational-sheet-close"
          @click="emit('update:open', false)"
        >
          {{ $t('common.close') }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
