import type { Area } from "react-easy-crop";

const createImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = src;
  });

export const cropAvatarImage = async (
  sourceUrl: string,
  cropPixels: Area,
  fileName: string,
  fileType: string
): Promise<File> => {
  const image = await createImage(sourceUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas crop tidak tersedia di browser ini.");
  }

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, fileType || "image/png", 0.92);
  });

  if (!blob) {
    throw new Error("Gagal membuat hasil crop avatar.");
  }

  return new File([blob], fileName, {
    type: blob.type || fileType || "image/png",
    lastModified: Date.now(),
  });
};
