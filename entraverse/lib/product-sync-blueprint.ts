export type ProductSyncStructureItem = {
  key: "master" | "marketplace";
  title: string;
  subtitle: string;
  accent: string;
  badge: string;
  summary: string;
  bullets: string[];
};

export type ProductSyncFlowItem = {
  stage: string;
  process: string;
  description: string;
};

export type ProductSyncBackendItem = {
  title: string;
  description: string;
};

export const productSyncStructure: ProductSyncStructureItem[] = [
  {
    key: "master",
    title: "Master Produk",
    subtitle: "The Root / Akar",
    accent: "blue",
    badge: "Single Source of Truth",
    summary:
      "Data akar produk ditarik dari Mekari Jurnal dan menjadi sumber legal untuk SKU, nama internal, dan harga dasar.",
    bullets: [
      "Sumber data utama berasal dari Mekari Jurnal.",
      "Menyimpan SKU, nama produk legal/internal, dan harga dasar.",
      "Perubahan dari Jurnal memperbarui data akar agar selalu segar.",
    ],
  },
  {
    key: "marketplace",
    title: "Marketplace Produk",
    subtitle: "The Network / Jaringan",
    accent: "emerald",
    badge: "Mapping & Distribution",
    summary:
      "Jaringan distribusi yang menghubungkan satu SKU master ke banyak kanal penjualan seperti TikTok Shop dan Shopee.",
    bullets: [
      "Setiap item marketplace dipetakan ke satu SKU di Master Produk.",
      "Harga master bisa didorong ke kanal secara massal.",
      "Nama dan deskripsi per marketplace bisa berbeda tanpa mengubah data akar.",
    ],
  },
];

export const productSyncFlow: ProductSyncFlowItem[] = [
  {
    stage: "Inbound",
    process: "Mekari Jurnal -> Master Produk",
    description: "Menarik stok dan detail produk terbaru ke database Entraverse.",
  },
  {
    stage: "Mapping",
    process: "Master Produk <-> Marketplace Produk",
    description: "Menghubungkan SKU master dengan ID unik produk di TikTok Shop dan Shopee.",
  },
  {
    stage: "Outbound",
    process: "Marketplace Produk -> TikTok & Shopee",
    description: "Mendorong update stok dan harga terbaru dari Entraverse ke kanal penjualan.",
  },
];

export const productSyncBackendPlan: ProductSyncBackendItem[] = [
  {
    title: "Laravel Scheduled Jobs",
    description: "Pantau webhook atau API Mekari Jurnal secara berkala untuk menjaga data akar tetap mutakhir.",
  },
  {
    title: "Foreign Key Mapping",
    description: "Tabel marketplace_products harus merujuk ke master_products agar sinkronisasi stok akurat dan menghindari overselling.",
  },
  {
    title: "Next.js Sync Visibility",
    description: "Dashboard admin menampilkan status update terakhir untuk data akar dan jaringan agar operasional mudah dipantau.",
  },
];
