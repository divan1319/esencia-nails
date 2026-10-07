import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

let client: S3Client | undefined

export function s3(): S3Client {
  client ??= new S3Client({
    endpoint: env('AWS_ENDPOINT_URL_S3'),
    region: env('AWS_REGION'),
    // La URL de Neon lleva el bucket en la ruta.
    forcePathStyle: true,
    credentials: {
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
    },
  })
  return client
}

export const bucket = () => env('S3_BUCKET')

export async function putPublicImage(key: string, body: Uint8Array, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys inmutables: el navegador puede cachear la foto un año
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
}

export async function deleteImage(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
}

// Duración de la URL firmada temporal de lectura (1 hora en segundos)
export const SIGNED_URL_EXPIRES_IN = 60 * 60

/**
 * Genera una URL firmada de Neon Object Storage usando credenciales AWS SigV4.
 * Resuelve el error 403 Forbidden al consultar directamente objetos de Neon.
 */
export async function signedUrl(key: string): Promise<string> {
  const cleanKey = key.replace(/^\//, '')
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: cleanKey,
    }),
    { expiresIn: SIGNED_URL_EXPIRES_IN },
  )
}

/**
 * URL estable de la app para un archivo del storage.
 * Es la que se guarda y devuelve en las respuestas de la API (`/api/files/...`).
 * `GET /api/files/[...key]` redirige a la URL firmada de S3 al momento de pedirla.
 */
export function publicUrl(key: string): string {
  const cleanKey = key.replace(/^\//, '')
  return `/api/files/${cleanKey}`
}

/**
 * URL directa del bucket (útil si el bucket fuese configurado como 100% público anónimo).
 */
export function s3DirectUrl(key: string): string {
  const base = env('AWS_ENDPOINT_URL_S3').replace(/\/$/, '')
  const b = bucket()
  const cleanKey = key.replace(/^\//, '')
  if (base.endsWith(`/${b}`) || cleanKey.startsWith(`${b}/`)) {
    return `${base}/${cleanKey}`
  }
  return `${base}/${b}/${cleanKey}`
}
