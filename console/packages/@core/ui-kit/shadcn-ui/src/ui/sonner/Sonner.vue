<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner';

import { Toaster as Sonner } from 'vue-sonner';
import 'vue-sonner/style.css';

const props = defineProps<ToasterProps>();
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="props"
    :toast-options="{
      classes: {
        toast:
          'group toast !bg-card !text-card-foreground !border-border !border !shadow-xl',
        description: '!text-muted-foreground',
        actionButton: '!bg-primary !text-primary-foreground',
        cancelButton: '!bg-muted !text-muted-foreground',
      },
    }"
    :style="{
      '--normal-bg': 'hsl(var(--card))',
      '--normal-border': 'hsl(var(--border))',
      '--normal-text': 'hsl(var(--card-foreground))',
      '--success-bg': 'hsl(var(--card))',
      '--success-border': 'hsl(var(--border))',
      '--success-text': 'hsl(var(--card-foreground))',
      '--error-bg': 'hsl(var(--card))',
      '--error-border': 'hsl(var(--border))',
      '--error-text': 'hsl(var(--card-foreground))',
      '--info-bg': 'hsl(var(--card))',
      '--info-border': 'hsl(var(--border))',
      '--info-text': 'hsl(var(--card-foreground))',
      '--warning-bg': 'hsl(var(--card))',
      '--warning-border': 'hsl(var(--border))',
      '--warning-text': 'hsl(var(--card-foreground))',
    }"
  />
</template>

<style>
/* Enforce solid opaque background, crisp border and shadow on all Sonner toasts */
[data-sonner-toaster] [data-sonner-toast] {
  color: hsl(var(--card-foreground)) !important;
  background-color: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  box-shadow:
    0 10px 25px -5px rgb(0 0 0 / 25%),
    0 8px 10px -6px rgb(0 0 0 / 20%) !important;
  opacity: 1 !important;
}

[data-sonner-toaster]
  [data-sonner-toast][data-rich-colors='true'][data-type='success'] {
  color: hsl(var(--card-foreground)) !important;
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--border)) !important;
}

[data-sonner-toaster]
  [data-sonner-toast][data-rich-colors='true'][data-type='error'] {
  color: hsl(var(--card-foreground)) !important;
  background-color: hsl(var(--card)) !important;
  border-color: hsl(var(--destructive)) !important;
}
</style>
