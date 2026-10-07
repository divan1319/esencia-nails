import { defineEventHandler } from 'h3'
import { asc } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { blockedDates } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return db
    .select()
    .from(blockedDates)
    .orderBy(asc(blockedDates.date), asc(blockedDates.startMinute))
})
