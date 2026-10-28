<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@operon/locales';

import { Button, Input, Label, toast } from '@operon-core/shadcn-ui';

import { updatePassword } from '#/api/core/auth';
import { captureError } from '#/utils/bugsink';

defineOptions({ name: 'ResetPassword' });

const router = useRouter();
const loading = ref(false);
const recoveryToken = ref('');
const password = ref('');
const confirmPassword = ref('');

onMounted(() => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    recoveryToken.value = params.get('access_token') || '';
  }
});

async function handleSubmit() {
  if (!password.value) {
    toast.warning($t('authentication.newPasswordRequired'));
    return;
  }
  if (password.value.length < 6) {
    toast.warning($t('authentication.passwordMinLength'));
    return;
  }
  if (password.value !== confirmPassword.value) {
    toast.warning($t('authentication.confirmPasswordTip'));
    return;
  }

  try {
    loading.value = true;
    await updatePassword(password.value, recoveryToken.value);
    toast.success($t('authentication.passwordResetSuccess'));
    router.push('/auth/login');
  } catch (error: any) {
    captureError(error, { view: 'ResetPassword' });
    toast.error(error.message || $t('authentication.passwordResetFailed'));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-sm p-4">
    <div class="mb-6 text-center">
      <h2 class="text-xl font-bold">
        {{ $t('authentication.resetPasswordTitle') }}
      </h2>
      <p class="text-muted-foreground mt-1">
        {{ $t('authentication.resetPasswordSubtitle') }}
      </p>
    </div>

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label class="leading-none">
          {{ $t('authentication.newPassword') }}
          <span class="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          v-model="password"
          type="password"
          autocomplete="new-password"
          :placeholder="$t('authentication.newPasswordPlaceholder')"
          class="h-10"
        />
      </div>

      <div class="space-y-2">
        <Label class="leading-none">
          {{ $t('authentication.confirmPassword') }}
          <span class="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          :placeholder="$t('authentication.reenterNewPassword')"
          class="h-10"
        />
      </div>

      <Button type="submit" :disabled="loading" class="w-full h-10 mt-2">
        {{
          loading
            ? $t('authentication.updatingPassword')
            : $t('authentication.saveNewPassword')
        }}
      </Button>

      <Button
        variant="link"
        type="button"
        class="w-full mt-2"
        @click="router.push('/auth/login')"
      >
        {{ $t('authentication.backToLogin') }}
      </Button>
    </form>
  </div>
</template>
