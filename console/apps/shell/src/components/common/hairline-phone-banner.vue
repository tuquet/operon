<script lang="ts" setup>
import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
} from 'vue';

import { usePreferences } from '@operon/preferences';

import { HL } from './hairline-kernel';

defineOptions({ name: 'HairlinePhoneBanner' });

const { isDark } = usePreferences();
const stageRef = ref<HTMLDivElement | null>(null);

let destroyFigure: (() => void) | null = null;
let stopTour: (() => void) | null = null;
let currentStops: ([number, number] | null)[] | null = null;

const W = 88;
const L = 164;
const BH = 9.5;
const BR = 15;
const BB = 2.4;
const N = 5;
const CX0 = 8.5;
const CX1 = 79.5;
const CD = 17.2;
const CT = 3.6;
const CR = 4.4;
const CB = 1.1;
const Y_START = 31;
const Y_STEP = 22;
const Z_REST = [7.8, 5.5, 3.6, 2.1, 1];
const DY_REST = [-1.5, -0.7, 0, 0.7, 1.5];
const T_LEN = [26, 19, 29, 17, 23];
const B1_LEN = [44, 38, 46, 35, 42];
const B2_LEN = [30, 35, 25, 32, 21];

function mountPhone(
  {
    stage,
    svg,
  }: {
    stage: HTMLElement;
    svg: SVGSVGElement;
  },
  value = 21,
) {
  const {
    Cam,
    clamp,
    disposer,
    facing,
    fit,
    flatDot,
    mk,
    open,
    place,
    pointer,
    poly,
    prism,
    proj,
    put,
    reflect,
    register,
    ringAt,
    rings,
    rrect,
    run,
    seg,
    solid,
    tdone,
    tset,
    tval,
    tween,
    unproj,
  } = HL;

  const bag = disposer();
  let amp = value;

  const C = Cam(45, 0.5, 1.92);
  fit(
    C,
    [
      [-4, 0, -BH],
      [W + 2, L, -BH - 10],
      [W + 2, 0, -BH],
      [0, L, -BH],
      [0, 0, 28 + CT],
      [W, L, 24],
    ],
    200,
    164,
  );
  const P = proj(C);
  const front = facing(C);

  const g = mk('g', {}, svg);
  const bodyOuter = rrect(0, 0, W, L, BR, 14);
  const bodyInner = rrect(BB, BB, W - BB, L - BB, BR - BB, 14);
  reflect(svg, g, P, front, bodyOuter, -BH, 14);

  for (const [y0, y1] of [
    [32, 47],
    [52, 67],
  ]) {
    const [br, bi] = rings(-3.6, y0, 2, y1, 1.2, 0.4);
    put(solid(g), prism(P, front, br, bi, -BH + 3.5, -1.2));
  }

  put(solid(g), prism(P, front, bodyOuter, bodyInner, -BH, 0));

  const onRight = (ring: any[]) => ring.map((q) => P(W, q.u, q.v));
  const onBot = (ring: any[]) => ring.map((q) => P(q.u, L, q.v));
  mk(
    'path',
    { d: poly(onRight(rrect(42, -6.6, 60, -2.6, 1.3, 4))), class: 'nf' },
    g,
  );
  mk(
    'path',
    {
      d: poly(onBot(rrect(W / 2 - 8, -6.5, W / 2 + 8, -2.9, 1.6, 5))),
      class: 'nf',
    },
    g,
  );
  mk(
    'path',
    {
      d: poly(onBot(rrect(W / 2 - 6.2, -5.4, W / 2 + 6.2, -4, 0.7, 4))),
      class: 'nf lo',
    },
    g,
  );
  for (const dx of [-20, -16, -12, 12, 16, 20]) {
    const d = mk('circle', { r: 0.85, class: 'dot off' }, g);
    place(d, P(W / 2 + dx, L, -4.7));
  }

  const screenRing = rrect(4.8, 5.5, W - 4.8, L - 5.5, 11, 12);
  mk('path', { d: poly(ringAt(P, screenRing, 0)), class: 'nf lo' }, g);
  mk(
    'path',
    {
      d: open(
        ringAt(
          P,
          run(screenRing, (q: any) => !front(q)),
          -0.8,
        ),
      ),
      class: 'nf lo',
    },
    g,
  );

  const islandRing = rrect(W / 2 - 15, 7.8, W / 2 + 15, 13.4, 2.8, 6);
  mk('path', { d: poly(ringAt(P, islandRing, 0.1)), class: 'nf' }, g);
  mk(
    'path',
    {
      d: seg(P(W / 2 - 7.5, 10.6, 0.1), P(W / 2 + 2.5, 10.6, 0.1)),
      class: 'nf lo',
    },
    g,
  );
  const camDot = flatDot(g, C, 0.85, 'dot m');
  place(camDot, P(W / 2 + 9, 10.6, 0.1));

  const homeRing = rrect(W / 2 - 17, L - 11, W / 2 + 17, L - 8.6, 1.2, 4);
  mk('path', { d: poly(ringAt(P, homeRing, 0.1)), class: 'nf lo' }, g);

  const [cardRing, cardInner] = rings(CX0, 0, CX1, CD, CR, CB);
  const iconRing = rrect(CX0 + 4.2, 3.5, CX0 + 14.4, CD - 3.5, 2.3, 4);
  for (let i = 0; i < N; i++) {
    const yb = Y_START + i * Y_STEP;
    const Ps = (x: number, y: number, z: number) => P(x, y + yb, z);
    mk('path', { d: poly(ringAt(Ps, cardInner, 0.1)), class: 'nf dash' }, g);
  }

  const cards: any[] = [];
  for (let i = 0; i < N; i++) {
    const yb = Y_START + i * Y_STEP;
    const grp = mk('g', {}, g);
    const body = solid(grp);
    const icon = mk('path', { class: 'nf' }, grp);
    const head = mk('path', { class: 'nf' }, grp);
    const lines = mk('path', { class: 'nf lo' }, grp);
    const activeDotClass = i === 0 ? 'dot' : 'dot m';
    const badge = flatDot(grp, C, 0.85, activeDotClass);
    const dots: any[] = [];
    for (let k = 0; k < N; k++) {
      dots.push(flatDot(grp, C, 0.55, k === i ? activeDotClass : 'dot off'));
    }
    cards.push({
      i,
      yb,
      body,
      icon,
      head,
      lines,
      badge,
      dots,
      z: tween(Z_REST[i] ?? 0),
      dy: tween(DY_REST[i] ?? 0),
      drawn: '',
    });
  }

  function drawCard(c: any, z: number, dy: number) {
    const key = `${z},${dy}`;
    if (key === c.drawn) return;
    c.drawn = key;
    const yb = c.yb + dy;
    const zt = z + CT;
    const Pc = (x: number, y: number, zp: number) => P(x, y + yb, zp);
    put(c.body, prism(Pc, front, cardRing, cardInner, z, zt));
    c.icon.setAttribute('d', poly(ringAt(Pc, iconRing, zt)));
    c.head.setAttribute(
      'd',
      seg(Pc(CX0 + 18.8, 5.8, zt), Pc(CX0 + 18.8 + (T_LEN[c.i] ?? 0), 5.8, zt)),
    );
    c.lines.setAttribute(
      'd',
      seg(
        Pc(CX0 + 18.8, 9.9, zt),
        Pc(CX0 + 18.8 + (B1_LEN[c.i] ?? 0), 9.9, zt),
      ) +
        seg(
          Pc(CX0 + 18.8, 13.6, zt),
          Pc(CX0 + 18.8 + (B2_LEN[c.i] ?? 0), 13.6, zt),
        ),
    );
    place(c.badge, Pc(CX0 + 9.3, CD / 2, zt));
    c.dots.forEach((d: any, k: number) =>
      place(d, Pc(CX1 - 5.5, 3.6 + k * 2.5, zt)),
    );
  }

  function hit([sx, sy]: [number, number]) {
    let best = -1;
    let bestDist = 14;
    for (let i = 0; i < N; i++) {
      const [wx, wy] = unproj(C, sx, sy, (Z_REST[i] ?? 0) + CT);
      if (wx < CX0 - 6 || wx > CX1 + 6) continue;
      const cy = Y_START + i * Y_STEP + (DY_REST[i] ?? 0) + CD / 2;
      const d = Math.abs(wy - cy);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  const B = register(stage, (_dt: number, now: number) => {
    let moving = false;
    for (const c of cards) {
      drawCard(c, tval(c.z, now), tval(c.dy, now));
      if (!tdone(c.z, now) || !tdone(c.dy, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  cards[0].body.sil.classList.add('hi');
  cards[0].head.classList.add('hi');

  function retarget(a: number, stag: number) {
    const now = performance.now();
    const from = a >= 0 ? a : Math.max(0, act);
    const hiIdx = Math.max(a, 0);
    const part = amp * 0.28;
    cards.forEach((c, i) => {
      const delay = Math.abs(i - from) * stag;
      let tz = 1.2 + (N - 1 - Math.abs(i - a)) * 0.4;
      if (a < 0) {
        tz = Z_REST[i] ?? 0;
      } else if (i === a) {
        tz = amp;
      }

      let rawDy = part + (i - a - 1) * 1.6;
      if (a < 0) {
        rawDy = DY_REST[i] ?? 0;
      } else if (i === a) {
        rawDy = -2;
      } else if (i < a) {
        rawDy = -part - (a - 1 - i) * 1.4;
      }

      const tdy = clamp(rawDy, 23 - c.yb, L - 14 - CD - c.yb);
      tset(c.z, tz, now, delay);
      tset(c.dy, tdy, now, delay);
      const isHi = i === hiIdx;
      c.body.sil.classList.toggle('hi', isHi);
      c.head.classList.toggle('hi', isHi);
      c.icon.classList.toggle('hi', i === a);
      c.badge.setAttribute('class', isHi ? 'dot' : 'dot m');
      c.dots[i].setAttribute('class', isHi ? 'dot' : 'dot m');
    });
    B.wake();
  }

  function setActive(a: number) {
    if (a === act) return;
    act = a;
    retarget(a, 45);
  }

  bag.add(
    pointer(stage, {
      move: (p: [number, number]) => setActive(hit(p)),
      leave: () => setActive(-1),
    }),
  );
  bag.add(() => svg.replaceChildren());

  const stops: ([number, number] | null)[] = [
    ...[0, 2, 4].map((i) =>
      P(
        (CX0 + CX1) / 2,
        Y_START + i * Y_STEP + (DY_REST[i] ?? 0) + CD / 2,
        (Z_REST[i] ?? 0) + CT,
      ),
    ),
    null,
  ];

  return {
    set: (v: number) => {
      amp = v;
      if (act >= 0) retarget(act, 0);
    },
    stops,
    destroy: bag.dispose,
  };
}

function startTourAnimation() {
  if (stageRef.value && currentStops && !stopTour) {
    const tourHandle = HL.tour(stageRef.value, currentStops);
    stopTour = tourHandle.stop;
  }
}

function pauseTourAnimation() {
  stopTour?.();
  stopTour = null;
}

onMounted(() => {
  if (typeof window === 'undefined' || !stageRef.value) return;
  const stage = stageRef.value;

  HL.inject(document);
  const svg = HL.mk(
    'svg',
    { viewBox: '0 0 400 320', 'aria-hidden': 'true' },
    stage,
  ) as SVGSVGElement;

  const handle = mountPhone({ stage, svg }, 21);
  destroyFigure = handle.destroy;
  currentStops = handle.stops;

  startTourAnimation();
});

onDeactivated(() => {
  // Suspend RAF tour animation while deactivated to save 100% of CPU cycles
  pauseTourAnimation();
});

onActivated(() => {
  // Resume RAF tour animation when switched back to Light mode
  startTourAnimation();
});

onBeforeUnmount(() => {
  pauseTourAnimation();
  destroyFigure?.();
  destroyFigure = null;
  currentStops = null;
});
</script>

<template>
  <div
    class="hairline-phone-banner relative flex size-full items-center justify-center px-8 select-none"
  >
    <!-- Interactive Hairline SVG stage -->
    <div
      ref="stageRef"
      data-hairline="phone"
      :data-hairline-theme="isDark ? 'dark' : 'light'"
      role="img"
      aria-label="Five notification cards on a phone screen: the one under the pointer lifts bright while its neighbours part."
      class="hairline-stage relative z-10 w-full max-w-[680px] cursor-pointer xl:max-w-[780px]"
    ></div>
  </div>
</template>

<style scoped>
.hairline-stage {
  --hairline-plate: #fafafa;
  --hairline-ink: #141413;
}

:global(.dark) .hairline-stage {
  --hairline-plate: #0a0a0a;
  --hairline-ink: #e8e8ec;
}
</style>
