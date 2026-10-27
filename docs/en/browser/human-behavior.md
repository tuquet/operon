# Biometric Human Dynamics & Bézier Trajectories

Modern anti-bot security platforms (Cloudflare Turnstile, DataDome, Akamai Bot Manager, Kasada) no longer evaluate browser sessions based solely on passive hardware fingerprints. They actively monitor client-side behavioral telemetry: cursor velocity, acceleration profiles, hesitation pauses, click coordinate variance, and scroll inertia.

Standard automation scripts (such as default Playwright or Puppeteer scripts) move cursors along straight mathematical vectors or teleport instantly between coordinates, triggering immediate CAPTCHA challenges or silent account flags.

**Operon** solves this by embedding a **Biometric Human Dynamics Engine** that generates mathematically organic movement curves, realistic keystroke latencies, and physical mouse-wheel inertia.

---

## 1. Cubic Bézier Curve Trajectory Mathematics

Operon models cursor movements using parametric **Cubic Bézier Curves** modulated by randomized physical control points:

$$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3, \quad t \in [0, 1]$$

```text
       P1 (Randomized Arc Control)
         o-----------------.
        /                   \
       /                     \
      o                       \
  P0 (Origin)                  \
                                \           P2 (Target Approach Control)
                                 `-----------o
                                              \
                                               o P3 (Target Click Point)
```

1. **Origin ($P_0$) & Target ($P_3$)**:
   - The starting cursor position and the target clickable DOM element coordinates.
2. **Dynamic Control Points ($P_1, P_2$)**:
   - Randomly offset along the movement vector to simulate the biomechanical arc of a human forearm and wrist.
3. **Target Overshoot & Correction**:
   - High-speed human ballistic movements frequently overshoot target buttons by 2–5 pixels before an optical feedback loop corrects the trajectory back to the center of the element. Operonemulates this correction phase automatically.

---

## 2. Velocity Profiling & Gaussian Micro-Jitter

```text
 Velocity (px/ms)
   ▲
   │        Ballistic Acceleration Phase
   │             ╭──────────────╮
   │            ╱                ╲
   │           ╱                  ╲
   │          ╱                    ╲    Homing & Deceleration Phase
   │         ╱                      ╲──────────────╮
   │   ─────╯                                      ╰─────
   └────────────────────────────────────────────────────────► Time (ms)
     Cognitive Start                              Element Arrival
```

1. **Three-Phase Velocity Profile**:
   - **Phase 1 (Cognitive Initiation)**: Slow acceleration from standstill (40–80ms latency).
   - **Phase 2 (Ballistic Motion)**: Rapid acceleration across open screen space.
   - **Phase 3 (Homing & Deceleration)**: Smooth deceleration as the cursor enters the target bounding box.
2. **Biomechanical Micro-Jitter**:
   - Injects subtle sub-pixel Gaussian noise into mouse coordinates during travel, replicating optical sensor micro-vibrations and physiological human hand tremor.
3. **Pre-Click Cognitive Hesitation**:
   - Human users rarely click the millisecond a cursor lands on a button. inserts a randomized 80–220ms hesitation interval simulating visual confirmation before dispatching `mousedown` and `mouseup` events.

---

## 3. Natural Keystroke Cadence

When filling input fields, bots type with mathematically rigid intervals (e.g. exactly 50ms per character). Anti-bot scripts analyze inter-key latency distributions to detect automated input.

generates organic typing cadences:
- **Variable Key Intervals**: Keystroke durations vary randomly between 40ms and 180ms following a log-normal distribution.
- **Digram Frequency Modeling**: Common character combinations (such as *th*, *er*, *in*, *an*) are typed with shorter intervals than awkward key transitions.
- **Thinking Pauses**: Introduces occasional longer pauses (300–600ms) between words or input fields to simulate human typing cadence.

<HairlineFigure name="keyboard" />

---

## 4. Inertial Wheel Scrolling

Direct JavaScript scrolling via `window.scrollTo(0, 1200)` triggers telemetry alarms because real users navigate pages using mouse wheel detents or trackpad inertia.

implements physics-based smooth scrolling:
- Dispatches native CDP `Input.dispatchMouseEvent` wheel events with progressive scroll deltas.
- Decelerates naturally with simulated friction and damping coefficients.
- Introduces brief reading pauses at content sections.

---

## 5. Live Verification Demo

Verify human dynamics and Turnstile challenge bypass rates on your workstation:

```bash
# Launch visual browser verification against live Cloudflare Turnstile
opn browser verify --url "https://turnstile.zeroclick.io"
```

The verification command renders cursor trajectories in real time, demonstrating smooth Bézier curve navigation, target deceleration, and successful automated challenge resolution.
