/* hairline kernel - exported for workstation */
export interface HairlineCam {
  az: number;
  k: number;
  ox: number;
  oy: number;
  S: number;
}

export interface HairlineRingPoint {
  nu: number;
  nv: number;
  u: number;
  v: number;
}

export type Point2D = [number, number];
export type Point3D = [number, number, number];
export type ProjFn = (x: number, y: number, z: number) => Point2D;
export type FacingFn = (q: HairlineRingPoint) => boolean;

export interface HairlineTween {
  dur: number;
  from: number;
  t0: number;
  to: number;
}

interface HairlineBoard {
  awake: boolean;
  stage: Element;
  tick: (dt: number, now: number) => boolean;
  vis: boolean;
}

export const HL: Record<string, any> = (() => {
  const clamp = (v: number, a: number, b: number) =>
    Math.max(a, Math.min(b, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rad = (d: number) => (d * Math.PI) / 180;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const poly = (pts: Point2D[]) =>
    `M${pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z`;
  const seg = (a: Point2D, b: Point2D) =>
    `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
  const open = (pts: Point2D[]) =>
    pts.length < 2
      ? ''
      : `M${pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}`;
  const Cam = (azDeg: number, k: number, S: number): HairlineCam => ({
    az: rad(azDeg),
    k,
    S,
    ox: 0,
    oy: 0,
  });

  function proj(C: HairlineCam): ProjFn {
    const c = Math.cos(C.az);
    const s = Math.sin(C.az);
    const zf = Math.sqrt(1 - C.k * C.k);
    return (x: number, y: number, z: number): Point2D => {
      const X = x * c - y * s;
      const Y = x * s + y * c;
      return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
    };
  }

  function unproj(C: HairlineCam, sx: number, sy: number, z: number): Point2D {
    const c = Math.cos(C.az);
    const s = Math.sin(C.az);
    const zf = Math.sqrt(1 - C.k * C.k);
    const X = (sx - C.ox) / C.S;
    const Y = ((sy - C.oy) / C.S + z * zf) / C.k;
    return [X * c + Y * s, -X * s + Y * c];
  }

  function fit(C: HairlineCam, pts: Point3D[], cx: number, cy: number) {
    C.ox = 0;
    C.oy = 0;
    const P = proj(C);
    let a = 1e9;
    let b = -1e9;
    let c = 1e9;
    let d = -1e9;
    for (const p of pts) {
      const q = P(p[0], p[1], p[2]);
      a = Math.min(a, q[0]);
      b = Math.max(b, q[0]);
      c = Math.min(c, q[1]);
      d = Math.max(d, q[1]);
    }
    C.ox = cx - (a + b) / 2;
    C.oy = cy - (c + d) / 2;
  }

  function rrect(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    r: number,
    n = 4,
  ): HairlineRingPoint[] {
    const radius = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
    const out: HairlineRingPoint[] = [];
    const corners: [number, number, number][] = [
      [u1 - radius, v1 - radius, 0],
      [u0 + radius, v1 - radius, 90],
      [u0 + radius, v0 + radius, 180],
      [u1 - radius, v0 + radius, 270],
    ];
    for (const [cu, cv, a0] of corners) {
      for (let k = 0; k <= n; k++) {
        const a = rad(a0 + (90 * k) / n);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        out.push({ u: cu + radius * ca, v: cv + radius * sa, nu: ca, nv: sa });
      }
    }
    return out;
  }

  function circ(R: number, n = 96): HairlineRingPoint[] {
    const out: HairlineRingPoint[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      out.push({ u: R * ca, v: R * sa, nu: ca, nv: sa });
    }
    return out;
  }

  function hull(input: Point2D[]): Point2D[] {
    const pts = input.toSorted(
      (a: Point2D, b: Point2D) => a[0] - b[0] || a[1] - b[1],
    );
    const x = (o: Point2D, a: Point2D, b: Point2D) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo: Point2D[] = [];
    const up: Point2D[] = [];
    for (const p of pts) {
      while (lo.length > 1) {
        const p1 = lo[lo.length - 2];
        const p2 = lo[lo.length - 1];
        if (!p1 || !p2 || x(p1, p2, p) > 0) break;
        lo.pop();
      }
      lo.push(p);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      if (!p) continue;
      while (up.length > 1) {
        const p1 = up[up.length - 2];
        const p2 = up[up.length - 1];
        if (!p1 || !p2 || x(p1, p2, p) > 0) break;
        up.pop();
      }
      up.push(p);
    }
    lo.pop();
    up.pop();
    return [...lo, ...up];
  }

  const ringAt = (P: ProjFn, ring: HairlineRingPoint[], z: number): Point2D[] =>
    ring.map((q) => P(q.u, q.v, z));

  const facing = (C: HairlineCam): FacingFn => {
    const s = Math.sin(C.az);
    const c = Math.cos(C.az);
    return (q: HairlineRingPoint) => q.nu * s + q.nv * c >= -1e-6;
  };

  function run(ring: HairlineRingPoint[], keep: FacingFn): HairlineRingPoint[] {
    const n = ring.length;
    if (n === 0) return [];
    let s = -1;
    for (let i = 0; i < n; i++) {
      const curr = ring[i];
      const prev = ring[(i + n - 1) % n];
      if (curr && prev && keep(curr) && !keep(prev)) {
        s = i;
        break;
      }
    }
    const first = ring[0];
    if (s < 0) return first && keep(first) ? [...ring] : [];
    const out: HairlineRingPoint[] = [];
    for (let k = 0; k < n; k++) {
      const item = ring[(s + k) % n];
      if (!item || !keep(item)) break;
      out.push(item);
    }
    return out;
  }

  function prism(
    P: ProjFn,
    front: FacingFn,
    ring: HairlineRingPoint[],
    inner: HairlineRingPoint[] | null,
    z0: number,
    z1: number,
  ) {
    return {
      sil: poly(hull([...ringAt(P, ring, z1), ...ringAt(P, ring, z0)])),
      crease: inner ? open(ringAt(P, run(inner, front), z1)) : '',
    };
  }

  const rings = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    b: number,
  ): [HairlineRingPoint[], HairlineRingPoint[]] => [
    rrect(x0, y0, x1, y1, r),
    rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b)),
  ];

  function extremes(P: ProjFn, ring: HairlineRingPoint[]) {
    const pr = ring.map((q) => P(q.u, q.v, 0));
    let a = 0;
    let b = 0;
    let c = 0;
    pr.forEach((p, k) => {
      const pa = pr[a];
      const pb = pr[b];
      const pc = pr[c];
      if (pa && p[0] < pa[0]) a = k;
      if (pb && p[0] > pb[0]) b = k;
      if (pc && p[1] > pc[1]) c = k;
    });
    return [ring[a], ring[b], ring[c]];
  }

  function fillet(pts: Point2D[], rs: number[], n = 4): Point2D[] {
    const m = pts.length;
    const out: Point2D[] = [];
    for (let i = 0; i < m; i++) {
      const a = pts[(i + m - 1) % m];
      const p = pts[i];
      const b = pts[(i + 1) % m];
      if (!a || !p || !b) continue;
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
      const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const t = Math.min(rs[i] ?? 0, la / 2, lb / 2);
      const p1: Point2D = [
        p[0] + ((a[0] - p[0]) / la) * t,
        p[1] + ((a[1] - p[1]) / la) * t,
      ];
      const p2: Point2D = [
        p[0] + ((b[0] - p[0]) / lb) * t,
        p[1] + ((b[1] - p[1]) / lb) * t,
      ];
      for (let k = 0; k <= n; k++) {
        const s = k / n;
        const w = 1 - s;
        out.push([
          w * w * p1[0] + 2 * w * s * p[0] + s * s * p2[0],
          w * w * p1[1] + 2 * w * s * p[1] + s * s * p2[1],
        ]);
      }
    }
    return out;
  }

  function ghost(
    P: ProjFn,
    front: FacingFn,
    ring: HairlineRingPoint[],
    z0: number,
    depth: number,
  ) {
    const f = run(ring, front);
    const lowP = ringAt(P, f, z0 - depth);
    const ends = [f[0], f[f.length - 1]].filter((q): q is HairlineRingPoint =>
      Boolean(q),
    );
    return {
      d:
        open(lowP) +
        ends.map((q) => seg(P(q.u, q.v, z0), P(q.u, q.v, z0 - depth))).join(''),
      y0: Math.min(...ringAt(P, f, z0).map((p) => p[1])),
      y1: Math.max(...lowP.map((p) => p[1])) + 2,
    };
  }

  let reduced = false;
  const setReducedMotion = (on: boolean) => {
    reduced = on;
  };
  const reducedMotion = () => reduced;

  function spring(
    x: number,
    o: { c?: number; eps?: number; k?: number; m?: number } = {},
  ) {
    return {
      x,
      v: 0,
      t: x,
      k: o.k ?? 100,
      c: o.c ?? 18,
      m: o.m ?? 1,
      eps: o.eps ?? 0.01,
    };
  }

  function stepS(
    sp: {
      c: number;
      eps: number;
      k: number;
      m: number;
      t: number;
      v: number;
      x: number;
    },
    dt: number,
  ) {
    if (reduced) {
      sp.x = sp.t;
      sp.v = 0;
      return false;
    }
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = (-sp.k * (sp.x - sp.t) - sp.c * sp.v) / sp.m;
      sp.v += a * h;
      sp.x += sp.v * h;
    }
    if (Math.abs(sp.x - sp.t) < sp.eps && Math.abs(sp.v) < sp.eps * 10) {
      sp.x = sp.t;
      sp.v = 0;
      return false;
    }
    return true;
  }

  function bezier(x1: number, y1: number, x2: number, y2: number) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const X = (u: number) => ((ax * u + bx) * u + cx) * u;
    const Y = (u: number) => ((ay * u + by) * u + cy) * u;
    const dX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
    return (t: number) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      let u = t;
      for (let i = 0; i < 8; i++) {
        const e = X(u) - t;
        if (Math.abs(e) < 1e-5) break;
        const d = dX(u);
        if (Math.abs(d) < 1e-6) break;
        u -= e / d;
      }
      if (!(u >= 0 && u <= 1) || Math.abs(X(u) - t) > 1e-4) {
        let lo = 0;
        let hi = 1;
        u = t;
        for (let i = 0; i < 24; i++) {
          if (X(u) < t) lo = u;
          else hi = u;
          u = (lo + hi) / 2;
        }
      }
      return Y(u);
    };
  }

  const EASE_LIFT = bezier(0.32, 0.72, 0, 1);
  const tween = (v: number, dur = 700): HairlineTween => ({
    from: v,
    to: v,
    t0: -1e9,
    dur,
  });
  const tval = (tw: HairlineTween, now: number) => {
    const p = clamp((now - tw.t0) / tw.dur, 0, 1);
    return tw.from + (tw.to - tw.from) * (reduced ? 1 : EASE_LIFT(p));
  };
  const tset = (tw: HairlineTween, to: number, now: number, delay: number) => {
    if (tw.to === to) return;
    tw.from = tval(tw, now);
    tw.to = to;
    tw.t0 = now + delay;
  };
  const tdone = (tw: HairlineTween, now: number) =>
    reduced || now >= tw.t0 + tw.dur;

  const NS = 'http://www.w3.org/2000/svg';
  function mk(
    tag: string,
    attrs?: Record<string, number | string>,
    parent?: Element | null,
  ): SVGElement {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        e.setAttribute(k, String(attrs[k]));
      }
    }
    if (parent) parent.append(e);
    return e;
  }

  function solid(parent: Element) {
    const g = mk('g', {}, parent);
    return {
      g,
      sil: mk('path', { class: 'sil' }, g),
      cr: mk('path', { class: 'nf lo' }, g),
    };
  }

  const put = (
    el: { cr: SVGElement; sil: SVGElement },
    s: { crease: string; sil: string },
  ) => {
    el.sil.setAttribute('d', s.sil);
    el.cr.setAttribute('d', s.crease);
  };

  const flatDot = (parent: Element, C: HairlineCam, r: number, cls: string) =>
    mk(
      'ellipse',
      { rx: r2(r * C.S), ry: r2(r * C.S * C.k), class: cls },
      parent,
    );

  const place = (el: SVGElement, q: Point2D) => {
    el.setAttribute('cx', String(r2(q[0])));
    el.setAttribute('cy', String(r2(q[1])));
  };

  let fid = 0;
  function fade(svg: Element, y0: number, y1: number, a0 = 0.7) {
    const id = `hl-fd${++fid}`;
    const defs = mk('defs', {}, svg);
    const lg = mk(
      'linearGradient',
      {
        id: `${id}g`,
        gradientUnits: 'userSpaceOnUse',
        x1: 0,
        y1: r2(y0),
        x2: 0,
        y2: r2(y1),
      },
      defs,
    );
    mk('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': a0 }, lg);
    mk('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, lg);
    const m = mk(
      'mask',
      { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 400, height: 320 },
      defs,
    );
    mk(
      'rect',
      { x: 0, y: 0, width: 400, height: 320, fill: `url(#${id}g)` },
      m,
    );
    return `url(#${id})`;
  }

  function reflect(
    svg: Element,
    parent: Element,
    P: ProjFn,
    front: FacingFn,
    ring: HairlineRingPoint[],
    z0: number,
    depth: number,
  ) {
    const r = ghost(P, front, ring, z0, depth);
    const gh = mk('g', { class: 'ghost', mask: fade(svg, r.y0, r.y1) }, parent);
    mk('path', { d: r.d }, gh);
  }

  let boards: HairlineBoard[] = [];
  const byStage = new Map<Element, Set<HairlineBoard>>();
  let raf = 0;
  let last = 0;
  let io: IntersectionObserver | null = null;
  let rm: MediaQueryList | null = null;

  function frame(now: number) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1e3));
    last = now;
    let any = false;
    for (const b of [...boards]) {
      if (b.vis && b.awake) {
        try {
          b.awake = Boolean(b.tick(dt, now));
        } catch (error) {
          b.awake = false;
          setTimeout(() => {
            throw error;
          });
        }
        any = any || b.awake;
      }
    }
    raf = any ? requestAnimationFrame(frame) : 0;
  }

  function wake(b: HairlineBoard) {
    b.awake = true;
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  const onMotion = () => {
    setReducedMotion(Boolean(rm?.matches));
    boards.forEach((b) => wake(b));
  };

  function start() {
    if (io) return;
    io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const set = byStage.get(e.target);
          if (!set) continue;
          for (const b of set) {
            b.vis = e.isIntersecting;
            if (b.vis) wake(b);
          }
        }
      },
      { rootMargin: '80px' },
    );
    rm = matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(rm.matches);
    rm.addEventListener('change', onMotion);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    io?.disconnect();
    io = null;
    rm?.removeEventListener('change', onMotion);
    rm = null;
  }

  function register(
    stage: Element,
    tick: (dt: number, now: number) => boolean,
  ) {
    start();
    const b: HairlineBoard = { stage, tick, vis: false, awake: true };
    boards.push(b);
    const peers = byStage.get(stage);
    if (peers) {
      for (const p of peers) b.vis = p.vis;
      peers.add(b);
      if (b.vis) wake(b);
    } else {
      byStage.set(stage, new Set([b]));
      io?.observe(stage);
    }
    tick(0, performance.now());
    let gone = false;
    return {
      wake: () => {
        if (!gone) wake(b);
      },
      unregister: () => {
        if (gone) return;
        gone = true;
        boards = boards.filter((x) => x !== b);
        const set = byStage.get(stage);
        if (set) {
          set.delete(b);
          if (set.size === 0) {
            byStage.delete(stage);
            io?.unobserve(stage);
          }
        }
        if (boards.length === 0) stop();
      },
    };
  }

  const handlers = new WeakMap<
    Element,
    {
      down?: (pt: Point2D, e: any) => void;
      leave: (e: any) => void;
      move: (pt: Point2D, e: any) => void;
    }
  >();
  const touring = new WeakMap<
    Element,
    { hold: () => void; release: () => void }
  >();

  function pointer(
    stage: HTMLElement,
    on: {
      down?: (pt: Point2D, e: any) => void;
      leave: (e: any) => void;
      move: (pt: Point2D, e: any) => void;
    },
  ) {
    handlers.set(stage, on);
    let tm = 0;
    const pt = (e: PointerEvent): Point2D => {
      const r = stage.getBoundingClientRect();
      return [
        ((e.clientX - r.left) / r.width) * 400,
        ((e.clientY - r.top) / r.height) * 320,
      ];
    };
    const move = (e: PointerEvent) => {
      clearTimeout(tm);
      touring.get(stage)?.hold();
      on.move(pt(e), e);
    };
    const down = (e: PointerEvent) => {
      clearTimeout(tm);
      touring.get(stage)?.hold();
      if (e.pointerType !== 'mouse') stage.releasePointerCapture?.(e.pointerId);
      if (on.down) on.down(pt(e), e);
      else on.move(pt(e), e);
    };
    const leave = (e: PointerEvent) => {
      clearTimeout(tm);
      tm = window.setTimeout(
        () => {
          on.leave(e);
          touring.get(stage)?.release();
        },
        e.pointerType === 'mouse' ? 0 : 1400,
      );
    };
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointerleave', leave);
    return () => {
      clearTimeout(tm);
      if (handlers.get(stage) === on) handlers.delete(stage);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointerleave', leave);
    };
  }

  const LAP: (null | Point2D)[] = [
    [128, 150],
    [200, 118],
    [272, 150],
    [200, 206],
    null,
  ];
  const TRAVEL = 900;
  const DWELL = 1200;
  const REST = 1800;
  const RESUME = 1200;
  const STAGGER = 450;
  const GHOST = { pointerType: 'ghost' };
  let started = 0;

  function entry([x, y]: Point2D): Point2D {
    const dx = x - 200;
    const dy = y - 160;
    if (!dx && !dy) return [200, 320];
    const kx = dx ? (dx > 0 ? 200 : -200) / dx : Infinity;
    const ky = dy ? (dy > 0 ? 160 : -160) / dy : Infinity;
    const k = Math.min(kx, ky);
    return [200 + dx * k, 160 + dy * k];
  }

  function tour(
    stage: HTMLElement,
    stops: (null | Point2D)[],
    onStop?: (idx: number) => void,
  ) {
    let i = 0;
    let wait = RESUME + STAGGER * (started++ % 4);
    let t = -1;
    let at: null | Point2D = null;
    let origin: Point2D = [200, 320];
    let hand = false;
    let keys = stage.contains(stage.ownerDocument.activeElement);
    let gone = false;
    const leave = () => {
      at = null;
      t = -1;
      handlers.get(stage)?.leave(GHOST);
    };
    const tick = (dt: number) => {
      if (hand || keys || stops.length === 0) return false;
      if (reducedMotion()) {
        if (at) leave();
        return false;
      }
      if (wait > 0) {
        wait -= dt * 1e3;
        return true;
      }
      const stop2 = stops[i];
      if (!stop2) {
        if (at) leave();
        onStop?.(i);
        i = (i + 1) % stops.length;
        wait = REST;
        return true;
      }
      const h = handlers.get(stage);
      if (!h) return true;
      if (t < 0) {
        origin = at ?? entry(stop2);
        t = 0;
      }
      t = Math.min(TRAVEL, t + dt * 1e3);
      const k = EASE_LIFT(t / TRAVEL);
      at = [
        origin[0] + (stop2[0] - origin[0]) * k,
        origin[1] + (stop2[1] - origin[1]) * k,
      ];
      h.move(at, GHOST);
      if (t < TRAVEL) return true;
      onStop?.(i);
      i = (i + 1) % stops.length;
      t = -1;
      wait = DWELL;
      return true;
    };
    const take = () => {
      at = null;
      t = -1;
    };
    const give = () => {
      if (hand || keys) return;
      i = 0;
      t = -1;
      wait = RESUME;
      board.wake();
    };
    const me = {
      hold: () => {
        hand = true;
        take();
      },
      release: () => {
        if (!hand) return;
        hand = false;
        give();
      },
    };
    const focusIn = () => {
      keys = true;
      take();
    };
    const focusOut = (e: FocusEvent) => {
      if (keys && !stage.contains(e.relatedTarget as Node | null)) {
        keys = false;
        give();
      }
    };
    stage.addEventListener('focusin', focusIn);
    stage.addEventListener('focusout', focusOut);
    touring.set(stage, me);
    const board = register(stage, tick);
    return {
      stop: () => {
        if (gone) return;
        gone = true;
        board.unregister();
        stage.removeEventListener('focusin', focusIn);
        stage.removeEventListener('focusout', focusOut);
        if (touring.get(stage) === me) touring.delete(stage);
        if (at) leave();
      },
    };
  }

  function disposer() {
    let fns: Array<() => void> = [];
    return {
      add: (fn: () => void) => {
        fns.push(fn);
      },
      on: (
        target: EventTarget,
        type: string,
        fn: EventListenerOrEventListenerObject,
        opts?: AddEventListenerOptions | boolean,
      ) => {
        const h = fn;
        target.addEventListener(type, h, opts);
        fns.push(() => target.removeEventListener(type, h, opts));
      },
      dispose: () => {
        const run2 = fns;
        fns = [];
        for (let i = run2.length - 1; i >= 0; i--) {
          run2[i]?.();
        }
      },
    };
  }

  const LIGHT: Record<string, string> = {
    plate: '#ffffff',
    hi: '#232327',
    edge: '#a4a4ac',
    mid: '#c3c3c9',
    lo: '#e0e0e4',
  };
  const DARK: Record<string, string> = {
    plate: '#08090a',
    hi: '#d0d6e0',
    edge: '#5b5d64',
    mid: '#3e3e44',
    lo: '#29292d',
  };
  const KEYS = ['plate', 'hi', 'edge', 'mid', 'lo'] as const;
  const vars = (p: Record<string, string>) =>
    KEYS.map((k) => `--hl-${k}:var(--hairline-${k},${p[k]});`).join('');
  const EASE = 'cubic-bezier(0.5,0,0.1,1)';
  const SVG = ':where([data-hairline]>svg)';

  function css(lightDark: boolean) {
    const both = Object.fromEntries(
      KEYS.map((k) => [k, `light-dark(${LIGHT[k]},${DARK[k]})`]),
    );
    return [
      `:where([data-hairline]){display:block;position:relative;aspect-ratio:5/4;touch-action:pan-y;user-select:none;-webkit-user-select:none;--hl-sw:var(--hairline-stroke,0.9);${vars(LIGHT)}}`,
      lightDark ? `:where([data-hairline]){${vars(both)}}` : '',
      `:where(.dark,[data-theme="dark"]) :where([data-hairline]){${vars(DARK)}}`,
      `:where([data-hairline][data-hairline-theme="light"]){${vars(LIGHT)}}`,
      `:where([data-hairline][data-hairline-theme="dark"]){${vars(DARK)}}`,
      `:where([data-hairline]:focus-visible){outline:1.5px solid var(--hl-hi);outline-offset:2px}`,
      `${SVG}{position:absolute;inset:0;width:100%;height:100%;display:block}`,
      `:where([data-hairline]>[data-hairline-live]){position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
      `${SVG} :where(path,polygon,ellipse,line){fill:var(--hl-plate);stroke:var(--hl-mid);stroke-width:var(--hl-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;transition:stroke 260ms ${EASE}}`,
      `${SVG} :where(.nf){fill:none}`,
      `${SVG} :where(.fo){stroke:none}`,
      `${SVG} :where(.sil){stroke:var(--hl-edge)}`,
      `${SVG} :where(.hi){stroke:var(--hl-hi)}`,
      `${SVG} :where(.lo){stroke:var(--hl-lo)}`,
      `${SVG} :where(.dash){stroke-dasharray:1 3}`,
      `${SVG} :where(.dot){stroke:none;fill:var(--hl-hi);transition:fill 260ms ${EASE}}`,
      `${SVG} :where(.dot.m){fill:var(--hl-edge)}`,
      `${SVG} :where(.dot.off){fill:var(--hl-lo)}`,
      `${SVG} :where(.ghost path){fill:none;stroke:var(--hl-mid)}`,
    ].join('');
  }

  const done = new WeakSet<Document | ShadowRoot>();
  function inject(root: Document | ShadowRoot) {
    if (done.has(root)) return;
    done.add(root);
    const doc = root.nodeType === 9 ? (root as Document) : root.ownerDocument;
    if (!doc) return;
    const win = doc.defaultView;
    const text = css(
      Boolean(win?.CSS?.supports?.('color', 'light-dark(#000,#fff)')),
    );
    if (win && 'adoptedStyleSheets' in root) {
      try {
        const sheet = new win.CSSStyleSheet();
        sheet.replaceSync(text);
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        return;
      } catch {
        // Fallback to <style> injection when adoptedStyleSheets is unsupported
      }
    }
    const style = doc.createElement('style');
    style.dataset.hairlineStyle = '';
    style.textContent = text;
    const container =
      root.nodeType === 9 ? (doc.head ?? doc.documentElement) : root;
    container.append(style);
  }

  return {
    Cam,
    EASE_LIFT,
    LAP,
    bezier,
    circ,
    clamp,
    css,
    disposer,
    extremes,
    facing,
    fade,
    fillet,
    fit,
    flatDot,
    ghost,
    hull,
    inject,
    lerp,
    mk,
    open,
    place,
    pointer,
    poly,
    prism,
    proj,
    put,
    r2,
    rad,
    reducedMotion,
    reflect,
    register,
    ringAt,
    rings,
    rrect,
    run,
    seg,
    setReducedMotion,
    solid,
    spring,
    stepS,
    tdone,
    tour,
    tset,
    tval,
    tween,
    unproj,
  };
})();
