"use client";

// Komponen CheckInSection — realtime dari Supabase
// Paste ini di page.tsx menggantikan fungsi CheckInSection & WishesSection yang lama

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, Guest, Wish } from "@/lib/supabase";

export function CheckInSection() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuests = useCallback(async () => {
    const { data } = await supabase.from("guests").select("*").order("name");
    if (data) setGuests(data as Guest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGuests();
    const channel = supabase
      .channel("checkin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, loadGuests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadGuests]);

  const checkedIn = guests.filter((g) => g.status === "checked-in").length;
  const pct = guests.length > 0 ? Math.round((checkedIn / guests.length) * 100) : 0;

  return (
    <section id="checkin" className="py-32 px-6 md:px-20">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-4">Check In</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Guest Check-In
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="rounded-3xl p-8"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-1">Dashboard</p>
                <h3 className="text-white text-xl font-light">Real Time Check-In</h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total", value: guests.length, color: "text-white" },
                { label: "Check-In", value: checkedIn, color: "text-green-400" },
                { label: "Belum", value: guests.length - checkedIn, color: "text-yellow-400" },
                { label: "%", value: `${pct}%`, color: "text-[#65B7F6]" },
              ].map((s) => (
                <div key={s.label} className="text-center rounded-2xl py-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className={`text-2xl font-light mb-1 ${s.color}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</div>
                  <div className="text-white/40 text-[10px] uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-6">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#65B7F6] to-green-400"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-8 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
                <div className="grid grid-cols-4 text-[10px] uppercase tracking-widest text-white/30 pb-2 border-b border-white/10">
                  <span>No</span><span>Nama</span><span>Status</span><span className="text-right">Waktu</span>
                </div>
                {guests.map((g, i) => (
                  <div key={g.id} className="grid grid-cols-4 text-sm items-center py-1">
                    <span className="text-white/30 text-xs">{i + 1}</span>
                    <span className="text-white/80 text-xs">{g.name}</span>
                    <span className={`text-xs ${g.status === "checked-in" ? "text-green-400" : "text-yellow-500/70"}`}>
                      {g.status === "checked-in" ? "✓" : "○"}
                    </span>
                    <span className="text-white/40 text-right text-xs">
                      {g.checkin_time
                        ? new Date(g.checkin_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-white/20 text-[10px] mt-4">• Data terupdate otomatis secara realtime</p>
          </motion.div>

          {/* Info QR */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[#65B7F6] text-xs tracking-widest uppercase mb-4">Guest Check-In</p>
              <p className="text-white/50 text-sm mb-6">
                Setiap tamu menerima QR Code unik di undangan personal mereka. Tunjukkan QR Code saat tiba di lokasi.
              </p>

              {/* Decorative QR illustration */}
              <div className="w-40 h-40 mx-auto mb-4 rounded-2xl bg-white p-3 flex items-center justify-center">
                <svg viewBox="0 0 37 37" className="w-full h-full">
                  <rect x="1" y="1" width="14" height="14" fill="none" stroke="#111" strokeWidth="1.5" rx="1" />
                  <rect x="4" y="4" width="8" height="8" fill="#111" rx="0.5" />
                  <rect x="22" y="1" width="14" height="14" fill="none" stroke="#111" strokeWidth="1.5" rx="1" />
                  <rect x="25" y="4" width="8" height="8" fill="#111" rx="0.5" />
                  <rect x="1" y="22" width="14" height="14" fill="none" stroke="#111" strokeWidth="1.5" rx="1" />
                  <rect x="4" y="25" width="8" height="8" fill="#111" rx="0.5" />
                  {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => {
                    if ((r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3)) return null;
                    const fill = Math.random() > 0.5 ? "#111" : "none";
                    return fill !== "none" ? <rect key={`${r}-${c}`} x={c*5+1} y={r*5+1} width={4} height={4} fill={fill} rx={0.3} /> : null;
                  }))}
                </svg>
              </div>

              <div className="text-center">
                <p className="text-[#65B7F6] text-lg tracking-widest font-semibold">QR UNIK</p>
                <p className="text-white/40 text-xs tracking-widest uppercase">Per Tamu</p>
              </div>
            </div>

            <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "rgba(101,183,246,0.05)", border: "1px solid rgba(101,183,246,0.15)" }}>
              <span className="text-[#65B7F6] text-lg">ℹ</span>
              <p className="text-white/40 text-xs leading-relaxed">
                QR Code bersifat unik untuk setiap tamu dan tidak dapat digunakan oleh orang lain. Data check-in terupdate secara realtime di dashboard.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function WishesSection() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadWishes = useCallback(async () => {
    const { data } = await supabase
      .from("wishes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setWishes(data as Wish[]);
  }, []);

  useEffect(() => {
    loadWishes();
    const channel = supabase
      .channel("wishes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, loadWishes)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadWishes]);

  const submit = async () => {
    if (!name.trim() || !msg.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("wishes").insert({
      name: name.trim(),
      phone: phone.trim(),
      message: msg.trim(),
    });
    if (!error) {
      setName(""); setPhone(""); setMsg("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
    setSubmitting(false);
  };

  return (
    <section id="wishes" className="py-32 px-6 md:px-20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="uppercase tracking-[8px] text-[#65B7F6] text-xs mb-6">Wishes</p>
          <h2 className="text-5xl md:text-6xl text-white font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            RSVP & Wishes
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full rounded-2xl px-6 py-5 text-sm outline-none text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nomor WhatsApp (opsional)"
              className="w-full rounded-2xl px-6 py-5 text-sm outline-none text-white placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Tulis ucapan dan doa terbaik Anda..."
              rows={5}
              className="w-full rounded-2xl px-6 py-5 text-sm outline-none text-white placeholder:text-white/30 resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl px-4 py-3 text-sm text-green-400 text-center"
                  style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
                >
                  ✓ Ucapan terkirim! Terima kasih 🎉
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={submit}
              disabled={submitting || !name.trim() || !msg.trim()}
              className="w-full py-4 rounded-full text-black font-semibold text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)" }}
            >
              {submitting ? "Mengirim..." : "Kirim Ucapan & RSVP"}
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-4 max-h-80 overflow-y-auto pr-2"
            style={{ scrollbarWidth: "none" }}
          >
            {wishes.length === 0 && (
              <p className="text-white/20 text-sm text-center py-8">Belum ada ucapan. Jadilah yang pertama! 🎉</p>
            )}
            <AnimatePresence>
              {wishes.map((w) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl p-5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#65B7F6] text-sm font-medium">{w.name}</p>
                    <p className="text-white/30 text-xs">
                      {new Date(w.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
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