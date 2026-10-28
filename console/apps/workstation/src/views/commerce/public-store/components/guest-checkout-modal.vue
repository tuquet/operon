<script setup lang="ts">
import type {
  CommerceOrder,
  CommerceProduct,
  CommerceProductVariant,
  PaymentGateway,
  PaymentIntent,
} from '#/api';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@operon-core/shadcn-ui';

import {
  CheckCircle2,
  Copy,
  CreditCard,
  ShoppingBag,
  Sparkles,
} from '@lucide/vue';

import { $t } from '#/locales';

defineProps<{
  activeProduct: CommerceProduct | null;
  activeVariant: CommerceProductVariant | null;
  publicGateways: PaymentGateway[];
  currentGateway: null | PaymentGateway;
  estimatedFiatAmount: number;
  totalCheckoutCredits: number;
  submittingOrder: boolean;
  createdIntent: null | PaymentIntent;
  createdOrder: CommerceOrder | null;
  createdClaimToken: string;
  checkingPayment: boolean;
  copyText: (text: string, label: string) => void;
  stopPolling: () => void;
  checkStatus: (orderCode: string, claimToken: string, silent: boolean) => void;
}>();
const emit = defineEmits<{
  (e: 'createOrder'): void;
}>();
const open = defineModel<boolean>('open', { required: true });
const checkoutQty = defineModel<number>('checkoutQty', { required: true });
const buyerEmail = defineModel<string>('buyerEmail', { required: true });
const selectedGatewayId = defineModel<string>('selectedGatewayId', {
  required: true,
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-base font-semibold">
          <ShoppingBag class="size-4 text-primary" />
          {{
            createdIntent
              ? $t('page.commerce_view.pay_order_title', {
                  code: createdOrder?.order_code || '',
                })
              : $t('page.commerce_view.quick_buy_title', {
                  name: activeProduct?.name || '',
                })
          }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground">
          {{
            createdIntent
              ? $t('page.commerce_view.guest_pay_order_desc')
              : $t('page.commerce_view.guest_configure_order_desc')
          }}
        </DialogDescription>
      </DialogHeader>

      <!-- Step 1: Configure Order -->
      <div v-if="!createdIntent && activeVariant" class="space-y-4 py-2">
        <div
          class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3"
        >
          <div>
            <p class="font-semibold text-foreground">
              {{ activeVariant.name }}
            </p>
            <p class="text-muted-foreground">SKU: {{ activeVariant.sku }}</p>
          </div>
          <p class="text-base font-bold text-primary">
            {{ activeVariant.price_credits.toLocaleString('en-US') }} Xu
          </p>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.quantity_label') }}
            </Label>
            <Input
              v-model.number="checkoutQty"
              type="number"
              :min="activeVariant.min_qty || 1"
              :max="activeVariant.max_qty || 100"
              class="h-8 w-full px-2.5"
            />
          </div>

          <div class="space-y-1">
            <Label class="text-foreground">
              {{ $t('page.commerce_view.buyer_email_optional_label') }}
            </Label>
            <Input
              v-model="buyerEmail"
              type="email"
              placeholder="guest@example.com"
              class="h-8 w-full px-2.5"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label
            class="font-semibold tracking-wider text-muted-foreground uppercase"
          >
            {{ $t('page.commerce_view.select_payment_channel_label') }}
          </Label>
          <Button
            v-for="gw in publicGateways"
            :key="gw.id"
            type="button"
            variant="outline"
            class="flex h-auto w-full items-center justify-between rounded-lg p-3 text-left transition-colors"
            :class="
              currentGateway?.id === gw.id
                ? 'border-primary bg-primary/10'
                : 'border-border/60 bg-card hover:border-primary/40'
            "
            @click="selectedGatewayId = gw.id"
          >
            <div class="flex items-center gap-2.5">
              <CreditCard class="size-4 text-primary" />
              <div>
                <p class="font-semibold text-foreground">
                  {{ gw.name }}
                </p>
                <p class="text-muted-foreground">
                  1 Xu = {{ gw.rate_per_credit.toLocaleString('en-US') }}
                  {{ gw.currency }}
                </p>
              </div>
            </div>
            <Badge variant="outline" class="text-2xs">
              {{ gw.currency }}
            </Badge>
          </Button>
        </div>

        <div
          class="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
        >
          <span class="text-muted-foreground">
            {{ $t('page.commerce_view.total_payment') }}
          </span>
          <div class="text-right">
            <p class="text-lg font-bold text-foreground">
              {{ estimatedFiatAmount.toLocaleString('en-US') }}
              {{ currentGateway?.currency || 'VND' }}
            </p>
            <p class="text-muted-foreground">
              ({{ totalCheckoutCredits.toLocaleString('en-US') }} Xu)
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" @click="open = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button
            size="sm"
            :disabled="submittingOrder || publicGateways.length === 0"
            class="gap-1.5"
            @click="emit('createOrder')"
          >
            <Sparkles class="size-3.5" />
            {{ $t('page.commerce_view.create_order_get_qr_btn') }}
          </Button>
        </div>
      </div>

      <!-- Step 2: Claim Token Banner + QR Code + Auto-Polling -->
      <div v-else-if="createdIntent && createdOrder" class="space-y-4 py-2">
        <div
          class="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-1.5"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-foreground">
              {{ $t('page.commerce_view.claim_token_auto_saved_label') }}
            </span>
            <Button
              size="sm"
              variant="outline"
              class="h-6 gap-1 px-2"
              @click="
                copyText(
                  createdClaimToken,
                  $t('page.commerce_view.claim_token_copy_label'),
                )
              "
            >
              <Copy class="size-3" />
              {{ $t('common.copy') }}
            </Button>
          </div>
          <Badge variant="outline" class="w-full justify-start truncate">
            {{ createdClaimToken }}
          </Badge>
        </div>

        <div
          v-if="createdIntent.checkout_payload?.qr_image_url"
          class="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white p-4"
        >
          <img
            :src="createdIntent.checkout_payload.qr_image_url"
            :alt="$t('page.commerce_view.payment_qr_alt')"
            class="h-52 w-52 object-contain"
          />
          <span class="mt-2 text-muted-foreground">
            {{ $t('page.commerce_view.scan_qr_exact_amount_hint') }}
          </span>
        </div>

        <div
          class="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3.5"
        >
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">
              {{ $t('page.commerce_view.transfer_amount_label') }}
            </span>
            <span class="font-bold text-foreground">
              {{ createdIntent.pay_amount.toLocaleString('en-US') }}
              {{ createdIntent.pay_currency }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">
              {{ $t('page.commerce_view.transfer_memo_label') }}
            </span>
            <div class="flex items-center gap-1.5">
              <Badge variant="secondary">
                {{ createdIntent.transfer_code }}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                class="h-6 px-2"
                @click="
                  copyText(
                    createdIntent.transfer_code,
                    $t('page.commerce_view.transfer_code_label'),
                  )
                "
              >
                <Copy class="size-3" />
              </Button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">
              {{ $t('page.commerce_view.order_status_short_label') }}
            </span>
            <Badge variant="secondary" class="text-2xs">
              {{ createdOrder.status }} ({{
                $t('page.commerce_view.auto_check_3s')
              }})
            </Badge>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            @click="
              () => {
                stopPolling();
                open = false;
              }
            "
          >
            {{ $t('common.close') }}
          </Button>
          <Button
            size="sm"
            class="gap-1.5"
            :disabled="checkingPayment"
            @click="
              () =>
                createdOrder &&
                checkStatus(createdOrder.order_code, createdClaimToken, false)
            "
          >
            <CheckCircle2 class="size-3.5" />
            {{ $t('page.commerce_view.check_and_claim_now_btn') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
