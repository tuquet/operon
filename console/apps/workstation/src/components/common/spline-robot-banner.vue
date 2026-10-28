<script lang="ts" setup>
import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';

import { $t } from '@operon/locales';
import { usePreferences } from '@operon/preferences';

defineOptions({ name: 'SplineRobotBanner' });

const props = withDefaults(
  defineProps<{
    sceneUrl?: string;
  }>(),
  {
    sceneUrl: 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode',
  },
);

const { isDark } = usePreferences();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isLoading = ref(true);
const hasError = ref(false);

interface SplineAppInstance {
  dispose?: () => void;
  load: (url: string) => Promise<void>;
  play?: () => void;
  stop?: () => void;
}

let splineApp: null | SplineAppInstance = null;
let disposed = false;

const RUNTIME_CDNS = [
  'https://unpkg.com/@splinetool/runtime@1.9.82/build/runtime.js',
  'https://cdn.jsdelivr.net/npm/@splinetool/runtime@1.9.82/build/runtime.js',
];

async function loadSplineRuntime(): Promise<{
  Application: new (canvas: HTMLCanvasElement) => SplineAppInstance;
}> {
  let lastErr: unknown;
  for (const url of RUNTIME_CDNS) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      if (mod?.Application) {
        return mod;
      }
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr ?? new Error('Failed to load @splinetool/runtime');
}

onMounted(async () => {
  if (typeof window === 'undefined' || !canvasRef.value) return;
  try {
    isLoading.value = true;
    hasError.value = false;
    const { Application } = await loadSplineRuntime();
    if (disposed || !canvasRef.value) return;

    const app = new Application(canvasRef.value);
    splineApp = app;
    await app.load(props.sceneUrl);
    if (!disposed) {
      isLoading.value = false;
      updateSplineLighting(isDark.value);
    }
  } catch {
    if (!disposed) {
      isLoading.value = false;
      hasError.value = true;
    }
  }
});

function updateSplineLighting(dark: boolean) {
  if (!splineApp) return;
  try {
    const objects = (splineApp as any).getAllObjects?.() || [];
    for (const obj of objects) {
      const name = (obj.name || '').toLowerCase();
      if (
        (name.includes('light') ||
          name.includes('sun') ||
          name.includes('directional') ||
          name.includes('point') ||
          name.includes('ambient')) &&
        typeof obj.intensity === 'number'
      ) {
        obj.intensity = dark ? 1 : 2.5;
      }
    }
  } catch {}
}

watch(isDark, (newDark) => {
  updateSplineLighting(newDark);
});

onDeactivated(() => {
  // Suspend WebGL rendering while deactivated to save GPU/CPU
  try {
    splineApp?.stop?.();
  } catch {}
});

onActivated(() => {
  // Resume WebGL rendering and calibrate lighting
  try {
    splineApp?.play?.();
    updateSplineLighting(isDark.value);
  } catch {}
});

onBeforeUnmount(() => {
  disposed = true;
  try {
    splineApp?.dispose?.();
  } catch {
    // Ignore WebGL cleanup errors on unmount
  }
  splineApp = null;
});
</script>

<template>
  <div
    class="spline-robot-banner relative flex size-full min-h-[520px] items-center justify-center overflow-hidden select-none"
  >
    <!-- 21st.dev / Aceternity Spotlight SVG effect with GPU layer isolation -->
    <svg
      class="animate-spotlight pointer-events-none absolute -top-40 left-0 z-[1] h-[169%] w-[138%] opacity-0 transform-gpu will-change-transform lg:w-[84%]"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      aria-hidden="true"
    >
      <g filter="url(#specter-spline-spotlight)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          :fill="isDark ? 'white' : '#141413'"
          :fill-opacity="isDark ? '0.18' : '0.07'"
        />
      </g>
      <defs>
        <filter
          id="specter-spline-spotlight"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="151"
            result="effect1_foregroundBlur_1065_8"
          />
        </filter>
      </defs>
    </svg>

    <!-- Minimal Hairline-style loader while .splinecode streams -->
    <Transition name="fade">
      <div
        v-if="isLoading"
        class="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 tracking-wider text-muted-foreground"
      >
        <div
          class="size-7 animate-spin rounded-full border border-foreground/20 border-t-foreground/80"
        ></div>
        <span>{{ $t('authentication.bannerLoadingScene') }}</span>
      </div>
    </Transition>

    <!-- Fallback message if offline -->
    <div
      v-if="hasError"
      class="z-20 flex flex-col items-center gap-2 px-6 text-center text-muted-foreground"
    >
      <span>{{ $t('authentication.bannerOfflineScene') }}</span>
    </div>

    <!-- Hardware-accelerated ambient ground shadow (0% WebGL canvas readback penalty) -->
    <div
      class="pointer-events-none absolute bottom-8 z-[2] h-12 w-3/4 max-w-[420px] rounded-full bg-black/25 blur-2xl transition-opacity duration-500 transform-gpu dark:bg-black/60"
      :class="isLoading ? 'opacity-0' : 'opacity-100'"
      aria-hidden="true"
    ></div>

    <!-- Interactive WebGL Canvas -->
    <canvas
      ref="canvasRef"
      class="relative z-10 block size-full cursor-grab transition-opacity duration-500 active:cursor-grabbing transform-gpu will-change-transform"
      :class="isLoading ? 'opacity-0' : 'opacity-100'"
    ></canvas>
  </div>
</template>

<style scoped>
@keyframes spotlight {
  0% {
    opacity: 0;
    transform: translate(-72%, -62%) scale(0.5);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -40%) scale(1);
  }
}

.animate-spotlight {
  animation: spotlight 1.8s ease 0.25s 1 forwards;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Color calibration without per-frame canvas drop-shadow blur readback */
:root:not(.dark) canvas {
  filter: brightness(1.15) contrast(1.05);
}

.dark canvas {
  filter: none;
}
</style>
