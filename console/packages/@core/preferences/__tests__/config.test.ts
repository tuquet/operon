import { describe, expect, it } from 'vitest';

import { defaultPreferences } from '../src/config';

describe('defaultPreferences immutability test', () => {
  // Create snapshot to ensure default config object is not mutated
  it('should not modify the config object', () => {
    expect(defaultPreferences).toMatchSnapshot();
  });
});
