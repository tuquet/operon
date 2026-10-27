<script setup lang="ts">
import type { Recordable } from '@operon/types';

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
  /**
   * Whether to show back button
   */
  showBack?: boolean;
}

defineOptions({
  name: 'AuthenticationCodeLogin',
});

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showBack: true,
  loginPath: '/auth/login',
  submitButtonText: '',
  subTitle: '',
  title: '',
});

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const router = useRouter();

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
        {{ title || $t('authentication.welcomeBack') }} 📲
      </slot>
      <template #desc>
        <span class="text-muted-foreground">
          <slot name="subTitle">
            {{ subTitle || $t('authentication.codeSubtitle') }}
          </slot>
        </span>
      </template>
    </Title>
    <Form />
    <VbenButton
      :class="{
        'cursor-wait': loading,
      }"
      :loading="loading"
      class="w-full"
      @click="handleSubmit"
    >
      <slot name="submitButtonText">
        {{ submitButtonText || $t('common.login') }}
      </slot>
    </VbenButton>
    <VbenButton
      v-if="showBack"
      class="mt-4 w-full"
      variant="outline"
      @click="goToLogin()"
    >
      {{ $t('common.back') }}
    </VbenButton>
  </div>
</template>
