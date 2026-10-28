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
} from '@operon-core/shadcn-ui';

import { $t } from '#/locales';

interface ProductFormState {
  name: string;
  slug: string;
  short_description: string;
  product_type: 'digital_file' | 'resource' | 'serial_stock' | 'wallet_credit';
  visibility: 'hidden' | 'public' | 'tenant_only';
  sku: string;
  price_credits: number;
  stock_mode: 'finite_counter' | 'serialized' | 'unlimited';
}

const props = defineProps<{
  productForm: ProductFormState;
  savingProduct: boolean;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
}>();

const open = defineModel<boolean>('open', { required: true });

// Form state alias to satisfy eslint vue/no-mutating-props
const form = props.productForm;
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="text-base font-semibold">
          {{ $t('page.commerce_view.upsert_product_modal_title') }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground">
          {{ $t('page.commerce_view.upsert_product_modal_desc') }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
        <div class="space-y-1 sm:col-span-2">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.product_name_label') }}
          </Label>
          <Input
            v-model="form.name"
            type="text"
            :placeholder="$t('page.commerce_view.product_name_placeholder')"
            class="h-8"
          />
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.product_slug_label') }}
          </Label>
          <Input
            v-model="form.slug"
            type="text"
            placeholder="via-co-2fa"
            class="h-8"
          />
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.product_type_label') }}
          </Label>
          <Select v-model="form.product_type">
            <SelectTrigger class="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serial_stock">
                {{ $t('page.commerce_view.opt_serial_stock') }}
              </SelectItem>
              <SelectItem value="resource">
                {{ $t('page.commerce_view.opt_resource') }}
              </SelectItem>
              <SelectItem value="digital_file">
                {{ $t('page.commerce_view.opt_digital_file') }}
              </SelectItem>
              <SelectItem value="wallet_credit">
                {{ $t('page.commerce_view.opt_wallet_credit') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.visibility_mode_label') }}
          </Label>
          <Select v-model="form.visibility">
            <SelectTrigger class="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                {{ $t('page.commerce_view.opt_vis_public') }}
              </SelectItem>
              <SelectItem value="tenant_only">
                {{ $t('page.commerce_view.opt_vis_tenant_only') }}
              </SelectItem>
              <SelectItem value="hidden">
                {{ $t('page.commerce_view.opt_vis_hidden') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.stock_mode_label') }}
          </Label>
          <Select v-model="form.stock_mode">
            <SelectTrigger class="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serialized">
                {{ $t('page.commerce_view.opt_stock_serialized') }}
              </SelectItem>
              <SelectItem value="unlimited">
                {{ $t('page.commerce_view.opt_stock_unlimited') }}
              </SelectItem>
              <SelectItem value="finite_counter">
                {{ $t('page.commerce_view.opt_stock_finite') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.sku_code_label') }}
          </Label>
          <Input
            v-model="form.sku"
            type="text"
            placeholder="VIA-2FA-01"
            class="h-8"
          />
        </div>

        <div class="space-y-1">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.unit_price_xu_label') }}
          </Label>
          <Input
            v-model.number="form.price_credits"
            type="number"
            min="0"
            class="h-8"
          />
        </div>

        <div class="space-y-1 sm:col-span-2">
          <Label class="text-foreground">
            {{ $t('page.commerce_view.short_desc_label') }}
          </Label>
          <Input
            v-model="form.short_description"
            type="text"
            :placeholder="$t('page.commerce_view.short_desc_placeholder')"
            class="h-8"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" @click="open = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button size="sm" :disabled="savingProduct" @click="emit('save')">
          {{ $t('common.save') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
