/**
 * STEP 2.3 — File upload: resume and photo stored securely in Supabase Storage.
 */

import { NextResponse } from 'next/server';
import { uploadUserFile } from '@/lib/storage';
import {
  validatePhotoBuffer,
  validateResumeBuffer,
  sanitizeUploadFilename,
} from '@/lib/upload-validation';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_RESUME_BYTES = 5 * 1024 * 1024;  // 5 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file || !type) {
      return NextResponse.json(
        { error: 'Missing file or type (photo|resume)' },
        { status: 400 }
      );
    }
    if (type !== 'photo' && type !== 'resume') {
      return NextResponse.json(
        { error: 'type must be photo or resume' },
        { status: 400 }
      );
    }

    const maxBytes = type === 'photo' ? MAX_PHOTO_BYTES : MAX_RESUME_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: type === 'photo' ? 'Photo must be under 10 MB' : 'Resume must be under 5 MB' },
        { status: 413 }
      );
    }

    const buffer = await file.arrayBuffer();
    const isPhoto = type === 'photo';
    if (isPhoto && !validatePhotoBuffer(buffer)) {
      return NextResponse.json(
        { error: 'Invalid image file. Use JPEG, PNG, GIF, or WebP.' },
        { status: 400 }
      );
    }
    if (!isPhoto && !validateResumeBuffer(buffer)) {
      return NextResponse.json(
        { error: 'Invalid resume file. Use PDF or DOC/DOCX.' },
        { status: 400 }
      );
    }
    const safeName = sanitizeUploadFilename(file.name, type as 'photo' | 'resume');
    const url = await uploadUserFile(
      type as 'photo' | 'resume',
      buffer,
      safeName,
      file.type || undefined
    );
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
