<script setup lang="ts">
import type { ToolbarType } from './types';

import { computed, useId } from 'vue';

import { preferences, usePreferences } from '@operon/preferences';

import { VbenLogo } from '@operon-core/shadcn-ui';

import { Copyright } from '../basic/copyright';
import AuthenticationFormView from './form.vue';
import Toolbar from './toolbar.vue';

interface Props {
  appName?: string;
  logo?: string;
  logoDark?: string;
  pageTitle?: string;
  pageDescription?: string;
  sloganImage?: string;
  toolbar?: boolean;
  copyright?: boolean;
  toolbarList?: ToolbarType[];
  clickLogo?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  appName: '',
  copyright: true,
  logo: '',
  logoDark: '',
  pageDescription: '',
  pageTitle: '',
  sloganImage: '/illustrations/specter-waving.svg',
  toolbar: true,
  toolbarList: () => ['color', 'language', 'layout', 'theme'],
  clickLogo: () => {},
});

const sloganUid = useId();

const { authPanelCenter, authPanelLeft, authPanelRight, isDark } =
  usePreferences();

/**
 * Select appropriate logo icon based on theme
 */
const logoSrc = computed(() => {
  // If dark theme and logoDark is provided, use dark theme logo
  if (isDark.value && props.logoDark) {
    return props.logoDark;
  }
  // Otherwise use default logo
  return props.logo;
});

const isBuiltinSlogan = computed(() => {
  const s = (props.sloganImage || '').trim();
  return !s || s.endsWith('/specter-waving.svg');
});
</script>

<template>
  <div
    :class="[isDark ? 'dark' : '']"
    class="flex min-h-full flex-1 overflow-x-hidden select-none"
  >
    <template v-if="toolbar">
      <slot name="toolbar">
        <Toolbar :toolbar-list="toolbarList" />
      </slot>
    </template>
    <!-- Left authentication panel -->
    <AuthenticationFormView
      v-if="authPanelLeft"
      class="min-h-full w-2/5 flex-1"
      data-side="left"
    >
      <template v-if="copyright" #copyright>
        <slot name="copyright">
          <Copyright
            v-if="preferences.copyright.enable"
            v-bind="preferences.copyright"
          />
        </slot>
      </template>
    </AuthenticationFormView>

    <slot name="logo">
      <!-- Header logo and application name -->
      <div
        v-if="logoSrc || appName"
        class="absolute top-0 left-0 z-10 flex flex-1"
        @click="clickLogo"
      >
        <div
          class="mt-4 ml-4 flex flex-1 items-center text-foreground sm:top-6 sm:left-6 lg:text-foreground"
        >
          <VbenLogo
            :logo-size="42"
            :src="logo"
            :src-dark="logoDark"
            :text="appName"
            :theme="isDark ? 'dark' : 'light'"
          />
        </div>
      </div>
    </slot>

    <!-- System presentation -->
    <div
      v-if="!authPanelCenter"
      class="relative hidden w-0 flex-1 border-x border-border/50 lg:block dark:border-white/[0.05]"
    >
      <div class="absolute inset-0 size-full bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div class="login-background absolute top-0 left-0 size-full"></div>
        <div
          :key="authPanelLeft ? 'left' : authPanelRight ? 'right' : 'center'"
          class="relative flex-col-center size-full"
          :class="{
            'enter-x': authPanelLeft,
            '-enter-x': authPanelRight,
          }"
        >
          <slot name="slogan">
            <svg
              v-if="isBuiltinSlogan"
              :aria-label="appName"
              class="h-64 w-2/5 animate-float object-contain"
              data-specter-slogan="true"
              fill="none"
              role="img"
              viewBox="0 0 434 482"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                :fill="`url(#${sloganUid}-grad)`"
                d="M200.645 18.1707C100.182 18.1707 73.3923 98.504 80.0898 198.921C84.1084 245.782 97.5034 319.421 94.8244 356.91C92.1454 383.687 33.2071 343.521 26.5096 343.521C22.4911 343.521 33.2071 423.854 147.065 423.854C173.855 423.854 167.158 450.632 200.645 461.343C258.244 473.393 294.411 426.532 306.466 397.076C341.294 379.671 381.479 292.643 424.343 182.854C408.269 153.398 368.084 193.565 349.331 205.615C354.689 142.687 314.503 18.1707 200.645 18.1707Z"
              />
              <path
                d="M147.065 252.476C164.479 289.965 193.948 316.743 223.417 292.643C231.454 285.948 223.417 259.171 188.59 228.376"
                stroke="#18181B"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="5"
              />
              <path
                d="M139.309 83.0111C159.401 53.5555 195.568 46.8611 225.037 50.8778"
                opacity="0.9"
                stroke="white"
                stroke-linecap="round"
                stroke-width="9"
              />
              <path
                d="M133.951 116.387C136.513 114.908 136.192 109.556 133.233 104.433C130.274 99.3102 125.797 96.3561 123.235 97.835C120.672 99.3139 120.993 104.666 123.952 109.789C126.912 114.912 131.388 117.866 133.951 116.387Z"
                fill="white"
                opacity="0.85"
              />
              <path
                :fill="
                  isDark ? '#A1A1AA' : 'hsl(var(--chart-3, var(--primary)))'
                "
                d="M144.667 218.239C153.544 218.239 160.741 214.043 160.741 208.867C160.741 203.691 153.544 199.494 144.667 199.494C135.789 199.494 128.593 203.691 128.593 208.867C128.593 214.043 135.789 218.239 144.667 218.239Z"
                opacity="0.35"
              />
              <path
                :fill="
                  isDark ? '#A1A1AA' : 'hsl(var(--chart-3, var(--primary)))'
                "
                d="M310.765 207.528C319.643 207.528 326.839 203.332 326.839 198.156C326.839 192.979 319.643 188.783 310.765 188.783C301.888 188.783 294.691 192.979 294.691 198.156C294.691 203.332 301.888 207.528 310.765 207.528Z"
                opacity="0.35"
              />
              <path
                d="M200.926 184.767C215.722 184.767 227.716 170.38 227.716 152.633C227.716 134.887 215.722 120.5 200.926 120.5C186.13 120.5 174.136 134.887 174.136 152.633C174.136 170.38 186.13 184.767 200.926 184.767Z"
                fill="#09090B"
              />
              <path
                d="M206.284 133.889C206.284 141.03 209.856 144.6 217 144.6C209.856 144.6 206.284 148.17 206.284 155.311C206.284 148.17 202.712 144.6 195.568 144.6C202.712 144.6 206.284 141.03 206.284 133.889Z"
                fill="white"
              />
              <path
                d="M192.889 169.771C194.96 169.771 196.639 168.093 196.639 166.022C196.639 163.952 194.96 162.273 192.889 162.273C190.817 162.273 189.138 163.952 189.138 166.022C189.138 168.093 190.817 169.771 192.889 169.771Z"
                fill="white"
              />
              <path
                d="M294.691 174.056C309.487 174.056 321.481 159.669 321.481 141.922C321.481 124.175 309.487 109.789 294.691 109.789C279.895 109.789 267.901 124.175 267.901 141.922C267.901 159.669 279.895 174.056 294.691 174.056Z"
                fill="#09090B"
              />
              <path
                d="M300.049 123.178C300.049 130.319 303.621 133.889 310.765 133.889C303.621 133.889 300.049 137.459 300.049 144.6C300.049 137.459 296.477 133.889 289.333 133.889C296.477 133.889 300.049 130.319 300.049 123.178Z"
                fill="white"
              />
              <path
                d="M286.654 159.06C288.726 159.06 290.405 157.382 290.405 155.311C290.405 153.241 288.726 151.562 286.654 151.562C284.583 151.562 282.904 153.241 282.904 155.311C282.904 157.382 284.583 159.06 286.654 159.06Z"
                fill="white"
              />
              <path
                d="M219.679 200.833C223.697 187.444 289.333 178.072 297.37 194.139C301.389 227.611 235.753 259.744 219.679 200.833Z"
                fill="#09090B"
              />
              <path
                :fill="
                  isDark ? '#A1A1AA' : 'hsl(var(--chart-2, var(--primary)))'
                "
                d="M235.753 220.917C251.827 212.883 275.938 210.206 287.994 214.222C279.957 235.644 246.469 239.661 235.753 220.917Z"
              />
              <defs>
                <linearGradient
                  :id="`${sloganUid}-grad`"
                  gradientUnits="userSpaceOnUse"
                  x1="145.386"
                  x2="336.45"
                  y1="40.4262"
                  y2="425.31"
                >
                  <stop
                    :stop-color="
                      isDark ? 'white' : 'hsl(var(--chart-4, var(--primary)))'
                    "
                    offset="0%"
                  />
                  <stop
                    :stop-color="
                      isDark ? '#F4F4F5' : 'hsl(var(--chart-2, var(--primary)))'
                    "
                    offset="35%"
                  />
                  <stop
                    :stop-color="
                      isDark ? '#E4E4E7' : 'hsl(var(--chart-1, var(--primary)))'
                    "
                    offset="70%"
                  />
                  <stop
                    :stop-color="
                      isDark ? '#CBD5E1' : 'hsl(var(--chart-3, var(--primary)))'
                    "
                    offset="100%"
                  />
                </linearGradient>
              </defs>
            </svg>
            <img
              v-else
              :alt="appName"
              :src="sloganImage"
              class="h-64 w-2/5 animate-float object-contain"
            />
          </slot>
          <div
            v-if="pageTitle"
            class="text-1xl mt-6 font-sans text-foreground lg:text-2xl"
          >
            {{ pageTitle }}
          </div>
          <div v-if="pageDescription" class="mt-2 dark:text-muted-foreground">
            {{ pageDescription }}
          </div>
        </div>
      </div>
    </div>

    <!-- Center authentication panel -->
    <div v-if="authPanelCenter" class="relative flex-center w-full">
      <div class="login-background absolute top-0 left-0 size-full"></div>
      <AuthenticationFormView
        class="w-full rounded-3xl pb-20 shadow-float shadow-primary/5 md:w-2/3 md:bg-background lg:w-1/2 xl:w-[36%]"
        data-side="bottom"
      >
        <template v-if="copyright" #copyright>
          <slot name="copyright">
            <Copyright
              v-if="preferences.copyright.enable"
              v-bind="preferences.copyright"
            />
          </slot>
        </template>
      </AuthenticationFormView>
    </div>

    <!-- Right authentication panel -->
    <AuthenticationFormView
      v-if="authPanelRight"
      class="min-h-full w-2/5 flex-1"
      data-side="right"
    >
      <template v-if="copyright" #copyright>
        <slot name="copyright">
          <Copyright
            v-if="preferences.copyright.enable"
            v-bind="preferences.copyright"
          />
        </slot>
      </template>
    </AuthenticationFormView>
  </div>
</template>

<style scoped>
.login-background {
  background-image: radial-gradient(rgb(20 20 19 / 7%) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(
    circle at 50% 50%,
    transparent 38%,
    rgb(0 0 0 / 55%) 100%
  );
}

.dark {
  .login-background {
    background-image: radial-gradient(
      rgb(232 232 236 / 6%) 1px,
      transparent 1px
    );
    background-size: 24px 24px;
    mask-image: radial-gradient(
      circle at 50% 50%,
      transparent 38%,
      rgb(0 0 0 / 55%) 100%
    );
  }
}
</style>
