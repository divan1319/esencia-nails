import { defineEventHandler } from 'h3'
import { asc, desc } from 'drizzle-orm'
import { db } from '../utils/db'
import { galleryCategories, galleryItems } from '../db/schema'
import { publicUrl } from '../utils/storage'

export default defineEventHandler(async () => {
  const categories = await db
    .select()
    .from(galleryCategories)
    .orderBy(asc(galleryCategories.sortOrder), asc(galleryCategories.name))

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
    })
    .from(galleryItems)
    .orderBy(asc(galleryItems.sortOrder), desc(galleryItems.createdAt))

  const itemsWithUrls = items.map((item) => ({
    ...item,
    thumbUrl: publicUrl(item.thumbKey),
    fullUrl: publicUrl(item.fullKey),
  }))

  return { categories, items: itemsWithUrls }
})
