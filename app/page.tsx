"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";


// ─── DATA ────────────────────────────────────────────────────────────────────

const GUESTS = [
  { id: 1, name: "Dika", status: "checked-in", time: "10:21" },
  { id: 2, name: "Cesa", status: "checked-in", time: "10:25" },
  { id: 3, name: "Ayu",  status: "pending",    time: null },
  { id: 4, name: "Yudha", status: "pending",   time: null },
];

const NAV_LINKS = ["Home", "Story", "Event", "Gallery", "Check In", "Wishes"];

const TIMELINE = [
  { id: "01", label: "Bride & Groom Arrival", time: "09:30 WIB" },
  { id: "02", label: "Opening Ceremony",   time: "10.00 WIB" },
  { id: "03", label: "Special Lunch With Guests",     time: "11.00 WIB" },
  { id: "04", label: "Closing Moment",     time: "13:00 WIB" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function useScrollSection() {
  const [active, setActive] = useState("Home");
  useEffect(() => {
    const ids = ["home","story","event","gallery","checkin","wishes"];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const label = NAV_LINKS[ids.indexOf(e.target.id)] ?? "Home";
            setActive(label);
          }
        });
      },
      { threshold: 0.4 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return active;
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); setTimeout(onDone, 400); return 100; }
        return p + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-[#080C14] flex flex-col items-center justify-center"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Animated petals */}
{useMemo(() => Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  duration: 3 + Math.random() * 2,
  delay: Math.random() * 2,
})), []).map((p) => (
  <motion.div
    key={p.id}
    className="absolute w-2 h-3 rounded-full bg-[#65B7F6]/30"
    style={{ left: p.left, top: p.top }}
    animate={{ y: [0, -60, 0], opacity: [0, 0.6, 0], rotate: [0, 180, 360] }}
    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
  />
))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <p className="uppercase tracking-[10px] text-[#65B7F6] text-xs mb-6">Our Special Moment</p>
        <h1 className="text-8xl font-serif text-white mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>RJ</h1>
        <div className="w-48 h-px bg-white/20 mx-auto my-6" />
        <p className="text-white/40 text-sm tracking-widest uppercase">Loading invitation...</p>

        <div className="mt-10 w-48 h-px bg-white/10 mx-auto overflow-hidden rounded-full">
          <motion.div
            className="h-full bg-gradient-to-r from-[#65B7F6] to-[#a8d8f8]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <p className="text-white/30 text-xs mt-3">{progress}%</p>
      </motion.div>
    </motion.div>
  );
}

function OpeningScreen({
  onOpen,
  audioRef,
  setMusicOn,
}: {
  onOpen: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setMusicOn: (v: boolean) => void;
}) {
  const handleOpen = async () => {
    // Panggil onOpen() dulu biar phase berubah ke "main"
    onOpen();

    // Tunggu sebentar lalu play — user gesture masih aktif di frame ini
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.muted = false;
    try {
      await audio.play();
      setMusicOn(true);
    } catch (err) {
      console.warn("Audio play failed:", err);
      setMusicOn(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[999] bg-[#080C14] flex items-center justify-center"
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1 }}
    >
{useMemo(() => Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  color: i % 2 === 0 ? "#65B7F6" : "#a8d8f8",
  opacity: 0.15 + Math.random() * 0.2,
  duration: 4 + Math.random() * 3,
  delay: Math.random() * 3,
})), []).map((p) => (
  <motion.div
    key={p.id}
    className="absolute w-1.5 h-2.5 rounded-full"
    style={{ left: p.left, top: p.top, background: p.color, opacity: p.opacity }}
    animate={{ y: [0, -80], opacity: [0.2, 0], rotate: [0, 360] }}
    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
  />
))}

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="text-center px-8 max-w-lg"
      >
        <p className="uppercase tracking-[10px] text-[#65B7F6] text-xs mb-8">Join With Us</p>

        <h1
          className="text-6xl md:text-8xl text-white mb-4 leading-none"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
        >
          Our Special<br />Moment
        </h1>

        <div className="flex items-center justify-center gap-4 my-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#65B7F6]/40" />
          <span className="text-[#65B7F6] text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>RJ</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#65B7F6]/40" />
        </div>

        <p className="text-white/50 text-sm mb-2">15 | 11 | 2026  ·  SUNDAY</p>
        <p className="text-white/40 text-xs mb-12 tracking-widest uppercase">You are invited to celebrate our special moment</p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleOpen}
          className="px-12 py-4 rounded-full text-black font-semibold text-sm tracking-widest uppercase transition-all"
          style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)" }}
        >
          Open Invitation ›
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function Navbar({
  musicOn,
  onToggleMusic,
  active,
}: {
  musicOn: boolean;
  onToggleMusic: () => void;
  active: string;
}) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const ids = ["home","story","event","gallery","checkin","wishes"];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{ background: "rgba(8,12,20,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span
        className="text-white text-xl font-light cursor-pointer"
        style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "4px" }}
        onClick={() => scrollTo("home")}
      >
        RJ
      </span>

      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link, i) => (
          <button
            key={link}
            onClick={() => scrollTo(ids[i])}
            className="text-xs tracking-widest uppercase transition-colors duration-300 pb-0.5"
            style={{
              color: active === link ? "#65B7F6" : "rgba(242,239,230,0.6)",
              borderBottom: active === link ? "1px solid #65B7F6" : "1px solid transparent",
            }}
          >
            {link}
          </button>
        ))}
      </div>

      <button
        onClick={onToggleMusic}
        className="flex items-center gap-2 text-xs tracking-widest uppercase transition-colors"
        style={{ color: musicOn ? "#65B7F6" : "rgba(242,239,230,0.5)" }}
      >
        <span className="text-base">{musicOn ? "🎵" : "🔇"}</span>
        <span className="hidden md:inline">{musicOn ? "Music On" : "Music Off"}</span>
      </button>
    </motion.nav>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center text-center overflow-hidden">
      {/* Background image */}
      <img
        src="/photos/263129.jpg"
        alt="hero"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35, filter: "brightness(0.7) saturate(0.8)" }}
        loading="eager"
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,12,20,0.3) 0%, rgba(8,12,20,0.6) 100%)" }} />

      {/* Floating petals */}
{useMemo(() => Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${10 + Math.random() * 80}%`,
  top: `${Math.random() * 100}%`,
  opacity: 0.2 + Math.random() * 0.3,
  duration: 5 + Math.random() * 4,
  delay: Math.random() * 4,
  xOffset: (Math.random() - 0.5) * 40,
})), []).map((p) => (
  <motion.div
    key={p.id}
    className="absolute w-2 h-3 rounded-full"
    style={{ left: p.left, top: p.top, background: "#65B7F6", opacity: p.opacity }}
    animate={{ y: [-20, -120], x: [0, p.xOffset], opacity: [0.3, 0] }}
    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
  />
))}

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="relative z-10 px-6"
      >
        <p className="uppercase tracking-[10px] text-[#65B7F6] text-xs mb-8">The Weeding Of</p>

        <h1
          className="text-6xl md:text-9xl text-white leading-none mb-6"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
        >
          RJ
        </h1>

        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px w-16 bg-[#65B7F6]/40" />
          <span className="text-[#65B7F6] text-xs tracking-[6px] uppercase">You Are Invited</span>
          <div className="h-px w-16 bg-[#65B7F6]/40" />
        </div>

        <p className="text-white/60 text-sm mb-2 tracking-widest">To Celebrate Our Special Moment</p>

        <div className="text-[#65B7F6] text-4xl md:text-5xl mt-6 mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          15 | 11 | 2026
        </div>
        <p className="text-white/40 text-xs tracking-[6px] uppercase">Sunday</p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
          className="mt-12 px-10 py-4 rounded-full text-black font-semibold text-xs tracking-widest uppercase"
          style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)" }}
        >
          Let's Go ›
        </motion.button>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
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
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6"></p>
          <h2 className="text-5xl md:text-6xl text-white font-light mb-8 leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Two Souls,<br />Become One
          </h2>
          <p className="text-white/50 leading-relaxed text-sm mb-4">
          Every step brings us closer, every prayer makes us stronger. Now, we are ready to walk together as one in His love and grace.
          </p>
          <p className="text-white/40 leading-relaxed text-sm">
          The bond that unites us now resides in all our hearts.
          That bond will never be broken.
          Let us grow with all our might until we bloom to perfection.
          There is no place to return to, let us head toward the destination we seek.
          Live in the present moment.
          </p>

          <button
            onClick={() => document.getElementById("event")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-10 text-xs tracking-widest uppercase text-[#65B7F6] border-b border-[#65B7F6]/40 pb-1 hover:border-[#65B7F6] transition-colors"
          >
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          <img
            src="/photos/263128.jpg"
            alt="Our Story"
            className="w-full h-[500px] object-cover rounded-3xl"
            loading="lazy"
          />
        </motion.div>
      </div>
    </section>
  );
}

function EventSection() {
  return (
    <section id="event" className="py-32 px-6 md:px-20 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Never Forget</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Save The Date
          </h2>
        </motion.div>

        {/* Event details cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-20">
          {[
            { icon: "📅", label: "Date", value: "Sunday, 15", sub: "November 2026" },
            { icon: "🕖", label: "Time", value: "10:00 - 13:00", sub: "WIB Onwards" },
            {
              icon: "📍",
              label: "Venue",
              value: "Mang Kabayan Signature",
              sub: "https://maps.app.goo.gl/tiYCPEpZaKzZjx7x5",
              subLabel: "Go Here ›",
            },
            { icon: "👔", label: "Dress Code", value: "Be Yourself", sub: "& Elegant" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="rounded-3xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-2xl mb-4">{item.icon}</div>
              <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-2">{item.label}</p>
              <p className="text-white text-3xl font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{item.value}</p>
              <p className="text-white/40 text-xs">{item.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Timeline */}
        <div className="grid md:grid-cols-4 gap-6">
          {TIMELINE.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              viewport={{ once: true }}
              className="rounded-3xl p-8"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="text-[#65B7F6] text-5xl font-light mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{item.id}</div>
              <h3 className="text-white text-lg font-light mb-2">{item.label}</h3>
              <p className="text-[#65B7F6] text-sm">{item.time}</p>
            </motion.div>
          ))}
        </div>

<div className="mt-12 text-center">
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => {
      const event = {
        title: "RJ Moment",
        startDate: "20261115T100000",
        endDate: "20261115T130000",
        location: "MANG KABAYAN SIGNATURE, Jl. Raya Hankam, Jakarta",
        description: "RJ Moment - Join us for this special event!\n\nLocation: MANG KABAYAN SIGNATURE\nhttps://maps.app.goo.gl/etD1U4QzunykAoho7",
      };

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.startDate}/${event.endDate}&location=${encodeURIComponent(event.location)}&details=${encodeURIComponent(event.description)}`;

      window.open(googleCalendarUrl, "_blank");
    }}
    className="px-10 py-4 rounded-full text-xs tracking-widest uppercase"
    style={{
      background: "rgba(101,183,246,0.1)",
      border: "1px solid rgba(101,183,246,0.3)",
      color: "#65B7F6",
    }}
  >
      Add to Calendar
      </motion.button>
      </div>
      </div>
    </section>
  );
}

function GallerySection() {
  return (
    <section id="gallery" className="py-32 px-6 md:px-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-4">Gallery</p>
          <div className="flex items-end justify-between">
            <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              A Glimpse<br />of Us
            </h2>
            <button
              className="text-xs tracking-widest uppercase text-[#65B7F6] border-b border-[#65B7F6]/40 pb-1 hidden md:block"
            >
              View Gallery ›
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {["/photos/263128.jpg", "/photos/263130.jpg", "/photos/263132.jpg"].map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-3xl group"
              style={{ height: i === 1 ? "560px" : "400px" }}
            >
              <motion.img
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.6 }}
                src={src}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThankYouSection() {
  return (
    <section className="py-32 px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(101,183,246,0.06) 0%, transparent 70%)" }} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="relative z-10"
      >
        <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Thank You</p>
        <h2 className="text-5xl md:text-6xl text-white font-light mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          We Can't Wait<br />To Celebrate With You
        </h2>
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-16 bg-[#65B7F6]/30" />
          <span className="text-[#65B7F6]/60 text-xs">✦</span>
          <div className="h-px w-16 bg-[#65B7F6]/30" />
        </div>
        <p className="text-white/50 text-sm leading-relaxed max-w-md mx-auto mb-4">
          Terima kasih atas cinta, doa, dan kehadiran Anda. Sampai jumpa di hari bahagia kami!
        </p>
        <p className="text-[#65B7F6] text-4xl mt-8" style={{ fontFamily: "'Dancing Script', cursive" }}>RJ</p>
      </motion.div>
    </section>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function InvitationDemo() {
  const [phase, setPhase] = useState<"loading" | "opening" | "main">("loading");
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const active = useScrollSection();

  // Preload fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Dancing+Script:wght@600&display=swap";
    document.head.appendChild(link);
  }, []);

  const toggleMusic = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
        await audio.play();
        setMusicOn(true);
      } else {
        audio.pause();
        setMusicOn(false);
      }
    } catch (err) {
      console.warn("Toggle music failed:", err);
      // Sync state dengan kondisi audio aktual
      setMusicOn(!audio.paused);
    }
  }, []);

  return (
    <div className="bg-[#080C14] text-[#F2EFE6] overflow-x-hidden min-h-screen">
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Dancing+Script:wght@600&display=swap');
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080C14; }
        ::-webkit-scrollbar-thumb { background: #65B7F6; border-radius: 2px; }
      `}</style>

      <audio ref={audioRef} loop preload="auto" playsInline src="/music/bg-music.mp3" />

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <LoadingScreen key="loading" onDone={() => setPhase("opening")} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "opening" && (
          <OpeningScreen key="opening" onOpen={() => setPhase("main")} audioRef={audioRef} setMusicOn={setMusicOn} />
        )}
      </AnimatePresence>

      {phase === "main" && (
        <>
          <Navbar musicOn={musicOn} onToggleMusic={toggleMusic} active={active} />
          <HeroSection />
          <StorySection />
          <EventSection />
          <GallerySection />
          <ThankYouSection />

          <footer className="py-12 text-center border-t border-white/5">
            <p className="text-white/20 text-xs tracking-widest uppercase">Our Special Moment RJ · Created By Jeki</p>
          </footer>
        </>
      )}
    </div>
  );
}