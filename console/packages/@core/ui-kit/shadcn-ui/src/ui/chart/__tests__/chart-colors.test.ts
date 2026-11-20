import { describe, expect, it } from 'vitest';

import { defaultColors } from '../index';

describe('defaultColors — semantic chart CSS variable palette', () => {
  it('returns hsl(var(--chart-1..5)) for counts up to 5 with zero hardcoded hex colors', () => {
    const colors = defaultColors(5);
    expect(colors).toEqual([
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ]);
    expect(colors.some((color) => color.startsWith('#'))).toBe(false);
  });

  it('returns the first 3 chart CSS variables by default', () => {
    expect(defaultColors()).toEqual([
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
    ]);
  });

  it('falls back to primary/secondary opacity steps for counts greater than 5', () => {
    const colors = defaultColors(6);
    expect(colors).toHaveLength(6);
    expect(colors.some((color) => color.startsWith('#'))).toBe(false);
  });
});
