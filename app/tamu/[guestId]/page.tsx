"use client";

// app/tamu/[guestId]/page.tsx
// Halaman undangan personal per tamu — data REAL dari Supabase
// CircularCarousel (react-bits, TS-TW) sudah di-inline di file ini

import React, {
  useState, use, useEffect, useLayoutEffect, useRef, useCallback, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Guest, Wish } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════════════════
   CIRCULAR CAROUSEL (inline)
   ═══════════════════════════════════════════════════════════════════════════ */

interface CircularCarouselItem {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
}

type CircularCarouselPreset = "cylinder" | "orbit" | "wheel" | "panorama";
type CircularCarouselIntro = "assemble" | "rise" | "spin" | "none";
type CircularCarouselAutoplay = "drift" | "step" | "off";

interface CircularCarouselProps {
  items?: CircularCarouselItem[];
  preset?: CircularCarouselPreset;
  intro?: CircularCarouselIntro;
  cardWidth?: number;
  aspectRatio?: number;
  gap?: number;
  curve?: number;
  tilt?: number;
  perspective?: number;
  autoplay?: CircularCarouselAutoplay;
  speed?: number;
  interval?: number;
  direction?: "left" | "right";
  draggable?: boolean;
  momentum?: number;
  snap?: boolean;
  pauseOnHover?: boolean;
  focusOnClick?: boolean;
  parallax?: number;
  stretch?: number;
  depthFade?: number;
  fadeColor?: string;
  innerShade?: number;
  cornerRadius?: number;
  captions?: boolean;
  onChange?: (index: number) => void;
  onItemClick?: (item: CircularCarouselItem, index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

type Vec3 = [number, number, number];

interface CCLayout {
  axis: "x" | "y";
  tilt: number;
  perspective: number;
  curve: number;
  spread: number;
  inward: boolean;
  billboard: boolean;
  backfaces: boolean;
  window: number;
}

interface CCTile {
  index: number;
  total: number;
  start: number;
  end: number;
  size: number;
  move: string;
}

interface CCSample {
  time: number;
  angle: number;
}

interface CCPress {
  id: number;
  x: number;
  y: number;
  angle: number;
  moved: boolean;
  origin: number;
  samples: CCSample[];
}

interface CarouselState {
  angle: number;
  velocity: number;
  target: number | null;
  dir: number;
  press: CCPress | null;
  drag: boolean;
  hover: boolean;
  pointer: { inside: boolean; x: number; y: number };
  yaw: number;
  pitch: number;
  intro: { type: CircularCarouselIntro; start: number } | null;
  introDone: boolean;
  holdUntil: number;
  stepAt: number;
  suppressClick: boolean;
  wheelTimer: ReturnType<typeof setTimeout> | undefined;
  fit: number;
  shift: number;
  drop: number;
  last: number;
}

interface CCSettings {
  count: number;
  step: number;
  radius: number;
  layout: CCLayout;
  axis: "x" | "y";
  tilt: number;
  perspective: number;
  cardW: number;
  cardH: number;
  intro: CircularCarouselIntro;
  autoplay: CircularCarouselAutoplay;
  speed: number;
  interval: number;
  draggable: boolean;
  momentum: number;
  snap: boolean;
  pauseOnHover: boolean;
  parallax: number;
  stretch: number;
  depthFade: number;
  captions: boolean;
  reduced: boolean;
}

interface IntroPose {
  radius: number;
  lift: number;
}

interface Leaving {
  id: number;
  items: CircularCarouselItem[];
  delays: number[];
}

const CC_STYLE = `
@keyframes circular-carousel-title { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes circular-carousel-leave { from { opacity: 1; } to { opacity: 0; } }
@keyframes circular-carousel-reveal { from { opacity: 0; } to { opacity: 1; } }
`;

const CC_MASKS: Partial<Record<CircularCarouselPreset, string>> = {
  wheel: "linear-gradient(to bottom, transparent, #000000 18%, #000000 82%, transparent)",
  panorama: "linear-gradient(to right, transparent, #000000 12%, #000000 88%, transparent)",
};

const ccPhoto = (id: string) =>
  `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=max&sat=-100`;

const CC_DEFAULT_ITEMS: CircularCarouselItem[] = [
  { src: ccPhoto("photo-1506744038136-46273834b3fb"), alt: "Mist drifting through a mountain valley", title: "Valley", subtitle: "Landscape" },
  { src: ccPhoto("photo-1524504388940-b1c1722653e1"), alt: "A woman with long hair in soft studio light", title: "Portrait", subtitle: "Studio" },
  { src: ccPhoto("photo-1486406146926-c627a92ad1ab"), alt: "Glass towers seen from street level", title: "Towers", subtitle: "Architecture" },
  { src: ccPhoto("photo-1502680390469-be75c86b636f"), alt: "A surfer carving inside a breaking wave", title: "Swell", subtitle: "Ocean" },
  { src: ccPhoto("photo-1487958449943-2429e8be8625"), alt: "An angular white building against the sky", title: "Facade", subtitle: "Architecture" },
  { src: ccPhoto("photo-1509631179647-0177331693ae"), alt: "A model in striped trousers leaning on a wall", title: "Pose", subtitle: "Editorial" },
  { src: ccPhoto("photo-1519681393784-d120267933ba"), alt: "The Milky Way above snowy peaks", title: "Night", subtitle: "Sky" },
  { src: ccPhoto("photo-1485968579580-b6d095142e6e"), alt: "A woman in a long coat on a city street", title: "Street", subtitle: "Editorial" },
  { src: ccPhoto("photo-1493246507139-91e8fad9978e"), alt: "Mountains mirrored in a still lake", title: "Mirror", subtitle: "Landscape" },
  { src: ccPhoto("photo-1511818966892-d7d671e672a2"), alt: "A glass skyscraper under a cloudy sky", title: "Glass", subtitle: "Architecture" },
];

const CC_PRESETS: Record<CircularCarouselPreset, CCLayout> = {
  cylinder: { axis: "y", tilt: -5, perspective: 2500, curve: 1, spread: 1, inward: false, billboard: false, backfaces: true, window: 0 },
  orbit: { axis: "y", tilt: -16, perspective: 1500, curve: 0, spread: 1.45, inward: false, billboard: true, backfaces: false, window: 0 },
  wheel: { axis: "x", tilt: 0, perspective: 1800, curve: 0, spread: 1, inward: false, billboard: false, backfaces: true, window: 1.7 },
  panorama: { axis: "y", tilt: 0, perspective: 0, curve: 1, spread: 1, inward: true, billboard: false, backfaces: false, window: 0 },
};

const CC_INTRO_LENGTH: Record<CircularCarouselIntro, number> = { assemble: 1500, rise: 1400, spin: 1800, none: 0 };
const CC_TILES = 8;
const CC_OVERLAP = 2.5;
const CC_DRAG_THRESHOLD = 5;
const CC_SPRING = 118;
const CC_SETTLE_SPEED = 9;
const CC_CAPTION_SPACE = 76;
const CC_SWAP_LENGTH = 700;
const CC_SWAP_SPREAD = 420;
const TO_RAD = Math.PI / 180;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

const rotateX = (p: Vec3, degrees: number): Vec3 => {
  const r = degrees * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

const rotateY = (p: Vec3, degrees: number): Vec3 => {
  const r = degrees * TO_RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

const Digits = ({ value }: { value: number }) => (
  <span className="inline-flex">
    {String(value)
      .padStart(2, "0")
      .split("")
      .map((digit, index) => (
        <span key={index} className="inline-block h-[1em] overflow-hidden">
          <span
            className="flex flex-col transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateY(${-Number(digit) * 10}%)` }}
          >
            {"0123456789".split("").map((n) => (
              <span key={n} className="h-[1em]">{n}</span>
            ))}
          </span>
        </span>
      ))}
  </span>
);

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
};

const CircularCarousel = ({
  items = CC_DEFAULT_ITEMS,
  preset = "cylinder",
  intro = "rise",
  cardWidth = 220,
  aspectRatio = 1,
  gap = 25,
  curve,
  tilt,
  perspective,
  autoplay = "drift",
  speed = 14,
  interval = 3,
  direction = "left",
  draggable = true,
  momentum = 0.6,
  snap = true,
  pauseOnHover = true,
  focusOnClick = true,
  parallax = 0.3,
  stretch = 0.5,
  depthFade = 0.55,
  fadeColor = "#000000",
  innerShade = 0.6,
  cornerRadius = 12,
  captions = false,
  onChange,
  onItemClick,
  className = "",
  style,
}: CircularCarouselProps) => {
  const incoming = items && items.length ? items : CC_DEFAULT_ITEMS;
  const [list, setList] = useState<CircularCarouselItem[]>(incoming);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const count = list.length;
  const shape: CircularCarouselPreset = CC_PRESETS[preset] ? preset : "cylinder";
  const layout = CC_PRESETS[shape];
  const axis = layout.axis;
  const tiltValue = tilt ?? layout.tilt;
  const curveValue = layout.billboard ? 0 : clamp(curve ?? layout.curve, 0, 1);
  const reduced = usePrefersReducedMotion();

  const cardW = Math.max(40, cardWidth);
  const cardH = cardW / clamp(aspectRatio, 0.2, 5);
  const along = axis === "x" ? cardH : cardW;
  const step = 360 / count;

  const radius = useMemo(() => {
    const n = Math.max(count, 3);
    const pitch = (along + gap) * layout.spread;
    const chord = pitch / (2 * Math.sin(Math.PI / n));
    const arc = (n * pitch) / (2 * Math.PI);
    return Math.max(chord + (arc - chord) * curveValue, along * 0.6);
  }, [count, along, gap, curveValue, layout.spread]);

  const tiles = useMemo<CCTile[]>(() => {
    const total = curveValue > 0.001 ? CC_TILES : 1;
    const length = along / total;
    const bend = curveValue > 0.001 ? radius / curveValue : 0;
    return Array.from({ length: total }, (_, index) => {
      const start = index * length - (index > 0 ? CC_OVERLAP / 2 : 0);
      const end = (index + 1) * length + (index < total - 1 ? CC_OVERLAP / 2 : 0);
      const center = (start + end) / 2 - along / 2;
      const alpha = bend ? center / bend : 0;
      const shift = bend ? bend * Math.sin(alpha) : center;
      const sink = bend ? bend * (1 - Math.cos(alpha)) : 0;
      const depth = layout.inward ? sink : -sink;
      const turn = ((layout.inward ? -alpha : alpha) * 180) / Math.PI;
      const move =
        axis === "x"
          ? `translate3d(0px, ${shift}px, ${depth}px) rotateX(${-turn}deg)`
          : `translate3d(${shift}px, 0px, ${depth}px) rotateY(${turn}deg)`;
      return { index, total, start, end, size: end - start, move };
    });
  }, [along, axis, curveValue, layout.inward, radius]);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wakeRef = useRef<() => void>(() => {});
  const measureRef = useRef<() => void>(() => {});
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const readyRef = useRef(false);
  readyRef.current = ready;

  const stateRef = useRef<CarouselState>({
    angle: 0, velocity: 0, target: null, dir: 0, press: null, drag: false, hover: false,
    pointer: { inside: false, x: 0, y: 0 }, yaw: 0, pitch: 0, intro: null, introDone: false,
    holdUntil: 0, stepAt: 0, suppressClick: false, wheelTimer: undefined,
    fit: 1, shift: 0, drop: 0, last: 0,
  });

  const settings: CCSettings = {
    count, step, radius, layout, axis,
    tilt: tiltValue,
    perspective: layout.inward ? radius : (perspective ?? layout.perspective),
    cardW, cardH,
    intro: reduced ? "none" : intro in CC_INTRO_LENGTH ? intro : "rise",
    autoplay: reduced ? "off" : autoplay,
    speed,
    interval: Math.max(0.5, interval),
    draggable,
    momentum: clamp(momentum, 0, 1),
    snap, pauseOnHover,
    parallax: reduced ? 0 : clamp(parallax, 0, 1),
    stretch: reduced ? 0 : clamp(stretch, 0, 1),
    depthFade: clamp(depthFade, 0, 1),
    captions, reduced,
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const dragSign = layout.inward ? -1 : 1;
  const directionSign = (direction === "right" ? 1 : -1) * dragSign;

  useEffect(() => {
    stateRef.current.dir = directionSign;
    wakeRef.current();
  }, [directionSign]);

  const incomingRef = useRef(incoming);
  incomingRef.current = incoming;
  const listRef = useRef(list);
  listRef.current = list;
  const sourcesKey = incoming.map((item) => item.src).join("|");

  useEffect(() => {
    let cancelled = false;
    const next = incomingRef.current;
    const smooth = readyRef.current && next.length === listRef.current.length;
    if (!smooth) {
      setReady(false);
      setLeaving(null);
      setList(next);
    }
    const sources = next.slice(0, 16).map((item) => item.src);
    const load = (src: string) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          if (image.decode)
            image.decode().then(() => resolve(), () => resolve());
          else resolve();
        };
        image.onerror = () => resolve();
        image.src = src;
      });
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2400));
    Promise.race([Promise.all(sources.map(load)), timeout]).then(() => {
      if (cancelled) return;
      const state = stateRef.current;
      if (smooth) {
        const previous = listRef.current;
        const s = settingsRef.current;
        if (!s.reduced && previous !== next) {
          setLeaving((current) => ({
            id: (current?.id || 0) + 1,
            items: previous,
            delays: previous.map((_, index) => (Math.abs(wrap(index * s.step + state.angle)) / 180) * CC_SWAP_SPREAD),
          }));
        }
        setList(next);
        wakeRef.current();
        return;
      }
      state.introDone = false;
      state.intro = null;
      setReady(true);
      wakeRef.current();
    });
    return () => { cancelled = true; };
  }, [sourcesKey]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(null), CC_SWAP_LENGTH + CC_SWAP_SPREAD + 80);
    return () => clearTimeout(timer);
  }, [leaving]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const ring = ringRef.current;
    if (!root || !stage || !camera || !ring) return undefined;
    const state = stateRef.current;
    let raf = 0;
    let visible = true;

    const nearest = (angle: number) => Math.round(angle / settingsRef.current.step) * settingsRef.current.step;

    const measure = () => {
      const s = settingsRef.current;
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const room = s.captions ? CC_CAPTION_SPACE : 0;
      const width = rect.width * 0.94;
      const height = (rect.height - room) * 0.92;
      const P = s.perspective;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      if (s.layout.inward) {
        minX = -width / 2;
        maxX = width / 2;
        minY = -s.cardH / 2;
        maxY = s.cardH / 2;
      } else {
        const corners: [number, number][] = [
          [-s.cardW / 2, -s.cardH / 2],
          [s.cardW / 2, -s.cardH / 2],
          [-s.cardW / 2, s.cardH / 2],
          [s.cardW / 2, s.cardH / 2],
        ];
        const limit = s.layout.window ? s.layout.window * s.step : 180;
        for (let a = -limit; a <= limit; a += limit / 24) {
          for (const [cx, cy] of corners) {
            let p: Vec3;
            if (s.axis === "x") {
              p = rotateY(rotateX([cx, cy, s.radius], -a), s.tilt);
            } else if (s.layout.billboard) {
              const c = rotateY([0, 0, s.radius], a);
              p = rotateX([c[0] + cx, cy, c[2]], s.tilt);
            } else {
              p = rotateX(rotateY([cx, cy, s.radius], a), s.tilt);
            }
            p = [p[0], p[1], p[2] - s.radius];
            if (p[2] >= P * 0.95) continue;
            const k = P / (P - p[2]);
            minX = Math.min(minX, p[0] * k);
            maxX = Math.max(maxX, p[0] * k);
            minY = Math.min(minY, p[1] * k);
            maxY = Math.max(maxY, p[1] * k);
          }
        }
      }
      const spanX = Math.max(maxX - minX, 1);
      const spanY = Math.max(maxY - minY, 1);
      const fit = Math.min(1, width / spanX, height / spanY);
      state.fit = fit;
      state.shift = -((minY + maxY) / 2) * fit - room / 2;
      state.drop = s.axis === "x" ? (rect.width / fit) * 0.55 + s.cardW : (rect.height / fit) * 0.55 + s.cardH;
      stage.style.perspective = `${P}px`;
      stage.style.transform = `translate3d(0, ${state.shift}px, 0) scale(${fit})`;
    };
    measureRef.current = measure;

    const introCard = (elapsed: number, landing: number): IntroPose => {
      if (!state.intro) return { radius: 1, lift: 0 };
      const type = state.intro.type;
      const reach = Math.abs(wrap(landing + state.angle));
      if (type === "assemble") {
        const delay = (reach / 180) * 420;
        const p = easeOut(clamp((elapsed - delay) / 1080, 0, 1));
        return { radius: 1 + 0.6 * (1 - p), lift: 0 };
      }
      if (type === "rise") {
        const delay = (reach / 180) * 480;
        const p = easeOutQuint(clamp((elapsed - delay) / 900, 0, 1));
        return { radius: 1, lift: (1 - p) * state.drop };
      }
      if (type === "spin") {
        const p = easeOut(clamp(elapsed / CC_INTRO_LENGTH.spin, 0, 1));
        return { radius: 1 + 0.28 * (1 - p), lift: 0 };
      }
      return { radius: 1, lift: 0 };
    };

    const advance = (s: CCSettings, dt: number, now: number) => {
      if (!state.introDone && readyRef.current) {
        if (!state.intro) {
          if (s.intro === "none") state.introDone = true;
          else state.intro = { type: s.intro, start: now };
        }
        if (state.intro && now - state.intro.start >= CC_INTRO_LENGTH[state.intro.type]) {
          state.intro = null;
          state.introDone = true;
        }
      }

      const paused = (s.pauseOnHover && state.hover) || state.drag || now < state.holdUntil;
      const cruise = s.autoplay === "drift" && !paused && !state.intro ? s.speed * state.dir : 0;
      let busy = Boolean(state.intro) || state.drag;

      if (state.drag || state.intro) {
        state.velocity = state.drag ? state.velocity : 0;
      } else if (state.target !== null) {
        let remaining = dt;
        const damping = 2 * Math.sqrt(CC_SPRING);
        while (remaining > 0) {
          const h = Math.min(remaining, 1 / 240);
          const accel = CC_SPRING * (state.target - state.angle) - damping * state.velocity;
          state.velocity += accel * h;
          state.angle += state.velocity * h;
          remaining -= h;
        }
        if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
          state.angle = state.target;
          state.velocity = 0;
          state.target = null;
        }
        busy = true;
      } else {
        const tau = 0.18 + s.momentum * 1.5;
        state.velocity += (cruise - state.velocity) * (1 - Math.exp(-dt / tau));
        state.angle += state.velocity * dt;
        if (cruise === 0 && s.snap && Math.abs(state.velocity) < CC_SETTLE_SPEED) {
          state.target = nearest(state.angle);
        }
        busy = busy || cruise !== 0 || Math.abs(state.velocity) > 0.01 || state.target !== null;
      }

      if (s.autoplay === "step" && !paused && !state.intro && state.introDone) {
        if (!state.stepAt) state.stepAt = now + s.interval * 1000;
        if (now >= state.stepAt) {
          state.target = (state.target ?? nearest(state.angle)) + s.step * state.dir;
          state.stepAt = now + s.interval * 1000;
        }
        busy = true;
      } else {
        state.stepAt = 0;
      }

      if (now < state.holdUntil) busy = true;

      const ease = 1 - Math.exp(-dt / 0.35);
      const aimYaw = state.pointer.inside ? state.pointer.x * s.parallax * 9 : 0;
      const aimPitch = state.pointer.inside ? -state.pointer.y * s.parallax * 6 : 0;
      state.yaw += (aimYaw - state.yaw) * ease;
      state.pitch += (aimPitch - state.pitch) * ease;
      if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;

      return busy;
    };

    const render = (s: CCSettings, now: number) => {
      const elapsed = state.intro ? now - state.intro.start : 0;
      const swell = 1 + s.stretch * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
      let spinOffset = 0;
      if (state.intro?.type === "spin") {
        const p = easeOut(clamp(elapsed / CC_INTRO_LENGTH.spin, 0, 1));
        spinOffset = -300 * state.dir * (1 - p);
      } else if (state.intro?.type === "assemble") {
        const p = easeOut(clamp(elapsed / CC_INTRO_LENGTH.assemble, 0, 1));
        spinOffset = -32 * state.dir * (1 - p);
      }
      const angle = state.angle + spinOffset;
      const R = s.radius * swell;

      if (s.axis === "x") {
        camera.style.transform = `translate3d(0, 0, ${-R}px) rotateY(${s.tilt + state.yaw}deg) rotateX(${state.pitch}deg)`;
        ring.style.transform = `rotateX(${-angle}deg)`;
      } else if (s.layout.inward) {
        camera.style.transform = `translate3d(0, 0, ${s.perspective - 1}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
        ring.style.transform = `rotateY(${angle}deg)`;
      } else {
        camera.style.transform = `translate3d(0, 0, ${-R}px) rotateX(${s.tilt + state.pitch}deg) rotateY(${state.yaw}deg)`;
        ring.style.transform = `rotateY(${angle}deg)`;
      }

      for (let index = 0; index < s.count; index++) {
        const card = cardRefs.current[index];
        if (!card) continue;
        const base = index * s.step;
        const mod = introCard(elapsed, base);
        const r = R * mod.radius;
        let transform: string;
        if (s.axis === "x") {
          transform = `rotateX(${-base}deg) translateZ(${r}px)`;
        } else if (s.layout.inward) {
          transform = `rotateY(${base}deg) translateZ(${-r}px)`;
        } else {
          transform = `rotateY(${base}deg) translateZ(${r}px)`;
          if (s.layout.billboard) transform += ` rotateY(${-(base + angle)}deg)`;
        }
        if (mod.lift) transform += s.axis === "x" ? ` translateX(${mod.lift}px)` : ` translateY(${mod.lift}px)`;
        card.style.transform = transform;

        const world = wrap(base + angle);
        const facing = Math.cos(world * TO_RAD);
        if (s.layout.inward) card.style.visibility = Math.abs(world) > 86 ? "hidden" : "";
        const fade = s.depthFade * Math.pow((1 - facing) / 2, 1.25);
        card.style.setProperty("--cc-depth", fade.toFixed(3));
      }

      const index = ((Math.round(-state.angle / s.step) % s.count) + s.count) % s.count || 0;
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
        onChangeRef.current?.(index);
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const s = settingsRef.current;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
      state.last = now;
      const busy = advance(s, dt, now);
      render(s, now);
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else state.last = 0;
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        state.last = 0;
      } else wake();
    };

    const resize = new ResizeObserver(() => {
      measure();
      wake();
    });
    resize.observe(root);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        state.last = 0;
      }
    });
    io.observe(root);

    const onWheel = (event: WheelEvent) => {
      const s = settingsRef.current;
      if (!s.draggable) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (!delta) return;
      event.preventDefault();
      const perPixel = 180 / (Math.PI * s.radius * state.fit);
      state.target = null;
      state.angle -= delta * perPixel * (s.layout.inward ? -1 : 1);
      state.velocity = -delta * perPixel * (s.layout.inward ? -1 : 1) * 30;
      state.holdUntil = performance.now() + 1600;
      clearTimeout(state.wheelTimer);
      state.wheelTimer = setTimeout(() => {
        if (settingsRef.current.snap) state.target = nearest(state.angle + state.velocity * 0.12);
        wake();
      }, 140);
      wake();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("visibilitychange", onVisibility);

    measure();
    render(settingsRef.current, performance.now());
    wake();

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
      clearTimeout(state.wheelTimer);
      root.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    measureRef.current();
    wakeRef.current();
  }, [radius, cardW, cardH, tiltValue, perspective, preset, captions, count]);

  useEffect(() => {
    wakeRef.current();
  });

  const focusIndex = useCallback((index: number) => {
    const state = stateRef.current;
    const s = settingsRef.current;
    let target = -index * s.step;
    target += 360 * Math.round((state.angle - target) / 360);
    state.target = target;
    state.holdUntil = performance.now() + 2800;
    wakeRef.current();
  }, []);

  const stepBy = useCallback((delta: number) => {
    const state = stateRef.current;
    const s = settingsRef.current;
    const base = state.target ?? Math.round(state.angle / s.step) * s.step;
    state.target = base - delta * s.step * (s.layout.inward ? -1 : 1);
    state.holdUntil = performance.now() + 2800;
    wakeRef.current();
  }, []);

  const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const pointer = stateRef.current.pointer;
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current;
    state.suppressClick = false;
    if (!draggable || event.button !== 0) return;
    state.press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: state.angle,
      moved: false,
      origin: 0,
      samples: [{ time: performance.now(), angle: state.angle }],
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current;
    if (event.pointerType === "mouse") {
      state.pointer.inside = true;
      updatePointer(event);
    }
    const press = state.press;
    if (!press || press.id !== event.pointerId) {
      wakeRef.current();
      return;
    }
    const s = settingsRef.current;
    const delta = s.axis === "x" ? event.clientY - press.y : event.clientX - press.x;
    const cross = s.axis === "x" ? event.clientX - press.x : event.clientY - press.y;
    if (!press.moved) {
      if (Math.abs(delta) < CC_DRAG_THRESHOLD) return;
      if (Math.abs(cross) > Math.abs(delta) * 1.2 && event.pointerType !== "mouse") {
        state.press = null;
        return;
      }
      press.moved = true;
      press.origin = delta;
      state.drag = true;
      state.target = null;
      state.velocity = 0;
      setDragging(true);
      try {
        rootRef.current?.setPointerCapture(event.pointerId);
      } catch {}
    }
    const perPixel = 180 / (Math.PI * s.radius * state.fit);
    state.angle = press.angle + (delta - press.origin) * perPixel * (s.layout.inward ? -1 : 1);
    const now = performance.now();
    press.samples.push({ time: now, angle: state.angle });
    while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
    wakeRef.current();
  };

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current;
    const press = state.press;
    if (!press || press.id !== event.pointerId) return;
    state.press = null;
    if (!press.moved) return;
    state.drag = false;
    setDragging(false);
    state.suppressClick = true;
    const s = settingsRef.current;
    const first = press.samples[0];
    const last = press.samples[press.samples.length - 1];
    const span = (last.time - first.time) / 1000;
    const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
    state.velocity = velocity;
    if (Math.abs(velocity) > 60) state.dir = Math.sign(velocity);
    const coasting = s.autoplay === "drift" && !(s.pauseOnHover && state.hover && event.pointerType === "mouse");
    if (s.snap && !coasting) {
      const tau = 0.18 + s.momentum * 1.5;
      state.target = Math.round((state.angle + velocity * tau * 0.55) / s.step) * s.step;
    }
    wakeRef.current();
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    stateRef.current.hover = true;
    wakeRef.current();
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = stateRef.current;
    if (event.pointerType === "mouse") {
      state.hover = false;
      state.pointer.inside = false;
    }
    wakeRef.current();
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const state = stateRef.current;
    if (state.suppressClick) {
      state.suppressClick = false;
      return;
    }
    const card = (event.target as HTMLElement).closest?.("[data-cc-index]");
    if (!card) return;
    const index = Number(card.getAttribute("data-cc-index"));
    if (focusOnClick) focusIndex(index);
    onItemClick?.(list[index], index);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const forward = axis === "x" ? "ArrowDown" : "ArrowRight";
    const backward = axis === "x" ? "ArrowUp" : "ArrowLeft";
    if (event.key === forward) stepBy(1);
    else if (event.key === backward) stepBy(-1);
    else if (event.key === "Home") focusIndex(0);
    else if (event.key === "End") focusIndex(count - 1);
    else if (event.key === "Enter" || event.key === " ") onItemClick?.(list[activeRef.current], activeRef.current);
    else return;
    event.preventDefault();
  };

  const current = list[active] || list[0];
  const label = current ? current.title || current.alt || `Image ${active + 1}` : "";

  const renderTile = (item: CircularCarouselItem, tile: CCTile, back: boolean, index: number) => {
    const strip = back ? tile.total - 1 - tile.index : tile.index;
    const first = strip === 0;
    const last = strip === tile.total - 1;
    const r = "var(--cc-radius)";
    const frameRadius =
      axis === "x"
        ? `${first ? r : 0} ${first ? r : 0} ${last ? r : 0} ${last ? r : 0}`
        : `${first ? r : 0} ${last ? r : 0} ${last ? r : 0} ${first ? r : 0}`;
    const offset = back ? along - tile.end : tile.start;
    const size = tile.size;
    const box: React.CSSProperties =
      axis === "x"
        ? { left: -cardW / 2, top: -size / 2, width: cardW, height: size }
        : { left: -size / 2, top: -cardH / 2, width: size, height: cardH };
    const photoStyle: React.CSSProperties =
      axis === "x"
        ? { left: 0, top: -offset, width: cardW, height: cardH }
        : { left: -offset, top: 0, width: cardW, height: cardH };
    const flip = axis === "x" ? " rotateX(180deg)" : " rotateY(180deg)";
    const gone = leaving?.items[index];
    return (
      <div
        key={`${back ? "b" : "f"}${tile.index}`}
        className="absolute [-webkit-backface-visibility:hidden] [backface-visibility:hidden] [outline:1px_solid_transparent]"
        style={{ ...box, transform: tile.move + (back ? flip : "") }}
        aria-hidden="true"
      >
        <div
          className="absolute left-0 top-0 w-full overflow-hidden"
          style={{ height: axis === "x" ? size : cardH, borderRadius: frameRadius }}
        >
          <img
            className="pointer-events-none absolute block max-w-none select-none object-cover [-webkit-user-drag:none]"
            src={item.src}
            alt=""
            draggable={false}
            decoding="async"
            style={photoStyle}
          />
          {gone && leaving && (
            <img
              key={`leaving-${leaving.id}`}
              className="pointer-events-none absolute block max-w-none select-none object-cover [-webkit-user-drag:none] animate-[circular-carousel-leave_700ms_cubic-bezier(0.33,1,0.68,1)_both]"
              src={gone.src}
              alt=""
              draggable={false}
              decoding="async"
              style={{ ...photoStyle, animationDelay: `${Math.round(leaving.delays[index])}ms` }}
            />
          )}
          {back && <div className="pointer-events-none absolute inset-0 bg-black opacity-[var(--cc-inner)]" />}
          <div className="pointer-events-none absolute inset-0 bg-[var(--cc-fade)] opacity-[var(--cc-depth,0)]" />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`group/cc relative h-full w-full touch-pan-y select-none overflow-hidden outline-none [-webkit-tap-highlight-color:transparent] focus-visible:shadow-[inset_0_0_0_2px_rgba(128,128,140,0.55)] data-[axis=x]:touch-pan-x data-[draggable]:cursor-grab data-[dragging]:cursor-grabbing ${className}`.trim()}
      style={
        {
          ...style,
          "--cc-fade": fadeColor,
          "--cc-radius": `${Math.max(0, cornerRadius)}px`,
          "--cc-inner": (1 - clamp(innerShade, 0, 1)).toFixed(3),
        } as React.CSSProperties
      }
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      tabIndex={0}
      data-axis={axis}
      data-shape={shape}
      data-ready={ready ? "" : undefined}
      data-draggable={draggable ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0"
        style={CC_MASKS[shape] ? { maskImage: CC_MASKS[shape], WebkitMaskImage: CC_MASKS[shape] } : undefined}
      >
        <div
          ref={stageRef}
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-[450ms] ease-[ease] group-data-[ready]/cc:opacity-100 motion-reduce:transition-none"
        >
          <div ref={cameraRef} className="relative h-0 w-0 [transform-style:preserve-3d]">
            <div ref={ringRef} className="absolute left-0 top-0 h-0 w-0 [transform-style:preserve-3d]">
              {list.map((item, index) => (
                <div
                  key={index}
                  ref={(element) => {
                    cardRefs.current[index] = element;
                  }}
                  className="absolute left-0 top-0 h-0 w-0 [transform-style:preserve-3d]"
                  data-cc-index={index}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${item.title || item.alt || `Image ${index + 1}`}, ${index + 1} of ${count}`}
                >
                  {tiles.map((tile) => renderTile(item, tile, false, index))}
                  {layout.backfaces && tiles.map((tile) => renderTile(item, tile, true, index))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {captions && current && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[22px] flex flex-col items-center gap-1.5 px-4 text-center animate-[circular-carousel-reveal_900ms_ease_both] motion-reduce:animate-none"
          aria-hidden="true"
        >
          <span
            key={active}
            className="flex max-w-full flex-col items-center text-[15px] font-medium leading-[1.35] animate-[circular-carousel-title_520ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
          >
            {current.title || current.alt}
            {current.subtitle && <span className="font-normal opacity-60">{current.subtitle}</span>}
          </span>
          <span className="inline-flex items-center gap-[3px] text-[12px] leading-none tabular-nums opacity-50">
            <Digits value={active + 1} />
            <span className="opacity-60">/</span>
            <span>{String(count).padStart(2, "0")}</span>
          </span>
        </div>
      )}
      <style>{CC_STYLE}</style>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`${label}, ${active + 1} of ${count}`}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   HALAMAN UNDANGAN
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Types ────────────────────────────────────────────────────────────────────

interface GiftData {
  senderName: string;
  senderPhone: string;
  giftType: "transfer" | "goods" | "hadir";
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  giftDescription: string;
  note: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRIDE_WA = "6285111203610";

function buildGiftWALink(form: GiftData): string {
  let detail = "";
  if (form.giftType === "transfer") {
    detail = `Bank: ${form.bankName}\nNo. Rek: ${form.accountNumber}\nA/N: ${form.accountHolder}`;
  } else if (form.giftType === "goods") {
    detail = `Keterangan: ${form.giftDescription}`;
  } else {
    detail = `Hadir langsung di acara`;
  }

  const typeLabel =
    form.giftType === "transfer"
      ? "Transfer / Amplop Digital"
      : form.giftType === "goods"
      ? "Hadiah Fisik"
      : "Hadir di Acara";

  const msg = encodeURIComponent(
    `Halo Ririn & Jeki! 🎉\n\n` +
    `Saya ${form.senderName} ingin mengkonfirmasi hadiah pernikahan:\n\n` +
    `👤 Nama: ${form.senderName}\n` +
    `📞 No. HP: ${form.senderPhone || "-"}\n` +
    `🎁 Jenis: ${typeLabel}\n` +
    `${detail}\n` +
    (form.note ? `\n📝 Catatan: ${form.note}\n` : "") +
    `\nSemoga bahagia selalu! 💕`
  );
  return `https://wa.me/${BRIDE_WA}?text=${msg}`;
}

const GALLERY_ITEMS: CircularCarouselItem[] = [
  { src: "/photos/263128.jpg", alt: "Ririn & Jeki 1" },
  { src: "/photos/263133.jpg", alt: "Ririn & Jeki 2" },
  { src: "/photos/263130.jpg", alt: "Ririn & Jeki 3" },
  { src: "/photos/263136.jpg", alt: "Ririn & Jeki 4" },
  { src: "/photos/263129.jpg", alt: "Ririn & Jeki 5" },
  { src: "/photos/263137.jpg", alt: "Ririn & Jeki 6" },
  { src: "/photos/263138.jpg", alt: "Ririn & Jeki 7" },
  { src: "/photos/263132.jpg", alt: "Ririn & Jeki 8" },
  { src: "/photos/263139.jpg", alt: "Ririn & Jeki 9" },
  // tambah foto lain di sini, idealnya total 6-8
];

// ─── QR Component ─────────────────────────────────────────────────────────────

type QRCodeLib = {
  (typeNumber: number, errorCorrectionLevel: string): {
    addData: (data: string) => void;
    make: () => void;
    createDataURL: (cellSize: number, margin: number) => string;
  };
};

declare global {
  interface Window { qrcode?: QRCodeLib; }
}

function QRCode({ value, size = 180 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    function generate() {
      if (!window.qrcode) return;
      try {
        const qr = window.qrcode(0, "M");
        qr.addData(value);
        qr.make();
        setDataUrl(qr.createDataURL(Math.max(2, Math.floor(size / 25)), 2));
      } catch {
        const qr = window.qrcode(4, "M");
        qr.addData(value);
        qr.make();
        setDataUrl(qr.createDataURL(Math.max(2, Math.floor(size / 33)), 2));
      }
    }
    if (window.qrcode) {
      generate();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
      script.onload = generate;
      document.head.appendChild(script);
    }
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div className="rounded-2xl bg-white flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-gray-800 animate-spin" />
      </div>
    );
  }
  return (
    <img src={dataUrl} alt={`QR ${value}`} width={size} height={size}
      className="rounded-2xl" style={{ imageRendering: "pixelated" }} />
  );
}

// ─── Gift Confirmation Form ───────────────────────────────────────────────────

function GiftForm({ guestName }: { guestName: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "detail" | "done">("type");
  const [form, setForm] = useState<GiftData>({
    senderName: guestName, senderPhone: "", giftType: "transfer",
    bankName: "", accountNumber: "", accountHolder: "", giftDescription: "", note: "",
  });

  const set = (k: keyof GiftData, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSend = () => { window.open(buildGiftWALink(form), "_blank"); setStep("done"); };

  const inputCls = "w-full px-5 py-4 rounded-2xl text-sm text-white outline-none";
  const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" };

  return (
    <>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setOpen(true)}
        className="w-full py-4 rounded-full text-sm tracking-widest uppercase"
        style={{ background: "rgba(101,183,246,0.1)", border: "1px solid rgba(101,183,246,0.3)", color: "#65B7F6" }}>
        🎁 Confirmation Gift
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-md rounded-3xl p-8 overflow-y-auto"
              style={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh" }}>

              {step === "done" ? (
                <div className="text-center py-6">
                  <p className="text-5xl mb-4">🎉</p>
                  <h3 className="text-2xl text-white font-light mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Terima Kasih!</h3>
                  <p className="text-white/50 text-sm mb-8">Konfirmasi hadiah Anda telah dikirim ke pengantin via WhatsApp.</p>
                  <button onClick={() => { setOpen(false); setStep("type"); }}
                    className="px-8 py-3 rounded-full text-sm"
                    style={{ background: "rgba(101,183,246,0.15)", color: "#65B7F6", border: "1px solid rgba(101,183,246,0.3)" }}>
                    Tutup
                  </button>
                </div>
              ) : step === "type" ? (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Confirmation Gift</h3>
                    <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
                  </div>
                  <p className="text-white/50 text-sm mb-6">Choose the type of gift you want to give to the bride and groom</p>
                  <div className="space-y-3 mb-8">
                    {([
                      { value: "transfer", label: "💸 Transfer / Envelope Digital", desc: "Transfer to bank account" },
                      { value: "goods", label: "🎁 Wedding Present", desc: "Send a physical gift" },
                      { value: "hadir", label: "🤝 Present On The Day", desc: "Best gift is your presence" },
                    ] as const).map((opt) => (
                      <button key={opt.value} onClick={() => { set("giftType", opt.value); setStep("detail"); }}
                        className="w-full text-left px-5 py-4 rounded-2xl transition-all hover:opacity-90"
                        style={{
                          background: form.giftType === opt.value ? "rgba(101,183,246,0.12)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${form.giftType === opt.value ? "rgba(101,183,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                        }}>
                        <p className="text-white text-sm mb-0.5">{opt.label}</p>
                        <p className="text-white/40 text-xs">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setStep("type")} className="text-white/40 hover:text-white transition-colors text-sm">← Back</button>
                      <h3 className="text-xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Detail Gift</h3>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors shrink-0">✕</button>
                  </div>

                  {form.giftType === "transfer" && (
                    <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(101,183,246,0.06)", border: "1px solid rgba(101,183,246,0.2)" }}>
                      <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-3">Please Transfer To</p>
                      {[{ label: "Bank", value: "BCA" }, { label: "Account Number", value: "2990760805" }, { label: "Account Name", value: "Ririn Nur Fadillah" }].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1">
                          <p className="text-white/40 text-xs">{item.label}</p>
                          <p className="text-white text-xs font-medium">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    <input className={inputCls} style={inputStyle} placeholder="Your Name" value={form.senderName} onChange={(e) => set("senderName", e.target.value)} />
                    <input className={inputCls} style={inputStyle} placeholder="Your Phone Number" value={form.senderPhone} onChange={(e) => set("senderPhone", e.target.value)} />
                    {form.giftType === "transfer" && (<>
                      <input className={inputCls} style={inputStyle} placeholder="Bank Name (e.g. BCA, Mandiri)" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
                      <input className={inputCls} style={inputStyle} placeholder="Account Number" value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
                      <input className={inputCls} style={inputStyle} placeholder="Account Name" value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} />
                    </>)}
                    {form.giftType === "goods" && (
                      <textarea className={inputCls} style={inputStyle} rows={3} placeholder="Gift Description" value={form.giftDescription} onChange={(e) => set("giftDescription", e.target.value)} />
                    )}
                    <textarea className={inputCls} style={inputStyle} rows={2} placeholder="Message / Additional Notes (Optional)" value={form.note} onChange={(e) => set("note", e.target.value)} />
                  </div>

                  <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)" }}>
                    <p className="text-white/50 text-xs leading-relaxed">
                      Click <span className="text-green-400">Send WhatsApp</span> — the browser will open WhatsApp with a message ready to send.
                    </p>
                  </div>

                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSend}
                    className="w-full py-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", color: "white" }}>
                    📲 Send WhatsApp
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setProgress((p) => Math.min(100, p + 2)), 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    const t = setTimeout(onDone, 400);
    return () => clearTimeout(t);
  }, [progress, onDone]);

  const petals = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
    duration: 3 + Math.random() * 2, delay: Math.random() * 2,
  })), []);

  return (
    <motion.div className="fixed inset-0 z-[9999] bg-[#080C14] flex flex-col items-center justify-center"
      exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
      {petals.map((p) => (
        <motion.div key={p.id} className="absolute w-2 h-3 rounded-full bg-[#65B7F6]/30"
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.6, 0], rotate: [0, 180, 360] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }} />
      ))}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center">
        <p className="uppercase tracking-[10px] text-[#65B7F6] text-xs mb-6">Our Special Moment</p>
        <h1 className="text-8xl font-serif text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>RJ</h1>
        <div className="w-48 h-px bg-white/20 mx-auto my-6" />
        <p className="text-white/40 text-sm tracking-widest uppercase">Loading invitation...</p>
        <div className="mt-10 w-48 h-px bg-white/10 mx-auto overflow-hidden rounded-full">
          <motion.div className="h-full bg-gradient-to-r from-[#65B7F6] to-[#a8d8f8]" style={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
        </div>
        <p className="text-white/30 text-xs mt-3">{progress}%</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Opening Screen ───────────────────────────────────────────────────────────

function OpeningScreen({ guestName, guestMember, onOpen, audioRef, setMusicOn }: {
  guestName: string; guestMember: number; onOpen: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>; setMusicOn: (v: boolean) => void;
}) {
  const handleOpen = async () => {
    onOpen();
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4; audio.muted = false;
    try { await audio.play(); setMusicOn(true); } catch { setMusicOn(false); }
  };

  const petals = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
    color: i % 2 === 0 ? "#65B7F6" : "#a8d8f8", opacity: 0.15 + Math.random() * 0.2,
    duration: 4 + Math.random() * 3, delay: Math.random() * 3,
  })), []);

  return (
    <motion.div className="fixed inset-0 z-[999] bg-[#080C14] flex items-center justify-center"
      exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 1 }}>
      {petals.map((p) => (
        <motion.div key={p.id} className="absolute w-1.5 h-2.5 rounded-full"
          style={{ left: p.left, top: p.top, background: p.color, opacity: p.opacity }}
          animate={{ y: [0, -80], opacity: [0.2, 0], rotate: [0, 360] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }} />
      ))}
      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }} className="text-center px-8 max-w-sm">
        <p className="uppercase tracking-[10px] text-[#65B7F6] text-xs mb-8">Join in Our Special Moment</p>
        <h1 className="text-6xl md:text-8xl text-white mb-4 leading-none"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>RJ</h1>
        <div className="flex items-center justify-center gap-4 my-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#65B7F6]/40" />
          <span className="text-[#65B7F6] text-xs tracking-[4px] uppercase">You Are Invited</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#65B7F6]/40" />
        </div>
        <p className="text-[#65B7F6] text-2xl mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{guestName}</p>
        {guestMember > 1 && <p className="text-white/30 text-xs mb-4">& {guestMember - 1} Partner</p>}
        <p className="text-white/40 text-xs mb-12 tracking-widest uppercase">15 November 2026 · Sunday</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={handleOpen}
          className="px-12 py-4 rounded-full text-black font-semibold text-sm tracking-widest uppercase"
          style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)" }}>
          Open Invitation ›
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_LINKS = ["Home", "Story", "Event", "Gallery", "Check In", "Wishes"];
const NAV_IDS = ["home", "story", "event", "gallery", "checkin", "wishes"];

function useScrollSection(enabled: boolean) {
  const [active, setActive] = useState("Home");
  useEffect(() => {
    if (!enabled) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(NAV_LINKS[NAV_IDS.indexOf(e.target.id)] ?? "Home"); });
    }, { threshold: 0.4 });
    NAV_IDS.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [enabled]);
  return active;
}

function Navbar({ musicOn, onToggleMusic, active }: { musicOn: boolean; onToggleMusic: () => void; active: string }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{ background: "rgba(8,12,20,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-white text-xl font-light cursor-pointer" onClick={() => scrollTo("home")}
        style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "4px" }}>RJ</span>
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link, i) => (
          <button key={link} onClick={() => scrollTo(NAV_IDS[i])}
            className="relative text-xs tracking-widest uppercase transition-colors duration-300 pb-1.5"
            style={{ color: active === link ? "#65B7F6" : "rgba(242,239,230,0.6)" }}>
            {link}
            {active === link && (
              <motion.div layoutId="tamu-nav-underline" className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "#65B7F6" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            )}
          </button>
        ))}
      </div>
      <button onClick={onToggleMusic} className="flex items-center gap-2 text-xs tracking-widest uppercase transition-colors"
        style={{ color: musicOn ? "#65B7F6" : "rgba(242,239,230,0.5)" }}>
        <span className="text-base">{musicOn ? "🎵" : "🔇"}</span>
        <span className="hidden md:inline">{musicOn ? "Music On" : "Music Off"}</span>
      </button>
    </motion.nav>
  );
}

// ─── Sections (Hero, Story, Event, Gallery) ───────────────────────────────────

const TIMELINE = [
  { id: "01", label: "Bride & Groom Arrival", time: "09:30 WIB" },
  { id: "02", label: "Opening Ceremony", time: "10:00 WIB" },
  { id: "03", label: "Special Lunch With Guests", time: "11:00 WIB" },
  { id: "04", label: "Closing Moment", time: "13:00 WIB" },
];

function HeroSection() {
  const heroPetals = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i, left: `${10 + Math.random() * 80}%`, top: `${Math.random() * 100}%`,
    opacity: 0.2 + Math.random() * 0.3, duration: 5 + Math.random() * 4,
    delay: Math.random() * 4, xOffset: (Math.random() - 0.5) * 40,
  })), []);

  return (
    <section id="home" className="relative min-h-[100svh] flex items-center justify-center text-center overflow-hidden">
      <img src="/photos/263129.jpg" alt="hero" className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35, filter: "brightness(0.7) saturate(0.8)" }} loading="eager" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,12,20,0.3) 0%, rgba(8,12,20,0.6) 100%)" }} />
      {heroPetals.map((p) => (
        <motion.div key={p.id} className="absolute w-2 h-3 rounded-full"
          style={{ left: p.left, top: p.top, background: "#65B7F6", opacity: p.opacity }}
          animate={{ y: [-20, -120], x: [0, p.xOffset], opacity: [0.3, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }} />
      ))}
      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: "easeOut" }} className="relative z-10 px-6">
        <p className="uppercase tracking-[10px] text-[#65B7F6] text-xs mb-8">THE WEDDING OF</p>
        <h1 className="text-6xl md:text-9xl text-white leading-none mb-6"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>RJ</h1>
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-px w-16 bg-[#65B7F6]/40" />
          <span className="text-[#65B7F6] text-xs tracking-[6px] uppercase">Ririn & Jeki</span>
          <div className="h-px w-16 bg-[#65B7F6]/40" />
        </div>
        <div className="text-[#65B7F6] text-4xl md:text-5xl mt-6 mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>15 | 11 | 2026</div>
        <p className="text-white/40 text-xs tracking-[6px] uppercase">Sunday</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
          className="mt-12 px-10 py-4 rounded-full text-black font-semibold text-xs tracking-widest uppercase"
          style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)" }}>Let's Go ›</motion.button>
      </motion.div>
      <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-[#65B7F6]" />
        </div>
      </motion.div>
    </section>
  );
}

function StorySection() {
  return (
    <section id="story" className="py-32 px-6 md:px-20 relative">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <motion.div initial={{ opacity: 0, x: -60 }} whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }} viewport={{ once: true }}>
          <h2 className="text-5xl md:text-6xl text-white font-light mb-8 leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}>Two Souls,<br />Become One</h2>
          <p className="text-white/50 leading-relaxed text-sm mb-4">
            Every step has brought us closer, and every prayer has led us here. With the grace and blessings of Allah SWT, we’re ready to begin our life together.
          </p>
          <p className="text-white/40 leading-relaxed text-sm mb-4">
            As we start this new chapter, we look forward to growing together, supporting each other, and cherishing the little moments that make life special.
          </p>
          <p className="text-white/40 leading-relaxed text-sm">
            This is just the beginning of our story, and we can’t wait to build a life filled with love, faith, and beautiful memories.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 60 }} whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }} viewport={{ once: true }}>
          <img src="/photos/263140.jpg" alt="Our Story" className="w-full h-[500px] object-cover rounded-3xl" loading="lazy" />
        </motion.div>
      </div>
    </section>
  );
}

function EventSection() {
  return (
    <section id="event" className="py-32 px-6 md:px-20 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-20">
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Never Forget</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Save The Date</h2>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-4 mb-20">
          {[
            { icon: "📅", label: "Date", value: "Sunday, 15", sub: "November 2026" },
            { icon: "🕖", label: "Time", value: "10:00 - 13:00", sub: "WIB Onwards" },
            { icon: "📍", label: "Venue", value: "Mang Kabayan Signature", sub: "https://maps.app.goo.gl/tiYCPEpZaKzZjx7x5", subLabel: "Go Here ›" },
            { icon: "👔", label: "Dress Code", value: "Be Yourself", sub: "& Elegant" },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }} viewport={{ once: true }}
              className="rounded-3xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-2xl mb-4">{item.icon}</div>
              <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-2">{item.label}</p>
              <p className="text-white text-3xl font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{item.value}</p>
              {"subLabel" in item ? (
                <a href={item.sub} target="_blank" rel="noopener noreferrer"
                  className="text-xs hover:text-[#a8d8f8] transition-colors"
                  style={{ color: "#65B7F6", textDecoration: "underline", textUnderlineOffset: "3px" }}>{item.subLabel}</a>
              ) : <p className="text-white/40 text-xs">{item.sub}</p>}
            </motion.div>
          ))}
        </div>
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {TIMELINE.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.15 }} viewport={{ once: true }}
              className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-[#65B7F6] text-5xl font-light mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{item.id}</div>
              <h3 className="text-white text-lg font-light mb-2">{item.label}</h3>
              <p className="text-[#65B7F6] text-sm">{item.time}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("RJ Moment")}&dates=20261115T100000/20261115T130000&ctz=Asia/Jakarta&location=${encodeURIComponent("MANG KABAYAN SIGNATURE, Jakarta")}`, "_blank")}
            className="px-10 py-4 rounded-full text-xs tracking-widest uppercase"
            style={{ background: "rgba(101,183,246,0.1)", border: "1px solid rgba(101,183,246,0.3)", color: "#65B7F6" }}>
            Add to Calendar
          </motion.button>
        </div>
      </div>
    </section>
  );
}

// ─── Gallery — Circular Carousel (Panorama) ──────────────────────────────────

function GallerySection() {
  return (
    <section id="gallery" className="py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 md:px-20">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-16">
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-4">Gallery</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            A Glimpse<br />of Us
          </h2>
        </motion.div>
      </div>

      <div className="relative w-full h-[420px] md:h-[560px]">
        <CircularCarousel
          items={GALLERY_ITEMS}
          preset="panorama"
          intro="rise"
          cardWidth={220}
          aspectRatio={0.75}
          speed={14}
          captions={false}
          gap={25}
          tilt={0}
          curve={1}
          perspective={1800}
          autoplay="drift"
          interval={3}
          direction="left"
          momentum={0.6}
          snap
          pauseOnHover
          focusOnClick
          draggable
          parallax={0.3}
          stretch={0.5}
          fadeColor="#080C14"
          depthFade={0.55}
          innerShade={0.6}
          cornerRadius={12}
        />
      </div>
    </section>
  );
}

// ─── Check In Section (QR per tamu) ──────────────────────────────────────────

function CheckInSection({ guestName, guestId, guestMember }: { guestName: string; guestId: string; guestMember: number }) {
  return (
    <section id="checkin" className="py-32 px-6 flex flex-col items-center text-center">
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }} viewport={{ once: true }} className="max-w-sm w-full">
        <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-8">QR Check-In</p>
        <div className="rounded-3xl p-8 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex justify-center mb-6">
            <QRCode value={typeof window !== "undefined" ? window.location.href : guestId} size={180} />
          </div>
          <h3 className="text-2xl text-white font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{guestName}</h3>
          <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-1">Our Beloved Guest</p>
          <p className="text-white/30 text-xs">{guestMember} orang · {guestId}</p>
        </div>
        <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(101,183,246,0.05)", border: "1px solid rgba(101,183,246,0.15)" }}>
          <p className="text-white/40 text-xs leading-relaxed">
            ℹ Show this QR code to the staff when you arrive. This QR is unique and intended only for {guestName}.
          </p>
        </div>
        <GiftForm guestName={guestName} />
      </motion.div>
    </section>
  );
}

// ─── Wishes Section — REAL dari Supabase + Realtime ──────────────────────────

function WishesSection({ guestName }: { guestName: string }) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState(guestName);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadWishes = useCallback(async () => {
    const { data } = await supabase.from("wishes").select("*").order("created_at", { ascending: false });
    if (data) setWishes(data as Wish[]);
  }, []);

  useEffect(() => {
    loadWishes();
    const channel = supabase.channel("tamu-wishes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, loadWishes)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadWishes]);

  const submit = async () => {
    if (!name.trim() || !msg.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("wishes").insert({ name: name.trim(), phone: phone.trim(), message: msg.trim() });
    if (!error) { setName(guestName); setPhone(""); setMsg(""); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000); }
    setSubmitting(false);
  };

  return (
    <section id="wishes" className="py-32 px-6 md:px-20">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Wishes</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Wishes</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }} viewport={{ once: true }} className="space-y-4">
            {[
              { value: name, setter: setName, placeholder: "Guest Name" },
              { value: phone, setter: setPhone, placeholder: "Phone Number (optional)" },
            ].map((f) => (
              <input key={f.placeholder} value={f.value} onChange={(e) => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-2xl px-6 py-5 text-sm outline-none text-white placeholder:text-white/30"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            ))}
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write your wishes..." rows={5}
              className="w-full rounded-2xl px-6 py-5 text-sm outline-none text-white placeholder:text-white/30 resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <AnimatePresence>
              {submitted && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl px-4 py-3 text-sm text-green-400 text-center"
                  style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  ✓ Ucapan terkirim! Terima kasih 🎉
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={submit}
              disabled={submitting || !name.trim() || !msg.trim()}
              className="w-full py-4 rounded-full text-black font-semibold text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)" }}>
              {submitting ? "Mengirim..." : "Send Wishes"}
            </motion.button>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }} viewport={{ once: true }}
            className="space-y-4 max-h-80 overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>
            {wishes.length === 0 && <p className="text-white/20 text-sm text-center py-8">Belum ada ucapan. Jadilah yang pertama! 🎉</p>}
            <AnimatePresence>
              {wishes.map((w) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#65B7F6] text-sm font-medium">{w.name}</p>
                    <p className="text-white/30 text-xs">{new Date(w.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{w.message}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TamuPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = use(params);

  const [guest, setGuest] = useState<Guest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [phase, setPhase] = useState<"loading" | "opening" | "main">("loading");
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const active = useScrollSection(phase === "main");

  const handleLoadingDone = useCallback(() => setPhase("opening"), []);

  // ── Fetch guest dari Supabase ──
  useEffect(() => {
    if (!guestId) return;
    supabase.from("guests").select("*").eq("id", guestId).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setGuest(data as Guest);
      });
  }, [guestId]);

  const toggleMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) { await audio.play(); setMusicOn(true); }
      else { audio.pause(); setMusicOn(false); }
    } catch { setMusicOn(!audioRef.current?.paused); }
  }, []);

  // ── Not found ──
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-4">Undangan Tidak Ditemukan</p>
          <h1 className="text-4xl text-white font-light mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Hmm...</h1>
          <p className="text-white/40 text-sm">Link undangan ini tidak valid. Silakan hubungi panitia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080C14] text-[#F2EFE6] overflow-x-hidden min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Dancing+Script:wght@600&display=swap');
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080C14; }
        ::-webkit-scrollbar-thumb { background: #65B7F6; border-radius: 2px; }
      `}</style>

      <audio ref={audioRef} loop preload="auto" playsInline src="/music/bg-music.mp3" />

      <AnimatePresence mode="wait">
        {phase === "loading" && <LoadingScreen key="loading" onDone={handleLoadingDone} />}
      </AnimatePresence>

      {/* Guard: loading selesai tapi data tamu belum datang */}
      {phase === "opening" && !guest && (
        <div className="fixed inset-0 z-[999] bg-[#080C14] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-[#65B7F6] animate-spin" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "opening" && guest && (
          <OpeningScreen key="opening" guestName={guest.name} guestMember={guest.member}
            onOpen={() => setPhase("main")} audioRef={audioRef} setMusicOn={setMusicOn} />
        )}
      </AnimatePresence>

      {phase === "main" && guest && (
        <>
          <Navbar musicOn={musicOn} onToggleMusic={toggleMusic} active={active} />
          <HeroSection />
          <StorySection />
          <EventSection />
          <GallerySection />
          <CheckInSection guestName={guest.name} guestId={guest.id} guestMember={guest.member} />
          <WishesSection guestName={guest.name} />

          <section className="py-32 px-6 text-center relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(101,183,246,0.06) 0%, transparent 70%)" }} />
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }} viewport={{ once: true }} className="relative z-10">
              <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Thank You</p>
              <h2 className="text-5xl md:text-6xl text-white font-light mb-6"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}>We Can't Wait<br />To Celebrate With You</h2>
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-16 bg-[#65B7F6]/30" />
                <span className="text-[#65B7F6]/60 text-xs">✦</span>
                <div className="h-px w-16 bg-[#65B7F6]/40" />
              </div>
              <p className="text-white/50 text-sm leading-relaxed max-w-md mx-auto mb-4">
                Thank you for your love, prayers, and support. See you on our special day!
              </p>
              <p className="text-[#65B7F6] text-4xl mt-8" style={{ fontFamily: "'Dancing Script', cursive" }}>RJ</p>
            </motion.div>
          </section>

          <footer className="py-12 text-center border-t border-white/5">
            <p className="text-white/20 text-xs tracking-widest uppercase">Our Special Moment RJ · Created By Jeki</p>
          </footer>
        </>
      )}
    </div>
  );
}