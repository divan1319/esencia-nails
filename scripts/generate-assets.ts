import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const publicDir = path.resolve(process.cwd(), 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// 1. icon.svg
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6d28d9" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fdf4ff" />
      <stop offset="100%" stop-color="#fae8ff" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#4c1d95" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Background circle -->
  <rect width="512" height="512" rx="128" fill="url(#violetGrad)" />
  <circle cx="256" cy="256" r="210" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4" stroke-dasharray="12 12" />
  
  <!-- Stylized Monogram E -->
  <g filter="url(#shadow)">
    <path d="M 170 140 H 340 C 352 140 360 148 360 160 C 360 172 352 180 340 180 H 210 V 236 H 320 C 332 236 340 244 340 256 C 340 268 332 276 320 276 H 210 V 332 H 345 C 357 332 365 340 365 352 C 365 364 357 372 345 372 H 170 C 158 372 150 364 150 352 V 160 C 150 148 158 140 170 140 Z" fill="url(#accentGrad)" />
  </g>

  <!-- Sparkles -->
  <path d="M 370 140 Q 370 165 395 165 Q 370 165 370 190 Q 370 165 345 165 Q 370 165 370 140 Z" fill="#fef08a" />
  <path d="M 140 320 Q 140 338 158 338 Q 140 338 140 356 Q 140 338 122 338 Q 140 338 140 320 Z" fill="#fef08a" opacity="0.8" />
</svg>`

fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconSvg, 'utf-8')
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg, 'utf-8')

// 2. manifest.webmanifest
const manifest = {
  name: 'Esencia Nails by Mel',
  short_name: 'Esencia Nails',
  description: 'Servicio profesional de uñas a domicilio en Santa Tecla, El Salvador',
  start_url: '/',
  display: 'standalone',
  background_color: '#0f172a',
  theme_color: '#7c3aed',
  icons: [
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
}

fs.writeFileSync(path.join(publicDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf-8')

// 3. robots.txt
const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin/
`
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots, 'utf-8')

// Helper for generating PNG files
function crc32(buf: Buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    }
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function generateSolidPng(width: number, height: number, primaryR: number, primaryG: number, primaryB: number) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 8-bit
  ihdr[9] = 2 // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rowBytes = 1 + width * 3
  const raw = Buffer.alloc(height * rowBytes)

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes
    raw[rowStart] = 0 // Filter type None
    const gradientFactor = 1 - (y / height) * 0.35
    const r = Math.min(255, Math.max(0, Math.round(primaryR * gradientFactor)))
    const g = Math.min(255, Math.max(0, Math.round(primaryG * gradientFactor)))
    const b = Math.min(255, Math.max(0, Math.round(primaryB * gradientFactor)))
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
    }
  }

  const idat = zlib.deflateSync(raw)
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// Generate icon-192.png, icon-512.png, og-image.png
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), generateSolidPng(192, 192, 124, 58, 237))
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), generateSolidPng(512, 512, 124, 58, 237))
fs.writeFileSync(path.join(publicDir, 'og-image.png'), generateSolidPng(1200, 630, 124, 58, 237))

console.log('Public assets generated successfully in:', publicDir)
