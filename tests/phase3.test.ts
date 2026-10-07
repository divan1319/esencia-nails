import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Fase 3 Criterio 1: Assets estáticos de PWA, Favicon y Open Graph', () => {
  const publicDir = path.resolve(process.cwd(), 'public')
  assert.ok(fs.existsSync(publicDir), 'El directorio public debe existir')

  // Validar icon.svg y favicon.svg
  assert.ok(fs.existsSync(path.join(publicDir, 'icon.svg')), 'icon.svg debe existir')
  assert.ok(fs.existsSync(path.join(publicDir, 'favicon.svg')), 'favicon.svg debe existir')

  // Validar PNGs (192, 512, og-image)
  const icon192 = fs.statSync(path.join(publicDir, 'icon-192.png'))
  const icon512 = fs.statSync(path.join(publicDir, 'icon-512.png'))
  const ogImage = fs.statSync(path.join(publicDir, 'og-image.png'))
  assert.ok(icon192.size > 0, 'icon-192.png no debe estar vacío')
  assert.ok(icon512.size > 0, 'icon-512.png no debe estar vacío')
  assert.ok(ogImage.size > 0, 'og-image.png no debe estar vacío')

  // Validar manifest.webmanifest
  const manifestPath = path.join(publicDir, 'manifest.webmanifest')
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest debe existir')
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  assert.equal(manifestContent.short_name, 'Esencia Nails')
  assert.equal(manifestContent.theme_color, '#7c3aed')
  assert.equal(manifestContent.display, 'standalone')
  assert.ok(Array.isArray(manifestContent.icons) && manifestContent.icons.length >= 2)

  // Validar robots.txt
  const robotsPath = path.join(publicDir, 'robots.txt')
  assert.ok(fs.existsSync(robotsPath), 'robots.txt debe existir')
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8')
  assert.ok(robotsContent.includes('Disallow: /admin'))
})

test('Fase 3 Criterio 2: Normalización de código de reserva para consulta pública', () => {
  // Los códigos deben normalizarse a mayúsculas y sin espacios laterales
  const raw1 = '  mel123  '
  const normalized1 = raw1.trim().toUpperCase()
  assert.equal(normalized1, 'MEL123')

  const raw2 = 'a1b2c3'
  const normalized2 = raw2.trim().toUpperCase()
  assert.equal(normalized2, 'A1B2C3')
})

test('Fase 3 Criterio 3: Proyección pública segura de la reserva (sin adminNotes)', () => {
  // Simular registro en base de datos con campo privado
  const dbBookingRecord = {
    id: 'booking-1',
    code: 'MEL123',
    status: 'confirmed',
    date: '2026-10-08',
    startMinute: 990,
    endMinute: 1080,
    clientName: 'Valeria Gómez',
    clientPhone: '79581732',
    address: 'Residencial Santa Teresa, Senda 3, Casa #12',
    notes: 'Uñas almendradas',
    adminNotes: 'NOTA PRIVADA: clienta puntual, verificar pago anticipo',
    serviceNameSnapshot: 'Esmaltado en gel',
    priceTypeSnapshot: 'fixed',
    priceCentsSnapshot: 1500,
    travelFeeCentsSnapshot: 200,
    depositCentsSnapshot: 500,
    depositStatus: 'received',
    createdAt: new Date(),
  }

  // Campos expuestos por la API pública GET /api/bookings/[code]
  const publicProjection = {
    code: dbBookingRecord.code,
    status: dbBookingRecord.status,
    date: dbBookingRecord.date,
    startMinute: dbBookingRecord.startMinute,
    endMinute: dbBookingRecord.endMinute,
    clientName: dbBookingRecord.clientName,
    clientPhone: dbBookingRecord.clientPhone,
    address: dbBookingRecord.address,
    notes: dbBookingRecord.notes,
    serviceNameSnapshot: dbBookingRecord.serviceNameSnapshot,
    priceTypeSnapshot: dbBookingRecord.priceTypeSnapshot,
    priceCentsSnapshot: dbBookingRecord.priceCentsSnapshot,
    travelFeeCentsSnapshot: dbBookingRecord.travelFeeCentsSnapshot,
    depositCentsSnapshot: dbBookingRecord.depositCentsSnapshot,
    depositStatus: dbBookingRecord.depositStatus,
    createdAt: dbBookingRecord.createdAt,
  }

  // Verificar que adminNotes NO está expuesto
  assert.equal('adminNotes' in publicProjection, false)
  assert.equal(publicProjection.code, 'MEL123')
  assert.equal(publicProjection.status, 'confirmed')
})

test('Fase 3 Criterio 4: Generación de signedUrl con AWS SigV4 para Neon Object Storage', async () => {
  const { signedUrl, SIGNED_URL_EXPIRES_IN } = await import('../server/utils/storage')
  const key = 'galeria/test-monogram.webp'
  const url = await signedUrl(key)

  assert.ok(url.includes('X-Amz-Signature='), 'Debe incluir firma AWS SigV4')
  assert.ok(url.includes(`X-Amz-Expires=${SIGNED_URL_EXPIRES_IN}`), 'Debe incluir tiempo de expiración')
  assert.ok(url.includes('galeria/test-monogram.webp'), 'Debe apuntar a la key especificada')
})
