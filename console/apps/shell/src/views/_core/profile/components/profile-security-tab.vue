<script setup lang="ts">
import { ref } from 'vue';

import { $t } from '@operon/locales';

import {
  Badge,
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Separator,
  toast,
} from '@operon-core/shadcn-ui';

import { CheckCircle2, KeyRound, Lock, ShieldCheck } from '@lucide/vue';

import { updateUserPassword } from '#/api';
import { useAsyncAction } from '#/composables';
import { validateNewPassword } from '#/utils/security';

defineOptions({ name: 'ProfileSecurityTab' });

const newPassword = ref('');
const confirmPassword = ref('');
const { executeAction, isLoading: savingPassword } = useAsyncAction();

async function handleSavePassword() {
  const errorKey = validateNewPassword(
    newPassword.value,
    confirmPassword.value,
  );
  if (errorKey) {
    toast.warning($t(errorKey));
    return;
  }

  await executeAction(
    async () => {
      await updateUserPassword(newPassword.value);
      newPassword.value = '';
      confirmPassword.value = '';
    },
    {
      errorFallback: $t('profile.changePasswordError', { error: '' }),
      success: $t('profile.changePasswordSuccess'),
      tracking: { action: 'handleSavePassword', view: 'Profile' },
    },
  );
}
</script>

<template>
  <div class="max-w-2xl flex flex-col gap-6 pt-1">
    <div>
      <h3 class="text-base font-semibold text-foreground">
        {{ $t('profile.changePasswordTitle') }}
      </h3>
      <p class="text-muted-foreground">
        {{ $t('profile.changePasswordDesc') }}
      </p>
    </div>

    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <Label for="profile-new-password">{{
          $t('authentication.newPassword')
        }}</Label>
        <InputGroup class="h-10 w-full">
          <InputGroupAddon>
            <Lock class="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            id="profile-new-password"
            v-model="newPassword"
            type="password"
            :placeholder="$t('profile.min6CharsPlaceholder')"
          />
        </InputGroup>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="profile-confirm-password">{{
          $t('authentication.confirmPassword')
        }}</Label>
        <InputGroup class="h-10 w-full">
          <InputGroupAddon>
            <Lock class="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            id="profile-confirm-password"
            v-model="confirmPassword"
            type="password"
            :placeholder="$t('authentication.reenterNewPassword')"
          />
        </InputGroup>
      </div>

      <div>
        <Button
          class="flex items-center gap-2 h-10 mt-1"
          :disabled="savingPassword"
          @click="handleSavePassword"
        >
          <KeyRound class="size-4" />
          <span>{{
            savingPassword ? $t('profile.saving') : $t('profile.savePassword')
          }}</span>
        </Button>
      </div>
    </div>

    <!-- Security Overview Cards -->
    <Separator class="my-1" />
    <div class="flex flex-col gap-4">
      <h4 class="font-semibold text-foreground">
        {{ $t('profile.securityStatusTitle') }}
      </h4>

      <div
        class="rounded-lg border border-border/60 p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success"
          >
            <ShieldCheck class="size-5" />
          </div>
          <div>
            <div class="text-foreground">
              {{ $t('profile.mfaTitle') }}
            </div>
            <div class="text-muted-foreground">
              {{ $t('profile.mfaDesc') }}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          class="bg-muted text-muted-foreground border-border"
        >
          {{ $t('profile.mfaReady') }}
        </Badge>
      </div>

      <div
        class="rounded-lg border border-border/60 p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <CheckCircle2 class="size-5" />
          </div>
          <div>
            <div class="text-foreground">
              {{ $t('profile.sessionTitle') }}
            </div>
            <div class="text-muted-foreground">
              {{ $t('profile.sessionDesc') }}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          class="bg-success/10 text-success border-success/30"
        >
          {{ $t('common.active') }}
        </Badge>
      </div>
    </div>
  </div>
</template>
