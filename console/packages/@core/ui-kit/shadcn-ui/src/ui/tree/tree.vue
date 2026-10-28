<script lang="ts" setup>
import type { Arrayable } from '@vueuse/core';
import type { FlattenedItem } from 'reka-ui';

import type { ClassType, Recordable } from '@operon-core/typings';

import type { TreeProps } from './types';

import { computed, ref, watch } from 'vue';

import { ChevronRight, IconifyIcon } from '@operon-core/icons';
import { cn, get } from '@operon-core/shared/utils';

import { TreeItem, TreeRoot } from 'reka-ui';

import { Checkbox } from '../checkbox';
import { treePropsDefaults } from './types';

const props = withDefaults(defineProps<TreeProps>(), treePropsDefaults());

const emits = defineEmits<{
  expand: [value: FlattenedItem<Recordable<any>>];
  select: [value: FlattenedItem<Recordable<any>>];
}>();

interface InnerFlattenItem<T = Recordable<any>, P = number | string> {
  hasChildren: boolean;
  id: P;
  level: number;
  parentId: null | P;
  parents: P[];
  value: T;
}

function flatten<T = Recordable<any>, P = number | string>(
  items: T[],
  childrenField: string = 'children',
  level = 0,
  parentId: null | P = null,
  parents: P[] = [],
): InnerFlattenItem<T, P>[] {
  const result: InnerFlattenItem<T, P>[] = [];
  items.forEach((item) => {
    const children = get(item, childrenField) as Array<T>;
    const id = get(item, props.valueField) as P;
    const val: InnerFlattenItem<T, P> = {
      hasChildren: Array.isArray(children) && children.length > 0,
      id,
      level,
      parentId,
      parents: [...parents],
      value: item,
    };
    result.push(val);
    if (val.hasChildren)
      result.push(
        ...flatten(children, childrenField, level + 1, id, [...parents, id]),
      );
  });
  return result;
}

const flattenData = ref<Array<InnerFlattenItem>>([]);
const modelValue = defineModel<Arrayable<number | string>>();
const expanded = ref<Array<number | string>>([]);

const treeValue = ref();

/** ID -> raw data map, O(1) lookup replaces O(n) find */
const valueMap = computed(() => {
  const map = new Map<number | string, Recordable<any>>();
  for (const item of flattenData.value) {
    map.set(get(item.value, props.valueField) as number | string, item.value);
  }
  return map;
});

function getItemByValue(value: number | string) {
  return valueMap.value.get(value);
}

function updateTreeValue() {
  const val = modelValue.value;
  if (val === undefined) {
    treeValue.value = props.multiple ? [] : undefined;
  } else if (Array.isArray(val)) {
    if (val.length === 0) {
      treeValue.value = [];
    } else {
      // Single pass filtering + mapping, avoiding redundant getItemByValue
      const enabledItems: Recordable<any>[] = [];
      const enabledIds: (number | string)[] = [];
      for (const v of val) {
        const item = getItemByValue(v);
        if (item && !get(item, props.disabledField)) {
          enabledItems.push(item);
          enabledIds.push(v);
        }
      }

      // Indeterminate nodes are not passed to Reka UI internal selection: Reka UI treats model-value nodes as selected,
      // causing clicks on indeterminate ancestors to be treated as uncheck, accidentally removing ancestor and descendants. Kept only in modelValue.
      if (props.includeIndeterminate && props.multiple) {
        const excludedKeys = computeIndeterminateKeysInSelection(enabledIds);
        treeValue.value = enabledItems.filter(
          (item) => !excludedKeys.has(get(item.value, props.valueField)),
        );
      } else {
        treeValue.value = enabledItems;
      }

      if (enabledIds.length !== val.length) {
        modelValue.value = mergeIndeterminate(enabledIds);
      }
    }
  } else {
    const item = getItemByValue(val);
    if (item && !get(item, props.disabledField)) {
      treeValue.value = item;
    } else {
      treeValue.value = props.multiple ? [] : undefined;
      modelValue.value = props.multiple ? [] : undefined;
    }
  }
}

// Init: build flattenData and sync treeValue
flattenData.value = flatten(props.treeData, props.childrenField);
if (flattenData.value.length > 0) {
  updateTreeValue();
}

// Init: expand - defaultExpandedLevel takes priority, otherwise use defaultExpandedKeys
if (
  props.defaultExpandedLevel !== undefined &&
  props.defaultExpandedLevel > 0
) {
  expandToLevel(props.defaultExpandedLevel);
} else {
  expanded.value = props.defaultExpandedKeys ?? [];
}

// Watch only treeData and related field changes to rebuild flattenData
let lastTreeData: any = JSON.stringify(props.treeData);
watch(
  () => ({
    treeData: props.treeData,
    childrenField: props.childrenField,
    valueField: props.valueField,
  }),
  () => {
    flattenData.value = flatten(props.treeData, props.childrenField);
    if (flattenData.value.length > 0) {
      updateTreeValue();
    }

    // Re-expand only when treeData content substantially changes (avoid over-expansion)
    const currentTreeData = JSON.stringify(props.treeData);
    if (lastTreeData !== currentTreeData) {
      lastTreeData = currentTreeData;
      if (
        props.defaultExpandedLevel !== undefined &&
        props.defaultExpandedLevel > 0
      ) {
        expandToLevel(props.defaultExpandedLevel);
      }
    }
  },
  { deep: true },
);

// Watch only modelValue changes to sync treeValue (without rebuilding flattenData to avoid reactive loops)
// flush: 'sync' ensures immediate sync after assignment, removing manual updateTreeValue calls with checkAll/unCheckAll
watch(
  () => modelValue.value,
  () => {
    if (flattenData.value.length > 0) {
      updateTreeValue();
    }
  },
  { flush: 'sync' },
);

function updateModelValue(val: Arrayable<Recordable<any>>) {
  if (Array.isArray(val)) {
    const filteredVal = val.filter((v) => !get(v, props.disabledField));
    const selectedIds = filteredVal.map((v) => get(v, props.valueField));
    modelValue.value = mergeIndeterminate(selectedIds);
  } else {
    // In single-select mode, val is null/undefined when unchecking, clear synchronously
    modelValue.value =
      val && !get(val, props.disabledField)
        ? get(val, props.valueField)
        : undefined;
  }
}

function expandToLevel(level: number) {
  const keys: (number | string)[] = [];
  flattenData.value.forEach((item) => {
    if (item.level <= level - 1) {
      keys.push(get(item.value, props.valueField) as number | string);
    }
  });
  expanded.value = keys;
}

function collapseNodes(value: Arrayable<number | string>) {
  const keys = new Set(Array.isArray(value) ? value : [value]);
  expanded.value = expanded.value.filter((key) => !keys.has(key));
}

function expandNodes(value: Arrayable<number | string>) {
  const keys = [...(Array.isArray(value) ? value : [value])];
  keys.forEach((key) => {
    if (expanded.value.includes(key)) return;
    const item = getItemByValue(key);
    if (item) {
      expanded.value.push(key);
    }
  });
}

function expandAll() {
  expanded.value = flattenData.value
    .filter((item) => item.hasChildren)
    .map((item) => get(item.value, props.valueField));
}

function collapseAll() {
  expanded.value = [];
}

function checkAll() {
  if (!props.multiple) return;
  const selectedIds = [
    ...new Set(
      flattenData.value
        .filter((item) => !get(item.value, props.disabledField))
        .map((item) => get(item.value, props.valueField)),
    ),
  ];
  modelValue.value = mergeIndeterminate(selectedIds);
}

function unCheckAll() {
  if (!props.multiple) return;
  modelValue.value = [];
}

function isNodeDisabled(item: FlattenedItem<Recordable<any>>) {
  return props.disabled || get(item.value, props.disabledField);
}

// Calculate checked/indeterminate state
const selectAllStatus = computed<'indeterminate' | boolean>(() => {
  if (!props.multiple) return false;
  if (!modelValue.value || !Array.isArray(modelValue.value)) return false;

  const allValues = flattenData.value
    .filter((item) => !get(item.value, props.disabledField))
    .map((item) => get(item.value, props.valueField));

  const selectedSet = new Set(modelValue.value as (number | string)[]);
  const selectedCount = allValues.filter((v) => selectedSet.has(v)).length;

  if (selectedCount === 0) return false;
  if (selectedCount === allValues.length) return true;
  return 'indeterminate';
});

function onSelectAllChange(checked: 'indeterminate' | boolean) {
  if (checked === true) {
    checkAll();
  } else {
    unCheckAll();
  }
}

function onToggle(item: FlattenedItem<Recordable<any>>) {
  emits('expand', item);
}
function onSelect(item: FlattenedItem<Recordable<any>>, isSelected: boolean) {
  if (isNodeDisabled(item)) {
    return;
  }

  if (props.checkStrictly && props.multiple && props.autoCheckParent) {
    // Get current node record in flattenData to read parents
    const flatItem = flattenData.value.find(
      (i) =>
        get(i.value, props.valueField) === get(item.value, props.valueField),
    );

    if (isSelected) {
      // On check: append all enabled ancestors to modelValue (keepParentOnUncheck does not affect ancestor append on check)
      flatItem?.parents
        ?.filter((p) => {
          const parentItem = getItemByValue(p);
          return parentItem && !get(parentItem, props.disabledField);
        })
        ?.forEach((p) => {
          if (
            Array.isArray(modelValue.value) &&
            !modelValue.value.includes(p)
          ) {
            modelValue.value.push(p);
          }
        });
    } else if (!props.keepParentOnUncheck) {
      // On uncheck: remove ancestors with no selected children; retain parent check state when keepParentOnUncheck is true
      flatItem?.parents
        ?.filter((p) => {
          const parentItem = getItemByValue(p);
          return parentItem && !get(parentItem, props.disabledField);
        })
        ?.toReversed()
        ?.forEach((p) => {
          const hasSelectedChild = flattenData.value.some(
            (i) =>
              i.parentId === p &&
              i.id !== item._id &&
              Array.isArray(modelValue.value) &&
              (modelValue.value as (number | string)[]).includes(
                get(i.value, props.valueField) as number | string,
              ),
          );
          if (!hasSelectedChild) {
            const index = (modelValue.value as (number | string)[]).indexOf(p);
            if (index !== -1) {
              (modelValue.value as (number | string)[]).splice(index, 1);
            }
          }
        });
    }
  }
  // Ensure watcher syncs treeValue: checkStrictly mode needs new reference (ancestor push/pop mutates array in place),
  // or create new reference when includeIndeterminate needs to merge indeterminate nodes
  if (props.multiple && Array.isArray(modelValue.value)) {
    if (props.includeIndeterminate) {
      modelValue.value = mergeIndeterminate(
        modelValue.value as (number | string)[],
      );
    } else if (props.checkStrictly) {
      modelValue.value = [...modelValue.value];
    }
  }
  emits('select', item);
}

/** Calculate node keys in indeterminate state for given checked list */
function computeIndeterminateKeys(
  selectedIds: (number | string)[],
): (number | string)[] {
  if (
    !props.multiple ||
    selectedIds.length === 0 ||
    flattenData.value.length === 0
  )
    return [];

  const selectedSet = new Set(selectedIds);
  // Count how many selected descendants each ancestor node has
  const ancestorCounts = new Map<number | string, number>();

  for (const node of flattenData.value) {
    const nodeId = get(node.value, props.valueField) as number | string;
    if (!selectedSet.has(nodeId)) continue;

    // Accumulate count for all ancestors of currently selected node
    for (const parentId of node.parents) {
      ancestorCounts.set(parentId, (ancestorCounts.get(parentId) ?? 0) + 1);
    }
  }

  // Filter ancestors that are not themselves selected as indeterminate nodes
  const result: (number | string)[] = [];
  for (const [nodeId] of ancestorCounts) {
    if (!selectedSet.has(nodeId)) {
      result.push(nodeId);
    }
  }

  return result;
}

/**
 * Calculate keys of "indeterminate ancestor nodes" in checked list: node itself is in checked list, but descendants are only partially checked.
 * Unlike computeIndeterminateKeys, this is based on descendant counts, applicable when modelValue has merged indeterminate nodes,
 * used to strip indeterminate nodes from Reka UI internal selection and supplement checkbox indeterminate display.
 */
function computeIndeterminateKeysInSelection(
  selectedIds: (number | string)[],
): Set<number | string> {
  const result = new Set<number | string>();
  if (
    !props.multiple ||
    selectedIds.length === 0 ||
    flattenData.value.length === 0
  ) {
    return result;
  }

  const selectedSet = new Set(selectedIds);
  const totalDescendants = new Map<number | string, number>();
  const selectedDescendants = new Map<number | string, number>();

  for (const node of flattenData.value) {
    const nodeId = get(node.value, props.valueField) as number | string;
    for (const parentId of node.parents) {
      totalDescendants.set(parentId, (totalDescendants.get(parentId) ?? 0) + 1);
      if (selectedSet.has(nodeId)) {
        selectedDescendants.set(
          parentId,
          (selectedDescendants.get(parentId) ?? 0) + 1,
        );
      }
    }
  }

  for (const id of selectedIds) {
    const total = totalDescendants.get(id) ?? 0;
    const selected = selectedDescendants.get(id) ?? 0;
    if (total > 0 && selected > 0 && selected < total) {
      result.add(id);
    }
  }

  return result;
}

/** Indeterminate node key set, used to supplement checkbox display in scenarios where Reka UI does not compute indeterminate state (e.g. checkStrictly) */
const indeterminateKeys = computed(() => {
  if (!props.multiple || !props.includeIndeterminate) {
    return new Set<number | string>();
  }
  const ids = Array.isArray(modelValue.value)
    ? (modelValue.value as (number | string)[])
    : [];
  return computeIndeterminateKeysInSelection(ids);
});

/** Merge indeterminate nodes into checked list according to includeIndeterminate config */
function mergeIndeterminate(
  selectedIds: (number | string)[],
): (number | string)[] {
  if (
    !props.includeIndeterminate ||
    !props.multiple ||
    selectedIds.length === 0
  ) {
    return selectedIds;
  }
  const indeterminate = computeIndeterminateKeys(selectedIds);
  if (indeterminate.length === 0) return selectedIds;
  return [...new Set([...selectedIds, ...indeterminate])];
}

defineExpose({
  collapseAll,
  collapseNodes,
  expandAll,
  expandNodes,
  checkAll,
  unCheckAll,
  expandToLevel,
  getItemByValue,
});
</script>
<template>
  <TreeRoot
    :get-key="(item: any) => get(item, valueField)"
    :get-children="(item: any) => get(item, childrenField)"
    :items="treeData"
    :model-value="treeValue"
    v-model:expanded="expanded as string[]"
    :default-expanded="defaultExpandedKeys as string[]"
    :propagate-select="!checkStrictly"
    :bubble-select="!checkStrictly"
    :multiple="multiple"
    :disabled="disabled"
    :selection-behavior="allowClear || multiple ? 'toggle' : 'replace'"
    @update:model-value="updateModelValue"
    v-slot="{ flattenItems }"
    :class="
      cn(
        'text-blackA11 container list-none rounded-lg   select-none',
        $attrs.class as unknown as ClassType,
        bordered ? 'border' : '',
      )
    "
  >
    <div
      :class="
        cn('my-0.5 flex w-full items-center p-1', bordered ? 'border-b' : '')
      "
      v-if="$slots.header"
    >
      <slot name="header"> </slot>
    </div>
    <div
      :class="
        cn('my-0.5 flex w-full items-center p-1', bordered ? 'border-b' : '')
      "
      v-if="treeData.length > 0"
    >
      <div
        class="flex size-5 flex-1 cursor-pointer items-center"
        @click="() => (expanded?.length > 0 ? collapseAll() : expandAll())"
      >
        <ChevronRight
          :class="{ 'rotate-90': expanded?.length > 0 }"
          class="text-foreground/80 hover:text-foreground size-4 cursor-pointer transition"
        />
        <div class="flex items-center gap-1 item-all-checkbox">
          <Checkbox
            v-if="multiple"
            :model-value="selectAllStatus"
            :indeterminate="selectAllStatus === 'indeterminate'"
            @click.stop
            @update:model-value="onSelectAllChange"
          />
          <span v-if="selectAllLabel">{{ selectAllLabel }}</span>
        </div>
      </div>
    </div>
    <TransitionGroup :name="transition ? 'fade' : ''">
      <TreeItem
        v-for="item in flattenItems"
        v-slot="{
          isExpanded,
          isSelected,
          isIndeterminate,
          handleSelect,
          handleToggle,
        }"
        :key="item._id"
        :class="
          cn('cursor-pointer', getNodeClass?.(item), {
            'data-[selected]:bg-accent': !multiple,
            'text-foreground/50 cursor-not-allowed': isNodeDisabled(item),
          })
        "
        v-bind="{
          ...item.bind,
          onfocus: isNodeDisabled(item) ? 'this.blur()' : undefined,
          disabled: isNodeDisabled(item),
        }"
        @select="
          (event: any) => {
            if (isNodeDisabled(item)) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            if (event.detail.originalEvent.type === 'click') {
              event.preventDefault();
            }
            onSelect(item, event.detail.isSelected);
          }
        "
        @toggle="
          (event: any) => {
            if (event.detail.originalEvent.type === 'click') {
              event.preventDefault();
            }
            !isNodeDisabled(item) && onToggle(item);
          }
        "
        class="tree-node focus:ring-grass8 my-0.5 rounded outline-hidden"
      >
        <!-- Content row controls indentation via paddingLeft, unaffected by TreeItem internal rendering -->
        <div
          class="flex items-center w-full p-1"
          :style="{ paddingLeft: `${item.level - 1 + 0.25}rem` }"
        >
          <!-- Fixed-width expand area: renders arrow when child nodes exist, empty with fixed width when none -->
          <div class="flex shrink-0 items-center justify-center w-5">
            <ChevronRight
              v-if="
                item.hasChildren &&
                Array.isArray(item.value[childrenField]) &&
                item.value[childrenField].length > 0
              "
              class="text-foreground/80 hover:text-foreground size-4 cursor-pointer transition"
              :class="{ 'rotate-90': isExpanded }"
              @click.stop="
                () => {
                  handleToggle();
                  onToggle(item);
                }
              "
            />
          </div>
          <div class="flex items-center gap-1 item-checkbox">
            <Checkbox
              v-if="multiple"
              :model-value="isSelected && !isNodeDisabled(item)"
              :disabled="isNodeDisabled(item)"
              :indeterminate="
                (isIndeterminate ||
                  indeterminateKeys.has(get(item.value, valueField))) &&
                !isNodeDisabled(item)
              "
              @click="
                (event: MouseEvent) => {
                  if (isNodeDisabled(item)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  handleSelect();
                }
              "
            />
            <div
              class="flex items-center gap-1 item-checkbox"
              :title="get(item.value, labelField)"
              @click="
                (event: MouseEvent) => {
                  if (isNodeDisabled(item)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                  }
                  handleSelect();
                }
              "
            >
              <slot name="node" v-bind="item">
                <IconifyIcon
                  class="size-4"
                  v-if="showIcon && get(item.value, iconField)"
                  :icon="get(item.value, iconField)"
                />
                {{ get(item.value, labelField) }}
              </slot>
            </div>
          </div>
          <div class="h-4 w-4 shrink-0"></div>
        </div>
      </TreeItem>
    </TransitionGroup>
    <div
      :class="
        cn('my-0.5 flex w-full items-center p-1', bordered ? 'border-t' : '')
      "
      v-if="$slots.footer"
    >
      <slot name="footer"> </slot>
    </div>
  </TreeRoot>
</template>

<style lang="scss" scoped>
.item-checkbox {
  width: 100%;
  overflow: hidden;
}

.item-all-checkbox {
  width: 100%;
  overflow: hidden;

  .text-label {
    margin-left: 8px;
  }
}

/* 1. Declare transition effects */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

/* 2. Declare enter and leave states */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}

/* 3. Ensure leaving items are removed from layout flow
      to correctly compute moving animations. */
.fade-leave-active {
  position: absolute;
}
</style>
