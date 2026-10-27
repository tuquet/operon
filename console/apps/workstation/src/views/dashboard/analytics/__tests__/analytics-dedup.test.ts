// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import WorkspaceHero from '../../../tenants/components/workspace-hero.vue';
import WorkspaceOverviewTab from '../../../tenants/components/workspace-overview-tab.vue';
import AnalyticsView from '../index.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/analytics', query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));

vi.mock('@operon/locales', () => ({
  $t: (key: string) => key,
}));

vi.mock('#/composables', () => ({
  useClipboard: () => ({
    copyToClipboard: vi.fn(),
    isCopied: () => false,
  }),
  useDateFormat: () => ({
    formatDate: (v: string) => v,
    formatDateOnly: (v: string) => v,
  }),
}));

vi.mock('#/api', () => ({
  getRealAnalyticsData: vi.fn().mockResolvedValue({
    fleet: { loopbackPort: 8765, status: 'ready' },
    plugins: { coreCount: 8, items: [], moduleCount: 4, total: 12 },
    system: {
      edgeProvider: 'Cloudflare Pages',
      latencyMs: 20,
      status: 'healthy',
    },
    tenants: {
      activeCount: 3,
      growth: [],
      items: [],
      planBreakdown: { enterprise: 0, free: 1, pro: 2 },
      total: 3,
    },
  }),
}));

vi.mock('../growth-chart.vue', () => ({
  default: defineComponent({
    name: 'GrowthChartStub',
    setup() {
      return () => h('div', { 'data-testid': 'growth-chart-stub' });
    },
  }),
}));

vi.mock('../plans-chart.vue', () => ({
  default: defineComponent({
    name: 'PlansChartStub',
    setup() {
      return () => h('div', { 'data-testid': 'plans-chart-stub' });
    },
  }),
}));

vi.mock('../plugins-chart.vue', () => ({
  default: defineComponent({
    name: 'PluginsChartStub',
    setup() {
      return () => h('div', { 'data-testid': 'plugins-chart-stub' });
    },
  }),
}));

vi.mock('@operon-core/shadcn-ui', () => {
  const Stub = (name: string) =>
    defineComponent({
      name,
      setup(_props, { attrs, slots }) {
        return () => h('div', attrs, slots.default?.());
      },
    });
  return {
    Alert: Stub('Alert'),
    AlertDescription: Stub('AlertDescription'),
    AlertTitle: Stub('AlertTitle'),
    AreaChart: Stub('AreaChart'),
    Avatar: Stub('Avatar'),
    AvatarFallback: Stub('AvatarFallback'),
    Badge: Stub('Badge'),
    Button: Stub('Button'),
    Card: Stub('Card'),
    CardAction: Stub('CardAction'),
    CardContent: Stub('CardContent'),
    CardDescription: Stub('CardDescription'),
    CardFooter: Stub('CardFooter'),
    CardHeader: Stub('CardHeader'),
    CardTitle: Stub('CardTitle'),
    DonutChart: Stub('DonutChart'),
    Progress: Stub('Progress'),
    Spinner: Stub('Spinner'),
    toast: {
      error: vi.fn(),
      success: vi.fn(),
    },
  };
});

describe('enterprise UI information deduplication (SPEC-ui-information-deduplication)', () => {
  it('renders 2-row Executive KPI cards in Analytics without duplicate adjacent numbers or chart echoes', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const app = createApp(AnalyticsView);
    app.mount(container);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await nextTick();

    const workspacesCard = container.querySelector(
      '[data-testid="kpi-card-workspaces"]',
    );
    expect(workspacesCard).not.toBeNull();

    // Primary total is 3, and status pill shows active label without repeating '3' when activeCount === total
    const totalEl = container.querySelector(
      '[data-testid="kpi-workspaces-total"]',
    );
    const statusEl = container.querySelector(
      '[data-testid="kpi-workspaces-status"]',
    );
    expect(totalEl?.textContent?.trim()).toBe('3');
    expect(statusEl?.textContent?.trim()).toBe(
      'page.analytics.active_workspaces',
    );

    // Does not echo 'plan_pro' or 'plan_free' inside the KPI card (owned by PlansChart)
    expect(workspacesCard?.textContent).not.toContain(
      'page.analytics.plan_pro',
    );
    expect(workspacesCard?.textContent).not.toContain(
      'page.analytics.plan_free',
    );

    // Fleet card shows port :8765 as primary metric without repeating Desktop Bridge in Infrastructure Services
    const fleetPortEl = container.querySelector(
      '[data-testid="kpi-fleet-port"]',
    );
    expect(fleetPortEl?.textContent?.trim()).toBe(':8765');
    expect(container.textContent).not.toContain(
      'page.analytics.desktop_bridge',
    );

    app.unmount();
    container.remove();
  });

  it('distinguishes Selected Workspace badge from Active status badge in WorkspaceHero', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const app = createApp({
      render() {
        return h(WorkspaceHero, {
          isCurrentActive: true,
          loading: false,
          tenant: {
            created_at: '2026-01-01T00:00:00Z',
            id: 'tenant-uuid-12345678',
            metadata: { plan: 'Pro' },
            name: 'Acme Org',
            slug: 'acme-org',
            status: 'active',
          } as any,
        });
      },
    });
    app.mount(container);
    await nextTick();

    const currentBadge = container.querySelector(
      '[data-testid="hero-current-workspace-badge"]',
    );
    expect(currentBadge?.textContent?.trim()).toBe(
      'page.workspace.current_workspace',
    );

    app.unmount();
    container.remove();
  });

  it('renders only the 3 non-redundant operational cards in WorkspaceOverviewTab and distinct DangerZone copy', async () => {
    const container = document.createElement('div');
    document.body.append(container);

    const app = createApp({
      render() {
        return h(WorkspaceOverviewTab, {
          activeDevicesCount: 2,
          isCurrentActive: true,
          membersCount: 5,
          subscription: null,
          tenant: {
            created_at: '2026-01-01T00:00:00Z',
            id: 'tenant-uuid-12345678',
            name: 'Acme Org',
            slug: 'acme-org',
            status: 'active',
          } as any,
          totalDevicesCount: 4,
        });
      },
    });
    app.mount(container);
    await nextTick();

    // Has the 3 operational cards
    expect(
      container.querySelector('[data-testid="overview-card-tenant-id"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="overview-card-service-plan"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="overview-card-device-infra"]'),
    ).not.toBeNull();

    // Does NOT repeat Workspace Name, Slug, or Created At labels from WorkspaceHero
    expect(container.textContent).not.toContain('page.workspace.col_name');
    expect(container.textContent).not.toContain('page.workspace.col_slug');
    expect(container.textContent).not.toContain(
      'page.workspace.col_created_at',
    );

    // DangerZoneCard has distinct warning description and button label
    expect(container.textContent).toContain(
      'page.tenants_view.delete_modal_warning',
    );
    expect(container.textContent).toContain(
      'page.tenants_view.archive_or_delete',
    );

    app.unmount();
    container.remove();
  });
});
