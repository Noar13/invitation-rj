"use client";

// app/admin/page.tsx
// Dashboard admin — data real dari Supabase + realtime + QR Scanner check-in

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Guest, Wish } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const BRIDE_WA = "6289620487838";

function buildWABlastLink(guest: Guest, baseUrl: string): string {
  const inviteUrl = `${baseUrl}/tamu/${guest.id}`;
  const msg = encodeURIComponent(
    `Hi Dear, ${guest.name}\n\n` +
    `We warmly invite you to celebrate our special moment:\n\n` +
    `*RJ Moment*\n` +
    `- Date   : Sunday, 15 November 2026\n` +
    `- Time   : 10:00 - 13:00 WIB Onward\n` +
    `- Venue  : Mang Kabayan Signature, Jakarta\n` +
    `- Dress  : Be Yourself & Elegant\n\n` +
    `Open your personal digital invitation here:\n${inviteUrl}\n\n` +
    `_Your unique QR Code is inside the invitation._\n` +
    `_Please show it upon arrival for check-in._\n\n` +
    `Thank you for your presence and blessings`
  );
  return `https://wa.me/${guest.phone}?text=${msg}`;
}

// ─── QR Scanner Modal ─────────────────────────────────────────────────────────

type ScanResult = { guest: Guest; alreadyCheckedIn: boolean } | null;

function QRScannerModal({
  onClose,
  onCheckin,
}: {
  onClose: () => void;
  onCheckin: (guest: Guest) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const jsQRRef = useRef<((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null>(null);

  // Load jsQR library
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.onload = () => {
      jsQRRef.current = (window as unknown as { jsQR: typeof jsQRRef.current }).jsQR;
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  // Start camera
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        setError("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.");
        setScanning(false);
      }
    }

    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, []);

  // Scan frames
  useEffect(() => {
    if (!scanning) return;

    scanInterval.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !jsQRRef.current || video.readyState !== 4) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQRRef.current(imageData.data, canvas.width, canvas.height);

      if (code?.data) {
        // Extract guestId from URL or direct string
        let guestId = code.data;
        try {
          const url = new URL(code.data);
          const parts = url.pathname.split("/");
          const tamuIdx = parts.indexOf("tamu");
          if (tamuIdx !== -1 && parts[tamuIdx + 1]) {
            guestId = parts[tamuIdx + 1];
          }
        } catch { /* not a URL, use as-is */ }

        // Stop scanning
        setScanning(false);
        if (scanInterval.current) clearInterval(scanInterval.current);
        streamRef.current?.getTracks().forEach(t => t.stop());

        // Lookup guest in Supabase
        const { data, error: dbError } = await supabase
          .from("guests").select("*").eq("id", guestId).single();

        if (dbError || !data) {
          setError(`QR tidak dikenali: "${guestId}". Pastikan tamu scan dari halaman undangan.`);
        } else {
          setScanResult({ guest: data as Guest, alreadyCheckedIn: data.status === "checked-in" });
        }
      }
    }, 300);

    return () => { if (scanInterval.current) clearInterval(scanInterval.current); };
  }, [scanning]);

  const handleConfirmCheckin = async () => {
    if (!scanResult) return;
    setCheckinLoading(true);
    await onCheckin(scanResult.guest);
    setCheckinLoading(false);
    setSuccess(true);
    setTimeout(onClose, 2000);
  };

  const handleRescan = () => {
    setScanResult(null);
    setError("");
    setSuccess(false);
    setScanning(true);

    // Restart camera
    async function restartCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch { setError("Tidak dapat mengakses kamera."); }
    }
    restartCamera();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "#0d1420", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="text-white font-light text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Scan QR Check-In</h3>
            <p className="text-white/40 text-xs mt-0.5">Arahkan kamera ke QR Code tamu</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">✕</button>
        </div>

        {/* Camera / Result Area */}
        <div className="relative">
          {/* Video */}
          <div className="relative bg-black" style={{ aspectRatio: "1/1" }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            {scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56">
                  {/* Corner markers */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-[#65B7F6] ${cls}`} />
                  ))}
                  {/* Scan line */}
                  <motion.div className="absolute left-2 right-2 h-0.5 bg-[#65B7F6]/70 rounded-full"
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="text-white/60 text-xs bg-black/50 px-3 py-1 rounded-full">Mencari QR Code...</span>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">❌</div>
                  <p className="text-red-400 text-sm leading-relaxed mb-4">{error}</p>
                  <button onClick={handleRescan}
                    className="px-6 py-2 rounded-full text-xs text-white"
                    style={{ background: "rgba(101,183,246,0.2)", border: "1px solid rgba(101,183,246,0.4)" }}>
                    Scan Ulang
                  </button>
                </div>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                    className="text-6xl mb-3">✅</motion.div>
                  <p className="text-green-400 font-medium">Check-In Berhasil!</p>
                </div>
              </div>
            )}
          </div>

          {/* Guest Info Card */}
          {scanResult && !success && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="px-6 py-5">
              <div className="rounded-2xl p-4 mb-4"
                style={{
                  background: scanResult.alreadyCheckedIn ? "rgba(251,191,36,0.08)" : "rgba(74,222,128,0.08)",
                  border: `1px solid ${scanResult.alreadyCheckedIn ? "rgba(251,191,36,0.3)" : "rgba(74,222,128,0.3)"}`,
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: scanResult.alreadyCheckedIn ? "rgba(251,191,36,0.15)" : "rgba(74,222,128,0.15)" }}>
                    {scanResult.alreadyCheckedIn ? "⚠️" : "👤"}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{scanResult.guest.name}</p>
                    <p className="text-white/40 text-xs">{scanResult.guest.category} · {scanResult.guest.member} pax</p>
                    {scanResult.alreadyCheckedIn && (
                      <p className="text-yellow-400 text-xs mt-0.5">⚠ Tamu ini sudah check-in sebelumnya</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleRescan}
                  className="flex-1 py-3 rounded-2xl text-sm text-white/60 transition-all hover:text-white"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  Scan Ulang
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmCheckin} disabled={checkinLoading}
                  className="flex-2 flex-1 py-3 rounded-2xl text-sm font-medium text-black disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)", minWidth: "60%" }}>
                  {checkinLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Memproses...
                    </span>
                  ) : scanResult.alreadyCheckedIn ? "✓ Update Check-In" : "✓ Konfirmasi Check-In"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Idle state — no result yet */}
          {scanning && !scanResult && !error && (
            <div className="px-6 py-4 text-center">
              <p className="text-white/30 text-xs">Pastikan QR Code terlihat jelas di dalam kotak</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterBride, setFilterBride] = useState("All");
  const [activeTab, setActiveTab] = useState<"checkin" | "wishes" | "blast">("checkin");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  // Tambah di atas state lain
const [blastFilter, setBlastFilter] = useState("All");
const [blastStatus, setBlastStatus] = useState<Record<string, boolean>>(() => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("wa_blasted") || "{}");
  } catch { return {}; }
});

const markBlasted = (guestId: string) => {
  setBlastStatus((prev) => {
    const next = { ...prev, [guestId]: true };
    localStorage.setItem("wa_blasted", JSON.stringify(next));
    return next;
  });
};
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadGuests = useCallback(async () => {
    const { data, error } = await supabase.from("guests").select("*").order("name");
    if (!error && data) setGuests(data as Guest[]);
    setLoading(false);
  }, []);

  const loadWishes = useCallback(async () => {
    const { data, error } = await supabase.from("wishes").select("*").order("created_at", { ascending: false });
    if (!error && data) setWishes(data as Wish[]);
  }, []);

  useEffect(() => {
    loadGuests();
    loadWishes();

    const guestChannel = supabase.channel("guests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, loadGuests)
      .subscribe();
    const wishChannel = supabase.channel("wishes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishes" }, loadWishes)
      .subscribe();

    return () => { supabase.removeChannel(guestChannel); supabase.removeChannel(wishChannel); };
  }, [loadGuests, loadWishes]);

  const toggleCheckin = async (guest: Guest) => {
    setUpdatingId(guest.id);
    const newStatus = guest.status === "checked-in" ? "pending" : "checked-in";
    const { error } = await supabase.from("guests").update({
      status: newStatus,
      checkin_time: newStatus === "checked-in" ? new Date().toISOString() : null,
    }).eq("id", guest.id);

    if (!error) {
      setGuests((prev) => prev.map((g) =>
        g.id === guest.id ? { ...g, status: newStatus, checkin_time: newStatus === "checked-in" ? new Date().toISOString() : null } : g
      ));
    }
    setUpdatingId(null);
  };

  // Called from QR scanner
  const handleQRCheckin = async (guest: Guest) => {
    if (guest.status === "checked-in") return;
    const { error } = await supabase.from("guests").update({
      status: "checked-in",
      checkin_time: new Date().toISOString(),
    }).eq("id", guest.id);

    if (!error) {
      setGuests((prev) => prev.map((g) =>
        g.id === guest.id ? { ...g, status: "checked-in", checkin_time: new Date().toISOString() } : g
      ));
    }
  };

  const total = guests.length;
  const checkedIn = guests.filter((g) => g.status === "checked-in").length;
  const pending = total - checkedIn;
  const totalPax = guests.filter(g => g.status === "checked-in").reduce((s, g) => s + g.member, 0);
  const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
  const categories = ["All", ...Array.from(new Set(guests.map((g) => g.category)))];

  const filtered = guests.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || g.category === filterCategory;
    const matchBride = filterBride === "All" || g.from_bride === filterBride;
    return matchSearch && matchCat && matchBride;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#65B7F6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-white p-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap');`}</style>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <QRScannerModal onClose={() => setShowScanner(false)} onCheckin={handleQRCheckin} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Admin Dashboard
            </h1>
            <p className="text-white/40 text-sm mt-1">RJ Moment · 15 November 2026</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Scan Button */}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #65B7F6, #a8d8f8)", color: "#000" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <rect x="7" y="7" width="4" height="4" rx="0.5" />
                <rect x="13" y="7" width="4" height="4" rx="0.5" />
                <rect x="7" y="13" width="4" height="4" rx="0.5" />
                <path strokeLinecap="round" d="M13 13h4v4" />
              </svg>
              Scan QR
            </motion.button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Tamu", value: total, color: "text-white" },
          { label: "Check-In", value: checkedIn, color: "text-green-400" },
          { label: "Belum Hadir", value: pending, color: "text-yellow-400" },
          { label: "Total Pax", value: totalPax, color: "text-[#65B7F6]" },
          { label: "Persentase", value: `${pct}%`, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className={`text-3xl font-light mb-1 ${s.color}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</div>
            <div className="text-white/40 text-xs uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#65B7F6] to-green-400"
            animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
        <p className="text-white/30 text-xs mt-2">{pct}% tamu sudah check-in</p>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4 border-b border-white/10">
        {(["checkin", "wishes", "blast"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="relative pb-3 text-xs uppercase tracking-widest transition-colors"
            style={{ color: activeTab === tab ? "#65B7F6" : "rgba(255,255,255,0.4)" }}>
            {tab === "checkin" ? "Check-In" : tab === "wishes" ? `Ucapan (${wishes.length})` : "WA Blast"}
            {activeTab === tab && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-px bg-[#65B7F6]" />
            )}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">

        {/* CHECK-IN TAB */}
        {activeTab === "checkin" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-6">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama tamu..."
                className="flex-1 min-w-48 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {categories.map((c) => <option key={c} value={c} className="bg-[#080C14]">{c}</option>)}
              </select>
              <select value={filterBride} onChange={(e) => setFilterBride(e.target.value)}
                className="rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {["All", "Ririn", "Jeki"].map((b) => <option key={b} value={b} className="bg-[#080C14]">{b}</option>)}
              </select>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="grid grid-cols-12 text-[10px] uppercase tracking-widest text-white/30 px-6 py-3 border-b border-white/10"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="col-span-1">#</span>
                <span className="col-span-3">Nama</span>
                <span className="col-span-2">Dari</span>
                <span className="col-span-2">Kategori</span>
                <span className="col-span-1 text-center">Pax</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-1 text-center">Aksi</span>
              </div>
              <AnimatePresence>
                {filtered.map((g, i) => (
                  <motion.div key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid grid-cols-12 px-6 py-4 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <span className="col-span-1 text-white/30 text-sm">{i + 1}</span>
                    <div className="col-span-3">
                      <p className="text-white text-sm">{g.name}</p>
                      {g.checkin_time && (
                        <p className="text-white/30 text-[10px]">
                          {new Date(g.checkin_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <span className="col-span-2 text-white/50 text-xs">{g.from_bride}</span>
                    <span className="col-span-2 text-white/50 text-xs">{g.category}</span>
                    <span className="col-span-1 text-center text-white/60 text-sm">{g.member || "-"}</span>
                    <div className="col-span-2 flex justify-center">
                      <span className={`text-xs px-3 py-1 rounded-full ${g.status === "checked-in" ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>
                        {g.status === "checked-in" ? "✓ Hadir" : "○ Belum"}
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => toggleCheckin(g)} disabled={updatingId === g.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                        style={{
                          background: g.status === "checked-in" ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)",
                          border: `1px solid ${g.status === "checked-in" ? "rgba(239,68,68,0.3)" : "rgba(74,222,128,0.3)"}`,
                        }}>
                        {updatingId === g.id
                          ? <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                          : <span className="text-xs">{g.status === "checked-in" ? "✕" : "✓"}</span>}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <p className="text-white/20 text-xs mt-3">{filtered.length} dari {total} tamu ditampilkan</p>
          </div>
        )}

        {/* WISHES TAB */}
        {activeTab === "wishes" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishes.length === 0 && <p className="text-white/30 text-sm col-span-3 text-center py-12">Belum ada ucapan masuk</p>}
            <AnimatePresence>
              {wishes.map((w) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#65B7F6] font-medium text-sm">{w.name}</p>
                    <p className="text-white/30 text-xs">
                      {new Date(w.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{w.message}</p>
                  {w.phone && <p className="text-white/30 text-xs mt-2">{w.phone}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

{/* WA BLAST TAB */}
{activeTab === "blast" && (
  <div>
    {/* Filter & Summary Bar */}
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex gap-2">
        {["All", "Jeki", "Ririn"].map((f) => (
          <button
            key={f}
            onClick={() => setBlastFilter(f)}
            className="px-4 py-2 rounded-xl text-xs uppercase tracking-widest transition-all"
            style={{
              background: blastFilter === f ? "rgba(101,183,246,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${blastFilter === f ? "rgba(101,183,246,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: blastFilter === f ? "#65B7F6" : "rgba(255,255,255,0.4)",
            }}>
            {f}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-4 text-xs text-white/30">
        <span>
          <span className="text-green-400 font-medium">
            {guests.filter(g => blastFilter === "All" || g.from_bride === blastFilter)
              .filter(g => blastStatus[g.id]).length}
          </span>{" "}sudah diblast
        </span>
        <span>
          <span className="text-yellow-400 font-medium">
            {guests.filter(g => blastFilter === "All" || g.from_bride === blastFilter)
              .filter(g => !blastStatus[g.id]).length}
          </span>{" "}belum
        </span>
      </div>
    </div>

    {/* Guest List */}
    <div className="grid md:grid-cols-2 gap-3">
      {guests
        .filter(g => blastFilter === "All" || g.from_bride === blastFilter)
        .sort((a, b) => {
          const aBlasted = blastStatus[a.id] ? 1 : 0;
          const bBlasted = blastStatus[b.id] ? 1 : 0;
          return aBlasted - bBlasted || a.name.localeCompare(b.name);
        })
        .map((g) => {
          const alreadyBlasted = !!blastStatus[g.id];
          return (
            <div key={g.id} className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all"
              style={{
                background: alreadyBlasted ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${alreadyBlasted ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.08)"}`,
              }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: alreadyBlasted ? "#4ade80" : "rgba(255,255,255,0.2)" }} />
                <div>
                  <p className="text-white text-sm">{g.name}</p>
                  <p className="text-white/30 text-xs">{g.category} · {g.from_bride}</p>
                  {alreadyBlasted && (
                    <p className="text-green-400/60 text-[10px] mt-0.5">✓ Sudah diblast</p>
                  )}
                </div>
              </div>
              
                <a href={buildWABlastLink(g, baseUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markBlasted(g.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105 flex-shrink-0"
                style={{
                  background: alreadyBlasted ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.15)",
                  border: `1px solid ${alreadyBlasted ? "rgba(37,211,102,0.2)" : "rgba(37,211,102,0.3)"}`,
                  color: alreadyBlasted ? "rgba(37,211,102,0.6)" : "#25D366",
                }}>
                <span>📲</span>
                {alreadyBlasted ? "Kirim Lagi" : "Kirim WA"}
              </a>
            </div>
          );
        })}
    </div>

    <p className="text-white/20 text-xs mt-4">
      Status blast disimpan di browser ini.{" "}
      <button
        onClick={() => { localStorage.removeItem("wa_blasted"); setBlastStatus({}); }}
        className="underline hover:text-white/40 transition-colors">
        Reset semua
      </button>
    </p>
  </div>
)}
      </div>
    </div>
  );
}