<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '../card';

defineProps<{
  data: {
    color: string;
    name: string;
    value: any;
  }[];
  title?: string;
}>();
</script>

<template>
  <Card class="border-border/60 bg-popover/95 shadow-md backdrop-blur-xs">
    <CardHeader v-if="title" class="border-border/40 border-b p-2.5">
      <CardTitle class="text-muted-foreground">
        {{ title }}
      </CardTitle>
    </CardHeader>
    <CardContent class="flex min-w-[160px] flex-col gap-1.5 p-2.5">
      <div
        v-for="(item, key) in data"
        :key="key"
        class="flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-1.5">
          <span
            class="size-2 shrink-0 rounded-full"
            :style="{ backgroundColor: item.color }"
          ></span>
          <span class="text-muted-foreground">{{ item.name }}</span>
        </div>
        <span class="font-semibold text-foreground">{{ item.value }}</span>
      </div>
    </CardContent>
  </Card>
</template>
