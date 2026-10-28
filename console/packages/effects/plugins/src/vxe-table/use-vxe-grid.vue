<script lang="ts" setup>
import type {
  VxeGridDefines,
  VxeGridInstance,
  VxeGridListeners,
  VxeGridPropTypes,
  VxeGridProps as VxeTableGridProps,
  VxeToolbarPropTypes,
} from 'vxe-table';

import type { SetupContext } from 'vue';

import type { VbenFormProps } from '@operon-core/form-ui';

import type { ExtendedVxeGridApi, VxeGridProps } from './types';

import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  toRaw,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue';

import { usePriorityValues } from '@operon/hooks';
import { $t } from '@operon/locales';
import { usePreferences } from '@operon/preferences';
import {
  cloneDeep,
  cn,
  isBoolean,
  isEqual,
  mergeWithArrayOverride,
} from '@operon/utils';

import { VbenHelpTooltip, VbenLoading } from '@operon-core/shadcn-ui';

import { VxeButton } from 'vxe-pc-ui';
import { VxeGrid, VxeUI } from 'vxe-table';

import { extendProxyOptions } from './extends';
import { useTableForm } from './init';
import { applyViewedRowOptions, useViewedRow } from './viewed-row';

import 'vxe-table/styles/cssvar.scss';
import 'vxe-pc-ui/styles/cssvar.scss';
import './style.css';

interface Props extends VxeGridProps {
  api: ExtendedVxeGridApi;
}

const props = withDefaults(defineProps<Props>(), {});

const FORM_SLOT_PREFIX = 'form-';

const TOOLBAR_ACTIONS = 'toolbar-actions';
const TOOLBAR_TOOLS = 'toolbar-tools';
const TABLE_TITLE = 'table-title';

const gridRef = useTemplateRef<VxeGridInstance>('gridRef');

const state = props.api?.useStore?.();

const {
  gridOptions,
  class: className,
  gridClass,
  gridEvents,
  formOptions,
  tableTitle,
  tableData,
  tableTitleHelp,
  showSearchForm,
  separator,
  viewedRowOptions,
} = usePriorityValues(props, state);

// viewedRowOptions: helper is created once (persist/keyField do not support runtime switching)
// Changes in actionCodes, rowClassName, rowStyle, viewedKeys respond via options computed
const gridApi = props.api;

watch(
  viewedRowOptions,
  (cfg) => {
    // If helper exists, do not recreate
    if (gridApi.viewedRowHelper) return;

    if (!cfg) return;

    const keyField = (gridOptions.value?.rowConfig as any)?.keyField || 'id';
    const resolved = isBoolean(cfg) ? { keyField } : { keyField, ...cfg };
    gridApi.viewedRowHelper = useViewedRow(resolved);
  },
  { immediate: true },
);

const { isMobile } = usePreferences();
const isSeparator = computed(() => {
  if (
    !formOptions.value ||
    showSearchForm.value === false ||
    separator.value === false ||
    separator.value === undefined
  ) {
    return false;
  }
  if (separator.value === true) {
    return true;
  }
  return separator.value.show !== false;
});
const separatorBg = computed(() => {
  return !separator.value ||
    isBoolean(separator.value) ||
    !separator.value.backgroundColor
    ? undefined
    : separator.value.backgroundColor;
});
const slots: SetupContext['slots'] = useSlots();

const [Form, formApi] = useTableForm({
  compact: true,
  handleSubmit: async () => {
    const formValues = await formApi.getValues();
    formApi.setLatestSubmissionValues(toRaw(formValues));
    props.api.reload(formValues);
  },
  handleReset: async () => {
    const prevValues = await formApi.getValues();
    await formApi.reset();
    const formValues = await formApi.getValues();
    formApi.setLatestSubmissionValues(formValues);
    // If value changed, submitOnChange triggers refresh; manually refresh only when submitOnChange is false or value unchanged
    const isSubmitOnChange = formOptions.value?.submitOnChange ?? true;
    if (isEqual(prevValues, formValues) || !isSubmitOnChange) {
      props.api.reload(formValues);
    }
  },
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  showCollapseButton: true,
  submitButtonOptions: {
    content: computed(() => $t('common.search')),
  },
  submitOnChange: true,
  submitOnEnter: true,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
});

const showTableTitle = computed(() => {
  return !!slots[TABLE_TITLE] || tableTitle.value;
});

const showToolbar = computed(() => {
  return (
    !!slots[TOOLBAR_ACTIONS] || !!slots[TOOLBAR_TOOLS] || showTableTitle.value
  );
});

const toolbarOptions = computed(() => {
  const hasSlotActions = !!slots[TOOLBAR_ACTIONS];
  const hasSlotTools = !!slots[TOOLBAR_TOOLS];
  const searchBtn: VxeToolbarPropTypes.ToolConfig = {
    code: 'search',
    icon: 'vxe-icon-search',
    circle: true,
    status: showSearchForm.value ? 'primary' : undefined,
    title: showSearchForm.value
      ? $t('common.hideSearchPanel')
      : $t('common.showSearchPanel'),
  };
  // Merge search button into user-configured toolbarConfig.tools
  const toolbarConfig: VxeGridPropTypes.ToolbarConfig = {
    tools: (gridOptions.value?.toolbarConfig?.tools ??
      []) as VxeToolbarPropTypes.ToolConfig[],
  };
  if (gridOptions.value?.toolbarConfig?.search && !!formOptions.value) {
    toolbarConfig.tools = Array.isArray(toolbarConfig.tools)
      ? [...toolbarConfig.tools, searchBtn]
      : [searchBtn];
  }

  if (!showToolbar.value) {
    toolbarConfig.enabled = false;
    return { toolbarConfig };
  }

  // Enforce fixed toolbar config to disallow arbitrary user override,
  // reducing complexity and maintenance cost
  toolbarConfig.slots = {
    ...(hasSlotActions || showTableTitle.value
      ? { buttons: TOOLBAR_ACTIONS }
      : {}),
    ...(hasSlotTools ? { tools: TOOLBAR_TOOLS } : {}),
  };
  return { toolbarConfig };
});

const options = computed(() => {
  const globalGridConfig = VxeUI?.getConfig()?.grid ?? {};

  const rawMergedOptions: VxeTableGridProps = mergeWithArrayOverride(
    {},
    toRaw(toolbarOptions.value),
    toRaw(gridOptions.value),
    globalGridConfig,
  );
  const mergedOptions: VxeTableGridProps = cloneDeep(rawMergedOptions);

  // Keep the columns reference stable when unrelated reactive options change.
  // Otherwise VXE reloads the columns and loses its initialized sort state.
  mergedOptions.columns = rawMergedOptions.columns;

  if (mergedOptions.proxyConfig) {
    const { ajax } = mergedOptions.proxyConfig;
    mergedOptions.proxyConfig.enabled = !!ajax;
    // Do not autoload data; controlled by component
    mergedOptions.proxyConfig.autoLoad = false;
  }

  if (mergedOptions.pagerConfig) {
    const mobileLayouts = [
      'PrevJump',
      'PrevPage',
      'Number',
      'NextPage',
      'NextJump',
    ] as any;
    const layouts = [
      'Total',
      'Sizes',
      'Home',
      ...mobileLayouts,
      'End',
    ] as readonly string[];
    mergedOptions.pagerConfig = mergeWithArrayOverride(
      {},
      mergedOptions.pagerConfig,
      {
        autoHidden: true,
        pageSize: 20,
        background: true,
        pageSizes: [10, 20, 30, 50, 100, 200],
        className: 'mt-2 w-full',
        layouts: isMobile.value ? mobileLayouts : layouts,
        size: 'mini' as const,
      },
    );
  }
  if (mergedOptions.formConfig) {
    mergedOptions.formConfig.enabled = false;
  }
  if (tableData.value && tableData.value.length > 0) {
    mergedOptions.data = tableData.value;
  }

  // Inject viewed row feature (intercept rowClassName, rowStyle, columns)
  if (viewedRowOptions.value && gridApi.viewedRowHelper) {
    applyViewedRowOptions(
      mergedOptions,
      viewedRowOptions.value,
      gridApi.viewedRowHelper,
    );
  }

  return mergedOptions;
});

function onToolbarToolClick(event: VxeGridDefines.ToolbarToolClickEventParams) {
  if (event.code === 'search') {
    onSearchBtnClick();
  }
  (
    gridEvents.value?.toolbarToolClick as VxeGridListeners['toolbarToolClick']
  )?.(event);
}

function onSearchBtnClick() {
  props.api?.toggleSearchForm?.();
}

const events = computed(() => {
  return {
    ...gridEvents.value,
    toolbarToolClick: onToolbarToolClick,
  };
});

const delegatedSlots = computed(() => {
  const resultSlots: string[] = [];

  for (const key of Object.keys(slots)) {
    if (
      !['empty', 'form', 'loading', TOOLBAR_ACTIONS, TOOLBAR_TOOLS].includes(
        key,
      )
    ) {
      resultSlots.push(key);
    }
  }
  return resultSlots;
});

const delegatedFormSlots = computed(() => {
  const resultSlots: string[] = [];

  for (const key of Object.keys(slots)) {
    if (key.startsWith(FORM_SLOT_PREFIX)) {
      resultSlots.push(key);
    }
  }
  return resultSlots.map((key) => key.replace(FORM_SLOT_PREFIX, ''));
});

const showDefaultEmpty = computed(() => {
  // Check if native VXE Table empty state is configured
  const hasEmptyText = options.value.emptyText !== undefined;
  const hasEmptyRender = options.value.emptyRender !== undefined;

  // If native config exists, do not show default empty state
  return !hasEmptyText && !hasEmptyRender;
});

async function init() {
  await nextTick();
  const globalGridConfig = VxeUI?.getConfig()?.grid ?? {};
  const defaultGridOptions: VxeTableGridProps = mergeWithArrayOverride(
    {},
    toRaw(gridOptions.value),
    toRaw(globalGridConfig),
  );
  // Internally load data to prevent interference from form default values
  const autoLoad = defaultGridOptions.proxyConfig?.autoLoad;
  const enableProxyConfig = options.value.proxyConfig?.enabled;

  // form is replaced by vben-form (formConfig unsupported); log warning
  const formConfig = gridOptions.value?.formConfig;
  // Handle warning when loading multiple tables on one page:
  // defaultGridOptions and gridOptions are cached into State after first initialization
  if (formConfig && formConfig.enabled) {
    console.warn(
      '[Vben Vxe Table]: The formConfig in the grid is not supported, please use the `formOptions` props',
    );
  }
  props.api?.setState?.({ gridOptions: defaultGridOptions });
  // Form is replaced by vben-form; ensure query events receive arguments
  extendProxyOptions(props.api, defaultGridOptions, () =>
    formApi.getLatestSubmissionValues(),
  );

  if (enableProxyConfig && autoLoad) {
    // Wait for VXE to receive the latest options before applying default sort.
    await nextTick();
    props.api.grid.commitProxy?.(
      'initial',
      formOptions.value ? ((await formApi.getValues()) ?? {}) : {},
    );
  }
}

// formOptions supports reactivity
watch(
  formOptions,
  () => {
    formApi.setState((prev: Record<string, any>) => {
      const finalFormOptions: VbenFormProps = mergeWithArrayOverride(
        {},
        formOptions.value,
        prev,
      );
      return {
        ...finalFormOptions,
        collapseTriggerResize: !!finalFormOptions.showCollapseButton,
      };
    });
  },
  {
    immediate: true,
  },
);

const isCompactForm = computed(() => {
  return formApi.getState()?.compact;
});

onMounted(() => {
  props.api?.mount?.(gridRef.value, formApi);
  init();
});

onUnmounted(() => {
  formApi?.unmount?.();
  props.api?.unmount?.();
});
</script>

<template>
  <div :class="cn('h-full rounded-md bg-card', className)">
    <VxeGrid
      ref="gridRef"
      :class="
        cn(
          'p-2',
          {
            'pt-0': showToolbar && !formOptions,
          },
          gridClass,
        )
      "
      v-bind="options"
      v-on="events"
    >
      <!-- Left action area or title -->
      <template v-if="showToolbar" #toolbar-actions="slotProps">
        <slot v-if="showTableTitle" name="table-title">
          <div class="flex-center gap-1 text-[1rem] font-bold">
            {{ tableTitle }}
            <VbenHelpTooltip v-if="tableTitleHelp">
              {{ tableTitleHelp }}
            </VbenHelpTooltip>
          </div>
        </slot>
        <slot name="toolbar-actions" v-bind="slotProps"> </slot>
      </template>

      <!-- Inherit default slots -->
      <template
        v-for="slotName in delegatedSlots"
        :key="slotName"
        #[slotName]="slotProps"
      >
        <slot :name="slotName" v-bind="slotProps"></slot>
      </template>
      <template #toolbar-tools="slotProps">
        <slot name="toolbar-tools" v-bind="slotProps"></slot>
        <VxeButton
          icon="vxe-icon-search"
          circle
          class="ml-2"
          v-if="gridOptions?.toolbarConfig?.search && !!formOptions"
          :status="showSearchForm ? 'primary' : undefined"
          :title="$t('common.search')"
          @click="onSearchBtnClick"
        />
      </template>

      <!-- Search form -->
      <template #form>
        <div
          v-if="formOptions"
          v-show="showSearchForm !== false"
          :class="
            cn(
              'relative rounded-sm py-3',
              isCompactForm
                ? isSeparator
                  ? 'pb-8'
                  : 'pb-4'
                : isSeparator
                  ? 'pb-4'
                  : 'pb-0',
            )
          "
        >
          <slot name="form">
            <Form>
              <template
                v-for="slotName in delegatedFormSlots"
                :key="slotName"
                #[slotName]="slotProps"
              >
                <slot
                  :name="`${FORM_SLOT_PREFIX}${slotName}`"
                  v-bind="slotProps"
                ></slot>
              </template>
              <template #reset-before="slotProps">
                <slot name="reset-before" v-bind="slotProps"></slot>
              </template>
              <template #submit-before="slotProps">
                <slot name="submit-before" v-bind="slotProps"></slot>
              </template>
              <template #expand-before="slotProps">
                <slot name="expand-before" v-bind="slotProps"></slot>
              </template>
              <template #expand-after="slotProps">
                <slot name="expand-after" v-bind="slotProps"></slot>
              </template>
            </Form>
          </slot>
          <div
            v-if="isSeparator"
            :style="{
              ...(separatorBg ? { backgroundColor: separatorBg } : undefined),
            }"
            class="absolute bottom-1 -left-2 z-100 h-2 w-[calc(100%+1rem)] overflow-hidden bg-background-deep md:bottom-2 md:h-3"
          ></div>
        </div>
      </template>
      <!-- loading -->
      <template #loading>
        <slot name="loading">
          <VbenLoading :spinning="true" />
        </slot>
      </template>
      <!-- Unified empty state -->
      <template v-if="showDefaultEmpty" #empty>
        <slot name="empty">
          <div
            class="flex flex-col items-center justify-center py-8 text-center"
          >
            <div
              class="flex size-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground ring-1 ring-border/50 shadow-2xs"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H14.76a2 2 0 0 1 1.79 1.1L18 14"
                />
                <path d="M6 14v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" />
                <path d="M4 14h16" />
                <path d="M12 4v4" />
                <path d="M10 6l2-2 2 2" />
              </svg>
            </div>
            <div class="mt-2.5 text-foreground tracking-tight">
              {{ $t('common.noData') }}
            </div>
            <p class="mt-0.5 text-muted-foreground">
              {{ $t('common.noMatchingRecords') }}
            </p>
          </div>
        </slot>
      </template>
    </VxeGrid>
  </div>
</template>
