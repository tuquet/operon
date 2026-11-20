import { describe, expect, it } from 'vitest';

import { useDateFormat } from '../use-date-format';

describe('useDateFormat composable TDD suite', () => {
  const { formatDate, formatDateOnly } = useDateFormat();

  it('returns em-dash placeholder when date is null or empty', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');

    expect(formatDateOnly(null)).toBe('—');
    expect(formatDateOnly(undefined)).toBe('—');
    expect(formatDateOnly('')).toBe('—');
  });

  it('formats valid ISO date string correctly in Vietnamese locale', () => {
    const iso = '2026-10-26T12:30:00Z';
    const formatted = formatDate(iso);
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(5);

    const dateOnly = formatDateOnly(iso);
    expect(typeof dateOnly).toBe('string');
    expect(dateOnly.length).toBeGreaterThan(5);
  });
});
