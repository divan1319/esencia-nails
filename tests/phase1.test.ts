import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireAdmin } from '../server/utils/auth'
import { IMAGE_LIMITS, detectImageKind } from '../server/utils/image'
import { publicUrl, s3DirectUrl } from '../server/utils/storage'

test('Criterio: requireAdmin lanza 401 sin sesión', async () => {
  // Simular evento sin cookies/headers de sesión
  const fakeEvent = {
    headers: new Headers(),
  } as any

  await assert.rejects(
    async () => {
      await requireAdmin(fakeEvent)
    },
    (err: any) => {
      assert.equal(err.statusCode, 401)
      assert.equal(err.statusMessage, 'No autorizado')
      return true
    }
  )
})

test('Criterio: límites de optimización de imágenes (WebP y JPEG)', () => {
  assert.equal(IMAGE_LIMITS.thumb.maxSide, 600)
  assert.equal(IMAGE_LIMITS.thumb.maxBytes, 300 * 1024) // 300 KB

  assert.equal(IMAGE_LIMITS.full.maxSide, 1600)
  assert.equal(IMAGE_LIMITS.full.maxBytes, 1024 * 1024) // 1 MB

  // Validación de tipos válidos
  const webpHeader = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

  assert.equal(detectImageKind(webpHeader), 'webp')
  assert.equal(detectImageKind(jpegHeader), 'jpeg')
  assert.equal(detectImageKind(pngHeader), null)
})

test('Criterio: URL pública de S3 con AWS_ENDPOINT_URL_S3 y proxy /api/files', () => {
  process.env.AWS_ENDPOINT_URL_S3 = 'https://storage.neon.tech'
  process.env.S3_BUCKET = 'uploads'

  // publicUrl devuelve la ruta estable de la app para no exponer URLs temporales ni fallar por 403
  const url = publicUrl('galeria/foto-600.webp')
  assert.equal(url, '/api/files/galeria/foto-600.webp')

  // s3DirectUrl resuelve la URL directa con AWS_ENDPOINT_URL_S3
  const direct1 = s3DirectUrl('galeria/foto-600.webp')
  assert.equal(direct1, 'https://storage.neon.tech/uploads/galeria/foto-600.webp')

  process.env.AWS_ENDPOINT_URL_S3 = 'https://storage.neon.tech/uploads'
  const direct2 = s3DirectUrl('galeria/foto-600.webp')
  assert.equal(direct2, 'https://storage.neon.tech/uploads/galeria/foto-600.webp')
})
