import type { LayoutType } from '@operon-core/typings';

import type { VbenLayoutProps } from '../vben-layout';

import { computed } from 'vue';

export function useLayout(props: VbenLayoutProps) {
  const currentLayout = computed(() =>
    props.isMobile ? 'sidebar-nav' : (props.layout as LayoutType),
  );

  /**
   * Whether to display content in full screen, without sidebar, footer, header, and tabbar
   */
  const isFullContent = computed(() => currentLayout.value === 'full-content');

  /**
   * Whether sidebar mixed mode
   */
  const isSidebarMixedNav = computed(
    () => currentLayout.value === 'sidebar-mixed-nav',
  );

  /**
   * Whether header navigation mode
   */
  const isHeaderNav = computed(() => currentLayout.value === 'header-nav');

  /**
   * Whether mixed navigation mode
   */
  const isMixedNav = computed(
    () =>
      currentLayout.value === 'mixed-nav' ||
      currentLayout.value === 'header-sidebar-nav',
  );

  /**
   * Whether header mixed mode
   */
  const isHeaderMixedNav = computed(
    () => currentLayout.value === 'header-mixed-nav',
  );

  return {
    currentLayout,
    isFullContent,
    isHeaderMixedNav,
    isHeaderNav,
    isMixedNav,
    isSidebarMixedNav,
  };
}
