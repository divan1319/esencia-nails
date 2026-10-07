import { createError, defineEventHandler, getRouterParam, sendRedirect, setResponseHeader } from 'h3'
import { signedUrl, SIGNED_URL_EXPIRES_IN } from '../../utils/storage'

const ALLOWED_PREFIXES = ['galeria', 'uploads', 'test']

export default defineEventHandler(async (event) => {
  const rawKey = getRouterParam(event, 'key') || ''
  const key = rawKey.replace(/^\/+/, '')
  const partes = key.split('/')

  if (
    !key
    || partes.length < 2
    || !ALLOWED_PREFIXES.includes(partes[0])
    || partes.some((parte) => !parte || parte === '.' || parte === '..')
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Archivo o ruta no válida' })
  }

  try {
    const url = await signedUrl(key)
    // El navegador puede reutilizar la redirección mientras la firma siga vigente
    setResponseHeader(event, 'Cache-Control', `public, max-age=${SIGNED_URL_EXPIRES_IN - 600}`)
    return sendRedirect(event, url, 302)
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error al generar acceso al archivo: ${error?.message || 'Error en storage'}`,
    })
  }
})
