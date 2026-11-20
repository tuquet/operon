<script lang="ts" setup>
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router';

import { unref } from 'vue';
import { RouterView } from 'vue-router';

import { usePreferences } from '@operon/preferences';
import { getTabKey, storeToRefs, useTabbarStore } from '@operon/stores';

import { transformComponent, useLayoutHook } from '../../hooks';
import { IFrameRouterView } from '../../iframe';
import { RouteCachedPage, RouteCachedView } from '../../route-cached';

defineOptions({ name: 'LayoutContent' });

const tabbarStore = useTabbarStore();
const { keepAlive } = usePreferences();

const { getCachedTabs, getExcludeCachedTabs, renderRouteView } =
  storeToRefs(tabbarStore);

const { getEnabledTransition, getTransitionName } = useLayoutHook();

/**
 * Whether to display component
 * @param route
 */
const showComponent = (route: RouteLocationNormalizedLoadedGeneric) => {
  return !route.meta.domCached && unref(renderRouteView);
};
</script>

<template>
  <div class="page-route-container relative h-full">
    <IFrameRouterView />
    <RouteCachedView />
    <RouterView v-slot="{ Component, route }">
      <RouteCachedPage
        :component="Component"
        :route="route"
        v-if="route.meta.domCached"
      />
      <Transition
        v-if="getEnabledTransition"
        :name="getTransitionName(route)"
        :css="Boolean(getTransitionName(route))"
        appear
        :leave-active-class="
          getTransitionName(route)
            ? `${getTransitionName(route)}-leave-active page-route-leave-active`
            : undefined
        "
      >
        <KeepAlive
          v-if="keepAlive"
          :exclude="getExcludeCachedTabs"
          :include="getCachedTabs"
        >
          <component
            :is="transformComponent(Component, route)"
            v-if="showComponent(route)"
            v-show="!route.meta.iframeSrc"
            :key="getTabKey(route)"
          />
        </KeepAlive>
        <component
          :is="Component"
          v-else-if="showComponent(route)"
          :key="getTabKey(route)"
        />
      </Transition>
      <template v-else>
        <KeepAlive
          v-if="keepAlive"
          :exclude="getExcludeCachedTabs"
          :include="getCachedTabs"
        >
          <component
            :is="transformComponent(Component, route)"
            v-if="showComponent(route)"
            v-show="!route.meta.iframeSrc"
            :key="getTabKey(route)"
          />
        </KeepAlive>
        <component
          :is="Component"
          v-else-if="showComponent(route)"
          :key="getTabKey(route)"
        />
      </template>
    </RouterView>
  </div>
</template>

<style>
/* Optimize router animation transition overlap */
.page-route-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

/* Remove horizontal scrollbar during animation transition translateX(-30px) */
.page-route-container:has(> .fade-slide-enter-active),
.page-route-container:has(> .fade-slide-leave-active) {
  overflow-x: hidden;
}

/* Remove vertical scrollbar during animation transition */
.page-route-container:has(> .fade-up-enter-active),
.page-route-container:has(> .fade-up-leave-active),
.page-route-container:has(> .fade-down-enter-active),
.page-route-container:has(> .fade-down-leave-active) {
  overflow-y: hidden;
}
</style>
