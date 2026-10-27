import type { EChartsOption } from 'echarts';

import type { Ref } from 'vue';

import type { Nullable } from '@operon/types';

import type EchartsUI from './echarts-ui.vue';

import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  unref,
  watch,
} from 'vue';

import { usePreferences } from '@operon/preferences';

import {
  tryOnUnmounted,
  useDebounceFn,
  useResizeObserver,
  useTimeoutFn,
  useWindowSize,
} from '@vueuse/core';

import echarts from './echarts';

type EchartsUIType = typeof EchartsUI | undefined;

type EchartsThemeType = 'dark' | 'light' | null;

function useEcharts(chartRef: Ref<EchartsUIType>) {
  let chartInstance: echarts.ECharts | null = null;
  let cacheOptions: EChartsOption = {};
  // Whether echarts is active
  const isActiveRef = ref(false);

  const { isDark } = usePreferences();
  const { height, width } = useWindowSize();
  const resizeHandler: () => void = useDebounceFn(resize, 200);

  const getChartEl = (): HTMLElement | null => {
    const refValue = chartRef?.value as unknown;
    if (!refValue) return null;
    if (refValue instanceof HTMLElement) {
      return refValue;
    }
    const maybeComponent = refValue as { $el?: HTMLElement };
    return maybeComponent.$el ?? null;
  };

  onMounted(() => (isActiveRef.value = true));
  onActivated(() => (isActiveRef.value = true));
  onDeactivated(() => (isActiveRef.value = false));
  onBeforeUnmount(() => (isActiveRef.value = false));

  const isElHidden = (el: HTMLElement | null): boolean => {
    if (!el) return true;
    return el.offsetHeight === 0 || el.offsetWidth === 0;
  };

  const getOptions = computed((): EChartsOption => {
    if (!isDark.value) {
      return {};
    }

    return {
      backgroundColor: 'transparent',
    };
  });

  const initCharts = (t?: EchartsThemeType) => {
    const el = chartRef?.value?.$el;
    if (!el) {
      return;
    }
    chartInstance = echarts.init(el, t || isDark.value ? 'dark' : null);

    return chartInstance;
  };

  const renderEcharts = (
    options: EChartsOption,
    clear = true,
  ): Promise<Nullable<echarts.ECharts>> => {
    if (!unref(isActiveRef)) {
      return Promise.resolve(null);
    }
    cacheOptions = options;
    const currentOptions = {
      ...options,
      ...getOptions.value,
    };
    return new Promise((resolve) => {
      if (chartRef.value?.offsetHeight === 0) {
        useTimeoutFn(async () => {
          resolve(await renderEcharts(currentOptions));
        }, 30);
        return;
      }
      nextTick(() => {
        const el = getChartEl();
        if (isElHidden(el)) {
          useTimeoutFn(async () => {
            resolve(await renderEcharts(currentOptions));
          }, 30);
          return;
        }
        useTimeoutFn(() => {
          if (!chartInstance || chartInstance?.getDom() !== el) {
            chartInstance?.dispose();
            const instance = initCharts();
            if (!instance) return;
            chartInstance = instance;
          }
          clear && chartInstance?.clear();
          chartInstance?.setOption(currentOptions);
          resolve(chartInstance);
        }, 30);
      });
    });
  };

  const updateData = (
    option: EChartsOption,
    notMerge = false, // false = merge (preserves animations), true = full replace
    lazyUpdate = false, // true = defer redraw, suitable for multiple rapid calls
  ): Promise<echarts.ECharts | null> => {
    return new Promise((resolve) => {
      nextTick(() => {
        if (!chartInstance) {
          // Not initialized yet -> treated as initial render
          renderEcharts(option).then(resolve);
          return;
        }

        // Merge existing global options (such as backgroundColor)
        const finalOption = {
          ...option,
          ...getOptions.value,
        };

        chartInstance.setOption(finalOption, {
          notMerge,
          lazyUpdate,
          // silent: true,     // Can enable for maximum performance (disables all events)
        });

        resolve(chartInstance);
      });
    });
  };

  function resize() {
    const el = getChartEl();
    if (isElHidden(el)) {
      return;
    }
    chartInstance?.resize({
      animation: {
        duration: 300,
        easing: 'quadraticIn',
      },
    });
  }

  watch([width, height], () => {
    resizeHandler?.();
  });

  useResizeObserver(chartRef as never, resizeHandler);

  watch([isDark, isActiveRef], () => {
    if (chartInstance && unref(isActiveRef)) {
      chartInstance.dispose();
      initCharts();
      renderEcharts(cacheOptions);
      resize();
    }
  });

  tryOnUnmounted(() => {
    // Destroy instance and release resources
    chartInstance?.dispose();
  });
  return {
    isActive: isActiveRef,
    renderEcharts,
    resize,
    updateData,
    getChartInstance: () => chartInstance,
  };
}

export { useEcharts };

export type { EchartsUIType };
