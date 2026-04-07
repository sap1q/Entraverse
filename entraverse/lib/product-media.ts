import type { PhotoSlot } from "@/types/product";

export const PRODUCT_MEDIA_MAX_PHOTOS = 5;
export const PRODUCT_MEDIA_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_MEDIA_UPLOAD_MARKER_PREFIX = "__UPLOAD__:";

const INVALID_PHOTO_VALUES = new Set(["", "null", "undefined", "nan"]);

export const isInvalidPhotoValue = (value: string): boolean =>
  INVALID_PHOTO_VALUES.has(value.trim().toLowerCase());

export const isPersistablePhotoPath = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized) return false;
  if (isInvalidPhotoValue(normalized)) return false;
  if (/^(blob:|data:)/i.test(normalized)) return false;
  return true;
};

export const buildMediaSubmission = (slots: PhotoSlot[]) => {
  const photos: string[] = [];
  const files: File[] = [];

  slots.slice(0, PRODUCT_MEDIA_MAX_PHOTOS).forEach((slot) => {
    if (slot.file) {
      photos.push(`${PRODUCT_MEDIA_UPLOAD_MARKER_PREFIX}${files.length}`);
      files.push(slot.file);
      return;
    }

    if (isPersistablePhotoPath(slot.preview)) {
      photos.push(slot.preview.trim());
    }
  });

  return { photos, files };
};
