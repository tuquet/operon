<script lang="ts" setup>
import type { VxeDetailSheetMode, VxeDetailSheetOptions } from './types';

import type { EffectiveAccess } from '#/api/core/access';
import type {
  DynamicVxeFormField,
  SupabaseRelationalTableDescriptor,
  SupabaseResourceKey,
} from '#/api/core/supabase-schema-registry';

import { computed, reactive, ref, watch } from 'vue';

import { VxeForm, VxeFormItem } from '@operon/plugins/vxe-table';
import { usePreferences } from '@operon/preferences';

import {
  Badge,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
  Switch,
  Textarea,
  toast,
} from '@operon-core/shadcn-ui';

import {
  ArrowUpRight,
  Check,
  Copy,
  Database,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  ShieldCheck,
  Table2,
} from '@lucide/vue';

import { getEffectiveAccess } from '#/api/core/access';
import {
  buildDynamicVxeCreateSchema,
  buildDynamicVxeFormSchema,
  computeDirtyMutablePayload,
  computeInsertPayload,
  executeDynamicSupabaseInsert,
  executeDynamicSupabasePatch,
  inferResourceFromRouteAndRow,
  validateRequiredInsertFields,
} from '#/api/core/supabase-schema-registry';
import { useClipboard, useDateFormat } from '#/composables';
import { $t } from '#/locales';

import { useBottomSheetDrag } from './composables/use-bottom-sheet-drag';
import VxeRelationalTableSheet from './vxe-relational-table-sheet.vue';

interface Props {
  gridColumns?: Array<{ field?: string; title?: string }>;
  initialValues?: null | Record<string, any>;
  mode?: VxeDetailSheetMode;
  open: boolean;
  options?: VxeDetailSheetOptions<any>;
  routePath?: string;
  row: null | Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  gridColumns: () => [],
  initialValues: null,
  mode: 'edit',
  options: undefined,
  routePath: '',
});

const emit = defineEmits<{
  created: [createdRow: Record<string, any>];
  saved: [updatedRow: Record<string, any>];
  'update:open': [value: boolean];
}>();

const { isMobile } = usePreferences();
const { copyToClipboard, isCopied } = useClipboard();
const { formatDate } = useDateFormat();

const effectiveAccess = ref<EffectiveAccess | null>(null);
const saving = ref(false);
const formData = reactive<Record<string, any>>({});
const slugManuallyEdited = ref(false);
const activeRelation = ref<null | SupabaseRelationalTableDescriptor>(null);
const relationalSheetOpen = ref(false);

const isCreateMode = computed<boolean>(() => props.mode === 'create');
const isSuperadmin = computed<boolean>(() =>
  Boolean(effectiveAccess.value?.isSuperadmin),
);

// Antigravity dynamic smooth fluid drag sheet (iOS / Vaul style)
const {
  isBottomExpanded,
  isDragging,
  onGrabberPointerDown,
  onGrabberPointerMove,
  onGrabberPointerUp,
  sheetHeightDvh,
  toggleBottomHeight,
} = useBottomSheetDrag({
  onDismiss: () => emit('update:open', false),
});

function openRelationalTable(relation: SupabaseRelationalTableDescriptor) {
  activeRelation.value = relation;
  relationalSheetOpen.value = true;
}

async function ensureEffectiveAccess() {
  if (effectiveAccess.value) {
    return;
  }
  try {
    effectiveAccess.value = await getEffectiveAccess();
  } catch {
    // Fallback to null (optimistic UI; backend RLS enforces policy)
    effectiveAccess.value = null;
  }
}

const resolvedResource = computed<SupabaseResourceKey>(() => {
  const currentPath =
    props.routePath ||
    (typeof window === 'undefined' ? '' : window.location.pathname);
  return inferResourceFromRouteAndRow(
    currentPath,
    props.row,
    props.options?.resource,
  );
});

const dynamicSchema = computed(() => {
  if (isCreateMode.value) {
    const createSchema = buildDynamicVxeCreateSchema({
      access: effectiveAccess.value,
      gridColumns: props.gridColumns,
      initialValues: props.initialValues,
      resource: resolvedResource.value,
      translate: (key: string) => $t(key),
    });
    return {
      ...createSchema,
      relations: [] as SupabaseRelationalTableDescriptor[],
      title: props.options?.createTitle || createSchema.title,
    };
  }

  const editSchema = buildDynamicVxeFormSchema({
    access: effectiveAccess.value,
    gridColumns: props.gridColumns,
    resource: resolvedResource.value,
    row: props.row,
    translate: (key: string) => $t(key),
  });
  return {
    ...editSchema,
    initialData: {} as Record<string, any>,
  };
});

const hasEditableFields = computed<boolean>(() =>
  dynamicSchema.value.fields.some((f) => f.editable),
);

const isRlsWritable = computed<boolean>(() =>
  isCreateMode.value
    ? Boolean(
        dynamicSchema.value.rls.canInsert.allowed && hasEditableFields.value,
      )
    : Boolean(
        dynamicSchema.value.rls.canUpdate.allowed && hasEditableFields.value,
      ),
);

const activePolicyName = computed<string>(() =>
  isCreateMode.value
    ? dynamicSchema.value.rls.canInsert.policyName
    : dynamicSchema.value.rls.canUpdate.policyName,
);

function syncFormDataFromRow(row: null | Record<string, any>) {
  for (const key of Object.keys(formData)) {
    Reflect.deleteProperty(formData, key);
  }
  if (!row) {
    return;
  }
  for (const [key, val] of Object.entries(row)) {
    if (key.startsWith('_X_ROW')) continue;
    formData[key] =
      val && typeof val === 'object' && !Array.isArray(val)
        ? JSON.stringify(val, null, 2)
        : val;
  }
}

function syncFormDataForCreate() {
  for (const key of Object.keys(formData)) {
    Reflect.deleteProperty(formData, key);
  }
  slugManuallyEdited.value = false;
  const initData = dynamicSchema.value.initialData || {};
  for (const [key, val] of Object.entries(initData)) {
    formData[key] =
      val && typeof val === 'object' && !Array.isArray(val)
        ? JSON.stringify(val, null, 2)
        : val;
  }
}

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w\s-]/g, '')
    .replaceAll(/[\s_-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function handleTextInput(fieldKey: string) {
  if (!isCreateMode.value) {
    return;
  }
  if (fieldKey === 'slug') {
    const currentSlug = String(formData.slug || '').trim();
    slugManuallyEdited.value = currentSlug.length > 0;
    return;
  }
  if (
    fieldKey === 'name' &&
    !slugManuallyEdited.value &&
    dynamicSchema.value.fields.some((f) => f.field === 'slug')
  ) {
    formData.slug = slugifyText(String(formData.name || ''));
  }
}

const dynamicOptionsMap = ref<
  Record<string, Array<{ label: string; value: number | string }>>
>({});

async function refreshDynamicOptions() {
  if (!props.options?.dynamicFieldOptions || !props.open) {
    return;
  }
  try {
    const loaded = await props.options.dynamicFieldOptions({
      formData,
      mode: isCreateMode.value ? 'create' : 'edit',
      resource: resolvedResource.value,
      row: props.row,
    });
    if (loaded && typeof loaded === 'object') {
      dynamicOptionsMap.value = { ...dynamicOptionsMap.value, ...loaded };
    }
  } catch (error) {
    console.error('[VxeDetailSheet] Failed to load dynamic options:', error);
  }
}

watch(
  () => [props.open, props.mode, props.row, props.initialValues] as const,
  ([isOpen, currentMode, currentRow]) => {
    if (!isOpen) {
      relationalSheetOpen.value = false;
      return;
    }
    if (currentMode === 'create') {
      syncFormDataForCreate();
      void ensureEffectiveAccess();
      void refreshDynamicOptions();
    } else if (currentRow) {
      syncFormDataFromRow(currentRow);
      void ensureEffectiveAccess();
      void refreshDynamicOptions();
    }
  },
  { immediate: true },
);

function formatReadonlyValue(field: DynamicVxeFormField): string {
  const raw = props.row?.[field.field];
  if (raw === undefined || raw === null || raw === '') {
    return '—';
  }
  if (field.type === 'datetime') {
    return formatDate(String(raw));
  }
  if (field.type === 'boolean') {
    return raw ? $t('common.yes') : $t('common.no');
  }
  if (field.type === 'number' && typeof raw === 'number') {
    return raw.toLocaleString();
  }
  return String(raw);
}

function formatJsonPreview(field: string): string {
  const raw = props.row?.[field];
  if (raw === undefined || raw === null) {
    return '{}';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

function isCopyableIdentifier(field: DynamicVxeFormField): boolean {
  return (
    field.type === 'uuid' ||
    field.field === 'id' ||
    field.field.endsWith('_id') ||
    field.field.endsWith('_code') ||
    field.field === 'slug' ||
    field.field === 'host' ||
    field.field === 'ip_address'
  );
}

async function handleCreate() {
  if (saving.value) {
    return;
  }
  const resource = resolvedResource.value;
  const missingFields = validateRequiredInsertFields(formData, resource);
  if (missingFields.length > 0) {
    toast.warning($t('common.requiredFieldsMissing'));
    return;
  }

  const insertPayload = computeInsertPayload(formData, resource);

  saving.value = true;
  try {
    if (props.options?.onCreate) {
      const customResult = await props.options.onCreate({
        formData: { ...formData },
        insertPayload,
        resource,
      });
      const createdRow =
        customResult && typeof customResult === 'object'
          ? customResult
          : insertPayload;
      await props.options?.onCreated?.(createdRow);
      emit('created', createdRow);
    } else {
      const result = await executeDynamicSupabaseInsert(
        resource,
        formData,
        effectiveAccess.value,
      );
      await props.options?.onCreated?.(result.createdRow);
      emit('created', result.createdRow);
    }
    toast.success($t('common.createdSuccessfully'));
    emit('update:open', false);
  } catch (error: any) {
    toast.error(error?.message || $t('common.error'));
  } finally {
    saving.value = false;
  }
}

async function handleSave() {
  if (!props.row || saving.value) {
    return;
  }
  const resource = resolvedResource.value;
  const dirtyPayload = computeDirtyMutablePayload(
    props.row,
    formData,
    resource,
  );

  if (Object.keys(dirtyPayload).length === 0 && !props.options?.onSave) {
    toast.info($t('common.noChangesToSave'));
    return;
  }

  saving.value = true;
  try {
    if (props.options?.onSave) {
      await props.options.onSave({
        dirtyPayload,
        formData: { ...formData },
        resource,
        row: props.row,
      });
      const updated = { ...props.row, ...dirtyPayload };
      await props.options?.onSaved?.(updated);
      emit('saved', updated);
    } else {
      const result = await executeDynamicSupabasePatch(
        resource,
        props.row,
        formData,
        effectiveAccess.value,
      );
      await props.options?.onSaved?.(result.updatedRow);
      emit('saved', result.updatedRow);
    }
    toast.success($t('common.savedSuccessfully'));
    emit('update:open', false);
  } catch (error: any) {
    toast.error(error?.message || $t('common.error'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Sheet :open="props.open" @update:open="(val) => emit('update:open', val)">
    <SheetContent
      :side="isMobile ? 'bottom' : 'right'"
      :style="{
        zIndex: 1050,
        ...(isMobile && sheetHeightDvh !== null
          ? {
              height: `${sheetHeightDvh}dvh`,
              maxHeight: `${sheetHeightDvh}dvh`,
              transition: isDragging
                ? 'none'
                : 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }
          : {}),
      }"
      class="vxe-detail-sheet-content z-[1050] flex flex-col p-0 overflow-x-hidden shadow-2xl"
      :class="[
        !isDragging && 'transition-all duration-350 ease-out',
        isMobile
          ? [
              'w-full rounded-t-[20px] border-t border-border/80 bg-background/95 backdrop-blur-md',
              sheetHeightDvh === null &&
                (isBottomExpanded
                  ? 'h-[94dvh] max-h-[94dvh]'
                  : 'h-[60dvh] max-h-[60dvh]'),
            ]
          : 'inset-y-0 right-0 h-dvh w-full border-l border-border/80 bg-background/95 backdrop-blur-md sm:max-w-xl lg:max-w-2xl',
      ]"
    >
      <!-- Modern Grabber Zone (Mobile/Bottom Mode) with Pointer Capture & Native Touch Drag -->
      <div
        v-if="isMobile"
        class="flex w-full cursor-grab touch-none select-none items-center justify-center pt-3 pb-2 active:cursor-grabbing hover:bg-muted/30 transition-colors"
        @pointerdown="onGrabberPointerDown"
        @pointermove="onGrabberPointerMove"
        @pointerup="onGrabberPointerUp"
        @pointercancel="onGrabberPointerUp"
      >
        <button
          type="button"
          class="h-1.5 w-12 cursor-grab rounded-full bg-muted-foreground/35 transition-all hover:bg-muted-foreground/70 active:scale-105 active:bg-foreground"
          :title="
            isBottomExpanded
              ? 'Swipe down to collapse or tap'
              : 'Swipe up to expand or tap'
          "
          @click="toggleBottomHeight"
        ></button>
      </div>

      <!-- Sheet Header: Clean Record Title + Superadmin-Only Schema/RLS Popover -->
      <SheetHeader
        class="shrink-0 space-y-1 border-b border-border/60 bg-muted/20 px-4 py-3 text-left sm:px-5 sm:py-3.5"
      >
        <div class="flex items-center justify-between gap-2 pr-6">
          <div class="flex min-w-0 items-center gap-2">
            <SheetTitle
              class="truncate text-base font-semibold tracking-tight text-foreground"
            >
              {{ dynamicSchema.title }}
            </SheetTitle>

            <!-- Superadmin-only Schema & RLS Inspector Popover -->
            <Popover v-if="isSuperadmin">
              <PopoverTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  class="size-5 shrink-0 rounded-md border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground sm:size-6"
                  data-testid="vxe-superadmin-rls-trigger"
                  :title="$t('common.rlsWritable')"
                >
                  <ShieldCheck
                    v-if="isRlsWritable"
                    class="size-3 text-emerald-500 sm:size-3.5"
                  />
                  <Lock v-else class="size-3 text-amber-500 sm:size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                class="z-[1080] w-72 space-y-2 p-3"
                :style="{ zIndex: 1080 }"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-muted-foreground">Schema / Table</span>
                  <span
                    class="inline-flex items-center gap-1 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-foreground"
                  >
                    <Database class="size-3 shrink-0 text-primary" />
                    {{ dynamicSchema.rls.resource }}
                  </span>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-muted-foreground">RLS Mode</span>
                  <Badge
                    v-if="isRlsWritable"
                    variant="outline"
                    class="gap-1 border-success/30 bg-success/15 px-1.5 py-0.5 text-success"
                  >
                    <ShieldCheck class="size-3 shrink-0" />
                    {{ $t('common.rlsWritable') }}
                  </Badge>
                  <Badge
                    v-else
                    variant="outline"
                    class="gap-1 border-warning/30 bg-warning/15 px-1.5 py-0.5 text-warning"
                  >
                    <Lock class="size-3 shrink-0" />
                    {{ $t('common.rlsReadOnly') }}
                  </Badge>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-muted-foreground">RLS Policy</span>
                  <Badge variant="secondary" class="max-w-48 truncate">
                    {{ activePolicyName }}
                  </Badge>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <!-- Antigravity 1-Click Height Toggle (Mobile Only) -->
          <div v-if="isMobile" class="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-6 text-muted-foreground hover:bg-muted hover:text-foreground"
              :title="isBottomExpanded ? 'Collapse' : 'Expand'"
              @click="toggleBottomHeight"
            >
              <Minimize2 v-if="isBottomExpanded" class="size-3.5" />
              <Maximize2 v-else class="size-3.5" />
            </Button>
          </div>
        </div>

        <SheetDescription class="text-muted-foreground">
          {{
            isCreateMode
              ? $t('common.createSheetDescription')
              : $t('common.detailSheetTitle')
          }}
        </SheetDescription>
      </SheetHeader>

      <!-- Unified Flat VxeForm Body -->
      <div
        v-if="isCreateMode || props.row"
        class="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5"
      >
        <VxeForm
          :data="formData"
          custom-layout
          :title-position="isMobile ? 'top' : 'left'"
          class="w-full space-y-3"
        >
          <VxeFormItem
            v-for="field in dynamicSchema.fields"
            :key="field.field"
            :field="field.field"
            :title="
              field.required && field.editable
                ? `${field.title} *`
                : field.title
            "
            span="24"
          >
            <template #default>
              <!-- 1. Editable Controls -->
              <template v-if="field.editable">
                <!-- Enum Select -->
                <Select
                  v-if="
                    field.type === 'enum' &&
                    (dynamicOptionsMap[field.field]?.length ||
                      field.options?.length)
                  "
                  :model-value="String(formData[field.field] || '__none__')"
                  @update:model-value="
                    (val) => {
                      const next = String(val ?? '');
                      formData[field.field] = next === '__none__' ? '' : next;
                    }
                  "
                >
                  <SelectTrigger
                    :data-testid="`vxe-field-${field.field}`"
                    class="h-9 w-full bg-background"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent class="z-[1090]">
                    <SelectItem
                      v-for="opt in dynamicOptionsMap[field.field] ||
                      field.options ||
                      []"
                      :key="String(opt.value || '__none__')"
                      :value="String(opt.value || '__none__')"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <!-- Boolean Switch -->
                <div
                  v-else-if="field.type === 'boolean'"
                  class="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3"
                >
                  <span class="text-foreground">
                    {{
                      formData[field.field]
                        ? $t('common.enabled')
                        : $t('common.disabled')
                    }}
                  </span>
                  <Switch
                    :checked="Boolean(formData[field.field])"
                    :data-testid="`vxe-field-${field.field}`"
                    @update:checked="
                      (val: boolean) => (formData[field.field] = val)
                    "
                  />
                </div>

                <!-- Editable JSON -->
                <Textarea
                  v-else-if="field.type === 'json'"
                  v-model="formData[field.field]"
                  :data-testid="`vxe-field-${field.field}`"
                  rows="4"
                />

                <!-- Multiline Textarea -->
                <Textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="formData[field.field]"
                  :data-testid="`vxe-field-${field.field}`"
                  rows="3"
                />

                <!-- Number Input -->
                <Input
                  v-else-if="field.type === 'number'"
                  v-model.number="formData[field.field]"
                  :data-testid="`vxe-field-${field.field}`"
                  :max="field.max"
                  :min="field.min"
                  type="number"
                  class="h-9"
                />

                <!-- Default Text Input -->
                <Input
                  v-else
                  v-model="formData[field.field]"
                  :data-testid="`vxe-field-${field.field}`"
                  :placeholder="
                    field.placeholderKey ? $t(field.placeholderKey) : undefined
                  "
                  class="h-9"
                  @input="handleTextInput(field.field)"
                />
              </template>

              <!-- 2. Read-Only / Locked Controls -->
              <template v-else>
                <!-- Read-Only JSON Preview -->
                <div v-if="field.type === 'json'" class="relative">
                  <pre
                    class="max-h-44 overflow-auto rounded-md border border-border/60 bg-muted/30 p-2.5 text-foreground"
                    >{{ formatJsonPreview(field.field) }}</pre>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="absolute top-2 right-2 size-6 rounded border-border/60 bg-background/80 text-muted-foreground hover:text-foreground"
                    :title="$t('common.copy')"
                    @click="
                      copyToClipboard(
                        formatJsonPreview(field.field),
                        field.title,
                      )
                    "
                  >
                    <Check
                      v-if="isCopied(field.title)"
                      class="size-3 text-emerald-500"
                    />
                    <Copy v-else class="size-3" />
                  </Button>
                </div>

                <!-- Semantic Enum Status Badge -->
                <div
                  v-else-if="field.statusMeta"
                  class="flex h-9 items-center rounded-md border border-border/60 bg-muted/30 px-3"
                >
                  <Badge
                    variant="outline"
                    class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5"
                    :class="field.statusMeta.badgeClass"
                  >
                    <span
                      class="size-1.5 rounded-full"
                      :class="field.statusMeta.dotClass"
                    ></span>
                    <span>
                      {{
                        field.statusMeta.labelKey
                          ? $t(field.statusMeta.labelKey)
                          : field.statusMeta.fallbackLabel
                      }}
                    </span>
                  </Badge>
                </div>

                <!-- Copyable Identifier / UUID / Code -->
                <div
                  v-else-if="
                    props.row &&
                    isCopyableIdentifier(field) &&
                    props.row[field.field]
                  "
                  class="flex h-9 items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 text-muted-foreground"
                >
                  <span class="truncate">{{ props.row[field.field] }}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-6 shrink-0 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    :title="$t('common.copy')"
                    @click="
                      copyToClipboard(
                        String(props.row[field.field]),
                        field.title,
                      )
                    "
                  >
                    <Check
                      v-if="isCopied(field.title)"
                      class="size-3.5 text-emerald-500"
                    />
                    <Copy v-else class="size-3.5" />
                  </Button>
                </div>

                <!-- Read-Only Multiline Text -->
                <div
                  v-else-if="field.type === 'textarea'"
                  class="min-h-9 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-muted-foreground"
                >
                  {{ formatReadonlyValue(field) }}
                </div>

                <!-- Default Read-Only Scalar -->
                <div
                  v-else
                  class="flex h-9 items-center truncate rounded-md border border-border/60 bg-muted/30 px-3 text-muted-foreground"
                >
                  {{ formatReadonlyValue(field) }}
                </div>
              </template>
            </template>
          </VxeFormItem>

          <!-- Supabase-Style Relational Table Triggers (opens secondary stacked drawer without exposing raw schema.table) -->
          <VxeFormItem
            v-for="rel in dynamicSchema.relations"
            :key="rel.field"
            :field="rel.field"
            :title="rel.title"
            span="24"
          >
            <template #default>
              <Button
                type="button"
                variant="outline"
                class="flex h-10 w-full items-center justify-between gap-2 rounded-md border-border/70 bg-muted/25 px-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/60"
                :data-testid="`vxe-relation-trigger-${rel.field}`"
                @click="openRelationalTable(rel)"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <Table2 class="size-3.5 shrink-0 text-primary" />
                  <span class="truncate text-foreground">
                    {{ rel.title }}
                  </span>
                  <Badge variant="secondary" class="shrink-0">
                    {{
                      $t('common.relationalRecordsCount', {
                        count: rel.rows.length,
                      })
                    }}
                  </Badge>
                </div>

                <span
                  class="inline-flex shrink-0 items-center gap-1 text-primary"
                >
                  <span>{{ $t('common.viewRelationalTable') }}</span>
                  <ArrowUpRight class="size-3.5" />
                </span>
              </Button>
            </template>
          </VxeFormItem>
        </VxeForm>
      </div>

      <!-- Sheet Footer with Auto-Forwarded Business Row Actions + Save/Create/Close -->
      <SheetFooter
        v-if="isCreateMode || props.row"
        class="shrink-0 flex-col gap-2.5 border-t border-border/60 bg-background/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-col sm:space-x-0 sm:px-5 sm:pb-3"
      >
        <!-- Row Actions Bar (Only shown in Edit Mode when genuine business actions exist) -->
        <div
          v-if="
            !isCreateMode &&
            props.row &&
            ($slots['row-actions'] || props.options?.actions?.length)
          "
          class="flex w-full flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5"
        >
          <span class="text-muted-foreground">
            {{ $t('common.detailSheetActionsSection') }}
          </span>
          <div class="flex flex-wrap items-center gap-1.5 [&_.hidden]:inline">
            <slot name="row-actions" :row="props.row"></slot>

            <Button
              v-for="(act, idx) in props.options?.actions || []"
              :key="idx"
              :variant="act.variant || 'outline'"
              :disabled="act.disabled?.(props.row)"
              size="sm"
              class="h-7 gap-1 px-2.5"
              @click="(act.handler ?? act.onClick)?.(props.row)"
            >
              <component :is="act.icon" v-if="act.icon" class="size-3.5" />
              <span>{{ act.label }}</span>
            </Button>
          </div>
        </div>

        <!-- Primary Form Submit / Close Buttons -->
        <div class="flex w-full items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            class="h-9 px-4"
            @click="emit('update:open', false)"
          >
            {{ $t('common.close') }}
          </Button>
          <Button
            v-if="
              isCreateMode &&
              hasEditableFields &&
              dynamicSchema.rls.canInsert.allowed
            "
            size="sm"
            class="h-9 gap-1.5 px-4 shadow-xs"
            :disabled="saving"
            data-testid="vxe-detail-sheet-create"
            @click="handleCreate"
          >
            <Spinner v-if="saving" class="size-3.5" />
            <Plus v-else class="size-3.5" />
            <span>{{ $t('common.createRecord') }}</span>
          </Button>
          <Button
            v-else-if="
              !isCreateMode &&
              hasEditableFields &&
              dynamicSchema.rls.canUpdate.allowed
            "
            size="sm"
            class="h-9 gap-1.5 px-4 shadow-xs"
            :disabled="saving"
            data-testid="vxe-detail-sheet-save"
            @click="handleSave"
          >
            <Spinner v-if="saving" class="size-3.5" />
            <Save v-else class="size-3.5" />
            <span>{{ $t('common.saveChanges') }}</span>
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>

  <!-- Secondary Stacked Relational Table Drawer (Supabase Studio pattern) -->
  <VxeRelationalTableSheet
    v-model:open="relationalSheetOpen"
    :is-superadmin="isSuperadmin"
    :parent-resource="dynamicSchema.rls.resource"
    :parent-title="dynamicSchema.title"
    :relation="activeRelation"
  />
</template>

<style>
div.fixed.inset-0:has(+ .vxe-detail-sheet-content) {
  z-index: 1040 !important;
}

div.fixed.inset-0:has(+ .vxe-relational-sheet-content) {
  z-index: 1060 !important;
}
</style>
