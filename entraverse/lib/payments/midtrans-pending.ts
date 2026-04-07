"use client";

type JsonRecord = Record<string, unknown>;

export type PendingPaymentSnapshot = {
  orderNumber: string;
  statusLabel: string;
  paymentType: string | null;
  methodCode: string | null;
  methodLabel: string;
  channelCode: string | null;
  channelLabel: string | null;
  accountLabel: string | null;
  accountNumber: string | null;
  secondaryLabel: string | null;
  secondaryValue: string | null;
  expiryTime: string | null;
  totalAmount: number;
  instructions: string[];
  savedAt: string;
};

const STORAGE_KEY = "entraverse.midtrans.pending-snapshots";

const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object") return {};
  return value as JsonRecord;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toNumberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(normalized)) return normalized;
  }
  return 0;
};

const sanitizeIsoDate = (value: string | null): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const resolveMethodLabel = (methodCode: string | null, paymentType: string | null): string => {
  const normalized = (methodCode ?? paymentType ?? "").trim().toLowerCase();
  if (!normalized) return "Metode Pembayaran";

  const labels: Record<string, string> = {
    midtrans_snap: "Midtrans Snap",
    bank_transfer: "Transfer Bank",
    credit_card: "Kartu Kredit",
    debit_card: "Kartu Debit",
    echannel: "Mandiri Bill",
    permata_va: "Permata Virtual Account",
    bca_va: "BCA Virtual Account",
    bni_va: "BNI Virtual Account",
    bri_va: "BRI Virtual Account",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
    indomaret: "Indomaret",
    alfamart: "Alfamart",
  };

  return labels[normalized] ?? normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
};

const resolveChannelCode = (paymentType: string | null, row: JsonRecord): string | null => {
  const vaRows = Array.isArray(row.va_numbers) ? row.va_numbers : [];
  const firstVa = toObject(vaRows[0]);
  const vaBank = toStringValue(firstVa.bank);
  if (vaBank) return vaBank.toLowerCase();

  if (toStringValue(row.permata_va_number)) return "permata";
  if (paymentType === "echannel") return "mandiri";

  const store = toStringValue(row.store);
  if (store) return store.toLowerCase();

  if (paymentType && paymentType.endsWith("_va")) {
    return paymentType.slice(0, -3);
  }

  if (paymentType && ["gopay", "shopeepay", "qris", "credit_card", "debit_card"].includes(paymentType)) {
    return paymentType;
  }

  return null;
};

const resolveChannelLabel = (channelCode: string | null): string | null => {
  const normalized = (channelCode ?? "").trim().toLowerCase();
  if (!normalized) return null;

  const labels: Record<string, string> = {
    bca: "BCA",
    bni: "BNI",
    bri: "BRI",
    permata: "Permata Bank",
    mandiri: "Mandiri",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
    credit_card: "Kartu Kredit",
    debit_card: "Kartu Debit",
    indomaret: "Indomaret",
    alfamart: "Alfamart",
  };

  return labels[normalized] ?? normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
};

const resolveMethodCode = (paymentType: string | null, channelCode: string | null): string | null => {
  if (!paymentType) return null;
  if (paymentType === "bank_transfer" && channelCode) {
    return `${channelCode}_va`;
  }
  return paymentType;
};

const resolveAccountInfo = (
  paymentType: string | null,
  row: JsonRecord
): {
  accountLabel: string | null;
  accountNumber: string | null;
  secondaryLabel: string | null;
  secondaryValue: string | null;
} => {
  const vaRows = Array.isArray(row.va_numbers) ? row.va_numbers : [];
  const firstVa = toObject(vaRows[0]);
  const vaNumber = toStringValue(firstVa.va_number) ?? toStringValue(row.permata_va_number);

  if (vaNumber || paymentType === "bank_transfer" || paymentType?.endsWith("_va")) {
    return {
      accountLabel: "Nomor Virtual Account",
      accountNumber: vaNumber,
      secondaryLabel: null,
      secondaryValue: null,
    };
  }

  if (paymentType === "echannel") {
    return {
      accountLabel: "Bill Key",
      accountNumber: toStringValue(row.bill_key),
      secondaryLabel: "Biller Code",
      secondaryValue: toStringValue(row.biller_code),
    };
  }

  if (paymentType && ["cstore", "indomaret", "alfamart"].includes(paymentType)) {
    return {
      accountLabel: "Kode Pembayaran",
      accountNumber: toStringValue(row.payment_code),
      secondaryLabel: "Gerai",
      secondaryValue: toStringValue(row.store),
    };
  }

  return {
    accountLabel: null,
    accountNumber: null,
    secondaryLabel: null,
    secondaryValue: null,
  };
};

const resolveInstructions = (
  paymentType: string | null,
  channelLabel: string | null,
  accountLabel: string | null,
  secondaryLabel: string | null
): string[] => {
  const provider = channelLabel ?? "penyedia pembayaran";
  const normalized = (paymentType ?? "").trim().toLowerCase();

  if (normalized === "echannel") {
    return [
      "Buka Livin atau ATM Mandiri lalu pilih menu bayar atau multipayment.",
      `Masukkan ${secondaryLabel ?? "Biller Code"} yang tertera pada pesanan Anda.`,
      `Masukkan ${accountLabel ?? "Bill Key"} yang tertera pada pesanan Anda.`,
      "Verifikasi total tagihan lalu selesaikan pembayaran sebelum batas waktu berakhir.",
    ];
  }

  if (normalized === "bank_transfer" || normalized.endsWith("_va")) {
    return [
      `Buka aplikasi mobile banking, internet banking, atau ATM ${provider}.`,
      "Pilih menu transfer atau bayar ke Virtual Account.",
      `Masukkan ${(accountLabel ?? "Nomor Virtual Account").toLowerCase()} persis seperti yang tertera pada pesanan.`,
      "Periksa kembali total tagihan, lalu selesaikan pembayaran sebelum batas waktu berakhir.",
    ];
  }

  if (["gopay", "shopeepay", "qris"].includes(normalized)) {
    return [
      `Buka aplikasi ${provider}.`,
      "Ikuti instruksi pembayaran yang tampil pada pesanan Anda.",
      "Selesaikan pembayaran sebelum batas waktu berakhir agar pesanan tidak dibatalkan otomatis.",
    ];
  }

  if (["cstore", "indomaret", "alfamart"].includes(normalized)) {
    return [
      `Datangi gerai ${provider} terdekat.`,
      `Tunjukkan atau sebutkan ${(accountLabel ?? "Kode Pembayaran").toLowerCase()} ke kasir.`,
      "Selesaikan pembayaran sesuai total tagihan sebelum batas waktu berakhir.",
    ];
  }

  return [
    "Gunakan data pembayaran yang tertera pada pesanan Anda untuk menyelesaikan transaksi.",
    "Pastikan total tagihan sesuai dan lakukan pembayaran sebelum batas waktu berakhir.",
  ];
};

export const normalizeMidtransPendingSnapshot = (
  value: unknown,
  fallback: {
    orderNumber?: string | null;
    totalAmount?: number | null;
  } = {}
): PendingPaymentSnapshot | null => {
  const row = toObject(value);
  const orderNumber = toStringValue(row.order_id) ?? fallback.orderNumber ?? null;
  if (!orderNumber) return null;

  const paymentType = toStringValue(row.payment_type)?.toLowerCase() ?? null;
  const channelCode = resolveChannelCode(paymentType, row);
  const methodCode = resolveMethodCode(paymentType, channelCode);
  const channelLabel = resolveChannelLabel(channelCode);
  const account = resolveAccountInfo(paymentType, row);

  return {
    orderNumber,
    statusLabel: "Menunggu Pembayaran",
    paymentType,
    methodCode,
    methodLabel: resolveMethodLabel(methodCode, paymentType),
    channelCode,
    channelLabel,
    accountLabel: account.accountLabel,
    accountNumber: account.accountNumber,
    secondaryLabel: account.secondaryLabel,
    secondaryValue: account.secondaryValue,
    expiryTime: sanitizeIsoDate(toStringValue(row.expiry_time) ?? toStringValue(row.transaction_time)),
    totalAmount: Math.max(0, Math.round(toNumberValue(row.gross_amount) || fallback.totalAmount || 0)),
    instructions: resolveInstructions(paymentType, channelLabel, account.accountLabel, account.secondaryLabel),
    savedAt: new Date().toISOString(),
  };
};

const readSnapshotMap = (): Record<string, PendingPaymentSnapshot> => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, PendingPaymentSnapshot>;
  } catch {
    return {};
  }
};

const writeSnapshotMap = (value: Record<string, PendingPaymentSnapshot>): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

export const savePendingPaymentSnapshot = (snapshot: PendingPaymentSnapshot): void => {
  const nextMap = {
    ...readSnapshotMap(),
    [snapshot.orderNumber]: snapshot,
  };

  writeSnapshotMap(nextMap);
};

export const getPendingPaymentSnapshot = (orderNumber: string | null | undefined): PendingPaymentSnapshot | null => {
  const normalized = (orderNumber ?? "").trim();
  if (!normalized) return null;

  const snapshot = readSnapshotMap()[normalized];
  return snapshot ?? null;
};

export const clearPendingPaymentSnapshot = (orderNumber: string | null | undefined): void => {
  const normalized = (orderNumber ?? "").trim();
  if (!normalized || typeof window === "undefined") return;

  const nextMap = { ...readSnapshotMap() };
  delete nextMap[normalized];
  writeSnapshotMap(nextMap);
};
