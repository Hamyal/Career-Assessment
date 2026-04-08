# Career Assessment — Post-Remediation QA Validation Report

**System:** Career Decoder (54 questions, deterministic scoring, optional LLM transitions/narrative, Supabase, Resend, PDF)  
**Review type:** Post-fix validation — remaining gaps and regression check  
**Baseline:** Issues from `QA-VALIDATION-REPORT.md`; many fixes implemented. This report covers **remaining** and **new** findings.

---

## Remediation status (from original report)

| Original ID | Issue | Status |
|-------------|--------|--------|
| 4.1 | Send-completion-email unauthenticated | **Fixed** — Admin-only |
| 2.1 | Double submit | **Fixed** — Guard + idempotency support |
| 3.2 | Upload no file size limit | **Fixed** — 10 MB / 5 MB |
| 4.4 | Submit not rate limited | **Fixed** — 10/IP/15min |
| 7.1 | No upload loading state | **Fixed** — Uploading… + Send disabled |
| 9.2 | PDF public URL | **Fixed** — Signed URL in email/response |
| 4.2 | Admin cookie CSRF | **Fixed** — SameSite=Strict |
| 1.2 | Option IDs not validated | **Fixed** — Validation against option map |
| 2.3 | Required text not enforced server-side | **Fixed** — Q 1,2,4,6,7,9 |
| 8.2 | custom_text unbounded | **Fixed** — Max 5000 chars |
| 10.1 | Chat-transition prompt injection | **Mitigated** — Truncate 500 chars + prompt hardening |
| 6.1 | No idempotency | **Fixed** — Idempotency-Key header |
| 6.2 | Admin sessions no pagination | **Fixed** — limit/offset |
| 3.3 | No OpenAI circuit breaker | **Fixed** — In-memory circuit |
| 7.2 | No retry on error | **Fixed** — Retry submission button |
| 7.3 | Message list key | **Fixed** — Stable keys |

---

## 1. Remaining issues — functional & edge cases

### REM-1.1 Client does not send Idempotency-Key on submit
**Issue:** Submit API supports `Idempotency-Key` but the assessment page never sends it. Retry button triggers a new request without a key, so a second submission can create a duplicate session if the first one eventually succeeds.  
**Why it's a problem:** Duplicate sessions and emails when the user retries after a transient failure.  
**Fix:** On first submit, generate a UUID (e.g. `crypto.randomUUID()`) and store it in a ref. Send `Idempotency-Key: <uuid>` on the POST. Use the same key when the user clicks "Retry submission."  
**Severity:** Medium

### REM-1.2 Submit partial failure still leaves orphaned session
**Issue:** If PDF generation, upload, or email fails after session + responses are written, the session exists in DB with no PDF and the user sees a generic 500. There is no "retry report generation" by session_id.  
**Why it's a problem:** Orphaned sessions, support burden, poor UX.  
**Fix:** (a) Add a dedicated endpoint e.g. `POST /api/submit/retry-report` that accepts `session_id` (and optionally auth or signed token), loads session + responses, regenerates PDF and sends email, then returns the new pdf_url; or (b) store a `report_status` and run a background job to complete failed reports.  
**Severity:** High

### REM-1.3 Completion screen copy typo still present in some builds
**Issue:** The completion bubble may still show "x. You'll hear from us soon." in some environments (character encoding or unmerged change).  
**Why it's a problem:** Unprofessional appearance.  
**Fix:** Ensure the line is exactly "You'll hear from us soon." (no "x. ") in `assessment/page.tsx` and run a quick visual regression before release.  
**Severity:** Low

---

## 2. Remaining issues — error handling & UX

### REM-2.1 4xx error message fallback can hide server message
**Issue:** Client uses `if (d && typeof d.error === 'string') msg = d.error` but then `if (text.length < 200) msg = text || msg` only when JSON parse fails. If the server returns 400 with a long JSON body (e.g. detailed validation), the full error might be in `d.error`; current code is correct for that. But if the server returns non-JSON 4xx with body length ≥ 200, the user sees only statusText.  
**Why it's a problem:** User may not see the real reason for failure.  
**Fix:** Always prefer `d?.error` for 4xx when parse succeeds; never truncate to 200 for the fallback—use full `text` when not JSON, or at least first 500 chars.  
**Severity:** Low

---

## 3. Remaining issues — security

### REM-3.1 Upload does not validate file content (MIME / magic bytes)
**Issue:** Upload accepts any file as long as `type` is `photo` or `resume`. Client can send a malicious executable with `type: photo` and a .jpg filename. Only size is limited.  
**Why it's a problem:** Malicious files in storage; risk if files are ever executed or re-served in a vulnerable way.  
**Fix:** Server-side: for `photo`, check magic bytes (e.g. image signature); for `resume`, allow only PDF/DOC magic bytes. Reject with 400 if content does not match.  
**Severity:** Medium

### REM-3.2 Upload filename not sanitized
**Issue:** `file.name` is passed to `uploadUserFile` and used in storage path only via UUID; the stored path is `${type}/${uuid}${ext}`. Extension is taken from filename; a name like `../../evil.pdf` could result in `ext` being `.pdf` (lastIndexOf('.')). So path is still safe, but if filename is ever logged or displayed, long or special names could cause issues.  
**Why it's a problem:** Log injection or XSS if filename is rendered anywhere; path traversal is mitigated by UUID.  
**Fix:** Sanitize filename: strip path segments, limit length (e.g. 200 chars), allow only safe characters for extension; use a whitelist for `ext` (e.g. .jpg, .png, .pdf, .doc, .docx).  
**Severity:** Low

---

## 4. Remaining issues — performance & scalability

### REM-4.1 Submit remains a long sequential chain
**Issue:** Submit still does validate → score → user → session → responses → narrative (OpenAI) → PDF → upload → signed URL → email in one request. Under load or slow OpenAI, the request can timeout (e.g. Vercel 60s).  
**Why it's a problem:** Timeouts, poor UX, no way to show progress.  
**Fix:** Consider splitting: (a) sync part returns 202 with `session_id` after session + responses; (b) background job or serverless function generates narrative, PDF, upload, email and updates session; (c) client polls for completion or receives webhook/email.  
**Severity:** Medium

### REM-4.2 Rate limit and idempotency are in-memory
**Issue:** `rate-limit.ts` and `idempotency.ts` use process memory. In multi-instance or serverless, each instance has its own map; rate limits and idempotency do not apply across instances.  
**Why it's a problem:** Under horizontal scaling, an attacker can exceed the intended rate by hitting different instances; idempotency may not prevent duplicates across instances.  
**Fix:** For production at scale, use a shared store (e.g. Redis/Upstash) for rate limit and idempotency.  
**Severity:** Medium

---

## 5. AI / LLM — adversarial QA (remaining risks)

### AI-1. Chat-transition: output not validated for safety
**Vulnerability:** Model output is only length-capped (< 120 chars). No check for inappropriate content, prompt-leak, or instructions.  
**Exploit example:** A compromised or biased model could return "Ignore the next question" or off-brand text.  
**Impact:** Inappropriate or confusing text shown in the chat; reputational risk.  
**Mitigation:** (a) Blocklist obvious tokens/phrases (e.g. "ignore", "jailbreak", "system"); (b) allowlist tone (e.g. short, no questions); (c) optional second pass (e.g. classify safe vs unsafe and fall back to static phrase).  
**Severity:** Low

### AI-2. Narrative: no strict output validation or length cap
**Vulnerability:** Narrative is used as-is in the PDF. Model is instructed not to make up facts but there is no programmatic check that the text only uses archetype names and scores from the JSON.  
**Exploit example:** Model adds a sentence like "You may have anxiety" or invents a score.  
**Impact:** Misleading or harmful content in the report; liability.  
**Mitigation:** (a) Cap narrative length (e.g. 500 words) and trim; (b) post-check that narrative does not contain numbers or claims not present in the scoring JSON; (c) consider template-based narrative with placeholders filled from JSON.  
**Severity:** Medium

### AI-3. Chat-transition: possible token overflow in prompt
**Vulnerability:** `questionText` and `userAnswer` are truncated to 500 chars each. With system prompt and template, total is bounded but not explicitly validated. Very long 500-char strings could approach token limits for a small context window.  
**Impact:** Unlikely with 500-char cap and max_tokens 40; in edge cases, truncation or errors.  
**Mitigation:** Keep 500-char cap; optionally reduce to 300 each; document max token budget for the route.  
**Severity:** Low

### AI-4. No rate limit on chat-transition
**Vulnerability:** Each answer sends a POST to `/api/chat-transition`. No per-IP or per-session rate limit on this endpoint.  
**Exploit example:** Attacker sends many requests with arbitrary questionText/userAnswer to burn OpenAI quota or trigger circuit breaker for legitimate users.  
**Impact:** Cost, rate limits, degraded experience for real users.  
**Mitigation:** Apply rate limit (e.g. 60 requests per IP per 15 minutes) to the chat-transition route.  
**Severity:** Medium

---

## 6. Manual test case templates (critical flows)

### TC-1: Submit and receive report
| Field | Value |
|-------|--------|
| **Test Case ID** | TC-1 |
| **Feature** | Assessment submit and report delivery |
| **Preconditions** | All 54 questions answered; valid email; optional photo/resume uploaded. |
| **Test Steps** | 1. Complete assessment through Q54. 2. Click Send on last question. 3. Wait for "Saving your results". 4. Check for "All set!" and "Download your report (PDF)" or error. |
| **Expected Result** | 200 from submit; completion screen with pdf link; email received with same link (if Resend configured). |
| **Actual Result** | _To be filled_ |
| **Status** | Pass / Fail |
| **Severity** | High |
| **Notes** | Verify PDF opens and signed URL works. |

### TC-2: Double submit / retry idempotency
| Field | Value |
|-------|--------|
| **Test Case ID** | TC-2 |
| **Feature** | No duplicate sessions on retry |
| **Preconditions** | Assessment completed; first submit returns 500 or timeout. |
| **Test Steps** | 1. Complete assessment. 2. Simulate failure (e.g. disconnect after request sent). 3. Click "Retry submission". 4. Check DB for session count for that email. |
| **Expected Result** | With Idempotency-Key: one session. Without: may create two if both succeed. |
| **Actual Result** | _To be filled_ |
| **Status** | Pass / Fail |
| **Severity** | High |
| **Notes** | Implement client Idempotency-Key for full protection. |

### TC-3: Admin cannot access without auth
| Field | Value |
|-------|--------|
| **Test Case ID** | TC-3 |
| **Feature** | Admin sessions and send-completion-email protected |
| **Preconditions** | No admin cookie. |
| **Test Steps** | 1. GET /api/admin/sessions. 2. GET /api/admin/export-csv. 3. POST /api/send-completion-email with body { email, pdf_url }. |
| **Expected Result** | 401 for all. |
| **Actual Result** | _To be filled_ |
| **Status** | Pass / Fail |
| **Severity** | Critical |
| **Notes** | After login with correct ADMIN_SECRET, same requests return 200 (sessions/csv) or 200/400 (email). |

### TC-4: Upload size and type rejected
| Field | Value |
|-------|--------|
| **Test Case ID** | TC-4 |
| **Feature** | Upload file size limit |
| **Preconditions** | File > 10 MB (photo) or > 5 MB (resume). |
| **Test Steps** | 1. POST /api/upload with formData file (photo, 11 MB). 2. Same with resume 6 MB. |
| **Expected Result** | 413 with message "Photo must be under 10 MB" / "Resume must be under 5 MB". |
| **Actual Result** | _To be filled_ |
| **Status** | Pass / Fail |
| **Severity** | High |
| **Notes** | Content-type validation (MIME) not yet implemented. |

### TC-5: Validation rejects invalid payload
| Field | Value |
|-------|--------|
| **Test Case ID** | TC-5 |
| **Feature** | Submit validation |
| **Preconditions** | None. |
| **Test Steps** | 1. POST /api/submit with 53 responses → 400. 2. POST with invalid option ID for Q10 (e.g. "Z") → 400. 3. POST with empty custom_text for Q1 → 400. 4. POST with custom_text length 5001 for one question → 400. |
| **Expected Result** | 400 and error message describing the violation. |
| **Actual Result** | _To be filled_ |
| **Status** | Pass / Fail |
| **Severity** | High |
| **Notes** | Ensures server enforces shape and business rules. |

---

## 7. Summary — remaining severity

| Severity | Count | Focus |
|----------|--------|--------|
| Critical | 0 | — |
| High | 1 | Submit partial failure / retry by session (REM-1.2) |
| Medium | 5 | Idempotency client (REM-1.1), Upload MIME (REM-3.1), Submit timeout (REM-4.1), Shared rate/idempotency (REM-4.2), Narrative validation (AI-2), Chat-transition rate limit (AI-4) |
| Low | 5 | Copy typo (REM-1.3), Error message (REM-2.1), Filename sanitization (REM-3.2), Transition output safety (AI-1), Token overflow (AI-3) |

**Recommended next steps:**  
1. Implement retry-report by session_id (REM-1.2).  
2. Send Idempotency-Key from client (REM-1.1).  
3. Add rate limit to chat-transition (AI-4).  
4. Add upload MIME/magic-byte validation (REM-3.1).  
5. Plan shared store for rate limit and idempotency for multi-instance (REM-4.2).
