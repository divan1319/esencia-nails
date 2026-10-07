import { createError, defineEventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { zones } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  try {
    const [deleted] = await db
      .delete(zones)
      .where(eq(zones.id, id))
      .returning()

    if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Zona no encontrada' })

    return { ok: true, deleted }
  } catch (error: any) {
    if (error?.code === '23503') {
      throw createError({
        statusCode: 409,
        statusMessage: 'No se puede eliminar la zona porque tiene reservas asociadas.',
      })
    }
    throw error
  }
})
