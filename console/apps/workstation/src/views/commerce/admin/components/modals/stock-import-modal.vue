<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@operon-core/shadcn-ui';

import { $t } from '#/locales';

interface SerializedVariantOption {
  productName: string;
  variant: {
    id: string;
    sku: string;
    available_stock?: number;
  };
}

defineProps<{
  serializedVariants: SerializedVariantOption[];
  importingStock: boolean;
}>();
const emit = defineEmits<{
  (e: 'import'): void;
}>();
const open = defineModel<boolean>('open', { required: true });
const selectedVariantId = defineModel<string>('selectedVariantId', {
  required: true,
});
const batchCode = defineModel<string>('batchCode', { required: true });
const stockLinesRaw = defineModel<string>('stockLinesRaw', { required: true });
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold">
          {{ $t('page.commerce_view.bulk_stock_modal_title') }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground">
          {{ $t('page.commerce_view.bulk_stock_modal_desc') }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3 py-2">
        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.select_serialized_sku_label') }}
          </Label>
          <Select v-model="selectedVariantId">
            <SelectTrigger class="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="item in serializedVariants"
                :key="item.variant.id"
                :value="item.variant.id"
              >
                {{ item.productName }} — {{ item.variant.sku }} ({{
                  $t('page.commerce_view.stock_short', {
                    count: item.variant.available_stock,
                  })
                }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.batch_code_label') }}
          </Label>
          <Input v-model="batchCode" type="text" class="h-8" />
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.stock_lines_label') }}
          </Label>
          <Textarea
            v-model="stockLinesRaw"
            :rows="7"
            placeholder="1000881122|matkhau123|JBSWY3DPEHPK3PXP&#10;1000881123|matkhau456|KRSXG5CTMVRXEZLU"
            class="w-full rounded-lg border border-border bg-background p-3 text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" @click="open = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button size="sm" :disabled="importingStock" @click="emit('import')">
          {{ $t('page.commerce_view.submit_import_stock_btn') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
