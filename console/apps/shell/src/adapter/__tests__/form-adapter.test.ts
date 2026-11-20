import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { globalShareState } from '@operon/common-ui';

import { describe, expect, it, vi } from 'vitest';

import { initComponentAdapter } from '../component';
import { initSetupVbenForm, useVbenForm } from '../form';

vi.mock('@operon/locales', () => ({
  $t: (key: string) => key,
}));

describe('workstation form & component adapter', () => {
  it('allows typing in adapted Input component and triggers modelValue + onChange updates', async () => {
    await initComponentAdapter();
    const AdaptedInput = globalShareState.getComponents().Input;
    if (!AdaptedInput) {
      throw new Error('Expected Input component to be registered');
    }

    const currentValue = ref<string | undefined>(undefined);
    const onUpdateModelValue = vi.fn((val: string) => {
      currentValue.value = val;
    });
    const onUpdateValue = vi.fn();
    const onChange = vi.fn();

    const Host = defineComponent({
      setup() {
        return () =>
          h(AdaptedInput, {
            clearable: true,
            modelValue: currentValue.value,
            onChange,
            'onUpdate:modelValue': onUpdateModelValue,
            'onUpdate:value': onUpdateValue,
            placeholder: 'Search users...',
          });
      },
    });

    const container = document.createElement('div');
    document.body.append(container);
    const app = createApp(Host);

    try {
      app.mount(container);
      await nextTick();

      const inputEl = container.querySelector('input');
      if (!inputEl) {
        throw new Error('Expected input element to be rendered');
      }
      expect(inputEl.getAttribute('clearable')).toBeNull();
      expect(inputEl.value).toBe('');

      // Simulate user typing into the input
      inputEl.value = 'alice@operon.com';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();

      expect(onUpdateModelValue).toHaveBeenCalledWith('alice@operon.com');
      expect(onUpdateValue).toHaveBeenCalledWith('alice@operon.com');
      expect(onChange).toHaveBeenCalledWith('alice@operon.com');
      expect(currentValue.value).toBe('alice@operon.com');
      expect(inputEl.value).toBe('alice@operon.com');

      // Simulate form reset setting modelValue back to undefined
      currentValue.value = undefined;
      await nextTick();
      expect(inputEl.value).toBe('');
    } finally {
      app.unmount();
      container.remove();
    }
  });

  it('updates VbenForm state and triggers handleValuesChange when typing into Input field', async () => {
    await initComponentAdapter();
    await initSetupVbenForm();

    const onValuesChange = vi.fn();
    const [Form, formApi] = useVbenForm({
      handleValuesChange: onValuesChange,
      schema: [
        {
          component: 'Input',
          componentProps: {
            placeholder: 'Search users...',
          },
          fieldName: 'search',
          label: 'Search',
        },
      ],
      showDefaultActions: false,
      submitOnChange: true,
    });

    const container = document.createElement('div');
    document.body.append(container);
    const app = createApp(Form);

    try {
      app.mount(container);
      await nextTick();
      await nextTick();

      const inputEl = container.querySelector('input');
      if (!inputEl) {
        throw new Error('Expected input element to be rendered');
      }

      inputEl.value = 'owner';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      await nextTick();
      await nextTick();

      const values = await formApi.getValues();
      expect(values.search).toBe('owner');
      expect(inputEl.value).toBe('owner');
      expect(onValuesChange).toHaveBeenCalled();
    } finally {
      app.unmount();
      container.remove();
    }
  });
});
