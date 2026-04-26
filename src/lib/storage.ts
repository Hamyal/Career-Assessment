/**
 * Supabase Storage — upload report PDFs and return public URL.
 * Bucket "reports" must be created in Supabase Dashboard (Storage) and set to Public.
 */

import { supabaseServer } from './db/client';

const BUCKET = 'reports';

export async function uploadReportPdf(sessionId: string, pdfBuffer: Uint8Array): Promise<string> {
  const supabase = supabaseServer();
  const path = `${sessionId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error(
        `Storage bucket "${BUCKET}" not found. Create a public bucket named "reports" in Supabase Dashboard → Storage.`
      );
    }
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

/** Time-limited signed URL for report download (e.g. in email). Default 7 days. */
const REPORT_SIGNED_EXPIRY_SEC = 7 * 24 * 3600;
export async function getReportSignedUrl(
  sessionId: string,
  expiresInSeconds: number = REPORT_SIGNED_EXPIRY_SEC
): Promise<string> {
  const supabase = supabaseServer();
  const path = `${sessionId}.pdf`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  }
  return data.signedUrl;
}

/** STEP 2.3 — Upload resume or photo to Supabase Storage. Bucket "uploads" must exist and be public. */
const UPLOADS_BUCKET = 'uploads';

export async function uploadUserFile(
  type: 'photo' | 'resume',
  buffer: ArrayBuffer | Uint8Array,
  filename: string,
  contentType?: string
): Promise<string> {
  const supabase = supabaseServer();
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  const path = `${type}/${crypto.randomUUID()}${ext}`;
  const mime = contentType || (type === 'photo' ? 'image/jpeg' : 'application/pdf');

  const { error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
      throw new Error(
        `Storage bucket "${UPLOADS_BUCKET}" not found. Create a public bucket named "uploads" in Supabase Dashboard → Storage.`
      );
    }
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return publicUrl;
}
