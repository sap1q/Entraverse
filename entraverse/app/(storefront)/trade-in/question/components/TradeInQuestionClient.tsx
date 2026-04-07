"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Camera, Clock3, MapPin, Package, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import {
  resolveSelectedProductPrice,
  resolveSelectedProductOfflinePrice,
  resolveSelectedVariantRow,
} from "@/app/(storefront)/products/[slug]/components/productPricing";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/hooks/useCart";
import { useAddress } from "@/hooks/useAddress";
import { tradeInApi } from "@/lib/api/trade-in";
import type { UserAddress } from "@/lib/api/types/user-address.types";
import type { UserProfile } from "@/lib/api/types/user-profile.types";
import { userProfileApi } from "@/lib/api/user-profile";
import { cn } from "@/lib/utils";
import { formatCurrencyIDR } from "@/lib/utils/formatter";
import type { ProductDetail, ProductVariantPricingRow } from "@/types/product.types";
import { TradeInOptionCard } from "./TradeInOptionCard";
import {
  countUploadedRequiredSlots,
  getRequiredTradeInPhotoSlotCount,
  TRADE_IN_PHOTO_SLOTS,
  TradeInPhotoUploader,
  type TradeInPhotoItem,
} from "./TradeInPhotoUploader";
import { TradeInProgressTracker } from "./TradeInProgressTracker";
import { TradeInSummaryCard } from "./TradeInSummaryCard";

type SingleOption = {
  id: string;
  title: string;
  description: string;
  impactLabel: string;
  multiplier: number;
};

type ChipOption = {
  id: string;
  label: string;
  multiplier: number;
};

const STEPS = [
  { title: "Step 1", caption: "Kondisi perangkat" },
  { title: "Step 2", caption: "Riwayat & kelengkapan" },
  { title: "Step 3", caption: "Data customer" },
  { title: "Step 4", caption: "Verifikasi foto" },
] as const;

const PHYSICAL_OPTIONS: readonly SingleOption[] = [
  {
    id: "excellent",
    title: "Sangat baik",
    description: "Tanpa goresan besar, dent, atau retak pada bodi.",
    impactLabel: "",
    multiplier: 1,
  },
  {
    id: "good",
    title: "Baik",
    description: "Ada goresan ringan pemakaian, fungsi tetap normal.",
    impactLabel: "",
    multiplier: 0.92,
  },
  {
    id: "fair",
    title: "Cukup",
    description: "Ada bekas pakai yang terlihat jelas atau kerusakan kecil.",
    impactLabel: "",
    multiplier: 0.84,
  },
  {
    id: "poor",
    title: "Buruk",
    description: "Ada retak, dent besar, atau isu fisik yang cukup berat.",
    impactLabel: "",
    multiplier: 0.72,
  },
] as const;

const AGE_OPTIONS: readonly SingleOption[] = [
  {
    id: "lt1",
    title: "Kurang dari 1 tahun",
    description: "",
    impactLabel: "",
    multiplier: 1,
  },
  {
    id: "1to2",
    title: "1 sampai 2 tahun",
    description: "",
    impactLabel: "",
    multiplier: 0.9,
  },
  {
    id: "2to3",
    title: "2 sampai 3 tahun",
    description: "",
    impactLabel: "",
    multiplier: 0.82,
  },
  {
    id: "3to4",
    title: "3 sampai 4 tahun",
    description: "",
    impactLabel: "",
    multiplier: 0.74,
  },
] as const;

const ACCESSORY_OPTIONS: readonly ChipOption[] = [
  {
    id: "box",
    label: "Kotak",
    multiplier: 1.02,
  },
  {
    id: "cable",
    label: "Kabel",
    multiplier: 1.02,
  },
  {
    id: "accessories",
    label: "Aksesoris lainnya",
    multiplier: 1.03,
  },
] as const;

const SERVICE_OPTIONS: readonly SingleOption[] = [
  {
    id: "never",
    title: "Tidak pernah",
    description: "Belum pernah servis atau ganti komponen.",
    impactLabel: "",
    multiplier: 1,
  },
  {
    id: "once",
    title: "1 kali perbaikan",
    description: "Pernah servis sekali dengan fungsi saat ini tetap normal.",
    impactLabel: "",
    multiplier: 0.93,
  },
  {
    id: "twice",
    title: "2 kali perbaikan",
    description: "Pernah ada beberapa intervensi servis atau penggantian part.",
    impactLabel: "",
    multiplier: 0.86,
  },
] as const;

function getSelectedOption<T extends { id: string }>(options: readonly T[], selectedId: string | null): T | null {
  if (!selectedId) return null;
  return options.find((option) => option.id === selectedId) ?? null;
}

const buildVariantLabel = (row: ProductVariantPricingRow | null): string | null => {
  if (!row) return null;
  if (row.label?.trim()) return row.label.trim();

  const options = Object.values(row.options ?? {}).filter((value) => value.trim().length > 0);
  return options.length > 0 ? options.join(" / ") : null;
};

const getAddressBadgeLabel = (address: UserAddress): string =>
  address.address_label?.trim() || address.label?.trim() || "Alamat";

const getAddressPhone = (address: UserAddress): string =>
  address.recipient_phone?.trim() || address.phone_number?.trim() || "-";

function QuestionSection({
  number,
  title,
  subtitle,
  icon,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.4)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-blue-600">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              {number}
            </span>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

interface TradeInQuestionClientProps {
  product: ProductDetail;
  selectedVariantSku?: string | null;
}

export function TradeInQuestionClient({
  product,
  selectedVariantSku = null,
}: TradeInQuestionClientProps) {
  const router = useRouter();
  const checkTimerRef = useRef<number | null>(null);
  const photoUrlsRef = useRef<string[]>([]);
  const [physicalCondition, setPhysicalCondition] = useState<string | null>(null);
  const [deviceAge, setDeviceAge] = useState<string | null>(null);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [serviceHistory, setServiceHistory] = useState<string | null>(null);
  const [photos, setPhotos] = useState<TradeInPhotoItem[]>([]);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);
  const [isContinuingOrder, setIsContinuingOrder] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [tradeInAddressId, setTradeInAddressId] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionInfo, setSubmissionInfo] = useState<string | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const { addToCart } = useCart();
  const { addresses, selectedAddress, selectedAddressId, fetchAddresses } = useAddress();

  useEffect(() => {
    photoUrlsRef.current = photos.map((photo) => photo.previewUrl);
  }, [photos]);

  useEffect(() => {
    return () => {
      if (checkTimerRef.current) {
        window.clearTimeout(checkTimerRef.current);
      }

      photoUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  const selectedPhysical = getSelectedOption(PHYSICAL_OPTIONS, physicalCondition);
  const selectedAge = getSelectedOption(AGE_OPTIONS, deviceAge);
  const selectedService = getSelectedOption(SERVICE_OPTIONS, serviceHistory);
  const selectedAccessories = ACCESSORY_OPTIONS.filter((option) => accessories.includes(option.id));
  const selectedVariantRow = useMemo(
    () => resolveSelectedVariantRow(product, {}, selectedVariantSku) ?? product.variant_pricing?.[0] ?? null,
    [product, selectedVariantSku]
  );
  const selectedVariantLabel = useMemo(() => buildVariantLabel(selectedVariantRow), [selectedVariantRow]);
  const selectedTradeInVariants = useMemo(
    () => ({ ...(selectedVariantRow?.options ?? {}) }),
    [selectedVariantRow]
  );
  const offlineBasePrice = useMemo(
    () => resolveSelectedProductOfflinePrice(product, selectedTradeInVariants, selectedVariantSku),
    [product, selectedTradeInVariants, selectedVariantSku]
  );
  const entraverseDisplayPrice = useMemo(
    () => resolveSelectedProductPrice(product, selectedTradeInVariants, selectedVariantSku),
    [product, selectedTradeInVariants, selectedVariantSku]
  );
  const activeTradeInAddress = useMemo(
    () => addresses.find((item) => item.id === tradeInAddressId) ?? selectedAddress ?? null,
    [addresses, selectedAddress, tradeInAddressId]
  );
  const uploadedRequiredPhotoCount = useMemo(() => countUploadedRequiredSlots(photos), [photos]);
  const requiredPhotoSlotCount = getRequiredTradeInPhotoSlotCount();
  const profileRequirementMessages = useMemo(() => {
    const messages: string[] = [];

    if (!customerName.trim()) {
      messages.push("Nama customer belum tersedia di profil akun.");
    }

    if (!customerPhone.trim()) {
      messages.push("No. telepon belum tersedia di profil akun.");
    }

    if (!/\S+@\S+\.\S+/.test(customerEmail.trim())) {
      messages.push("Email profil belum valid.");
    }

    return messages;
  }, [customerEmail, customerName, customerPhone]);
  const isProfileComplete = profileRequirementMessages.length === 0;

  const customerFieldErrors = useMemo(
    () => ({
      customerName: customerName.trim() ? null : "Lengkapi nama customer di profil akun terlebih dahulu.",
      customerPhone: customerPhone.trim() ? null : "Lengkapi nomor telepon di profil akun terlebih dahulu.",
      customerEmail:
        /\S+@\S+\.\S+/.test(customerEmail.trim()) ? null : "Lengkapi email valid di profil akun terlebih dahulu.",
      customerAddress: activeTradeInAddress ? null : "Pilih alamat customer dari daftar alamat tersimpan.",
    }),
    [activeTradeInAddress, customerEmail, customerName, customerPhone]
  );
  const hasCustomerData = useMemo(
    () => Object.values(customerFieldErrors).every((value) => value === null),
    [customerFieldErrors]
  );
  const hasStepOne = Boolean(selectedPhysical && selectedAge);
  const hasStepTwo = Boolean(selectedService);
  const hasStepThree = hasCustomerData;
  const hasStepFour = uploadedRequiredPhotoCount >= requiredPhotoSlotCount;
  const answeredSections = [hasStepOne, hasStepTwo, hasStepThree, hasStepFour].filter(Boolean).length;
  const currentStep = answeredSections >= STEPS.length ? STEPS.length : answeredSections + 1;
  const progressPercent = (answeredSections / STEPS.length) * 100;
  const hasCompletedForm = hasStepOne && hasStepTwo && hasStepThree && hasStepFour;

  const estimate = useMemo(() => {
    let total = offlineBasePrice;

    if (selectedPhysical) {
      total *= selectedPhysical.multiplier;
    }

    if (selectedAge) {
      total *= selectedAge.multiplier;
    }

    selectedAccessories.forEach((option) => {
      total *= option.multiplier;
    });

    if (selectedService) {
      total *= selectedService.multiplier;
    }

    return Math.round(total);
  }, [offlineBasePrice, selectedAccessories, selectedAge, selectedPhysical, selectedService]);

  const summaryLines = useMemo(() => {
    const lines: Array<{ label: string; value: string }> = [];

    if (selectedVariantLabel) {
      lines.push({ label: "Varian produk", value: selectedVariantLabel });
    }

    if (selectedPhysical) {
      lines.push({ label: "Kondisi fisik", value: selectedPhysical.title });
    }

    if (selectedAge) {
      lines.push({ label: "Umur perangkat", value: selectedAge.title });
    }

    if (selectedAccessories.length > 0) {
      lines.push({
        label: "Kelengkapan",
        value: selectedAccessories.map((option) => option.label).join(", "),
      });
    }

    if (selectedService) {
      lines.push({ label: "Riwayat servis", value: selectedService.title });
    }

    if (photos.length > 0) {
      lines.push({
        label: "Foto verifikasi",
        value: `${uploadedRequiredPhotoCount}/${requiredPhotoSlotCount} wajib, ${photos.length} total`,
      });
    }

    if (customerName.trim()) {
      lines.push({ label: "Nama customer", value: customerName.trim() });
    }

    if (customerPhone.trim()) {
      lines.push({ label: "Telepon", value: customerPhone.trim() });
    }

    return lines;
  }, [
    customerName,
    customerPhone,
    photos.length,
    requiredPhotoSlotCount,
    selectedAccessories,
    selectedAge,
    selectedPhysical,
    selectedService,
    selectedVariantLabel,
    uploadedRequiredPhotoCount,
  ]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setPrefillLoading(true);
    void fetchAddresses({ silent: true });

    userProfileApi
      .getProfile(controller.signal)
      .then((profile) => {
        if (!active) return;

        setProfile(profile);
        setCustomerName(profile.name ?? "");
        setCustomerPhone(profile.phone ?? "");
        setCustomerEmail(profile.email ?? "");
      })
      .catch(() => {
        // Prefill profile bersifat best effort.
      })
      .finally(() => {
        if (active) {
          setPrefillLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchAddresses]);

  useEffect(() => {
    if (addresses.length === 0) {
      setTradeInAddressId(null);
      return;
    }

    if (tradeInAddressId && addresses.some((item) => item.id === tradeInAddressId)) {
      return;
    }

    const fallbackAddressId =
      (selectedAddressId && addresses.some((item) => item.id === selectedAddressId) ? selectedAddressId : null) ??
      selectedAddress?.id ??
      addresses.find((item) => item.is_main)?.id ??
      addresses[0]?.id ??
      null;

    setTradeInAddressId(fallbackAddressId);
  }, [addresses, selectedAddress, selectedAddressId, tradeInAddressId]);

  const resetCheckedLimit = () => {
    if (checkTimerRef.current) {
      window.clearTimeout(checkTimerRef.current);
      checkTimerRef.current = null;
    }

    setIsCheckingLimit(false);
  };

  const toggleAccessory = (accessoryId: string) => {
    setAccessories((current) =>
      current.includes(accessoryId)
        ? current.filter((item) => item !== accessoryId)
        : [...current, accessoryId]
    );
    resetCheckedLimit();
  };

  const handleCheckLimit = () => {
    setIsCheckingLimit(true);
    if (checkTimerRef.current) {
      window.clearTimeout(checkTimerRef.current);
    }

    checkTimerRef.current = window.setTimeout(() => {
      setIsCheckingLimit(false);
      checkTimerRef.current = null;
    }, 900);
  };

  const canContinue = hasCompletedForm;

  const handleContinueOrder = async () => {
    if (isContinuingOrder) return;

    if (!hasCompletedForm) {
      setSubmissionError("Lengkapi seluruh data trade-in terlebih dahulu sebelum melanjutkan pesanan.");
      return;
    }

    const stock =
      typeof selectedVariantRow?.stock === "number" && Number.isFinite(selectedVariantRow.stock)
        ? Math.max(0, selectedVariantRow.stock)
        : Math.max(0, product.stock);
    const minOrder = Math.max(1, product.min_order ?? 1);

    setIsContinuingOrder(true);
    setSubmissionError(null);
    setSubmissionInfo(null);

    try {
      const orderedPhotos = TRADE_IN_PHOTO_SLOTS.map((slot) => photos.find((photo) => photo.slotId === slot.id) ?? null)
        .filter((photo): photo is TradeInPhotoItem => photo !== null);

      const submission = await tradeInApi.submit({
        requested_product_id: product.id,
        requested_product_name: product.name,
        requested_product_variant_sku: selectedVariantSku ?? undefined,
        trade_in_only: false,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        customer_city: activeTradeInAddress?.city?.trim() || activeTradeInAddress?.subdistrict?.trim() || undefined,
        customer_address: activeTradeInAddress?.full_address?.trim() || "",
        customer_notes: customerNotes.trim() || undefined,
        device_brand: product.brand?.name,
        device_model: product.name,
        device_variant: selectedVariantLabel ?? undefined,
        physical_condition: selectedPhysical?.id ?? "",
        device_age: selectedAge?.id ?? "",
        service_history: selectedService?.id ?? "",
        accessory_summary: selectedAccessories.map((option) => option.label),
        estimated_amount: estimate,
        photo_slots: orderedPhotos.map((photo) => photo.slotId),
        photos: orderedPhotos.map((photo) => photo.file),
      });

      const result = await addToCart(product.id, minOrder, selectedTradeInVariants, {
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: offlineBasePrice,
        displayPrice: entraverseDisplayPrice,
        variantSku: selectedVariantSku ?? undefined,
        stock,
        minOrder,
        tradeInEnabled: true,
        tradeInValue: estimate,
        tradeInUnitValue: estimate / minOrder,
        tradeInTransactionId: submission.id,
        tradeInTransactionNumber: submission.transactionNumber,
      });

      if (result.success) {
        setSubmissionInfo(`Pengajuan trade-in ${submission.transactionNumber} berhasil dikirim.`);
        router.push("/checkout");
      } else {
        setSubmissionError(
          result.message
            ? `Pengajuan trade-in sudah tersimpan, tetapi keranjang gagal diperbarui: ${result.message}`
            : "Pengajuan trade-in sudah tersimpan, tetapi keranjang gagal diperbarui."
        );
      }
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Gagal mengirim pengajuan trade-in.");
    } finally {
      setIsContinuingOrder(false);
    }
  };

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_32%,#eff6ff_100%)] pb-28 pt-8 lg:pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            Trade-In Device
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Informasi Mengenai Produk Kamu
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Lengkapi data perangkat untuk mendapatkan estimasi limit trade-in yang bergerak secara real-time.
            Semua pertanyaan di bawah ini dipakai sebagai penilaian awal sebelum verifikasi akhir.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Device: <span className="font-semibold text-slate-900">{product.name}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Harga offline: <span className="font-semibold text-slate-900">{formatCurrencyIDR(offlineBasePrice)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <TradeInProgressTracker steps={STEPS} currentStep={currentStep} progressPercent={progressPercent} />
        </div>

        {submissionError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submissionError}
          </div>
        ) : null}
        {submissionInfo ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {submissionInfo}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <QuestionSection
              number="01"
              title="Bagaimana kondisi fisik produk Anda saat ini?"
              subtitle="Pilih kondisi yang paling mendekati kondisi nyata perangkat."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Kondisi fisik">
                {PHYSICAL_OPTIONS.map((option) => (
                  <TradeInOptionCard
                    key={option.id}
                    title={option.title}
                    description={option.description}
                    impactLabel={option.impactLabel}
                    selected={physicalCondition === option.id}
                    onSelect={() => {
                      setPhysicalCondition(option.id);
                      resetCheckedLimit();
                    }}
                  />
                ))}
              </div>
            </QuestionSection>

            <QuestionSection
              number="02"
              title="Umur produk Anda sudah berapa lama?"
              subtitle="Umur perangkat memengaruhi depresiasi dan limit trade-in."
              icon={<Clock3 className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Umur perangkat">
                {AGE_OPTIONS.map((option) => (
                  <TradeInOptionCard
                    key={option.id}
                    title={option.title}
                    description={option.description}
                    impactLabel={option.impactLabel}
                    selected={deviceAge === option.id}
                    onSelect={() => {
                      setDeviceAge(option.id);
                      resetCheckedLimit();
                    }}
                  />
                ))}
              </div>
            </QuestionSection>

            <QuestionSection
              number="03"
              title="Kelengkapan apa yang masih tersedia?"
              subtitle="Bagian ini bersifat multi-select. Semakin lengkap, limit umumnya lebih baik."
              icon={<Package className="h-5 w-5" />}
            >
              <div className="flex flex-wrap gap-3">
                {ACCESSORY_OPTIONS.map((option) => {
                  const active = accessories.includes(option.id);

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleAccessory(option.id)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-4 py-3 text-sm font-semibold transition",
                        active
                          ? "border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_-20px_rgba(37,99,235,0.85)]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-white"
                      )}
                      aria-pressed={active}
                    >
                      <span>{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </QuestionSection>

            <QuestionSection
              number="04"
              title="Apakah perangkat pernah mengalami perbaikan?"
              subtitle="Riwayat servis membantu kami mengukur stabilitas perangkat saat ini."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Riwayat servis">
                {SERVICE_OPTIONS.map((option) => (
                  <TradeInOptionCard
                    key={option.id}
                    title={option.title}
                    description={option.description}
                    impactLabel={option.impactLabel}
                    selected={serviceHistory === option.id}
                    onSelect={() => {
                      setServiceHistory(option.id);
                      resetCheckedLimit();
                    }}
                  />
                ))}
              </div>
            </QuestionSection>

            <QuestionSection
              number="05"
              title="Data customer untuk verifikasi awal"
              subtitle="Nama, email, dan no. telepon diambil dari profil akun Anda. Lengkapi profil terlebih dahulu agar proses review bisa dimulai."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              {!prefillLoading && !isProfileComplete ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <p className="font-semibold">Lengkapi profil akun terlebih dahulu untuk menggunakan fitur trade-in.</p>
                  <p className="mt-1 leading-6">
                    Nama customer, email, dan no. telepon pada pengajuan trade-in diambil otomatis dari profil akun.
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {profileRequirementMessages.map((message) => (
                      <li key={message}>• {message}</li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <Link
                      href="/account/profile"
                      className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      Lengkapi profil
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">Kontak customer mengikuti profil akun</p>
                  <p className="mt-1 leading-6">
                    Perubahan nama, email, atau no. telepon dilakukan dari halaman profil agar data trade-in tetap konsisten.
                  </p>
                </div>
                <Link
                  href="/account/profile"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Ubah profil
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id="trade-in-customer-name"
                  label="Nama customer"
                  value={customerName}
                  readOnly
                  error={customerFieldErrors.customerName ?? undefined}
                  className="border-slate-200 bg-slate-100 text-slate-500 focus:border-slate-200"
                  placeholder="Nama lengkap"
                />
                <Input
                  id="trade-in-customer-phone"
                  label="No. telepon"
                  value={customerPhone}
                  readOnly
                  error={customerFieldErrors.customerPhone ?? undefined}
                  className="border-slate-200 bg-slate-100 text-slate-500 focus:border-slate-200"
                  placeholder="08xxxxxxxxxx"
                />
                <Input
                  id="trade-in-customer-email"
                  label="Email"
                  type="email"
                  value={customerEmail}
                  readOnly
                  error={customerFieldErrors.customerEmail ?? undefined}
                  className="border-slate-200 bg-slate-100 text-slate-500 focus:border-slate-200"
                  placeholder="nama@email.com"
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Alamat customer</span>
                    <p className="text-xs leading-5 text-slate-500">
                      Alamat verifikasi diambil dari daftar alamat akun Anda, jadi tidak perlu input ulang.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/account/addresses/create"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Tambah alamat
                    </Link>
                    <Link
                      href="/account/addresses"
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    >
                      Kelola alamat
                    </Link>
                  </div>
                </div>

                {addresses.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {addresses.map((address) => {
                      const active = activeTradeInAddress?.id === address.id;
                      const locationText = [address.city, address.province, address.zip_code].filter(Boolean).join(", ");

                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setTradeInAddressId(address.id)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition",
                            active
                              ? "border-blue-600 bg-blue-50 shadow-[0_0_0_1px_rgba(37,99,235,0.18)]"
                              : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                          )}
                          aria-pressed={active}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              {getAddressBadgeLabel(address)}
                            </span>
                            {active ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Dipakai
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-3 text-sm font-semibold text-slate-900">{address.recipient_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{getAddressPhone(address)}</p>

                          <div className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                            <p className="leading-relaxed">{address.full_address}</p>
                          </div>

                          {locationText ? <p className="mt-2 text-xs text-slate-500">{locationText}</p> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    Belum ada alamat tersimpan. Tambahkan alamat terlebih dahulu agar data verifikasi bisa memakai
                    alamat akun Anda.
                  </div>
                )}

                {customerFieldErrors.customerAddress ? (
                  <span className="text-xs text-rose-600">{customerFieldErrors.customerAddress}</span>
                ) : null}
              </div>

              <label className="mt-4 block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Catatan tambahan</span>
                <textarea
                  value={customerNotes}
                  onChange={(event) => setCustomerNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500"
                  placeholder="Opsional: jelaskan kerusakan, kondisi baterai, atau catatan lain"
                />
              </label>

              {prefillLoading ? (
                <p className="mt-3 text-xs text-slate-500">Mengambil data profil dan alamat tersimpan Anda...</p>
              ) : !profile ? (
                <p className="mt-3 text-xs text-rose-600">
                  Data profil belum berhasil dimuat. Pastikan profil akun Anda tersedia sebelum melanjutkan trade-in.
                </p>
              ) : null}
            </QuestionSection>

            <QuestionSection
              number="06"
              title="Unggah foto device lama Anda"
              subtitle="Foto dipakai untuk pemeriksaan awal sebelum limit final diterbitkan."
              icon={<Camera className="h-5 w-5" />}
            >
              <TradeInPhotoUploader
                photos={photos}
                onChange={(nextPhotos) => {
                  const removedPhotos = photos.filter(
                    (photo) => !nextPhotos.some((nextPhoto) => nextPhoto.id === photo.id)
                  );

                  removedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
                  setPhotos(nextPhotos);
                  resetCheckedLimit();
                }}
              />
            </QuestionSection>

            <div className="lg:hidden">
              <TradeInSummaryCard
                productName={product.name}
                productImage={product.image}
                basePrice={offlineBasePrice}
                variantLabel={selectedVariantLabel}
                estimate={estimate}
                loading={isCheckingLimit}
                continueLoading={isContinuingOrder}
                canSubmit={canContinue}
                hasCompletedForm={hasCompletedForm}
                summaryLines={summaryLines}
                onCheckLimit={handleCheckLimit}
                onContinue={handleContinueOrder}
              />
            </div>
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-24">
            <TradeInSummaryCard
              productName={product.name}
              productImage={product.image}
              basePrice={offlineBasePrice}
              variantLabel={selectedVariantLabel}
              estimate={estimate}
              loading={isCheckingLimit}
              continueLoading={isContinuingOrder}
              canSubmit={canContinue}
              hasCompletedForm={hasCompletedForm}
              summaryLines={summaryLines}
              onCheckLimit={handleCheckLimit}
              onContinue={handleContinueOrder}
            />
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Estimasi Limit Hingga</p>
            <p className="truncate text-lg font-bold text-slate-950">{formatCurrencyIDR(estimate)}</p>
          </div>

          <Button
            type="button"
            onClick={handleCheckLimit}
            loading={isCheckingLimit}
            disabled={!hasCompletedForm || isCheckingLimit}
            variant="outline"
            className="h-11 rounded-2xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            Cek Limit
          </Button>
        </div>
      </div>
    </div>
  );
}
