import { describe, expect, it } from 'vitest';

import { paginateArray } from '../pagination';

describe('paginateArray', () => {
  const sampleData = Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  it('paginates correctly on first page with default pageSize', () => {
    const result = paginateArray(sampleData);
    expect(result.total).toBe(45);
    expect(result.items.length).toBe(15);
    expect(result.items[0]?.id).toBe(1);
    expect(result.items[14]?.id).toBe(15);
  });

  it('paginates correctly for custom page and pageSize', () => {
    const result = paginateArray(sampleData, { currentPage: 2, pageSize: 10 });
    expect(result.total).toBe(45);
    expect(result.items.length).toBe(10);
    expect(result.items[0]?.id).toBe(11);
    expect(result.items[9]?.id).toBe(20);
  });

  it('handles last page with partial count', () => {
    const result = paginateArray(sampleData, { currentPage: 3, pageSize: 20 });
    expect(result.total).toBe(45);
    expect(result.items.length).toBe(5);
    expect(result.items[0]?.id).toBe(41);
    expect(result.items[4]?.id).toBe(45);
  });

  it('handles out of bounds page gracefully', () => {
    const result = paginateArray(sampleData, { currentPage: 10, pageSize: 10 });
    expect(result.total).toBe(45);
    expect(result.items).toEqual([]);
  });

  it('normalizes negative or zero currentPage to 1', () => {
    const resultZero = paginateArray(sampleData, {
      currentPage: 0,
      pageSize: 10,
    });
    expect(resultZero.items[0]?.id).toBe(1);

    const resultNegative = paginateArray(sampleData, {
      currentPage: -5,
      pageSize: 10,
    });
    expect(resultNegative.items[0]?.id).toBe(1);
  });

  it('handles empty or null/undefined array safely', () => {
    expect(paginateArray([])).toEqual({ items: [], total: 0 });
    expect(paginateArray(null as any)).toEqual({ items: [], total: 0 });
    expect(paginateArray(undefined as any)).toEqual({ items: [], total: 0 });
  });
});
