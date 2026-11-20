import { mount } from '@vue/test-utils';

import { describe, expect, it } from 'vitest';

import { Page } from '..';

describe('page.vue', () => {
  it('renders title when passed', () => {
    const wrapper = mount(Page, {
      props: {
        title: 'Test Title',
      },
    });

    expect(wrapper.text()).toContain('Test Title');
  });

  it('does not add spacing below the title when description is omitted', () => {
    const wrapper = mount(Page, {
      props: {
        title: 'Test Title',
      },
    });

    expect(wrapper.find('.text-lg').classes()).not.toContain('mb-2');
  });

  it('renders description when passed', () => {
    const wrapper = mount(Page, {
      props: {
        description: 'Test Description',
        title: 'Test Title',
      },
    });

    expect(wrapper.text()).toContain('Test Description');
    expect(wrapper.find('.text-lg').classes()).toContain('mb-2');
  });

  it('renders default slot content', () => {
    const wrapper = mount(Page, {
      slots: {
        default: '<p>Default Slot Content</p>',
      },
    });

    expect(wrapper.html()).toContain('<p>Default Slot Content</p>');
  });

  it('renders footer slot when showFooter is true', () => {
    const wrapper = mount(Page, {
      props: {
        showFooter: true,
      },
      slots: {
        footer: '<p>Footer Slot Content</p>',
      },
    });

    expect(wrapper.html()).toContain('<p>Footer Slot Content</p>');
  });

  it('applies the custom contentClass', () => {
    const wrapper = mount(Page, {
      props: {
        contentClass: 'custom-class',
      },
    });

    const contentDiv = wrapper.find('.p-4');
    expect(contentDiv.classes()).toContain('custom-class');
  });

  it('uses flex layout for automatic content height', () => {
    const wrapper = mount(Page, {
      props: {
        autoContentHeight: true,
        heightOffset: 12,
        title: 'Auto height page',
      },
    });

    const content = wrapper.find('[data-layout-region="page-content"]');
    const header = wrapper.find('.border-b');

    expect(wrapper.classes()).toContain('min-h-0');
    expect(wrapper.classes()).toContain('overflow-hidden');
    expect(header.classes()).toContain('shrink-0');
    expect(content.exists()).toBe(true);
    expect(content.classes()).toContain('min-h-0');
    expect(content.classes()).toContain('flex-1');
    expect(content.classes()).toContain('overflow-y-auto');
    expect(content.attributes('style')).toContain(
      '--page-content-height-offset: 12px',
    );
    expect(content.attributes('style')).not.toContain('--vben-content-height');
  });

  it('positions the footer according to footerFixed', async () => {
    const wrapper = mount(Page, {
      slots: {
        footer: '<p>Footer</p>',
      },
    });

    const footer = wrapper.find('.bg-card');
    expect(footer.classes()).toContain('shrink-0');
    expect(footer.classes()).not.toContain('absolute');

    await wrapper.setProps({ footerFixed: true });

    expect(footer.classes()).toContain('mt-auto');
    expect(footer.classes()).toContain('shrink-0');
    expect(footer.classes()).not.toContain('absolute');
  });

  it('does not render title slot if title prop is provided', () => {
    const wrapper = mount(Page, {
      props: {
        title: 'Test Title',
      },
      slots: {
        title: '<p>Title Slot Content</p>',
      },
    });

    expect(wrapper.text()).toContain('Title Slot Content');
    expect(wrapper.html()).not.toContain('Test Title');
  });

  it('does not render description slot if description prop is provided', () => {
    const wrapper = mount(Page, {
      props: {
        description: 'Test Description',
      },
      slots: {
        description: '<p>Description Slot Content</p>',
      },
    });

    expect(wrapper.text()).toContain('Description Slot Content');
    expect(wrapper.html()).not.toContain('Test Description');
  });

  it('renders custom #loading slot when loading is true and switches to default slot when false', async () => {
    const wrapper = mount(Page, {
      props: {
        loading: true,
        title: 'Status Page',
      },
      slots: {
        default: '<p>Ready Content</p>',
        loading: '<p>Skeleton Loading</p>',
      },
    });

    expect(wrapper.text()).toContain('Status Page');
    expect(wrapper.find('[data-layout-region="page-loading"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain('Skeleton Loading');
    expect(wrapper.text()).not.toContain('Ready Content');

    await wrapper.setProps({ loading: false });

    expect(wrapper.find('[data-layout-region="page-loading"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).toContain('Ready Content');
  });

  it('renders built-in spinner overlay when loading is true without #loading slot', () => {
    const wrapper = mount(Page, {
      props: {
        loading: true,
        loadingText: 'Checking local services...',
      },
      slots: {
        default: '<p>Main Content</p>',
      },
    });

    expect(wrapper.text()).toContain('Main Content');
    expect(wrapper.text()).toContain('Checking local services...');
  });
});
