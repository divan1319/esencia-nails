// Validación de imágenes ya optimizadas por el navegador.

export type ImageKind = 'webp' | 'jpeg'

export const IMAGE_LIMITS = {
  thumb: { maxSide: 600, maxBytes: 300 * 1024 },
  full: { maxSide: 1600, maxBytes: 1024 * 1024 },
} as const

/** Formato real según los primeros bytes; no confía en el Content-Type. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  return null
}

export const CONTENT_TYPE: Record<ImageKind, string> = { webp: 'image/webp', jpeg: 'image/jpeg' }
export const EXTENSION: Record<ImageKind, string> = { webp: 'webp', jpeg: 'jpg' }
