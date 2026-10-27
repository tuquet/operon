<!-- Component used to retrieve cached routes and store them in Pinia -->
<script setup lang="ts">
import type { VNode } from 'vue';
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router';

import { watch } from 'vue';

import { useTabbarStore } from '@operon/stores';

interface Props {
  component?: VNode;
  route: RouteLocationNormalizedLoadedGeneric;
}

/**
 * Route cached component; renders no actual DOM content
 */
defineOptions({
  render() {
    return null;
  },
});
const props = defineProps<Props>();

const { addCachedRoute } = useTabbarStore();

watch(
  () => props.route,
  () => {
    if (props.component && props.route.meta.domCached) {
      addCachedRoute(props.component, props.route);
    }
  },
  { immediate: true },
);
</script>
