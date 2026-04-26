'use client';

/**
 * Full-screen conversational chatbot UI — advanced premium styling.
 * One-question-at-a-time as chat messages; same scoring and backend.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { questions, getOptionMap, getOptionLabels, getChatPrompt, getInfoOptions } from '@/questions';
import styles from './assessment-chat.module.css';

const TOTAL = questions.length;

const CONFETTI_COLORS = ['#fb6322', '#01074c', '#19c37d', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#c44569'];
function getConfettiPieces() {
  return Array.from({ length: 70 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2 + Math.random() * 2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));
}

type ResponseState = Record<number, { selected_options: string[]; custom_text?: string }>;

type ChatMessage =
  | { role: 'assistant'; content: string; questionId?: number; isTransition?: boolean }
  | { role: 'user'; content: string };

function BotAvatar() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/theo-bot/character/2.png"
      alt="TheoBot"
      className={styles.avatarBotImg}
      width={32}
      height={32}
    />
  );
}

/** Get first name from Full Name (question 1) for personalization */
function getFirstName(responses: ResponseState): string | null {
  const fullName = (responses[1]?.custom_text ?? '').trim();
  if (!fullName) return null;
  const first = fullName.split(/\s+/)[0];
  return first || null;
}

function formatUserAnswer(
  qId: number,
  r: { selected_options: string[]; custom_text?: string } | undefined,
  getOptionLabelsForQ: (qId: number, optionIds: string[]) => { id: string; label: string }[]
): string {
  if (!r) return '';
  const optionMap = getOptionMap();
  const ids = optionMap[qId] ? Object.keys(optionMap[qId]) : [];
  const labels = getOptionLabelsForQ(qId, ids);
  if (r.selected_options?.length) {
    const optionPart = r.selected_options
      .map((id) => labels.find((l) => l.id === id)?.label ?? id)
      .filter(Boolean)
      .join(' · ') || '';
    const note = (r.custom_text ?? '').trim();
    return note ? `${optionPart}${optionPart ? ' · ' : ''}Note: ${note}` : optionPart;
  }
  if (qId === 5 && r.custom_text) return 'Photo uploaded';
  if (qId === 53 && r.custom_text) return 'Resume uploaded';
  return (r.custom_text ?? '').trim() || '';
}

/**
 * Offline / pre-API transition line: professional career-coach tone with light motivation.
 * Uses a 4-digit year in the answer when present (e.g. 2024, 2027).
 */
function getTransitionFallbackLine(
  index: number,
  firstName: string | null,
  answerPreview = ''
): string {
  const first = firstName?.trim().split(/\s+/)[0] ?? '';
  const yr = answerPreview.match(/\b(19|20)\d{2}\b/)?.[0] ?? '';

  if (first && yr) {
    const lines = [
      `Thank you, ${first} — noting ${yr} helps us align your education timeline with your PowerPrint™ career arc.`,
      `${first}, ${yr} is a clear milestone; we will factor it into how we frame your readiness and next steps.`,
      `Understood — with ${yr} on record, ${first}, your profile gains sharper context for coaching and direction.`,
      `${first}, anchoring on ${yr} strengthens the precision of your personalized report — thank you.`,
      `Thank you, ${first}; ${yr} gives us a dependable reference point as we map your path forward.`,
      `Noted, ${first} — ${yr} supports a more confident read on where you are in your academic and career journey.`,
      `${first}, your ${yr} timeline is valuable context; it helps calibrate recommendations in your PowerPrint™ results.`,
      `Appreciated, ${first} — ${yr} clarifies how we position your near-term opportunities and growth areas.`,
    ];
    return lines[index % lines.length];
  }

  if (first) {
    const lines = [
      `Thank you, ${first} — your response helps us tailor your PowerPrint™ insights with greater precision.`,
      `I appreciate that, ${first}; clarity here strengthens the foundation of your career profile.`,
      `${first}, that context is useful — it keeps your assessment aligned with your real situation.`,
      `Thank you, ${first} — thoughtful answers like this make your personalized report more accurate and actionable.`,
      `${first}, noted — we will carry this forward as we shape your strengths and opportunities.`,
      `Thank you, ${first}; the detail you provided helps us calibrate your narrative with confidence.`,
      `${first}, your input matters — it refines how we interpret your path in this assessment.`,
      `Appreciated, ${first} — this step builds momentum toward a clearer view of your career direction.`,
      `Thank you, ${first} — we are mapping your answers into a coherent story for your PowerPrint™ summary.`,
      `${first}, well received — each response sharpens the quality of the guidance you will see ahead.`,
      `Thank you, ${first}; professionalism and honesty in your answers elevate the value of your results.`,
      `${first}, that helps — we are one step closer to a report that truly reflects you.`,
    ];
    return lines[index % lines.length];
  }

  const lines = [
    'Thank you — your response helps us tailor your PowerPrint™ profile with greater precision.',
    'Appreciated; that context strengthens your personalized career assessment.',
    'Noted — this detail supports a clearer read on your direction and opportunities.',
    'Thank you; thoughtful input improves the accuracy of your results.',
    'Understood — we will carry this forward in your report.',
    'Thank you — each answer refines the guidance we can offer you.',
  ];
  return lines[index % lines.length];
}

export default function AssessmentPage() {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<ResponseState>(() => {
    const init: ResponseState = {};
    questions.forEach((q) => {
      init[q.id] = { selected_options: [] };
    });
    return init;
  });
  const completionSubmitted = useRef(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'unknown' | 'sent' | 'skipped' | 'failed'>('unknown');
  const [photoFileUrl, setPhotoFileUrl] = useState<string | null>(null);
  const [resumeFileUrl, setResumeFileUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [aiTransitions, setAiTransitions] = useState<Record<number, string>>({});
  const [transitionLoadingStep, setTransitionLoadingStep] = useState<number | null>(null);
  const [submitTrigger, setSubmitTrigger] = useState(0);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastSessionIdRef = useRef<string | null>(null);
  const [lastSessionIdForRetry, setLastSessionIdForRetry] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const confettiPieces = useMemo(() => getConfettiPieces(), []);
  const responsesRef = useRef<ResponseState>({});
  responsesRef.current = responses;

  const question = questions[step] ?? questions[0];
  const progress = ((step + 1) / TOTAL) * 100;
  const optionMap = getOptionMap();
  const infoOptions = getInfoOptions(question.id);
  const optionIds = infoOptions
    ? infoOptions.options.map((o) => o.id)
    : question.scored && optionMap[question.id]
      ? Object.keys(optionMap[question.id])
      : [];
  const optionsWithLabels = infoOptions
    ? infoOptions.options
    : getOptionLabels(question.id, optionIds);
  const currentResponse = responses[question.id] ?? { selected_options: [] };
  const selected = currentResponse.selected_options;
  const customText = currentResponse.custom_text ?? '';
  const hasOptionChips = optionsWithLabels.length > 0;
  const isOtherSelected = hasOptionChips && selected.includes('other');
  const isOptionRadio = hasOptionChips && (infoOptions ? !infoOptions.multiSelect : !question.multi_select);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [step, scrollToBottom]);

  useEffect(() => {
    if (transitionLoadingStep === null) return;
    scrollToBottom();
  }, [transitionLoadingStep, aiTransitions, scrollToBottom]);

  const handleSelect = useCallback(
    (optionId: string) => {
      const isMulti = infoOptions ? infoOptions.multiSelect : question.multi_select;
      if (!question.scored && !infoOptions) return;
      setResponses((prev) => {
        const next = { ...prev };
        const r = next[question.id] ?? { selected_options: [] };
        let newSelected: string[];
        if (isMulti) {
          if (r.selected_options.includes(optionId)) {
            newSelected = r.selected_options.filter((x) => x !== optionId);
          } else if (question.scored && r.selected_options.length >= 2) {
            newSelected = r.selected_options;
          } else {
            newSelected = [...r.selected_options, optionId];
          }
        } else {
          newSelected = [optionId];
        }
        next[question.id] = { ...r, selected_options: newSelected };
        return next;
      });
    },
    [question.id, question.scored, question.multi_select, infoOptions]
  );

  const handleTextChange = useCallback((value: string) => {
    setResponses((prev) => ({
      ...prev,
      [question.id]: {
        ...prev[question.id],
        selected_options: prev[question.id]?.selected_options ?? [],
        custom_text: value,
      },
    }));
  }, [question.id]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, qId: number) => {
      const file = e.target.files?.[0];
      const value = file ? file.name : '';
      setResponses((prev) => ({
        ...prev,
        [qId]: { ...prev[qId], selected_options: prev[qId]?.selected_options ?? [], custom_text: value },
      }));
      if (!file) {
        if (qId === 5) {
          setPhotoFileUrl(null);
          setUploadingPhoto(false);
        }
        if (qId === 53) {
          setResumeFileUrl(null);
          setUploadingResume(false);
        }
        return;
      }
      const type = qId === 5 ? 'photo' : 'resume';
      if (qId === 5) setUploadingPhoto(true);
      if (qId === 53) setUploadingResume(true);
      const form = new FormData();
      form.set('file', file);
      form.set('type', type);
      fetch('/api/upload', { method: 'POST', body: form })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Upload failed'))))
        .then((data: { url?: string }) => {
          if (data.url) {
            if (qId === 5) setPhotoFileUrl(data.url);
            if (qId === 53) setResumeFileUrl(data.url);
          }
        })
        .catch(() => {
          if (qId === 5) setPhotoFileUrl(null);
          if (qId === 53) setResumeFileUrl(null);
        })
        .finally(() => {
          if (qId === 5) setUploadingPhoto(false);
          if (qId === 53) setUploadingResume(false);
        });
    },
    []
  );

  const canSend = useCallback(() => {
    if (question.id === 5) {
      if (uploadingPhoto) return false;
      if (currentResponse.custom_text && !photoFileUrl) return false;
    }
    if (question.id === 53) {
      if (uploadingResume) return false;
      if (currentResponse.custom_text && !resumeFileUrl) return false;
    }
    if (question.scored) {
      return question.multi_select
        ? selected.length >= 1 && selected.length <= 2
        : selected.length === 1;
    }
    if (infoOptions) {
      if (infoOptions.multiSelect) {
        return question.required ? selected.length >= 1 : true;
      }
      return selected.length === 1;
    }
    if (question.required && [1, 4].includes(question.id)) {
      return (customText ?? '').trim().length > 0;
    }
    return true;
  }, [question, selected.length, customText, uploadingPhoto, uploadingResume, currentResponse.custom_text, photoFileUrl, resumeFileUrl, infoOptions]);

  const sendAndNext = useCallback((overrideCurrentResponse?: { selected_options: string[]; custom_text?: string }) => {
    if (!canSend() && question.scored && !overrideCurrentResponse) return;
    if (question.id === 5 || question.id === 53) {
      if (uploadingPhoto || uploadingResume) return;
    }
    const currentStep = step;
    const questionText = question.text;
    const responseToSend = overrideCurrentResponse ?? responses[question.id];
    const userAnswer = formatUserAnswer(
      question.id,
      responseToSend,
      (qid, ids) => getOptionLabels(qid, ids)
    );
    const firstName = getFirstName(responses);
    const fallbackTransition = getTransitionFallbackLine(
      currentStep,
      firstName,
      (userAnswer ?? '').trim()
    );

    // Advance immediately with a short fallback; enrich from OpenAI in the background (no blocking on slow API).
    setAiTransitions((prev) => ({ ...prev, [currentStep]: fallbackTransition }));
    setTransitionLoadingStep(null);
    if (currentStep < TOTAL - 1) setStep((s) => s + 1);
    else setStep(TOTAL);

    fetch('/api/chat-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionText,
        userAnswer: (userAnswer ?? '').trim() || '—',
        firstName: firstName ?? '',
        stepIndex: currentStep,
        questionId: question.id,
      }),
    })
      .then((res) => res.json())
      .then((data: { transition?: string | null }) => {
        const reply = data?.transition && typeof data.transition === 'string' ? data.transition : null;
        if (reply) {
          setAiTransitions((prev) => ({ ...prev, [currentStep]: reply }));
        }
      })
      .catch(() => {});
  }, [canSend, question, step, responses, uploadingPhoto, uploadingResume]);

  useEffect(() => {
    if (step < TOTAL || completionSubmitted.current) return;
    const latest = responsesRef.current;
    const email = latest[4]?.custom_text?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    completionSubmitted.current = true; // guard before any async work to prevent double submit
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    setSubmitStatus('loading');
    setEmailStatus('unknown');
    const payload = {
      email: email.toLowerCase(),
      responses: questions.map((q) => {
        const r = latest[q.id];
        const selected = Array.isArray(r?.selected_options) ? r.selected_options : [];
        return {
          question_id: q.id,
          selected_options: selected,
          ...(r?.custom_text !== undefined && r?.custom_text !== '' && { custom_text: r.custom_text }),
        };
      }),
      ...(photoFileUrl && { photo_file_url: photoFileUrl }),
      ...(resumeFileUrl && { resume_file_url: resumeFileUrl }),
    };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idempotencyKeyRef.current) headers['Idempotency-Key'] = idempotencyKeyRef.current;
    fetch('/api/submit', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          let msg = res.statusText;
          try {
            const d = JSON.parse(text);
            if (d && typeof d.error === 'string') msg = d.error;
            if (d && typeof d.session_id === 'string') {
              lastSessionIdRef.current = d.session_id;
              setLastSessionIdForRetry(d.session_id);
            }
          } catch {
            msg = text.length > 500 ? `${text.slice(0, 500)}…` : text || msg;
          }
          throw new Error(msg);
        }
        try {
          return JSON.parse(text) as { pdf_url?: string; email_status?: 'sent' | 'skipped' | 'failed'; session_id?: string };
        } catch {
          throw new Error('Invalid response');
        }
      })
      .then((data: { pdf_url?: string; email_status?: 'sent' | 'skipped' | 'failed'; session_id?: string }) => {
        if (data.session_id) lastSessionIdRef.current = data.session_id;
        setPdfUrl(data.pdf_url ?? null);
        setSubmitStatus('done');
        const status = data.email_status ?? 'unknown';
        setEmailStatus(status === 'sent' || status === 'skipped' || status === 'failed' ? status : 'unknown');
      })
      .catch((err: Error) => {
        setSubmitError(err?.message ?? 'Request failed');
        setSubmitStatus('error');
      });
  }, [step, responses, photoFileUrl, resumeFileUrl, submitTrigger]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < TOTAL) setStep(stepIndex);
  }, []);

  const buildMessages = useCallback((): ChatMessage[] => {
    const list: ChatMessage[] = [];
    const firstName = getFirstName(responses);
    const welcome = firstName
      ? `Welcome, ${firstName}! I'm TheoBot, your AI Career Coach. We'll go through a few quick questions to build your personalized PowerPrint™ report. Let's get started.`
      : "Welcome! I'm TheoBot, your AI Career Coach. We'll go through a few quick questions to build your personalized PowerPrint™ report. Let's get started.";
    list.push({ role: 'assistant', content: welcome });
    for (let i = 0; i < step; i++) {
      const q = questions[i];
      list.push({ role: 'assistant', content: getChatPrompt(q), questionId: q.id });
      const answer = formatUserAnswer(q.id, responses[q.id], (qid, ids) => getOptionLabels(qid, ids));
      list.push({ role: 'user', content: answer || '—' });
      const transitionText =
        aiTransitions[i] ?? getTransitionFallbackLine(i, firstName, (answer || '—').trim());
      list.push({ role: 'assistant', content: transitionText, isTransition: true });
    }
    if (step < TOTAL) {
      list.push({ role: 'assistant', content: getChatPrompt(question), questionId: question.id });
      if (transitionLoadingStep === step) {
        const answer = formatUserAnswer(question.id, responses[question.id], (qid, ids) => getOptionLabels(qid, ids));
        list.push({ role: 'user', content: answer || '—' });
      }
    }
    return list;
  }, [step, question, responses, aiTransitions, transitionLoadingStep]);

  const messages = buildMessages();

  if (step >= TOTAL) {
    const firstName = getFirstName(responses);
    return (
      <main className={styles.root}>
        <div className={styles.celebrationOverlay} aria-hidden>
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className={styles.confettiPiece}
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                backgroundColor: p.color,
                width: p.size,
                height: p.size * 0.6,
              } as React.CSSProperties}
            />
          ))}
        </div>
        <div className={styles.celebrationBlock}>
          <div className={styles.celebrationEmoji} aria-hidden>🎉</div>
          <h2 className={styles.celebrationTitle}>Congratulations!</h2>
          <p className={styles.celebrationMessage}>
            You’ve unlocked the next level in decoding your career.
          </p>
        </div>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerBrandWrap}>
              <span className={styles.headerBrand}>Randy</span><span className={styles.headerBrandBot}>Bot</span>
              <span className={styles.headerSubtitle}>AI CAREER COACH</span>
            </div>
            <div className={styles.headerRight}>
              <button type="button" onClick={() => goToStep(TOTAL - 1)} className={styles.headerBackBtn} aria-label="Review answers">
                ← Review answers
              </button>
              <span className={styles.progressBadge}>Complete</span>
            </div>
          </div>
          <div className={styles.messages}>
            {messages.map((m, i) => {
              const isTransition = m.role === 'assistant' && 'isTransition' in m && (m as { isTransition?: boolean }).isTransition;
              const questionIndexForUser = m.role === 'user' ? (i - 2) / 3 : null;
              const editStep: number | null = m.role === 'user' && typeof questionIndexForUser === 'number' && Number.isInteger(questionIndexForUser) && questionIndexForUser >= 0 && questionIndexForUser < TOTAL ? questionIndexForUser : null;
              return (
                <div
                  key={`complete-msg-${i}-${m.role}`}
                  className={`${styles.bubbleRow} ${m.role === 'user' ? styles.bubbleRowUser : ''}`}
                >
                  <div className={styles.bubbleCell}>
                    <span className={m.role === 'user' ? styles.avatarUser : styles.avatarBot}>
                      {m.role === 'user' ? 'You' : <BotAvatar />}
                    </span>
                    <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : isTransition ? styles.bubbleTransition : styles.bubbleBot}`}>
                      <span className={styles.bubbleContent}>{m.content}</span>
                      {editStep !== null && (
                        <button type="button" onClick={() => goToStep(editStep)} className={styles.editAnswerLink}>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {submitStatus === 'loading' && (
              <div className={styles.bubbleRow}>
                <div className={styles.bubbleCell}>
                  <span className={styles.avatarBot}><BotAvatar /></span>
                  <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.loadingBubble}`}>
                    <span>Saving your results{firstName ? `, ${firstName}` : ''}…</span>
                    <div className={styles.loadingDots}>
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {submitStatus === 'error' && (
              <div className={styles.bubbleRow}>
                <div className={styles.bubbleCell}>
                  <span className={styles.avatarBot}><BotAvatar /></span>
                  <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.bubbleError}`}>
                    <p>Something went wrong: {submitError}.</p>
                    <p style={{ marginTop: 8 }}>
                      <button type="button" onClick={() => { completionSubmitted.current = false; setSubmitStatus('loading'); setSubmitTrigger((t) => t + 1); }} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline' }}>
                        Retry submission
                      </button>
                      {lastSessionIdForRetry && (
                        <>
                          {' · '}
                          <button type="button" onClick={() => {
                            setSubmitStatus('loading');
                            fetch('/api/submit/retry-report', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ session_id: lastSessionIdForRetry }),
                            }).then(async (r) => {
                              const data = await r.json();
                              if (r.ok) {
                                setPdfUrl(data.pdf_url ?? null);
                                setSubmitStatus('done');
                                setEmailStatus(data.email_status ?? 'unknown');
                              } else {
                                setSubmitError(data?.error ?? 'Retry failed');
                              }
                            }).catch(() => setSubmitError('Retry failed'));
                          }} className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline' }}>
                            Retry report only
                          </button>
                        </>
                      )}
                      {' '}Or contact support.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {submitStatus === 'done' && (
              <div className={styles.bubbleRow}>
                <div className={styles.bubbleCell}>
                  <span className={styles.avatarBot}><BotAvatar /></span>
                  <div className={`${styles.bubble} ${styles.completionBubble}`}>
                    <p><strong>All set{firstName ? `, ${firstName}` : ''}! We’ve got your Career Decoder form.</strong></p>
                    <p style={{ marginTop: 12 }}>
                      Next: we’ll build out your custom PowerPrint™ — with career matches, job market info, skills to focus on, and insight into how you’re wired for work.
                    </p>
                    <p style={{ marginTop: 12 }}>🧠 It’s not auto-generated. It’s personalized — by a real coach who gets it.</p>
                    <p style={{ marginTop: 12 }}>
                      You’ll hear from us soon.
                    
                    </p>
                    <p style={{ marginTop: 12 }}>
                      Have questions? Email us at{' '}
                      <a href="mailto:bianca@bianomics.com" className={styles.link}>bianca@bianomics.com</a>.
                    </p>
                    {pdfUrl && (
                      <p style={{ marginTop: 12 }}>
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                          Download your report (PDF)
                        </a>
                      </p>
                    )}
                    <p style={{ marginTop: 12 }}>
                      <Link href="/" className={styles.link}>Back to home</Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerBrandWrap}>
              <span className={styles.headerBrandLogo} aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/theo-bot/character/1.png" alt="" className={styles.headerBrandLogoImg} />
              </span>
              <div className={styles.headerBrandText}>
                <span className={styles.headerBrand}>Theo</span><span className={styles.headerBrandBot}>Bot</span>
                <span className={styles.headerSubtitle}>AI CAREER COACH</span>
              </div>
            </div>
            <div className={styles.headerRight}>
              {step > 0 && transitionLoadingStep === null && (
                <button type="button" onClick={goBack} className={styles.headerBackBtn} aria-label="Previous question">
                  ← Back
                </button>
              )}
              <span className={styles.progressBadge}>{Math.round(progress)}% Complete</span>
            </div>
          </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressLabelRow}>
            <span className={styles.progressLabel}>Progress</span>
            <span className={styles.progressPct}>{Math.round(progress)}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.messages}>
          {messages.map((m, i) => {
            const isTransition = m.role === 'assistant' && 'isTransition' in m && (m as { isTransition?: boolean }).isTransition;
            const questionIndexForUser = m.role === 'user' ? (i - 2) / 3 : null;
            const editStep: number | null = m.role === 'user' && typeof questionIndexForUser === 'number' && Number.isInteger(questionIndexForUser) && questionIndexForUser >= 0 && questionIndexForUser < step ? questionIndexForUser : null;
            return (
              <div
                key={`msg-${i}-${m.role}-${typeof m.content === 'string' ? m.content.slice(0, 30) : ''}`}
                className={`${styles.bubbleRow} ${m.role === 'user' ? styles.bubbleRowUser : ''}`}
              >
                <div className={styles.bubbleCell}>
                  <span className={m.role === 'user' ? styles.avatarUser : styles.avatarBot}>
                    {m.role === 'user' ? 'You' : <BotAvatar />}
                  </span>
                  <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                    <span className={styles.bubbleContent}>{m.content}</span>
                    {editStep !== null && (
                      <button
                        type="button"
                        onClick={() => goToStep(editStep)}
                        className={styles.editAnswerLink}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {transitionLoadingStep === step && (
            <div className={styles.bubbleRow}>
              <div className={styles.bubbleCell}>
                <span className={styles.avatarBot}><BotAvatar /></span>
                <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.loadingBubble}`}>
                  <span>Theo is thinking...</span>
                  <div className={styles.loadingDots}>
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          {transitionLoadingStep !== null && (
            <p className={styles.hint} style={{ marginBottom: 4 }}>Theo is thinking…</p>
          )}
          {hasOptionChips ? (
            <>
              <div className={styles.optionsRow}>
                {optionsWithLabels.map((opt, chipIndex) => {
                  const isSelected = selected.includes(opt.id);
                  const isRadio = infoOptions ? !infoOptions.multiSelect : !question.multi_select;
                  const icon = 'icon' in opt ? (opt as { icon?: string }).icon : undefined;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        handleSelect(opt.id);
                        if (isRadio && opt.id !== 'other') {
                          setTimeout(() => sendAndNext({ selected_options: [opt.id] }), 50);
                        } else if (!isRadio && !isSelected && selected.length === 1) {
                          setTimeout(() => sendAndNext({ selected_options: [selected[0], opt.id] }), 50);
                        }
                      }}
                      className={`${styles.optionChip} ${isSelected ? styles.optionChipSelected : ''}`}
                      style={{ animationDelay: `${chipIndex * 40}ms` }}
                    >
                      {icon && <span className={styles.optionIcon} aria-hidden>{icon}</span>}
                      {isRadio ? (isSelected ? '◉' : '○') : (isSelected ? '☑' : '☐')} {opt.label}
                    </button>
                  );
                })}
              </div>
              {(question.multi_select || infoOptions?.multiSelect) && (
                <p className={styles.hint}>
                  {infoOptions?.multiSelect ? `Select any that apply. Selected: ${selected.length}` : `Select up to 2. Selected: ${selected.length}`}
                </p>
              )}
              {isOtherSelected && infoOptions?.hasOther && (
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    placeholder="Other (optional)"
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className={styles.textInput}
                  />
                </div>
              )}
              {(isOtherSelected && infoOptions?.hasOther) || !isOptionRadio || question.scored ? (
                <div className={styles.inputRow}>
                  {question.scored && !(isOtherSelected && infoOptions?.hasOther) ? (
                    <input
                      type="text"
                      placeholder="Add a note (optional)"
                      value={customText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      className={styles.textInput}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => sendAndNext()}
                    disabled={!canSend() || transitionLoadingStep !== null}
                    className={styles.sendBtn}
                  >
                    Send
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {question.id === 5 || question.id === 53 ? (
                <div className={styles.fileZone}>
                  <span className={styles.uploadTypeIcon} aria-hidden>
                    {question.id === 5 ? (
                      <span className={styles.uploadEmoji} title="Photo">📷</span>
                    ) : (
                      <span className={styles.uploadEmoji} title="Resume">📄</span>
                    )}
                  </span>
                  <input
                    type="file"
                    id={`file-${question.id}`}
                    accept={question.id === 5 ? 'image/*' : '.pdf,.doc,.docx'}
                    onChange={(e) => handleFileChange(e, question.id)}
                    className={styles.fileInput}
                  />
                  <label htmlFor={`file-${question.id}`} className={styles.fileLabel}>
                    {question.id === 5 ? (uploadingPhoto ? 'Uploading…' : 'Upload photo') : (uploadingResume ? 'Uploading…' : 'Upload resume')}
                  </label>
                  {customText && <span className={styles.fileName}>{customText}</span>}
                  <div className={styles.fileActions}>
                    <button
                      type="button"
                      onClick={() => sendAndNext()}
                      disabled={!canSend() || transitionLoadingStep !== null}
                      className={styles.sendBtn}
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      onClick={() => sendAndNext()}
                      disabled={transitionLoadingStep !== null}
                      className={styles.skipBtn}
                    >
                      {question.id === 5 ? "I'll upload later" : 'Upload later'}
                    </button>
                  </div>
                </div>
              ) : question.id === 54 ? (
                <div className={styles.optionalInputWrap}>
                  <span className={styles.linkedInIconWrap} aria-hidden>
                    <svg className={styles.linkedInIcon} viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </span>
                  <div className={styles.inputRow}>
                    <input
                      type="url"
                      placeholder="Paste your LinkedIn profile link (optional)"
                      value={customText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendAndNext()}
                      className={styles.textInput}
                    />
                    <button
                      type="button"
                      onClick={() => sendAndNext()}
                      disabled={transitionLoadingStep !== null}
                      className={styles.sendBtn}
                    >
                      Send
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendAndNext()}
                    disabled={transitionLoadingStep !== null}
                    className={styles.skipBtn}
                  >
                    I don't have one
                  </button>
                </div>
              ) : question.id === 1 ? (
                <div className={styles.optionalInputWrap}>
                  <span className={styles.nameIconWrap} aria-hidden>
                    <svg className={styles.nameIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Name">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <div className={styles.inputRow}>
                    <input
                      type="text"
                      placeholder="What's your full name?"
                      value={customText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canSend() && sendAndNext()}
                      className={styles.textInput}
                    />
                    <button
                      type="button"
                      onClick={() => sendAndNext()}
                      disabled={!canSend() || transitionLoadingStep !== null}
                      className={styles.sendBtn}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : question.id === 4 ? (
                <div className={styles.optionalInputWrap}>
                  <span className={styles.emailIconWrap} aria-hidden>
                    <svg className={styles.emailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Email">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <div className={styles.inputRow}>
                    <input
                      type="email"
                      placeholder="What's your email address?"
                      value={customText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canSend() && sendAndNext()}
                      className={styles.textInput}
                    />
                    <button
                      type="button"
                      onClick={() => sendAndNext()}
                      disabled={!canSend() || transitionLoadingStep !== null}
                      className={styles.sendBtn}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSend() && sendAndNext()}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    onClick={() => sendAndNext()}
                    disabled={!canSend()}
                    className={styles.sendBtn}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          )}

          {step > 0 && transitionLoadingStep === null && (
            <button type="button" onClick={goBack} className={styles.backLink}>
              ← Previous question
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
