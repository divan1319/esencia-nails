import { createError, defineEventHandler, getRouterParam } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db'
import { requireAdmin } from '../../../utils/auth'
import { services } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

  try {
    const [deleted] = await db
      .delete(services)
      .where(eq(services.id, id))
      .returning()

    if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Servicio no encontrado' })

    return { ok: true, deleted }
  } catch (error: any) {
    if (error?.code === '23503') {
      throw createError({
        statusCode: 409,
        statusMessage: 'No se puede eliminar porque tiene reservas asociadas. Puedes desactivarlo en su lugar.',
      })
    }
    throw error
  }
})
