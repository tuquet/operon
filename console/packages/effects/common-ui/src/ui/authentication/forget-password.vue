<script setup lang="ts">
import type { VbenFormSchema } from '@operon-core/form-ui';

import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@operon/locales';

import { useVbenForm } from '@operon-core/form-ui';
import { VbenButton } from '@operon-core/shadcn-ui';

import Title from './auth-title.vue';

interface Props {
  formSchema: VbenFormSchema[];
  /**
   * Whether in loading state
   */
  loading?: boolean;
  /**
   * Login path
   */
  loginPath?: string;
  /**
   * Title
   */
  title?: string;
  /**
   * Description
   */
  subTitle?: string;
  /**
   * Button text
   */
  submitButtonText?: string;
}

defineOptions({
  name: 'ForgetPassword',
});

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loginPath: '/auth/login',
  submitButtonText: '',
  subTitle: '',
  title: '',
});

const emit = defineEmits<{
  submit: [Record<string, any>];
}>();

const [Form, formApi] = useVbenForm(
  reactive({
    commonConfig: {
      hideLabel: true,
      hideRequiredMark: true,
    },
    schema: computed(() => props.formSchema),
    showDefaultActions: false,
  }),
);

const router = useRouter();

async function handleSubmit() {
  const { valid } = await formApi.validate();
  const values = await formApi.getValues();
  if (valid) {
    emit('submit', values);
  }
}

function goToLogin() {
  router.push(props.loginPath);
}

defineExpose({
  getFormApi: () => formApi,
});
</script>

<template>
  <div>
    <Title>
      <slot name="title">
        {{ title || $t('authentication.forgetPassword') }} 🤦🏻‍♂️
      </slot>
      <template #desc>
        <slot name="subTitle">
          {{ subTitle || $t('authentication.forgetPasswordSubtitle') }}
        </slot>
      </template>
    </Title>
    <Form />

    <div>
      <VbenButton
        :class="{
          'cursor-wait': loading,
        }"
        aria-label="submit"
        class="mt-2 w-full"
        @click="handleSubmit"
      >
        <slot name="submitButtonText">
          {{ submitButtonText || $t('authentication.sendResetLink') }}
        </slot>
      </VbenButton>
      <VbenButton class="mt-4 w-full" variant="outline" @click="goToLogin()">
        {{ $t('common.back') }}
      </VbenButton>
    </div>
  </div>
</template>
