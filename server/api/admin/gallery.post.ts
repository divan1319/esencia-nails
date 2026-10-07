import { z } from 'zod'
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { db } from '../../utils/db'
import { requireAdmin } from '../../utils/auth'
import { galleryItems } from '../../db/schema'
import { putPublicImage, deleteImage } from '../../utils/storage'
import { CONTENT_TYPE, EXTENSION, IMAGE_LIMITS, detectImageKind } from '../../utils/image'

// multipart: thumb (archivo), full (archivo), meta (JSON con width, height, alt, categoryId)
const meta = z.object({
  width: z.number().int().min(1).max(IMAGE_LIMITS.full.maxSide),
  height: z.number().int().min(1).max(IMAGE_LIMITS.full.maxSide),
  alt: z.string().trim().max(200).optional(),
  categoryId: z.uuid().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)
  const part = (name: string) => parts?.find((p) => p.name === name)
  const thumb = part('thumb')?.data
  const full = part('full')?.data
  const rawMeta = part('meta')?.data
  if (!thumb || !full || !rawMeta) {
    throw createError({ statusCode: 400, statusMessage: 'Faltan thumb, full o meta' })
  }

  const info = meta.parse(JSON.parse(rawMeta.toString('utf8')))

  const thumbKind = detectImageKind(thumb)
  const fullKind = detectImageKind(full)
  if (!thumbKind || !fullKind) throw createError({ statusCode: 415, statusMessage: 'Solo WebP o JPEG' })
  if (thumb.byteLength > IMAGE_LIMITS.thumb.maxBytes || full.byteLength > IMAGE_LIMITS.full.maxBytes) {
    throw createError({ statusCode: 413, statusMessage: 'La imagen no se optimizó lo suficiente' })
  }

  const id = crypto.randomUUID()
  const thumbKey = `galeria/${id}-600.${EXTENSION[thumbKind]}`
  const fullKey = `galeria/${id}-1600.${EXTENSION[fullKind]}`

  await putPublicImage(thumbKey, thumb, CONTENT_TYPE[thumbKind])
  try {
    await putPublicImage(fullKey, full, CONTENT_TYPE[fullKind])
    const [item] = await db
      .insert(galleryItems)
      .values({ thumbKey, fullKey, width: info.width, height: info.height, alt: info.alt, categoryId: info.categoryId })
      .returning()
    return item
  } catch (error) {
    // No dejar archivos huérfanos si falla la segunda subida o el insert
    await Promise.allSettled([deleteImage(thumbKey), deleteImage(fullKey)])
    throw error
  }
})
