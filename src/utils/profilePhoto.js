// Reduce the image before storing it in the browser. The original stays on the device.
export async function prepareProfilePhoto(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choisissez une image JPG, PNG ou WebP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La photo doit faire au maximum 5 Mo.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = () =>
        reject(
          new Error("Cette image est illisible. Essayez une autre photo."),
        );
      picture.src = url;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    if (!size) throw new Error("Cette image est vide ou invalide.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(384, size);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Votre navigateur ne permet pas de préparer cette photo.",
      );
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
