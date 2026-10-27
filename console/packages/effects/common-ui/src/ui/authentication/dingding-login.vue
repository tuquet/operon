<script setup lang="ts">
import { useRoute } from 'vue-router';

import { SvgDingDingIcon } from '@operon/icons';
import { $t } from '@operon/locales';

import { alert, useVbenModal } from '@operon-core/popup-ui';
import { VbenIconButton } from '@operon-core/shadcn-ui';
import { loadScript } from '@operon-core/shared/utils';

interface Props {
  clientId: string;
  corpId: string;
  // Login redirect URL
  redirectUri?: string;
  // Whether QR code login is embedded
  isQrCode?: boolean;
}

const props = defineProps<Props>();

const route = useRoute();

const [Modal, modalApi] = useVbenModal({
  header: false,
  footer: false,
  fullscreenButton: false,
  class: 'size-75.5 dingding-qrcode-login-modal',
  onOpened() {
    handleQrCodeLogin();
  },
});

const getRedirectUri = () => {
  const { redirectUri } = props;
  if (redirectUri) {
    return redirectUri;
  }
  return window.location.origin + route.fullPath;
};

/**
 * Embedded QR code login
 */
const handleQrCodeLogin = async () => {
  const { clientId, corpId } = props;
  if (!(window as any).DTFrameLogin) {
    // QR code login: load assets
    await loadScript(
      'https://g.alicdn.com/dingding/h5-dingtalk-login/0.21.0/ddlogin.js',
    );
  }
  (window as any).DTFrameLogin(
    {
      id: 'dingding_qrcode_login_element',
      width: 300,
      height: 300,
    },
    {
      // Note: redirect_uri must be full URL; redirect will include code param
      redirect_uri: encodeURIComponent(getRedirectUri()),
      client_id: clientId,
      scope: 'openid corpid',
      response_type: 'code',
      state: '1',
      prompt: 'consent',
      corpId,
    },
    (loginResult: any) => {
      const { redirectUrl } = loginResult;
      // Can redirect directly here
      window.location.href = redirectUrl;
    },
    (errorMsg: string) => {
      // Display specific failure reason here
      alert(`Login Error: ${errorMsg}`);
    },
  );
};

const handleLogin = () => {
  const { clientId, corpId, isQrCode } = props;
  if (isQrCode) {
    // Embedded QR code login
    modalApi.open();
  } else {
    window.location.href = `https://login.dingtalk.com/oauth2/auth?redirect_uri=${encodeURIComponent(getRedirectUri())}&response_type=code&client_id=${clientId}&scope=openid&corpid=${corpId}&prompt=consent`;
  }
};
</script>

<template>
  <div>
    <VbenIconButton
      @click="handleLogin"
      :tooltip="$t('authentication.dingdingLogin')"
      tooltip-side="top"
    >
      <SvgDingDingIcon />
    </VbenIconButton>
    <Modal>
      <div id="dingding_qrcode_login_element"></div>
    </Modal>
  </div>
</template>

<style>
.dingding-qrcode-login-modal {
  .relative {
    padding: 0 !important;
  }
}
</style>
