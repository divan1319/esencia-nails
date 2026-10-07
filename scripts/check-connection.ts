// Uso: npx tsx --env-file=.env scripts/check-connection.ts
import { neon } from '@neondatabase/serverless'
import { HeadBucketCommand } from '@aws-sdk/client-s3'
import { s3 } from '../server/utils/storage'

async function check(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    console.log(`OK    ${label}`)
  } catch (error) {
    console.log(`FALLA ${label}: ${(error as Error).message}`)
  }
}

const sql = neon(process.env.DATABASE_URL!)

await check('Postgres (select 1)', () => sql`select 1`)
await check(`Bucket ${process.env.S3_BUCKET}`, () =>
  s3().send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET! })),
)
