<script lang="ts" setup>
import type { VbenFormSchema } from '@operon/common-ui';
import type { Recordable } from '@operon/types';

import { computed } from 'vue';

import { AuthenticationForgetPassword, z } from '@operon/common-ui';
import { $t } from '@operon/locales';

import { resetPassword } from '#/api/core/auth';
import { useAsyncAction } from '#/composables';

defineOptions({ name: 'ForgetPassword' });

const { executeAction, isLoading: loading } = useAsyncAction();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.emailTip'),
      },
      fieldName: 'email',
      label: $t('authentication.email'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.emailTip') })
        .email({ message: $t('authentication.emailValidErrorTip') }),
    },
  ];
});

async function handleSubmit(values: Recordable<any>) {
  await executeAction(() => resetPassword(values.email), {
    errorFallback: $t('authentication.resetLinkFailed'),
    success: $t('authentication.resetLinkSent'),
    tracking: { action: 'resetPassword', view: 'ForgetPassword' },
  });
}
</script>

<template>
  <AuthenticationForgetPassword
    :form-schema="formSchema"
    :loading="loading"
    @submit="handleSubmit"
  />
</template>
