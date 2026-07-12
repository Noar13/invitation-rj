// lib/guests.ts
// ─── Types ────────────────────────────────────────────────────────────────────

export type GuestCategory = "Mate" | "Work Collage" | "Familly";
export type GuestFrom = "Ririn" | "Jeki";
export type GuestStatus = "pending" | "checked-in";

export interface Guest {
  id: string;          // unique slug, e.g. "dika-ririn-001"
  name: string;
  address: string;
  phone: string;       // E.164, e.g. "628212345678"
  fromBride: GuestFrom;
  member: number;      // jumlah anggota rombongan
  category: GuestCategory;
  status: GuestStatus;
  checkinTime: string | null;
  qrCode: string;      // base URL for QR: /tamu/{id}
}

// ─── Parse CSV rows → Guest[] ─────────────────────────────────────────────────

export function parseCSVRow(
  row: Record<string, string>,
  index: number
): Guest {
  const name = (row["Name"] ?? "").trim();
  const rawPhone = (row["Phone"] ?? "").trim();

  // Nomor dari CSV kadang scientific notation (6.28e+12) → fix ke string integer
  const phone = rawPhone
    ? String(Math.round(Number(rawPhone))).replace(/^0/, "62")
    : "";

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const id = `${slug}-${String(index + 1).padStart(3, "0")}`;

  return {
    id,
    name,
    address: (row["Address"] ?? "").trim(),
    phone,
    fromBride: (row["From Bride"] as GuestFrom) ?? "Ririn",
    member: parseInt(row["Member"] ?? "1", 10) || 1,
    category: (row["Column 6"] as GuestCategory) ?? "Mate",
    status: "pending",
    checkinTime: null,
    qrCode: `/tamu/${id}`,
  };
}

// ─── Generate WhatsApp blast link per tamu ────────────────────────────────────

export function buildWABlastLink(guest: Guest, baseUrl: string): string {
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

// ─── Gift confirmation → WA to pengantin ─────────────────────────────────────

export interface GiftData {
  senderName: string;
  senderPhone: string;
  giftType: "transfer" | "goods" | "hadir";
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  giftDescription?: string;
  note?: string;
}

// Nomor WA pengantin yang menerima konfirmasi hadiah
export const BRIDE_WA = "6285781812498"; // ← ganti dengan nomor asli

export function buildGiftWALink(gift: GiftData, guestName: string): string {
  let detail = "";

  if (gift.giftType === "transfer") {
    detail =
      `💸 *Transfer*\n` +
      `Bank: ${gift.bankName}\n` +
      `No. Rek: ${gift.accountNumber}\n` +
      `Atas Nama: ${gift.accountHolder}`;
  } else if (gift.giftType === "goods") {
    detail = `🎁 *Hadiah Fisik*\n${gift.giftDescription}`;
  } else {
    detail = `🤝 *Hadir Langsung*`;
  }

  const msg = encodeURIComponent(
    `Assalamu'alaikum 💍\n\n` +
    `Saya *${guestName}* (${gift.senderPhone}) ingin mengkonfirmasi hadiah untuk pernikahan RJ:\n\n` +
    `${detail}\n\n` +
    (gift.note ? `📝 Catatan: ${gift.note}\n\n` : "") +
    `Terima kasih & semoga bahagia selalu! 🤍`
  );

  return `https://wa.me/${BRIDE_WA}?text=${msg}`;
}