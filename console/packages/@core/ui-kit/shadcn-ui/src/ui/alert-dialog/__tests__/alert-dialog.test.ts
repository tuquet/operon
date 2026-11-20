import type { App } from 'vue';

import { computed, createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../../button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../index';

vi.mock('@operon-core/composables', () => ({
  useScrollLock: () =>
    computed({
      get: () => false,
      set: () => {},
    }),
}));

let activeApp: App | undefined;

afterEach(() => {
  activeApp?.unmount();
  activeApp = undefined;
  document.body.innerHTML = '';
});

describe('shadcn AlertDialog', () => {
  it('styles AlertDialogAction and AlertDialogCancel with buttonVariants by default', async () => {
    const Consumer = defineComponent(
      () => () =>
        h(
          AlertDialog,
          { open: true },
          {
            default: () =>
              h(
                AlertDialogContent,
                { open: true },
                {
                  default: () => [
                    h(AlertDialogHeader, null, {
                      default: () => [
                        h(AlertDialogTitle, null, { default: () => 'Prompt' }),
                        h(AlertDialogDescription, null, {
                          default: () => 'Do you want to log out?',
                        }),
                      ],
                    }),
                    h(AlertDialogFooter, null, {
                      default: () => [
                        h(AlertDialogCancel, null, { default: () => 'Cancel' }),
                        h(AlertDialogAction, null, {
                          default: () => 'Confirm',
                        }),
                      ],
                    }),
                  ],
                },
              ),
          },
        ),
    );

    const host = document.createElement('div');
    document.body.append(host);
    activeApp = createApp(Consumer);
    activeApp.mount(host);
    await nextTick();
    await nextTick();

    const content = document.body.querySelector(
      '[data-slot="alert-dialog-content"]',
    );
    const description = document.body.querySelector(
      '[data-slot="alert-dialog-description"]',
    );
    const cancel = document.body.querySelector(
      '[data-slot="alert-dialog-cancel"]',
    );
    const action = document.body.querySelector(
      '[data-slot="alert-dialog-action"]',
    );

    expect(content).toBeInstanceOf(HTMLElement);
    expect(content?.className).toContain('grid');
    expect(content?.className).toContain('gap-4');

    expect(description?.className).toContain('text-sm');

    expect(cancel).toBeInstanceOf(HTMLButtonElement);
    expect(cancel?.className).toContain('border-input');
    expect(cancel?.className).toContain('bg-background');
    expect(cancel?.className).toContain('text-sm');

    expect(action).toBeInstanceOf(HTMLButtonElement);
    expect(action?.className).toContain('bg-primary');
    expect(action?.className).toContain('text-primary-foreground');
    expect(action?.className).toContain('text-sm');
  });

  it('does not override child Button variant when asChild is true', async () => {
    const Consumer = defineComponent(
      () => () =>
        h(
          AlertDialog,
          { open: true },
          {
            default: () =>
              h(
                AlertDialogContent,
                { open: true },
                {
                  default: () => [
                    h(AlertDialogTitle, null, { default: () => 'Prompt' }),
                    h(AlertDialogDescription, null, { default: () => 'Body' }),
                    h(
                      AlertDialogAction,
                      { asChild: true },
                      {
                        default: () =>
                          h(
                            Button,
                            { variant: 'destructive' },
                            { default: () => 'Delete' },
                          ),
                      },
                    ),
                  ],
                },
              ),
          },
        ),
    );

    const host = document.createElement('div');
    document.body.append(host);
    activeApp = createApp(Consumer);
    activeApp.mount(host);
    await nextTick();
    await nextTick();

    const action = document.body.querySelector(
      '[data-slot="alert-dialog-action"]',
    );
    expect(action).toBeInstanceOf(HTMLButtonElement);
    expect(action?.className).toContain('bg-destructive');
    expect(action?.className).not.toContain('bg-primary ');
  });
});
