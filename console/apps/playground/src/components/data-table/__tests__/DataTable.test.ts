import type { DataTableFeatures } from '../features';

import { createApp, h, nextTick, ref } from 'vue';

import { createColumnHelper } from '@tanstack/vue-table';
import { describe, expect, it, vi } from 'vitest';

import DataTable from '../DataTable.vue';
import DataTableColumnHeader from '../DataTableColumnHeader.vue';

interface ServiceNode {
  latencyMs: number;
  nodeId: string;
  region: string;
  status: 'degraded' | 'healthy';
}

const helper = createColumnHelper<DataTableFeatures, ServiceNode>();

const serviceColumns = helper.columns([
  helper.accessor('nodeId', {
    header: ({ column }) =>
      h(DataTableColumnHeader, { column, title: 'Node ID' }),
    cell: ({ row }) => h('span', row.original.nodeId),
  }),
  helper.accessor('region', {
    meta: { label: 'Cluster Region' },
    header: 'Region',
    cell: ({ row }) => h('span', row.original.region),
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: ({ row }) =>
      h(
        'span',
        { 'data-testid': `status-${row.original.nodeId}` },
        row.original.status,
      ),
  }),
]);

function makeSeedNodes(count: number): ServiceNode[] {
  return Array.from({ length: count }, (_, idx) => ({
    nodeId: `NODE-${idx + 1}`,
    region: idx % 2 === 0 ? 'ap-southeast-1' : 'eu-central-1',
    status: 'healthy',
    latencyMs: 12 + idx,
  }));
}

describe('generic DataTable<TData> reusability & realtime stability', () => {
  it('renders skeleton rows when loading with empty data', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(DataTable<ServiceNode>, {
          columns: serviceColumns,
          data: [],
          loading: true,
          skeletonRows: 4,
        }),
    });
    app.mount(host);

    const rows = host.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    expect(host.querySelectorAll('tbody td .animate-pulse').length).toBe(12);

    app.unmount();
    host.remove();
  });

  it('preserves active pageIndex on SSE/realtime cell updates by default (autoResetPageIndex = false)', async () => {
    const nodes = ref<ServiceNode[]>(makeSeedNodes(25));
    const host = document.createElement('div');
    document.body.append(host);

    let tableApi: any;
    const app = createApp({
      render: () =>
        h(
          DataTable<ServiceNode>,
          {
            columns: serviceColumns,
            data: nodes.value,
            rowKey: 'nodeId',
            initialPageSize: 10,
          },
          {
            toolbar: ({ table }: any) => {
              tableApi = table;
              return null;
            },
          },
        ),
    });
    app.mount(host);

    expect(host.textContent).toContain('Page 1 of 3');
    expect(host.textContent).toContain('NODE-1');

    // Navigate to Page 2 (rows NODE-11 .. NODE-20)
    tableApi.setPageIndex(1);
    await nextTick();
    expect(host.textContent).toContain('Page 2 of 3');
    expect(
      host.querySelector('[data-testid="status-NODE-12"]')?.textContent,
    ).toBe('healthy');

    // Simulate SSE status mutation on NODE-12
    nodes.value = nodes.value.map((n) =>
      n.nodeId === 'NODE-12' ? { ...n, status: 'degraded' } : n,
    );
    await nextTick();

    // Must remain on Page 2 AND reflect updated cell value immediately
    expect(host.textContent).toContain('Page 2 of 3');
    expect(
      host.querySelector('[data-testid="status-NODE-12"]')?.textContent,
    ).toBe('degraded');

    app.unmount();
    host.remove();
  });

  it('supports server-side manualPagination with rowCount and controlled pagination updates', async () => {
    const onPaginationChange = vi.fn();
    const pageSlice = makeSeedNodes(10);
    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        h(DataTable<ServiceNode>, {
          columns: serviceColumns,
          data: pageSlice,
          rowKey: 'nodeId',
          manualPagination: true,
          rowCount: 120,
          pagination: { pageIndex: 0, pageSize: 10 },
          'onUpdate:pagination': onPaginationChange,
        }),
    });
    app.mount(host);

    expect(host.textContent).toContain('120');
    expect(host.textContent).toContain('total row(s)');
    expect(host.textContent).toContain('Page 1 of 12');

    const nextBtn = [...host.querySelectorAll('button')].find((btn) =>
      btn.textContent?.includes('Go to next page'),
    );
    nextBtn?.click();
    await nextTick();

    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 10,
    });

    app.unmount();
    host.remove();
  });
});
