<script lang="ts" setup>
import type {
  CommerceProduct,
  CommerceProductType,
  CommerceProductVariant,
} from '#/api';

import { computed } from 'vue';

import { Badge, Button } from '@operon-core/shadcn-ui';

import { ShoppingBag } from '@lucide/vue';

import { isVariantInStock } from '#/api';
import { $t } from '#/locales';

interface Props {
  product: CommerceProduct;
  productTypeMap: Record<
    CommerceProductType,
    {
      label: string;
      variant: 'default' | 'destructive' | 'outline' | 'secondary';
    }
  >;
  selectedVariantId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  buy: [product: CommerceProduct];
  selectVariant: [productId: string, variantId: string];
}>();

const currentVariant = computed<CommerceProductVariant | undefined>(() => {
  if (props.selectedVariantId && props.product.variants) {
    const found = props.product.variants.find(
      (v) => v.id === props.selectedVariantId,
    );
    if (found) return found;
  }
  return props.product.variants?.[0];
});

function getProductTypeBadge(type: CommerceProductType) {
  return (
    props.productTypeMap[type] || {
      label: type,
      variant: 'outline' as const,
    }
  );
}
</script>

<template>
  <div
    class="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
  >
    <div class="space-y-3">
      <!-- Type & Visibility Row -->
      <div class="flex items-center justify-between gap-2">
        <Badge
          :variant="getProductTypeBadge(product.product_type).variant"
          class="text-2xs"
        >
          {{ getProductTypeBadge(product.product_type).label }}
        </Badge>
        <span v-if="currentVariant" class="text-muted-foreground">
          SKU: {{ currentVariant.sku }}
        </span>
      </div>

      <!-- Product Title & Description -->
      <div>
        <h3 class="text-base font-semibold text-foreground">
          {{ product.name }}
        </h3>
        <p class="mt-1 line-clamp-2 text-muted-foreground">
          {{
            product.short_description ||
            product.description ||
            $t('page.commerce_view.default_product_desc')
          }}
        </p>
      </div>

      <!-- Variant Selector Pills -->
      <div
        v-if="product.variants && product.variants.length > 0"
        class="space-y-1.5 pt-1"
      >
        <span
          class="font-semibold tracking-wider text-muted-foreground uppercase"
        >
          {{ $t('page.commerce_view.select_sku_label') }}
        </span>
        <div class="flex flex-wrap gap-1.5">
          <Button
            v-for="variant in product.variants"
            :key="variant.id"
            type="button"
            :variant="currentVariant?.id === variant.id ? 'default' : 'outline'"
            size="sm"
            class="h-auto px-2.5 py-1 text-left"
            @click="emit('selectVariant', product.id, variant.id)"
          >
            {{ variant.name }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Price, Stock & Buy CTA -->
    <div
      class="mt-5 flex items-end justify-between border-t border-border/50 pt-4"
    >
      <div class="space-y-0.5">
        <div class="flex items-baseline gap-1.5">
          <span class="text-xl font-bold text-foreground">
            {{ (currentVariant?.price_credits ?? 0).toLocaleString('en-US') }}
            Xu
          </span>
          <span
            v-if="
              currentVariant?.compare_at_credits &&
              (currentVariant?.compare_at_credits ?? 0) >
                (currentVariant?.price_credits ?? 0)
            "
            class="text-muted-foreground line-through"
          >
            {{ currentVariant?.compare_at_credits?.toLocaleString('en-US') }}
            Xu
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <span
            v-if="currentVariant?.stock_mode === 'unlimited'"
            class="text-success"
          >
            ● {{ $t('page.commerce_view.in_stock_unlimited') }}
          </span>
          <span
            v-else-if="(currentVariant?.available_stock ?? 0) > 0"
            class="text-success"
          >
            ●
            {{
              $t('page.commerce_view.stock_count', {
                count: currentVariant?.available_stock,
              })
            }}
          </span>
          <span v-else class="text-destructive">
            ● {{ $t('page.commerce_view.out_of_stock') }}
          </span>
        </div>
      </div>

      <Button
        size="sm"
        :disabled="!isVariantInStock(currentVariant)"
        class="gap-1.5"
        @click="emit('buy', product)"
      >
        <ShoppingBag class="size-3.5" />
        {{ $t('page.commerce_view.buy_now') }}
      </Button>
    </div>
  </div>
</template>
