import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

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
    // La URL de Neon lleva el bucket en la ruta. Si falla, prueba quitándolo.
    forcePathStyle: true,
    credentials: {
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
    },
  })
  return client
}

export const bucket = () => env('S3_BUCKET') // lectura pública

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

export function publicUrl(key: string): string {
  const base = env('AWS_ENDPOINT_URL_S3').replace(/\/$/, '')
  const b = bucket()
  const cleanKey = key.replace(/^\//, '')
  if (base.endsWith(`/${b}`) || cleanKey.startsWith(`${b}/`)) {
    return `${base}/${cleanKey}`
  }
  return `${base}/${b}/${cleanKey}`
}
