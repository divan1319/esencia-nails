// Optimiza una foto en el navegador antes de subirla a la galería.
// Devuelve dos versiones (600 px y 1600 px de lado mayor) en WebP, o JPEG si el
// navegador no sabe codificar WebP desde canvas (algunas versiones de Safari, no verificado).

const MAX_INPUT_BYTES = 15 * 1024 * 1024
const VARIANTS = {
  thumb: { maxSide: 600, maxBytes: 300 * 1024 },
  full: { maxSide: 1600, maxBytes: 1024 * 1024 },
} as const // mismos límites que server/utils/image.ts

const QUALITIES = [0.8, 0.7, 0.6, 0.5]

export type OptimizedImage = { thumb: Blob; full: Blob; width: number; height: number }

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar la imagen'))), type, quality),
  )
}

function draw(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Prueba WebP; si el navegador entrega otro tipo, usa JPEG. Baja calidad hasta caber en maxBytes. */
async function encode(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  for (const quality of QUALITIES) {
    let blob = await toBlob(canvas, 'image/webp', quality)
    if (blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality + 0.02)
    if (blob.size <= maxBytes) return blob
  }
  throw new Error('La imagen sigue pesando demasiado; prueba con otra foto')
}

export async function optimizeImage(file: File): Promise<OptimizedImage> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  if (file.size > MAX_INPUT_BYTES) throw new Error('La foto pesa más de 15 MB')

  // 'from-image' respeta la orientación EXIF de las fotos del celular
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const fullCanvas = draw(bitmap, VARIANTS.full.maxSide)
    const thumbCanvas = draw(bitmap, VARIANTS.thumb.maxSide)
    const [full, thumb] = await Promise.all([
      encode(fullCanvas, VARIANTS.full.maxBytes),
      encode(thumbCanvas, VARIANTS.thumb.maxBytes),
    ])
    return { thumb, full, width: fullCanvas.width, height: fullCanvas.height }
  } finally {
    bitmap.close()
  }
}

/** Arma el multipart que espera POST /api/admin/gallery */
export function galleryFormData(img: OptimizedImage, extra: { alt?: string; categoryId?: string } = {}): FormData {
  const ext = (b: Blob) => (b.type === 'image/webp' ? 'webp' : 'jpg')
  const form = new FormData()
  form.append('thumb', img.thumb, `thumb.${ext(img.thumb)}`)
  form.append('full', img.full, `full.${ext(img.full)}`)
  form.append('meta', JSON.stringify({ width: img.width, height: img.height, ...extra }))
  return form
}
