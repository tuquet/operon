import type { VueWrapper } from '@vue/test-utils';

import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { COMPONENT_MAP, setupVbenForm } from '../src/config';
import { useVbenForm } from '../src/use-vben-form';

const ElInput = defineComponent({
  name: 'ElInput',
  setup(props, { attrs }) {
    return () => h('input', { ...props, ...attrs });
  },
});

const ElTreeSelect = defineComponent({
  name: 'ElTreeSelect',
  setup(props, { attrs }) {
    return () => h('div', { ...props, ...attrs, class: 'el-select__wrapper' });
  },
});

const wrappers: VueWrapper[] = [];

// Probe: record props/attrs keys actually received by ElTreeSelect
let capturedTreeSelectKeys: string[] = [];
let capturedTreeSelectNodeName: unknown;
let capturedTreeSelectNameValue: unknown;
let capturedDeclaredName: unknown;

// Probe declaring name as semantic prop: verify componentProps.name is not stripped
const DeclaredNameComponent = defineComponent({
  name: 'DeclaredNameComponent',
  props: {
    name: { type: String, default: '' },
  },
  setup(props) {
    capturedDeclaredName = props.name;
    return () => h('div', `name:${props.name ?? ''}`);
  },
});

const ProbeTreeSelect = defineComponent({
  name: 'ProbeTreeSelect',
  inheritAttrs: false,
  setup(props, { attrs }) {
    capturedTreeSelectKeys = [...Object.keys(props), ...Object.keys(attrs)];
    capturedTreeSelectNodeName = Reflect.get(attrs, 'nodeName');
    capturedTreeSelectNameValue = Reflect.get(attrs, 'name');
    return () => h(ElTreeSelect, { ...props, ...attrs });
  },
});

beforeAll(() => {
  setupVbenForm({
    config: {},
    rules: {},
  });
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount();
  }
  capturedTreeSelectKeys = [];
  capturedTreeSelectNodeName = undefined;
  capturedTreeSelectNameValue = undefined;
  capturedDeclaredName = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('issue #8214: form field named nodeName crashes TreeSelect render', () => {
  it('renders MRE schema (TreeSelect parentId + Input nodeName) without error', async () => {
    // MRE: TreeSelect(fieldName parentId) + Input(fieldName nodeName)
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const [Form] = useVbenForm({
      schema: [
        {
          component: ProbeTreeSelect,
          componentProps: { data: [] },
          fieldName: 'parentId',
        },
        {
          component: ElInput,
          fieldName: 'nodeName',
        },
      ],
    });

    let renderError: unknown;
    const wrapper = mount(Form, {
      global: {
        config: {
          errorHandler: (error) => {
            renderError = error;
          },
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    await nextTick();

    expect(renderError).toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();

    // Open TreeSelect popup: issue #8214 crash happened during popup floating positioning
    // (getNodeName reads hijacked form.nodeName), verify entire open flow succeeds here
    await wrapper.find('.el-select__wrapper').trigger('click');
    await flushPromises();
    await nextTick();
    expect(renderError).toBeUndefined();
    expect(consoleError).not.toHaveBeenCalled();

    // Native control should not have name="nodeName": <input name="nodeName"> hijacks
    // form.nodeName accessor (root cause of issue #8214)
    expect(wrapper.find('input[name="nodeName"]').exists()).toBe(false);

    // Probe result: ElTreeSelect received keys must not include nodeName key with object value
    expect(capturedTreeSelectKeys).toContain('name');
    expect(capturedTreeSelectNodeName).toBeUndefined();
  });

  it('does not leak a nodeName keyed object into TreeSelect props when field is named nodeName', async () => {
    // Inverse scenario: TreeSelect field itself is nodeName (strictest case)
    // Environment prerequisite: happy-dom <form> must support inherent nodeName property,
    // otherwise conflictsWithFormProperty check misjudges (returns undefined -> name not stripped)
    expect(Reflect.get(document.createElement('form'), 'nodeName')).toBe(
      'FORM',
    );
    const [Form] = useVbenForm({
      schema: [
        {
          component: ProbeTreeSelect,
          componentProps: { data: [] },
          fieldName: 'nodeName',
        },
      ],
    });

    let renderError: unknown;
    const wrapper = mount(Form, {
      global: {
        config: {
          errorHandler: (error) => {
            renderError = error;
          },
        },
      },
    });
    wrappers.push(wrapper);
    await flushPromises();
    await nextTick();

    expect(renderError).toBeUndefined();
    // Conflicting field (nodeName) control must not receive name, otherwise <input name="nodeName">
    // hijacks form.nodeName accessor (issue #8214)
    expect(capturedTreeSelectKeys).not.toContain('name');
    expect(capturedTreeSelectNodeName).toBeUndefined();
  });

  it('keeps model binding when modelPropName resolves to name and its value collides', async () => {
    // coderabbit review boundary: when modelPropName is 'name', binds.name carries model data
    // (v-model semantics), and must not be stripped even if value matches <form> inherent property;
    // native attribute path is still blocked by conflictsWithFormProperty.
    const [Form] = useVbenForm({
      schema: [
        {
          component: ProbeTreeSelect,
          componentProps: { data: [] },
          defaultValue: 'nodeName',
          fieldName: 'nodeName',
          modelPropName: 'name',
        },
      ],
    });

    const wrapper = mount(Form);
    wrappers.push(wrapper);
    await flushPromises();
    await nextTick();

    // Model binding survives: name key exists and carries form data (not hijacked by child attr path)
    expect(capturedTreeSelectKeys).toContain('name');
    expect(capturedTreeSelectNameValue).toBe('nodeName');
  });

  it('preserves componentProps.name when the component declares name as a semantic prop', async () => {
    // coderabbit review boundary: for component declaring name semantic prop, componentProps.name
    // is component prop rather than native fallthrough attribute, must not be stripped on conflict
    const [Form] = useVbenForm({
      schema: [
        {
          component: DeclaredNameComponent,
          componentProps: { name: 'nodeName' },
          fieldName: 'nodeName',
        },
      ],
    });

    const wrapper = mount(Form);
    wrappers.push(wrapper);
    await flushPromises();
    await nextTick();

    // Semantic prop survives: component receives name explicitly configured by user
    expect(capturedDeclaredName).toBe('nodeName');
  });

  it('resolves string components through componentMap before the declared-prop check', async () => {
    // coderabbit review boundary: if component resolved from string name via componentMap declares
    // name semantic prop, it must likewise not be stripped (guard must inspect resolved FieldComponent)
    COMPONENT_MAP.NameDeclared = DeclaredNameComponent;
    const [Form] = useVbenForm({
      schema: [
        {
          component: 'NameDeclared',
          componentProps: { name: 'nodeName' },
          fieldName: 'nodeName',
        },
      ],
    });

    const wrapper = mount(Form);
    wrappers.push(wrapper);
    await flushPromises();
    await nextTick();

    expect(capturedDeclaredName).toBe('nodeName');
  });
});
