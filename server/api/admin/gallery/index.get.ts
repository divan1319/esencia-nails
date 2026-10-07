import { defineEventHandler } from 'h3'
import { asc, desc } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { galleryCategories, galleryItems } from '../../../db/schema'
import { publicUrl } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const items = await db
    .select({
      id: galleryItems.id,
      categoryId: galleryItems.categoryId,
      thumbKey: galleryItems.thumbKey,
      fullKey: galleryItems.fullKey,
      width: galleryItems.width,
      height: galleryItems.height,
      alt: galleryItems.alt,
      featured: galleryItems.featured,
      sortOrder: galleryItems.sortOrder,
      createdAt: galleryItems.createdAt,
    })
    .from(galleryItems)
    .orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt))

  const categories = await db
    .select()
    .from(galleryCategories)
    .orderBy(asc(galleryCategories.sortOrder), asc(galleryCategories.name))

  return {
    items: items.map((i) => ({
      ...i,
      thumbUrl: publicUrl(i.thumbKey),
      fullUrl: publicUrl(i.fullKey),
    })),
    categories,
  }
})
