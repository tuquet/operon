/**
 * Console Controller: an exploded isometric FLYDIGI-style gaming controller
 * (bottom shell, inner PCB, top shell with asymmetrical sticks, D-pad, ABXY,
 * and shoulder bumpers). Moving the pointer toward the center separates the
 * layers and tilts them subtly; the slider controls the maximum explosion gap.
 */
const {
  Cam,
  clamp,
  facing,
  fillet,
  fit,
  hull,
  lerp,
  open,
  poly,
  proj,
  r2,
  rrect,
  seg,
  spring,
  stepS,
  unproj,
  disposer,
  mk,
  place,
  pointer,
  reflect,
  register,
} = HL;

const REST_GAP = 4;

function padRing(scale = 1, inset = 0) {
  const b = inset;
  const s = scale;
  const pts = [
    [-32 * s + b, -22 * s + b],
    [32 * s - b, -22 * s + b],
    [38 * s - b, -6 * s],
    [42 * s - b, 18 * s - b],
    [28 * s - b, 26 * s - b],
    [14 * s, 12 * s - b],
    [-14 * s, 12 * s - b],
    [-28 * s + b, 26 * s - b],
    [-42 * s + b, 18 * s - b],
    [-38 * s + b, -6 * s],
  ];
  const ring = fillet(pts, [8, 8, 6, 10, 9, 6, 6, 9, 10, 6], 4);
  return ring.map(([u, v], i) => {
    const [u0, v0] = ring[(i - 1 + ring.length) % ring.length];
    const [u1, v1] = ring[(i + 1) % ring.length];
    const dx = u1 - u0;
    const dy = v1 - v0;
    const len = Math.hypot(dx, dy) || 1;
    return { u, v, nu: dy / len, nv: -dx / len };
  });
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let maxGap = value;

  const C = Cam(0, 0.55, 2.05);
  fit(
    C,
    [
      [-44, -26, -4],
      [44, 28, 42],
      [44, -26, 0],
      [-44, 28, 0],
    ],
    200,
    166,
  );
  const front = facing(C);
  const P = proj(C);

  const g = mk('g', {}, svg);
  const shellFoot = padRing(1, 0);
  const shellInner = padRing(1, 2.2);
  const pcbFoot = padRing(0.78, 0);
  const pcbInner = padRing(0.78, 1.8);

  reflect(svg, g, P, front, shellFoot, 0, 14);

  const gBot = mk('g', {}, g);
  const botSil = mk('path', { class: 'sil' }, gBot);
  const botCr = mk('path', { class: 'nf lo' }, gBot);
  const botPadL = mk('path', { class: 'nf lo' }, gBot);
  const botPadR = mk('path', { class: 'nf lo' }, gBot);

  const gPcb = mk('g', {}, g);
  const pcbSil = mk('path', { class: 'sil' }, gPcb);
  const pcbCr = mk('path', { class: 'nf lo' }, gPcb);
  const pcbChip = mk('path', { class: 'nf' }, gPcb);
  const pcbTraces = mk('path', { class: 'nf lo' }, gPcb);

  const gTop = mk('g', {}, g);
  const topSil = mk('path', { class: 'sil hi' }, gTop);
  const topCr = mk('path', { class: 'nf lo' }, gTop);
  const shoulders = mk('path', { class: 'nf' }, gTop);
  const stickL = mk('path', { class: 'sil' }, gTop);
  const stickR = mk('path', { class: 'sil' }, gTop);
  const dpad = mk('path', { class: 'nf' }, gTop);
  const abxy = [0, 1, 2, 3].map(() =>
    mk('circle', { r: 3.4, class: 'dot' }, gTop),
  );
  const menuDots = [0, 1].map(() =>
    mk('circle', { r: 1.4, class: 'dot m' }, gTop),
  );

  const spExp = spring(0);
  const spLx = spring(0);
  const spLy = spring(0);
  let lastKey = '';

  function drawLayer(P_off, foot, inner, z0, z1, silEl, crEl) {
    const f0 = foot.map((q) => P_off(q.u, q.v, z0));
    const f1 = foot.map((q) => P_off(q.u, q.v, z1));
    silEl.setAttribute('d', poly(hull([...f0, ...f1])));
    crEl.setAttribute('d', poly(inner.map((q) => P_off(q.u, q.v, z1))));
  }

  function render() {
    const e = spExp.x;
    const lx = spLx.x;
    const ly = spLy.x;
    const key = `${r2(e)},${r2(lx)},${r2(ly)},${r2(maxGap)}`;
    if (key === lastKey) return;
    lastKey = key;

    const gap = lerp(REST_GAP, maxGap, e);
    const zBot0 = 0;
    const zBot1 = 5;
    const zPcb0 = zBot1 + gap * 0.45;
    const zPcb1 = zPcb0 + 2.5;
    const zTop0 = zPcb1 + gap * 0.55;
    const zTop1 = zTop0 + 6;

    const Pbot = (u, v, z) => P(u - lx * 0.4, v - ly * 0.4, z);
    const Ppcb = (u, v, z) => P(u, v, z);
    const Ptop = (u, v, z) => P(u + lx, v + ly, z);

    drawLayer(Pbot, shellFoot, shellInner, zBot0, zBot1, botSil, botCr);
    botPadL.setAttribute(
      'd',
      poly(rrect(-22, 4, -13, 14, 2, 3).map((q) => Pbot(q.u, q.v, zBot1))),
    );
    botPadR.setAttribute(
      'd',
      poly(rrect(13, 4, 22, 14, 2, 3).map((q) => Pbot(q.u, q.v, zBot1))),
    );

    drawLayer(Ppcb, pcbFoot, pcbInner, zPcb0, zPcb1, pcbSil, pcbCr);
    pcbChip.setAttribute(
      'd',
      poly(rrect(-7, -7, 7, 5, 2, 3).map((q) => Ppcb(q.u, q.v, zPcb1))),
    );
    pcbTraces.setAttribute(
      'd',
      seg(Ppcb(-20, -6, zPcb1), Ppcb(-7, -2, zPcb1)) +
        seg(Ppcb(20, -6, zPcb1), Ppcb(7, -2, zPcb1)) +
        seg(Ppcb(-14, 8, zPcb1), Ppcb(-5, 5, zPcb1)) +
        seg(Ppcb(14, 8, zPcb1), Ppcb(5, 5, zPcb1)),
    );

    drawLayer(Ptop, shellFoot, shellInner, zTop0, zTop1, topSil, topCr);

    const exploded = e > 0.35;
    topSil.classList.toggle('hi', !exploded);
    pcbSil.classList.toggle('hi', exploded);
    pcbChip.classList.toggle('hi', exploded);

    shoulders.setAttribute(
      'd',
      open(
        rrect(-28, -24, -12, -20, 1.5, 3).map((q) => Ptop(q.u, q.v, zTop1 - 1)),
      ) +
        open(
          rrect(12, -24, 28, -20, 1.5, 3).map((q) => Ptop(q.u, q.v, zTop1 - 1)),
        ),
    );

    const drawStick = (cx, cy, el) => {
      const base = rrect(cx - 5.5, cy - 5.5, cx + 5.5, cy + 5.5, 5.5, 6).map(
        (q) => Ptop(q.u, q.v, zTop1),
      );
      const cap = rrect(cx - 4.2, cy - 4.2, cx + 4.2, cy + 4.2, 4.2, 6).map(
        (q) => Ptop(q.u + lx * 0.15, q.v + ly * 0.15, zTop1 + 4),
      );
      el.setAttribute('d', poly(hull([...base, ...cap])));
    };
    drawStick(-20, -6, stickL);
    drawStick(12, 4, stickR);

    const dpts = fillet(
      [
        [-15, 1],
        [-11, 1],
        [-11, 5],
        [-7, 5],
        [-7, 9],
        [-11, 9],
        [-11, 13],
        [-15, 13],
        [-15, 9],
        [-19, 9],
        [-19, 5],
        [-15, 5],
      ],
      Array.from({ length: 12 }, () => 1.2),
      2,
    );
    dpad.setAttribute('d', poly(dpts.map(([u, v]) => Ptop(u, v, zTop1 + 1.2))));

    [
      [22, -12],
      [28, -6],
      [22, 0],
      [16, -6],
    ].forEach(([u, v], i) => place(abxy[i], Ptop(u, v, zTop1 + 1)));
    place(menuDots[0], Ptop(-5, -4, zTop1 + 0.5));
    place(menuDots[1], Ptop(5, -4, zTop1 + 0.5));
  }

  render();

  const loop = register(stage, (dt) => {
    const m1 = stepS(spExp, dt);
    const m2 = stepS(spLx, dt);
    const m3 = stepS(spLy, dt);
    render();
    return m1 || m2 || m3;
  });
  bag.add(loop.unregister);

  bag.add(
    pointer(stage, {
      move([sx, sy]) {
        const [wx, wy] = unproj(C, sx, sy, 10);
        const dist = Math.hypot(wx, wy);
        const t = clamp(1 - dist / 52, 0, 1);
        spExp.t = t;
        spLx.t = clamp(wx * 0.08, -3, 3);
        spLy.t = clamp(wy * 0.08, -3, 3);
        if (t > 0.35) {
          read.textContent = `exploded · ${Math.round(t * 100)}%`;
        } else {
          read.textContent = dist < 62 ? 'shell' : 'rest';
        }
        loop.wake();
      },
      leave() {
        spExp.t = 0;
        spLx.t = 0;
        spLy.t = 0;
        read.textContent = 'rest';
        loop.wake();
      },
    }),
  );

  return {
    set(v) {
      maxGap = v;
      render();
      loop.wake();
    },
    destroy() {
      bag.dispose();
      svg.replaceChildren();
    },
  };
}

hairline({
  name: 'console-controller',
  means:
    'An exploded isometric FLYDIGI-style controller that separates its shell, PCB, and controls as the pointer approaches.',
  rules: [1, 3, 4, 5, 6, 8, 9, 10],
  range: [10, 22, 34],
  tour: [[200, 166], [155, 145], [245, 160], null],
  mount,
});
