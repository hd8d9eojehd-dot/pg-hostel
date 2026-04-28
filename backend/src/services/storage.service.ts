import { supabaseAdmin } from '../config/supabase'
import { env } from '../config/env'

export async function getUploadUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error) throw new Error(`Failed to create upload URL: ${error.message}`)
  return data.signedUrl
}

export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])
  if (error) throw new Error(`Failed to delete file: ${error.message}`)
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw new Error(`Failed to create signed URL: ${error.message}`)
  return data.signedUrl
}

export const BUCKETS = {
  DOCS: env.SUPABASE_STORAGE_BUCKET_DOCS,
  AVATARS: env.SUPABASE_STORAGE_BUCKET_AVATARS,
  COMPLAINTS: env.SUPABASE_STORAGE_BUCKET_COMPLAINTS,
}
