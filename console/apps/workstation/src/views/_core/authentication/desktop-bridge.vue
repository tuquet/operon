<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { $t } from '@operon/locales';
import { useAccessStore, useUserStore } from '@operon/stores';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@operon-core/shadcn-ui';

import { CheckCircle2, Laptop } from '@lucide/vue';

import { listTenants } from '#/api';
import { useClipboard } from '#/composables';
import { captureError } from '#/utils/bugsink';
import { validateDesktopBridgePort } from '#/utils/security';

defineOptions({ name: 'DesktopBridge' });

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const { copyToClipboard, isCopied } = useClipboard();

// Query parameters from Desk app
const machineName = computed(
  () =>
    (route.query.machine_name as string) ||
    $t('authentication.desktopLocalWorkstation'),
);
const state = computed(() => (route.query.state as string) || '');
const validatedPort = computed(() =>
  validateDesktopBridgePort(route.query.port),
);
const port = computed(() => validatedPort.value ?? 8765);

// Auth status
const isLoggedIn = computed(() => Boolean(accessStore.accessToken));
const userName = computed(
  () =>
    userStore.userInfo?.realName || userStore.userInfo?.username || 'Operator',
);
const userAvatar = computed(
  () => userStore.userInfo?.avatar || 'https://operon.com/icons/cli.svg',
);

// Tenancy
const selectedTenant = ref('');
const tenantOptions = ref<{ label: string; value: string }[]>([]);

async function loadTenants() {
  if (!accessStore.accessToken) return;
  try {
    const list = await listTenants();
    if (list && list.length > 0) {
      tenantOptions.value = list.map((t) => ({
        label: `${t.name} · ${t.slug}`,
        value: t.id,
      }));
      selectedTenant.value = tenantOptions.value[0]?.value || '';
    }
  } catch (error) {
    captureError(error, { phase: 'loadTenants', view: 'DesktopBridge' });
  }

  if (tenantOptions.value.length === 0) {
    tenantOptions.value = [
      {
        label: $t('authentication.desktopDefaultWorkspace'),
        value: 'default-workspace',
      },
    ];
    selectedTenant.value = 'default-workspace';
  }
}

const loading = ref(false);
const isAuthorized = ref(false);
const errorMessage = ref('');

const deepLinkUrl = computed(() => {
  const token = accessStore.accessToken || '';
  const refreshToken = accessStore.refreshToken || '';
  return `operon://auth/callback?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refreshToken)}&state=${encodeURIComponent(state.value)}&tenant_id=${encodeURIComponent(selectedTenant.value)}&machine_name=${encodeURIComponent(machineName.value)}`;
});

function goToLogin() {
  const currentUrl = encodeURIComponent(window.location.href);
  router.push(`/auth/login?redirect=${currentUrl}`);
}

async function handleAuthorize() {
  if (!isLoggedIn.value) {
    goToLogin();
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      token: accessStore.accessToken || '',
      refreshToken: accessStore.refreshToken || '',
      state: state.value,
      tenantId: selectedTenant.value,
      machineName: machineName.value,
    };

    try {
      if (validatedPort.value !== null) {
        await fetch(`http://127.0.0.1:${port.value}/api/v1/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // Loopback may fallback to custom URI protocol
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deepLinkUrl.value;
    document.body.append(iframe);

    setTimeout(() => {
      isAuthorized.value = true;
      loading.value = false;
    }, 600);
  } catch (error: any) {
    captureError(error, { phase: 'handleAuthorize', view: 'DesktopBridge' });
    loading.value = false;
    errorMessage.value =
      error?.message || $t('authentication.desktopSendAuthFailed');
  }
}

function handleReopenDesk() {
  window.location.href = deepLinkUrl.value;
}

const tokenBundleLabel = computed(() =>
  $t('authentication.desktopTokenBundleLabel'),
);

function handleCopyTokenBundle() {
  const bundle = btoa(
    JSON.stringify({
      token: accessStore.accessToken || '',
      refreshToken: accessStore.refreshToken || '',
      tenantId: selectedTenant.value,
      state: state.value,
      machineName: machineName.value,
    }),
  );
  copyToClipboard(bundle, tokenBundleLabel.value);
}

function handleCancel() {
  window.close();
}

onMounted(() => {
  if (isLoggedIn.value) {
    loadTenants();
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-lg">
      <template v-if="isAuthorized">
        <div class="text-center py-6 space-y-4">
          <div
            class="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success"
          >
            <CheckCircle2 class="size-7" />
          </div>
          <h3 class="text-xl font-bold">
            {{ $t('authentication.desktopAuthorizedTitle') }}
          </h3>
          <p class="text-muted-foreground max-w-sm mx-auto">
            {{ $t('authentication.desktopAuthorizedDesc') }}
          </p>
          <div class="space-y-3 pt-2">
            <div class="flex gap-2 justify-center">
              <Button @click="handleReopenDesk">
                {{ $t('authentication.desktopReopenBtn') }}
              </Button>
              <Button variant="outline" @click="handleCopyTokenBundle">
                {{
                  isCopied(tokenBundleLabel)
                    ? $t('common.copied')
                    : $t('authentication.desktopCopyTokenBtn')
                }}
              </Button>
            </div>
            <div>
              <Button class="w-full" @click="handleCancel">
                {{ $t('authentication.desktopCloseTab') }}
              </Button>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="!isLoggedIn">
        <div class="text-center py-6 space-y-4">
          <Avatar class="size-16 mx-auto mb-2">
            <AvatarImage src="https://operon.com/icons/cli.svg" />
            <AvatarFallback>CLI</AvatarFallback>
          </Avatar>
          <h3 class="text-xl font-bold">
            {{ $t('authentication.desktopConnectTitle') }}
          </h3>
          <p class="text-muted-foreground">
            {{ $t('authentication.desktopConnectDesc') }}
          </p>

          <div class="rounded-lg bg-muted p-4 text-left">
            <span class="font-semibold text-muted-foreground block mb-1">
              {{ $t('authentication.desktopRequestingDevice') }}
            </span>
            <div class="flex items-center justify-between">
              <span class="text-foreground">{{ machineName }}</span>
              <Badge variant="secondary">
                {{ $t('authentication.desktopLocalWorkstation') }}
              </Badge>
            </div>
          </div>

          <Button class="w-full" @click="goToLogin">
            {{ $t('common.login') }}
          </Button>
        </div>
      </template>

      <template v-else>
        <div class="text-center pb-4">
          <div
            class="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-3 text-primary"
          >
            <Laptop class="size-8" />
          </div>
          <h3 class="text-xl font-bold">
            {{ $t('authentication.desktopConsentTitle') }}
          </h3>
          <p class="text-muted-foreground mt-1">
            {{ $t('authentication.desktopConsentDesc') }}
          </p>
        </div>

        <div
          class="space-y-4 rounded-xl border border-border/60 bg-muted/40 p-4"
        >
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">{{
              $t('authentication.desktopAccountLabel')
            }}</span>
            <div class="flex items-center space-x-2">
              <Avatar class="size-6">
                <AvatarImage :src="userAvatar" />
                <AvatarFallback>{{ userName.slice(0, 1) }}</AvatarFallback>
              </Avatar>
              <span class="text-foreground">{{ userName }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">{{ $t('term.device') }}</span>
            <Badge
              variant="outline"
              class="bg-accent text-accent-foreground border-border"
            >
              {{ machineName }}
            </Badge>
          </div>

          <div>
            <span class="text-muted-foreground block mb-2">{{
              $t('term.workspace')
            }}</span>
            <Select v-model="selectedTenant">
              <SelectTrigger class="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in tenantOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Alert class="mt-4">
          <AlertTitle class="mb-0.5 font-semibold">
            {{ $t('authentication.desktopSecurityNoteTitle') }}
          </AlertTitle>
          <AlertDescription>
            {{ $t('authentication.desktopSecurityNoteDesc') }}
          </AlertDescription>
        </Alert>

        <Alert v-if="errorMessage" variant="destructive" class="mt-3">
          <AlertDescription>
            {{ errorMessage }}
          </AlertDescription>
        </Alert>

        <div class="mt-6 flex gap-3">
          <Button variant="outline" class="flex-1" @click="handleCancel">
            {{ $t('common.cancel') }}
          </Button>
          <Button class="flex-1" :disabled="loading" @click="handleAuthorize">
            {{
              loading
                ? $t('authentication.desktopProcessing')
                : $t('authentication.desktopGrantBtn')
            }}
          </Button>
        </div>
      </template>
    </Card>
  </div>
</template>
