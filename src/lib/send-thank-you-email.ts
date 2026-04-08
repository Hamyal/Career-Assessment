/**
 * Send thank-you email with report link (and optional PDF attachment) to the user.
 * Used by submit API so the response is sent server-side (no dependency on client).
 */

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY?.trim();
const resend = apiKey ? new Resend(apiKey) : null;
// Resend free tier: use exactly onboarding@resend.dev (or your verified domain)
const fromEmail = process.env.EMAIL_FROM?.trim() || 'onboarding@resend.dev';

async function fetchPdfAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch {
    return null;
  }
}

export type ThankYouEmailStatus = 'sent' | 'skipped' | 'failed';

/**
 * Sends thank-you email to the user's address. Returns status so the API can include it in the response.
 */
export async function sendThankYouEmail(
  userEmail: string,
  pdfUrl: string | null
): Promise<ThankYouEmailStatus> {
  const email = userEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'failed';
  }

  if (!resend) {
    console.warn('RESEND_API_KEY not set; thank-you email skipped');
    return 'skipped';
  }

  const pdfLine = pdfUrl
    ? `<p><a href="${pdfUrl}" style="color:#333;font-weight:600;">Download your report (PDF)</a></p>`
    : '<p>Your personalized report will be ready soon. We’ll send you a link when it’s available.</p>';

  const attachments: { filename: string; content: string }[] = [];
  if (pdfUrl) {
    const base64 = await fetchPdfAsBase64(pdfUrl);
    if (base64) attachments.push({ filename: 'career-assessment-report.pdf', content: base64 });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your PowerPrint™ Career Assessment — Report ready',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#111;">Thank you</h2>
          <p>You’ve completed the Career Assessment. Your report has been sent to this email address.</p>
          ${pdfLine}
          ${attachments.length > 0 ? '<p style="color:#666;font-size:14px;">Your PDF report is also attached to this email.</p>' : ''}
          <p style="margin-top:1.5rem;color:#666;font-size:14px;">Questions? Reply to this email.</p>
        </div>
      `,
      ...(attachments.length > 0 && { attachments }),
    });

    if (error) {
      console.error('Resend error:', error?.name, error?.message);
      return 'failed';
    }
    return data?.id ? 'sent' : 'sent';
  } catch (e) {
    console.error('Send thank-you email error:', e);
    return 'failed';
  }
}
