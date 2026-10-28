<script lang="ts" setup>
import type { VbenFormSchema } from '@operon/common-ui';
import type { Recordable } from '@operon/types';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@operon/common-ui';
import { SvgGithubIcon } from '@operon/icons';
import { $t } from '@operon/locales';

import { Button } from '@operon-core/shadcn-ui';

import { loginWithGitHub } from '#/api/core/auth';
import { useAuthStore } from '#/store';
import { loadTurnstile, TURNSTILE_SITE_KEY } from '#/utils/turnstile';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const turnstileContainerRef = ref<HTMLDivElement | null>(null);
const turnstileToken = ref<string>('');
let widgetId: null | string = null;

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        autocomplete: 'username',
        placeholder: $t('authentication.emailTip'),
      },
      fieldName: 'username',
      label: $t('authentication.email'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.emailTip') })
        .email({ message: $t('authentication.emailValidErrorTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        autocomplete: 'current-password',
        placeholder: $t('authentication.passwordTip'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
});

async function initTurnstile() {
  try {
    await loadTurnstile();
    if (window.turnstile && turnstileContainerRef.value && !widgetId) {
      widgetId = window.turnstile.render(turnstileContainerRef.value, {
        sitekey: TURNSTILE_SITE_KEY,
        mode: 'invisible',
        callback: (token: string) => {
          turnstileToken.value = token;
        },
        'expired-callback': () => {
          turnstileToken.value = '';
          if (widgetId && window.turnstile) {
            window.turnstile.reset(widgetId);
          }
        },
        'error-callback': () => {
          turnstileToken.value = '';
        },
      });
    }
  } catch {
    // Non-blocking in case script is blocked
  }
}

async function handleLogin(values: Recordable<any>) {
  try {
    await authStore.authLogin({
      ...values,
      captchaToken: turnstileToken.value,
    });
  } catch (error) {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
    throw error;
  }
}

onMounted(() => {
  initTurnstile();
});

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) {
    try {
      window.turnstile.remove(widgetId);
    } catch {}
  }
});

function handleGitHubLogin() {
  loginWithGitHub();
}
</script>

<template>
  <div>
    <div
      ref="turnstileContainerRef"
      style="
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
        pointer-events: none;
        opacity: 0;
      "
    ></div>
    <AuthenticationLogin
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      :show-code-login="false"
      :show-forget-password="true"
      :show-qrcode-login="false"
      :show-register="false"
      :show-third-party-login="true"
      @submit="handleLogin"
    >
      <template #third-party-login>
        <div class="mt-4 w-full">
          <div class="relative my-3 flex items-center justify-between">
            <span class="w-[28%] border-b border-input"></span>
            <span class="text-center text-muted-foreground">
              {{ $t('authentication.orLoginWith') }}
            </span>
            <span class="w-[28%] border-b border-input"></span>
          </div>
          <Button
            variant="outline"
            class="w-full h-10 flex items-center justify-center gap-2"
            @click="handleGitHubLogin"
          >
            <SvgGithubIcon class="size-5" />
            <span>{{ $t('authentication.continueWithGithub') }}</span>
          </Button>
        </div>
      </template>
    </AuthenticationLogin>
  </div>
</template>
