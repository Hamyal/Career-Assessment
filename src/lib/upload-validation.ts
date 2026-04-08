/**
 * Upload validation: magic-byte (MIME) check and filename sanitization.
 */

const IMAGE_SIGNATURES: { bytes: number[]; offset: number }[] = [
  { bytes: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 }, // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }, // GIF
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // WEBP (RIFF) - check at 8 for WEBP
];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // PK.. (DOCX etc)
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06];
const MAX_FILENAME_LENGTH = 200;
const SAFE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx']);

function matchesSignature(buffer: ArrayBuffer, sig: number[], offset: number): boolean {
  const arr = new Uint8Array(buffer);
  if (offset + sig.length > arr.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (arr[offset + i] !== sig[i]) return false;
  }
  return true;
}

export function validatePhotoBuffer(buffer: ArrayBuffer): boolean {
  for (const { bytes, offset } of IMAGE_SIGNATURES) {
    if (matchesSignature(buffer, bytes, offset)) return true;
  }
  if (matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46], 0)) {
    const arr = new Uint8Array(buffer);
    if (arr.length >= 12 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) return true; // WEBP
  }
  return false;
}

export function validateResumeBuffer(buffer: ArrayBuffer): boolean {
  if (matchesSignature(buffer, PDF_SIGNATURE, 0)) return true;
  if (matchesSignature(buffer, ZIP_SIGNATURE, 0) || matchesSignature(buffer, ZIP_EMPTY, 0)) return true; // DOCX
  if (buffer.byteLength >= 8) {
    const arr = new Uint8Array(buffer);
    if (arr[0] === 0xd0 && arr[1] === 0xcf && arr[2] === 0x11 && arr[3] === 0xe0) return true; // DOC (OLE)
  }
  return false;
}

export function sanitizeUploadFilename(filename: string, type: 'photo' | 'resume'): string {
  const base = filename.replace(/^.*[\\/]/, '').slice(0, MAX_FILENAME_LENGTH);
  const lastDot = base.lastIndexOf('.');
  const ext = lastDot >= 0 ? base.slice(lastDot).toLowerCase() : '';
  const safeExt = type === 'photo'
    ? (SAFE_EXT.has(ext) && /^\.(jpg|jpeg|png|gif|webp)$/.test(ext) ? ext : '.jpg')
    : (SAFE_EXT.has(ext) && /^\.(pdf|doc|docx)$/.test(ext) ? ext : '.pdf');
  const nameWithoutExt = lastDot >= 0 ? base.slice(0, lastDot) : base;
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
  return (safeName || 'file') + safeExt;
}
