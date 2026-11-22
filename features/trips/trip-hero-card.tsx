"use client";

import { CalendarDays, Lock, MapPin, Sparkles } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import { cn } from "cn";

export interface HeroMember {
  id: string;
  name: string;
  image: string | null;
}

export interface TripHeroCardProps {
  name: string;
  coverUrl: string | null;
  gradient: string;
  destination: string | null;
  dateLabel: string | null;
  phaseLabel: string | null;
  phaseLive: boolean;
  statusLabel: string | null;
  members: HeroMember[];
  membersLabel: string;
}

const TILT = { stiffness: 170, damping: 18, mass: 0.6 } as const;

/**
 * Interactive 3D trip cover: tilts with pointer / touch-drag / device motion, with parallax depth
 * (photo drifts one way, content floats above it), a moving light glare and a tilt-aware shadow.
 * Falls back to a static card when the user prefers reduced motion.
 */
export function TripHeroCard({ name, coverUrl, gradient, destination, dateLabel, phaseLabel, phaseLive, statusLabel, members, membersLabel }: TripHeroCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [fanned, setFanned] = useState(false);

  // Pointer position in [-0.5, 0.5], smoothed with springs.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, TILT);
  const sy = useSpring(py, TILT);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-13, 13]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [11, -11]);
  const imgX = useTransform(sx, [-0.5, 0.5], [16, -16]);
  const imgY = useTransform(sy, [-0.5, 0.5], [12, -12]);
  const glareX = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(sy, [-0.5, 0.5], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.38), rgb(255 255 255 / 0.08) 32%, transparent 60%)`;
  const shadowX = useTransform(sx, [-0.5, 0.5], [22, -22]);
  const shadowY = useTransform(sy, [-0.5, 0.5], [34, 14]);
  const shadow = useMotionTemplate`${shadowX}px ${shadowY}px 50px -14px rgb(2 44 41 / 0.55)`;

  const setFromPoint = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set(Math.min(0.5, Math.max(-0.5, (clientX - rect.left) / rect.width - 0.5)));
    py.set(Math.min(0.5, Math.max(-0.5, (clientY - rect.top) / rect.height - 0.5)));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!reduce) setFromPoint(e.clientX, e.clientY);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  // A cached image can finish loading before hydration, in which case onLoad never fires.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setImgLoaded(true);
  }, [coverUrl]);

  // Phones: gently follow the device tilt (Android/desktop fire this without a permission prompt).
  useEffect(() => {
    if (reduce || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      px.set(Math.max(-0.5, Math.min(0.5, e.gamma / 50)));
      py.set(Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 60)));
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [reduce, px, py]);

  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;

  return (
    <div className="[perspective:1100px]">
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
        onPointerUp={reset}
        onPointerCancel={reset}
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        style={reduce ? undefined : { rotateX, rotateY, boxShadow: shadow, transformStyle: "preserve-3d" }}
        className="relative min-h-56 touch-pan-y rounded-[2rem] text-white shadow-xl select-none"
        data-testid="trip-hero"
      >
        {/* Media layer (clipped). Overflow-hidden lives here so the content layer can keep its 3D depth. */}
        <div className={cn("absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-br", gradient)}>
          {coverUrl ? (
            <motion.div style={reduce ? undefined : { x: imgX, y: imgY }} className="absolute -inset-6">
              <motion.img
                ref={imgRef}
                src={coverUrl}
                alt=""
                draggable={false}
                onLoad={() => setImgLoaded(true)}
                initial={false}
                animate={reduce ? { opacity: imgLoaded ? 1 : 0 } : { opacity: imgLoaded ? 1 : 0, scale: [1.06, 1.14, 1.06] }}
                transition={{ opacity: { duration: 0.5 }, scale: { duration: 22, repeat: Infinity, ease: "easeInOut" } }}
                className="size-full object-cover"
                data-testid="trip-cover-image"
              />
            </motion.div>
          ) : (
            <NoCoverArt reduce={Boolean(reduce)} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_55%,rgb(0_0_0/0.35))]" />
          {!reduce ? <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0 mix-blend-overlay" aria-hidden /> : null}
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-white/15 ring-inset" aria-hidden />
        </div>

        {/* Content layer, lifted towards the viewer. */}
        <div className="relative flex min-h-56 flex-col justify-between gap-6 p-5" style={reduce ? undefined : { transform: "translateZ(48px)" }}>
          <div className="flex items-start justify-between gap-2">
            {phaseLabel ? (
              <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                {phaseLive ? (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
                  </span>
                ) : (
                  <Sparkles className="size-3.5" aria-hidden />
                )}
                {phaseLabel}
              </span>
            ) : (
              <span />
            )}
            {statusLabel ? (
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <Lock className="size-3.5" aria-hidden /> {statusLabel}
              </span>
            ) : null}
          </div>

          <div className="space-y-3">
            <motion.h2
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 26 }}
              className="text-3xl leading-[1.05] font-extrabold tracking-tight text-balance drop-shadow-[0_2px_12px_rgb(0_0_0/0.45)]"
            >
              {name}
            </motion.h2>

            {destination || dateLabel ? (
              <div className="flex flex-wrap gap-2 text-sm">
                {destination ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1 backdrop-blur-md">
                    <MapPin className="size-3.5" aria-hidden /> {destination}
                  </span>
                ) : null}
                {dateLabel ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1 backdrop-blur-md">
                    <CalendarDays className="size-3.5" aria-hidden /> {dateLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setFanned((f) => !f)}
              onPointerEnter={() => setFanned(true)}
              onPointerLeave={() => setFanned(false)}
              aria-label={membersLabel}
              aria-expanded={fanned}
              className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-white/60"
            >
              <span className="flex">
                {shown.map((m, i) => (
                  <motion.span
                    key={m.id}
                    initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1, marginInlineStart: i === 0 ? 0 : fanned ? 4 : -10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28, delay: reduce ? 0 : 0.18 + i * 0.04 }}
                    className="rounded-full ring-2 ring-black/25"
                    title={m.name}
                  >
                    <MemberAvatar id={m.id} name={m.name} image={m.image} className="size-8" />
                  </motion.span>
                ))}
                {extra > 0 ? (
                  <motion.span
                    animate={{ marginInlineStart: fanned ? 4 : -10 }}
                    className="flex size-8 items-center justify-center rounded-full bg-white/25 text-xs font-bold ring-2 ring-black/25 backdrop-blur-md"
                  >
                    +{extra}
                  </motion.span>
                ) : null}
              </span>
              <span className="text-sm font-medium text-white/90">{membersLabel}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** Animated art for trips without a cover photo: drifting light blobs + a dotted travel route. */
function NoCoverArt({ reduce }: { reduce: boolean }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <motion.div
        className="absolute -top-16 -left-10 size-56 rounded-full bg-white/25 blur-3xl"
        animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-12 -bottom-20 size-64 rounded-full bg-amber-300/35 blur-3xl"
        animate={reduce ? undefined : { x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg viewBox="0 0 400 220" className="absolute inset-0 size-full opacity-55" preserveAspectRatio="xMidYMid slice">
        {/* Dots marching along the route (dash offset animation keeps the dotted pattern). */}
        <motion.path
          d="M40 185 C 100 120, 150 200, 205 135 S 300 60, 345 78"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="0.5 13"
          animate={reduce ? undefined : { strokeDashoffset: [0, -27] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        <circle cx="40" cy="185" r="6" fill="white" />
        <motion.g animate={reduce ? undefined : { y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
          <path d="M345 44c-10 0-18 8-18 18 0 13 18 29 18 29s18-16 18-29c0-10-8-18-18-18z" fill="white" />
          <circle cx="345" cy="62" r="6" fill="#0F766E" />
        </motion.g>
      </svg>
    </div>
  );
}
