import { z } from "zod";

const parseDate = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const profileSchema = z.object({
  name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter.").max(100, "Nama lengkap terlalu panjang."),
  email: z.string().trim().email("Format email tidak valid."),
  phone: z
    .string()
    .trim()
    .max(20, "Nomor telepon terlalu panjang.")
    .refine((value) => value === "" || /^\d+$/.test(value), "Nomor telepon hanya boleh berisi angka."),
  gender: z.enum(["", "male", "female", "other"]),
  date_of_birth: z.string().refine((value) => {
    if (!value) return true;
    const parsed = parseDate(value);
    if (!parsed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return parsed < today;
  }, "Tanggal lahir harus sebelum hari ini."),
  avatar: z.any().nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
