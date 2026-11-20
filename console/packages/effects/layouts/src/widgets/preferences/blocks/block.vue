<script setup lang="ts">
interface Props {
  title?: string;
}

defineOptions({
  name: 'PreferenceBlock',
});

withDefaults(defineProps<Props>(), {
  title: '',
});
</script>

<template>
  <section class="py-5 border-b border-border last:border-b-0">
    <h3 v-if="title" class="mb-4 text-sm font-semibold text-foreground">
      {{ title }}
    </h3>
    <slot></slot>
  </section>
</template>
