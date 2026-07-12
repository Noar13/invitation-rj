"use client";

// app/tamu/[guestId]/page.tsx
// Halaman undangan personal per tamu — data REAL dari Supabase

import { useState, use, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Guest, Wish } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GiftData {
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

const BRIDE_WA = "6289620487838";

function buildGiftWALink(form: GiftData, guestName: string): string {
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

function GiftForm({ guestName, guestId }: { guestName: string; guestId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "detail" | "done">("type");
  const [form, setForm] = useState<GiftData>({
    senderName: guestName, senderPhone: "", giftType: "transfer",
    bankName: "", accountNumber: "", accountHolder: "", giftDescription: "", note: "",
  });

  const set = (k: keyof GiftData, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSend = () => { window.open(buildGiftWALink(form, guestName), "_blank"); setStep("done"); };

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
                      Klik <span className="text-green-400">Send via WhatsApp</span> — the browser will open WhatsApp with a message ready to send.
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
    const interval = setInterval(() => {
      setProgress((p) => { if (p >= 100) { clearInterval(interval); setTimeout(onDone, 400); return 100; } return p + 2; });
    }, 30);
    return () => clearInterval(interval);
  }, [onDone]);

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

function useScrollSection() {
  const [active, setActive] = useState("Home");
  useEffect(() => {
    const ids = ["home", "story", "event", "gallery", "checkin", "wishes"];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(NAV_LINKS[ids.indexOf(e.target.id)] ?? "Home"); });
    }, { threshold: 0.4 });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  return active;
}

function Navbar({ musicOn, onToggleMusic, active }: { musicOn: boolean; onToggleMusic: () => void; active: string }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const ids = ["home", "story", "event", "gallery", "checkin", "wishes"];
  return (
    <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{ background: "rgba(8,12,20,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-white text-xl font-light cursor-pointer" onClick={() => scrollTo("home")}
        style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "4px" }}>RJ</span>
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link, i) => (
          <button key={link} onClick={() => scrollTo(ids[i])}
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

function HeroSection({ guestName }: { guestName: string }) {
  const heroPetals = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i, left: `${10 + Math.random() * 80}%`, top: `${Math.random() * 100}%`,
    opacity: 0.2 + Math.random() * 0.3, duration: 5 + Math.random() * 4,
    delay: Math.random() * 4, xOffset: (Math.random() - 0.5) * 40,
  })), []);

  return (
    <section id="home" className="relative h-screen flex items-center justify-center text-center overflow-hidden">
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
          <p className="text-white/50 leading-relaxed text-sm mb-4">Every step brings us closer; every prayer makes us stronger. Now, we are ready to walk together as one in His love and grace.</p>
          <p className="text-white/40 leading-relaxed text-sm">The bond that unites us now resides in all our hearts. That bond will never be broken. Let us grow with all our might until we bloom to perfection. There is no place to return to, let us head toward the destination we seek. Live in the present moment.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 60 }} whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }} viewport={{ once: true }}>
          <img src="/photos/263128.jpg" alt="Our Story" className="w-full h-[500px] object-cover rounded-3xl" loading="lazy" />
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
            onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("RJ Moment")}&dates=20261115T100000/20261115T130000&location=${encodeURIComponent("MANG KABAYAN SIGNATURE, Jakarta")}`, "_blank")}
            className="px-10 py-4 rounded-full text-xs tracking-widest uppercase"
            style={{ background: "rgba(101,183,246,0.1)", border: "1px solid rgba(101,183,246,0.3)", color: "#65B7F6" }}>
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
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-16">
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-4">Gallery</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>A Glimpse<br />of Us</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-4">
          {["/photos/263128.jpg", "/photos/263130.jpg", "/photos/263132.jpg"].map((src, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.1 }} viewport={{ once: true }}
              className="overflow-hidden rounded-3xl" style={{ height: i === 1 ? "560px" : "400px" }}>
              <motion.img whileHover={{ scale: 1.04 }} transition={{ duration: 0.6 }}
                src={src} className="w-full h-full object-cover" loading="lazy" />
            </motion.div>
          ))}
        </div>
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
        <GiftForm guestName={guestName} guestId={guestId} />
      </motion.div>
    </section>
  );
}

// ─── Wishes Section — REAL dari Supabase + Realtime ──────────────────────────

function WishesSection() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState("");
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
    if (!error) { setName(""); setPhone(""); setMsg(""); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000); }
    setSubmitting(false);
  };

  return (
    <section id="wishes" className="py-32 px-6 md:px-20">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }} className="text-center mb-16">
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Wishes</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>RSVP & Wishes</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }} viewport={{ once: true }} className="space-y-4">
            {[
              { value: name, setter: setName, placeholder: "Guest Name", type: "input" },
              { value: phone, setter: setPhone, placeholder: "Phone Number (optional)", type: "input" },
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
              {submitting ? "Mengirim..." : "Send RSVP & Wishes"}
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
  const active = useScrollSection();

  // ── Fetch guest dari Supabase ──
  useEffect(() => {
    if (!guestId) return;
    supabase.from("guests").select("*").eq("id", guestId).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setGuest(data as Guest);
      });
  }, [guestId]);

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
        {phase === "loading" && <LoadingScreen key="loading" onDone={() => setPhase("opening")} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "opening" && guest && (
          <OpeningScreen key="opening" guestName={guest.name} guestMember={guest.member}
            onOpen={() => setPhase("main")} audioRef={audioRef} setMusicOn={setMusicOn} />
        )}
      </AnimatePresence>

      {phase === "main" && guest && (
        <>
          <Navbar musicOn={musicOn} onToggleMusic={toggleMusic} active={active} />
          <HeroSection guestName={guest.name} />
          <StorySection />
          <EventSection />
          <GallerySection />
          <CheckInSection guestName={guest.name} guestId={guest.id} guestMember={guest.member} />
          <WishesSection />

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