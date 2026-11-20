import type { RealAnalyticsData } from '#/api';

import { computed, onMounted, ref } from 'vue';

import { toast } from '@operon-core/shadcn-ui';

import { getRealAnalyticsData } from '#/api';
import { $t } from '#/locales';
import { captureError } from '#/utils/bugsink';

const INITIAL_ANALYTICS_DATA: RealAnalyticsData = {
  fleet: { loopbackPort: 8765, status: 'ready' },
  plugins: { coreCount: 0, items: [], moduleCount: 0, total: 0 },
  system: {
    edgeProvider: 'Cloudflare Pages',
    latencyMs: 20,
    status: 'healthy',
  },
  tenants: {
    activeCount: 0,
    growth: [],
    items: [],
    planBreakdown: { enterprise: 0, free: 0, pro: 0 },
    total: 0,
  },
};

function toPercent(part: number, total: number): number {
  return Math.round((part / (total || 1)) * 100);
}

/**
 * Encapsulates analytics telemetry fetching and derived chart/percentage transforms (SRP).
 */
export function useAnalyticsMetrics() {
  const loading = ref(true);
  const analyticsData = ref<RealAnalyticsData>(
    structuredClone(INITIAL_ANALYTICS_DATA),
  );

  const totalPlans = computed(() => {
    const { enterprise, free, pro } = analyticsData.value.tenants.planBreakdown;
    return enterprise + free + pro || 1;
  });

  const proPlanPercent = computed(() =>
    toPercent(analyticsData.value.tenants.planBreakdown.pro, totalPlans.value),
  );
  const freePlanPercent = computed(() =>
    toPercent(analyticsData.value.tenants.planBreakdown.free, totalPlans.value),
  );
  const entPlanPercent = computed(() =>
    toPercent(
      analyticsData.value.tenants.planBreakdown.enterprise,
      totalPlans.value,
    ),
  );

  const plansChartData = computed(() => [
    {
      count: analyticsData.value.tenants.planBreakdown.pro,
      plan: $t('page.analytics.plan_pro') || 'Pro',
    },
    {
      count: analyticsData.value.tenants.planBreakdown.free,
      plan: $t('page.analytics.plan_free') || 'Free',
    },
    {
      count: analyticsData.value.tenants.planBreakdown.enterprise,
      plan: $t('page.analytics.plan_enterprise') || 'Enterprise',
    },
  ]);

  const totalPlugins = computed(
    () =>
      analyticsData.value.plugins.coreCount +
        analyticsData.value.plugins.moduleCount || 1,
  );

  const corePluginPercent = computed(() =>
    toPercent(analyticsData.value.plugins.coreCount, totalPlugins.value),
  );
  const modulePluginPercent = computed(() =>
    toPercent(analyticsData.value.plugins.moduleCount, totalPlugins.value),
  );

  async function loadAnalytics() {
    loading.value = true;
    try {
      analyticsData.value = await getRealAnalyticsData();
    } catch (error: any) {
      captureError(error, { action: 'loadAnalytics', view: 'Analytics' });
      toast.error(error.message || $t('common.error'));
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    void loadAnalytics();
  });

  return {
    analyticsData,
    corePluginPercent,
    entPlanPercent,
    freePlanPercent,
    loadAnalytics,
    loading,
    modulePluginPercent,
    plansChartData,
    proPlanPercent,
  };
}
