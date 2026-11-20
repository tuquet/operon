<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@operon/locales';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Spinner,
} from '@operon-core/shadcn-ui';

import { Copy, ExternalLink, Laptop } from '@lucide/vue';

import { useClipboard } from '#/composables';
import { useAuthStore } from '#/store';
import { captureError, captureMessage } from '#/utils/bugsink';

import {
  buildDesktopAuthCallbackUrl,
  launchProtocolViaIframe,
} from './desktop-protocol';

defineOptions({ name: 'AuthCallback' });

const router = useRouter();
const authStore = useAuthStore();
const { copyToClipboard, isCopied } = useClipboard();

const loading = ref(true);
const errorMessage = ref('');
const isDesktopBridge = ref(false);
const deepLinkUrl = ref('');
const cachedAccessToken = ref('');
const cachedRefreshToken = ref('');

function handleOpenDesktop() {
  if (deepLinkUrl.value) {
    window.location.href = deepLinkUrl.value;
  }
}

function handleCopyToken() {
  if (cachedAccessToken.value) {
    copyToClipboard(cachedAccessToken.value, 'token');
  }
}

async function handleContinueOnWeb() {
  if (!cachedAccessToken.value) return;

  loading.value = true;
  isDesktopBridge.value = false;

  try {
    await authStore.completeOAuthSession({
      accessToken: cachedAccessToken.value,
      refreshToken: cachedRefreshToken.value || undefined,
      targetRouter: router,
    });
  } catch (error: any) {
    captureError(error, {
      phase: 'continue_on_web',
      view: 'AuthCallback',
    });
    loading.value = false;
    errorMessage.value =
      error.message || $t('authentication.githubCallbackError');
  }
}

onMounted(async () => {
  if (typeof window === 'undefined') return;

  try {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const error =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      params.get('error_description');

    if (error) {
      captureError(new Error(error), {
        phase: 'oauth_error_param',
        view: 'AuthCallback',
      });
      loading.value = false;
      errorMessage.value = $t('authentication.githubLoginFailedWithReason', {
        error,
      });
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (type === 'recovery') {
      await router.push(`/auth/reset-password${window.location.hash}`);
      return;
    }

    if (accessToken) {
      cachedAccessToken.value = accessToken;
      if (refreshToken) {
        cachedRefreshToken.value = refreshToken;
      }

      // Check if initiated from desktop app (VS Code / Linear Web Bridge pattern)
      const isDesktopTarget = searchParams.get('target') === 'desktop';

      if (isDesktopTarget) {
        loading.value = false;
        isDesktopBridge.value = true;
        const targetDeepLink = buildDesktopAuthCallbackUrl({
          refreshToken: refreshToken || undefined,
          token: accessToken,
        });
        deepLinkUrl.value = targetDeepLink;

        // Automatically trigger protocol handler
        try {
          launchProtocolViaIframe(targetDeepLink);

          setTimeout(() => {
            window.location.href = targetDeepLink;
          }, 350);
        } catch {
          // Handled via manual button click if popup blocked
        }
        return;
      }

      // Standard Web SPA Authentication
      await authStore.completeOAuthSession({
        accessToken,
        redirect: searchParams.get('redirect') || params.get('redirect'),
        refreshToken,
        targetRouter: router,
      });
      return;
    }

    captureMessage('GitHub OAuth callback missing access_token', 'warning', {
      view: 'AuthCallback',
    });
    loading.value = false;
    errorMessage.value = $t('authentication.githubSessionMissing');
  } catch (error: any) {
    captureError(error, {
      phase: 'oauth_exchange',
      view: 'AuthCallback',
    });
    loading.value = false;
    errorMessage.value =
      error.message || $t('authentication.githubCallbackError');
  }
});
</script>

<template>
  <div
    class="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center"
  >
    <div v-if="loading" class="flex flex-col items-center gap-4">
      <Spinner class="mx-auto size-8 text-primary" />
      <p class="text-muted-foreground">
        {{ $t('authentication.githubVerifying') }}
      </p>
    </div>

    <!-- Desktop Web Bridge View (VS Code / Linear Style) -->
    <div v-else-if="isDesktopBridge" class="w-full max-w-md">
      <Card class="text-center">
        <CardHeader class="items-center pb-2">
          <div
            class="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Laptop class="size-8" />
          </div>
          <CardTitle class="text-xl font-bold tracking-tight">
            {{ $t('authentication.desktopAuthorizedTitle') }}
          </CardTitle>
          <CardDescription class="max-w-xs leading-relaxed">
            {{ $t('authentication.desktopAuthorizedDesc') }}
          </CardDescription>
        </CardHeader>

        <CardContent class="flex flex-col gap-3 pt-2">
          <Button class="w-full" @click="handleOpenDesktop">
            <ExternalLink class="size-4" />
            <span>{{ $t('authentication.desktopReopenBtn') }}</span>
          </Button>

          <Button variant="outline" class="w-full" @click="handleCopyToken">
            <Copy class="size-4" />
            <span>{{
              isCopied('token')
                ? $t('common.copied')
                : $t('authentication.desktopCopyTokenBtn')
            }}</span>
          </Button>
        </CardContent>

        <CardFooter class="justify-center border-t border-border/40 pt-4">
          <Button
            variant="ghost"
            size="sm"
            class="text-muted-foreground hover:text-foreground"
            @click="handleContinueOnWeb"
          >
            {{ $t('authentication.continueOnWeb') }} &rarr;
          </Button>
        </CardFooter>
      </Card>
    </div>

    <!-- Error View -->
    <div v-else class="flex flex-col items-center gap-4 max-w-md">
      <div class="text-3xl text-destructive font-bold">!</div>
      <h3 class="text-lg font-semibold text-destructive">
        {{ $t('authentication.githubAuthFailed') }}
      </h3>
      <p class="text-muted-foreground">
        {{ errorMessage }}
      </p>
      <div class="pt-2">
        <Button @click="router.push('/auth/login')">
          {{ $t('authentication.backToLogin') }}
        </Button>
      </div>
    </div>
  </div>
</template>
