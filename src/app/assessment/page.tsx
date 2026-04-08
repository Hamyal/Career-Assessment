'use client';

/**
 * Full-screen conversational chatbot UI — advanced premium styling.
 * One-question-at-a-time as chat messages; same scoring and backend.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { questions, getOptionMap, getOptionLabels, getChatPrompt } from '@/questions';
import { getInfoOptions, hasInfoOptions } from '@/questions/info-options';
import { BOT_DISPLAY_NAME, BOT_SHORT_NAME, BOT_AVATAR_LETTER, BOT_HEADER_PRIMARY, BOT_HEADER_SECONDARY } from '@/lib/bot-branding';
import styles from './assessment-chat.module.css';

const TOTAL = questions.length;
const DRAFT_KEY = 'career-assessment-draft';

type ResponseState = Record<number, { selected_options: string[]; custom_text?: string }>;

type Draft = { step: number; responses: ResponseState; version?: number };

function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (typeof d.step !== 'number' || d.step < 0 || d.step > TOTAL) return null;
    if (!d.responses || typeof d.responses !== 'object') return null;
    return d;
  } catch {
    return null;
  }
}

function saveDraft(step: number, responses: ResponseState) {
  if (typeof window === 'undefined') return;
  try {
    if (step >= TOTAL) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, responses, version: 1 } satisfies Draft));
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

type ChatMessage =
  | { role: 'assistant'; content: string; questionId?: number; isTransition?: boolean }
  | { role: 'user'; content: string };

function formatUserAnswer(
  qId: number,
  r: { selected_options: string[]; custom_text?: string } | undefined,
  getOptionLabelsForQ: (qId: number, optionIds: string[]) => { id: string; label: string }[]
): string {
  if (!r) return '';
  const infoOpts = getInfoOptions(qId);
  if (infoOpts && r.selected_options?.length) {
    const optionPart = r.selected_options
      .map((id) => {
        if (id === 'other' && infoOpts.hasOther) {
          const t = (r.custom_text ?? '').trim();
          return t ? `Other: ${t}` : 'Other';
        }
        if (qId === 54 && id === 'yes') return r.custom_text?.trim() ? r.custom_text.trim() : 'Link provided';
        return infoOpts.options.find((o) => o.id === id)?.label ?? id;
      })
      .filter(Boolean)
      .join(' · ');
    return optionPart || '';
  }
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
  if (qId === 5) {
    if ((r.custom_text ?? '').trim() === 'Skipped') return 'Skipped';
    if (r.custom_text) return 'Photo uploaded';
  }
  if (qId === 53) {
    const t = (r.custom_text ?? '').trim();
    if (t && t !== 'Skipped') return 'Resume uploaded';
    if (t === 'Skipped') return "I'll upload later";
    return t || '—';
  }
  return (r.custom_text ?? '').trim() || '';
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
  const [aiCombinedResponses, setAiCombinedResponses] = useState<Record<number, string>>({});
  const [personalizedQuestionPrompts, setPersonalizedQuestionPrompts] = useState<Record<number, string>>({});
  const [personalizedFetchDone, setPersonalizedFetchDone] = useState<Record<number, boolean>>({});
  const [submitTrigger, setSubmitTrigger] = useState(0);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastSessionIdRef = useRef<string | null>(null);
  const [lastSessionIdForRetry, setLastSessionIdForRetry] = useState<string | null>(null);
  const [participantCode, setParticipantCode] = useState<string | null>(null);
  const [optionsRevealed, setOptionsRevealed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const optionsScrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredDraft = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    if (hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;
    const draft = loadDraft();
    if (draft && draft.step > 0) {
      skipNextSaveRef.current = true;
      setStep(draft.step);
      setResponses(draft.responses);
    }
  }, []);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (step >= TOTAL) return;
    saveDraft(step, responses);
  }, [step, responses]);

  const question = questions[step] ?? questions[0];
  const progress = ((step + 1) / TOTAL) * 100;
  const optionMap = getOptionMap();
  const infoOptions = getInfoOptions(question.id);
  const optionIds = question.scored && optionMap[question.id] ? Object.keys(optionMap[question.id]) : [];
  const optionsWithLabels = question.scored
    ? getOptionLabels(question.id, optionIds).map((o) => ({ ...o, icon: undefined as string | undefined }))
    : (infoOptions?.options ?? []).map((o) => ({ id: o.id, label: o.label, icon: o.icon }));
  const hasSelectableOptions = (question.scored && optionIds.length > 0) || (infoOptions && infoOptions.options.length > 0);
  const currentResponse = responses[question.id] ?? { selected_options: [] };
  const selected = currentResponse.selected_options;
  const customText = currentResponse.custom_text ?? '';
  const isMultiSelect = question.scored ? question.multi_select : !!infoOptions?.multi_select;
  const isOtherSelected = infoOptions?.hasOther && selected.includes('other');
  const isQ54LinkSelected = question.id === 54 && selected.includes('yes');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [step, scrollToBottom]);

  // 2 second pause before showing options for each question
  useEffect(() => {
    if (step >= TOTAL) {
      setOptionsRevealed(true);
      return;
    }
    setOptionsRevealed(false);
    const t = setTimeout(() => setOptionsRevealed(true), 2000);
    return () => clearTimeout(t);
  }, [step]);

  // Focus first option when options appear so user can use arrow keys
  useEffect(() => {
    if (!optionsRevealed || !hasSelectableOptions || optionsWithLabels.length === 0) return;
    const t = setTimeout(() => optionRefs.current[0]?.focus(), 100);
    return () => clearTimeout(t);
  }, [step, optionsRevealed, hasSelectableOptions, optionsWithLabels.length]);

  // Fetch AI-personalized question phrasing for the current step; show loading until we have it or API returns
  useEffect(() => {
    if (step >= TOTAL) return;
    const q = questions[step];
    setPersonalizedFetchDone((prev) => ({ ...prev, [q.id]: false }));
    const questionText = getChatPrompt(q);
    const userName = (() => {
      const full = responses[1]?.custom_text?.trim();
      if (!full) return '';
      return full.split(/\s+/)[0] ?? '';
    })();
    let cancelled = false;
    fetch('/api/personalize-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText, userName }),
    })
      .then((res) => res.json())
      .then((data: { prompt?: string }) => {
        if (cancelled) return;
        if (data?.prompt?.trim()) {
          setPersonalizedQuestionPrompts((prev) => ({ ...prev, [q.id]: data.prompt!.trim() }));
        }
        setPersonalizedFetchDone((prev) => ({ ...prev, [q.id]: true }));
      })
      .catch(() => {
        if (!cancelled) setPersonalizedFetchDone((prev) => ({ ...prev, [q.id]: true }));
      });
    return () => { cancelled = true; };
  }, [step, responses]);

  const handleSelect = useCallback(
    (optionId: string) => {
      const multi = question.scored ? question.multi_select : !!infoOptions?.multi_select;
      setResponses((prev) => {
        const next = { ...prev };
        const r = next[question.id] ?? { selected_options: [] };
        let newSelected: string[];
        if (multi) {
          if (r.selected_options.includes(optionId)) {
            newSelected = r.selected_options.filter((x) => x !== optionId);
          } else if (r.selected_options.length >= 2) {
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
    [question.id, question.scored, question.multi_select, infoOptions?.multi_select]
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
    if (infoOptions && infoOptions.options.length > 0) {
      if (selected.length === 0) return false;
      if (selected.includes('other') && infoOptions.hasOther) {
        const needText = [2, 6, 7, 9].includes(question.id);
        if (needText) return (customText ?? '').trim().length > 0;
      }
      if (question.id === 54 && selected.includes('yes')) {
        return (customText ?? '').trim().length > 0;
      }
      return true;
    }
    if (question.required && [1, 2, 4, 6, 7, 9].includes(question.id)) {
      return (customText ?? '').trim().length > 0;
    }
    return true;
  }, [question, selected.length, customText, uploadingPhoto, uploadingResume, currentResponse.custom_text, photoFileUrl, resumeFileUrl, infoOptions]);

  /** First name from Q1 (Full Name) for personalized replies */
  const getFirstName = useCallback((): string => {
    const full = responses[1]?.custom_text?.trim();
    if (!full) return '';
    const first = full.split(/\s+/)[0] ?? '';
    return first.length > 0 ? first : '';
  }, [responses]);

  const sendAndNext = useCallback((overrideOrEvent?: { selected_options: string[]; custom_text?: string } | React.MouseEvent) => {
    const overrideCurrentResponse = overrideOrEvent && !('nativeEvent' in overrideOrEvent) ? overrideOrEvent : undefined;
    const effectiveResponse = overrideCurrentResponse ?? responses[question.id];
    if (!overrideCurrentResponse) {
      if (!canSend() && question.scored) return;
      if (question.id === 5) {
        if (!currentResponse.custom_text) return;
      }
      if (question.id === 53) {
        if (uploadingResume) return;
      }
    }
    const currentStep = step;
    const questionText = question.text;
    const userAnswer = formatUserAnswer(
      question.id,
      effectiveResponse ?? responses[question.id],
      (qid, ids) => getOptionLabels(qid, ids)
    );

    if (step < TOTAL - 1) setStep((s) => s + 1);
    else setStep(TOTAL);

    const userName = getFirstName();
    const nextQ = currentStep < TOTAL - 1 ? questions[currentStep + 1] : null;
    const nextQuestionText = nextQ ? getChatPrompt(nextQ) : '';

    // Prefer one personalized reply (acknowledgment + next question); fallback to transition-only
    if (nextQuestionText) {
      fetch('/api/chat-next-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: userAnswer || '—',
          nextQuestionText,
          ...(userName && { userName }),
        }),
      })
        .then((res) => res.json())
        .then((data: { message?: string }) => {
          if (data?.message?.trim()) {
            setAiCombinedResponses((prev) => ({ ...prev, [currentStep]: data.message!.trim() }));
            return;
          }
          // Fallback: fetch transition only
          fetch('/api/chat-transition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionText,
              userAnswer: userAnswer || '—',
              ...(userName && { userName }),
            }),
          })
            .then((r) => r.json())
            .then((d: { transition?: string | null }) => {
              if (d?.transition && typeof d.transition === 'string') {
                setAiTransitions((prev) => ({ ...prev, [currentStep]: d.transition! }));
              }
            })
            .catch(() => {});
        })
        .catch(() => {
          fetch('/api/chat-transition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionText,
              userAnswer: userAnswer || '—',
              ...(userName && { userName }),
            }),
          })
            .then((r) => r.json())
            .then((d: { transition?: string | null }) => {
              if (d?.transition && typeof d.transition === 'string') {
                setAiTransitions((prev) => ({ ...prev, [currentStep]: d.transition! }));
              }
            })
            .catch(() => {});
        });
    } else {
      fetch('/api/chat-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          userAnswer: userAnswer || '—',
          ...(userName && { userName }),
        }),
      }) 
        .then((res) => res.json())
        .then((data: { transition?: string | null }) => {
          if (data?.transition && typeof data.transition === 'string') {
            setAiTransitions((prev) => ({ ...prev, [currentStep]: data.transition! }));
          }
        })
        .catch(() => {});
    }
  }, [canSend, question, currentResponse.custom_text, step, responses, getFirstName, uploadingResume]);

  useEffect(() => {
    if (step < TOTAL || completionSubmitted.current) return;
    const email = responses[4]?.custom_text?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    completionSubmitted.current = true; // guard before any async work to prevent double submit
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    setSubmitStatus('loading');
    setEmailStatus('unknown');
    const chatMessages: { role: 'assistant' | 'user'; content: string }[] = [];
    const welcome = `Hi! I'm ${BOT_DISPLAY_NAME}. This is your personalized chat. We'll go through some questions together and you'll get a custom PowerPrint™ report at the end. Let's get started.`;
    chatMessages.push({ role: 'assistant', content: welcome });
    const firstName = (() => {
      const full = responses[1]?.custom_text?.trim();
      if (!full) return '';
      return full.split(/\s+/)[0] ?? '';
    })();
    for (let i = 0; i < step; i++) {
      if (i === 0) {
        const q = questions[0];
        const basePrompt = getChatPrompt(q);
        const qContent =
          personalizedQuestionPrompts[q.id] ||
          (firstName ? `Hi ${firstName}, ${basePrompt.charAt(0).toLowerCase()}${basePrompt.slice(1)}` : basePrompt);
        chatMessages.push({ role: 'assistant', content: qContent });
      }
      const q = questions[i];
      const answer = formatUserAnswer(q.id, responses[q.id], (qid, ids) => getOptionLabels(qid, ids));
      chatMessages.push({ role: 'user', content: answer || '—' });
      const combined = aiCombinedResponses[i];
      if (combined) {
        chatMessages.push({ role: 'assistant', content: combined });
      } else {
        if (aiTransitions[i]) chatMessages.push({ role: 'assistant', content: aiTransitions[i] });
        const nextQ = questions[i + 1];
        if (nextQ) {
          const nextPrompt = getChatPrompt(nextQ);
          const nextContent =
            personalizedQuestionPrompts[nextQ.id] ||
            (firstName ? `Hi ${firstName}, ${nextPrompt.charAt(0).toLowerCase()}${nextPrompt.slice(1)}` : nextPrompt);
          chatMessages.push({ role: 'assistant', content: nextContent });
        }
      }      
    }
    const REQUIRED_TEXT_IDS = [1, 2, 4, 6, 7, 9];
    const payload = {
      email: email.toLowerCase(),
      responses: questions.map((q) => {
        const r = responses[q.id];
        let custom_text = r?.custom_text;
        if (REQUIRED_TEXT_IDS.includes(q.id) && (!custom_text || !String(custom_text).trim()) && r?.selected_options?.length) {
          const infoOpts = getInfoOptions(q.id);
          const firstId = r.selected_options[0];
          custom_text = infoOpts?.options.find((o) => o.id === firstId)?.label ?? firstId;
        }
        return {
          question_id: q.id,
          selected_options: r?.selected_options ?? [],
          ...(custom_text !== undefined && custom_text !== '' && { custom_text: String(custom_text).trim() }),
        };
      }),
      chat_messages: chatMessages,
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
          return JSON.parse(text) as { pdf_url?: string | null; email_status?: string; session_id?: string; participant_code?: string | null; report_pending?: boolean };
        } catch {
          throw new Error('Invalid response');
        }
      })
      .then((data: { pdf_url?: string | null; email_status?: string; session_id?: string; participant_code?: string | null; report_pending?: boolean }) => {
        if (data.session_id) lastSessionIdRef.current = data.session_id;
        setPdfUrl(data.pdf_url ?? null);
        setParticipantCode(data.participant_code ?? null);
        setSubmitStatus('done');
        clearDraft();
        const status = data.email_status ?? 'unknown';
        setEmailStatus(status === 'sent' || status === 'skipped' || status === 'failed' ? status : 'unknown');
        if (data.report_pending) setSubmitError(null);
      })
      .catch((err: Error) => {
        setSubmitError(err?.message ?? 'Request failed');
        setSubmitStatus('error');
      });
  }, [step, responses, photoFileUrl, resumeFileUrl, submitTrigger, aiTransitions, aiCombinedResponses, personalizedQuestionPrompts]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const buildMessages = useCallback((): ChatMessage[] => {
    const list: ChatMessage[] = [];
    const firstName = getFirstName();
    const welcome = `Hi! I'm ${BOT_DISPLAY_NAME}. This is your personalized chat. We'll go through some questions together and you'll get a custom PowerPrint™ report at the end. Let's get started.`;
    list.push({ role: 'assistant', content: welcome });

    if (step === 0) {
      const q = question;
      const prompt = getChatPrompt(q);
      const personalized = personalizedQuestionPrompts[q.id];
      const content = personalized || (firstName ? `Hi ${firstName}, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}` : prompt);
      list.push({ role: 'assistant', content, questionId: q.id });
      return list;
    }

    for (let i = 0; i < step; i++) {
      if (i === 0) {
        const q = questions[0];
        const basePrompt = getChatPrompt(q);
        const qContent =
          personalizedQuestionPrompts[q.id] ||
          (firstName ? `Hi ${firstName}, ${basePrompt.charAt(0).toLowerCase()}${basePrompt.slice(1)}` : basePrompt);
        list.push({ role: 'assistant', content: qContent, questionId: q.id });
      }
      const answer = formatUserAnswer(questions[i].id, responses[questions[i].id], (qid, ids) => getOptionLabels(qid, ids));
      list.push({ role: 'user', content: answer || '—' });
      const combined = aiCombinedResponses[i];
      if (combined) {
        list.push({ role: 'assistant', content: combined });
      } else {
        if (aiTransitions[i]) list.push({ role: 'assistant', content: aiTransitions[i], isTransition: true });
        const nextQ = questions[i + 1];
        if (nextQ) {
          const nextPrompt = getChatPrompt(nextQ);
          const nextPersonalized = personalizedQuestionPrompts[nextQ.id];
          const nextFetched = personalizedFetchDone[nextQ.id];
          const nextContent = nextPersonalized
            ? nextPersonalized
            : (nextFetched ? (firstName ? `Hi ${firstName}, ${nextPrompt.charAt(0).toLowerCase()}${nextPrompt.slice(1)}` : nextPrompt) : (firstName ? `Hi ${firstName}, ${nextPrompt.charAt(0).toLowerCase()}${nextPrompt.slice(1)}` : nextPrompt));
          list.push({ role: 'assistant', content: nextContent, questionId: nextQ.id });
        }
      }
    }
    return list;
  }, [step, question, responses, aiTransitions, aiCombinedResponses, getFirstName, personalizedQuestionPrompts, personalizedFetchDone]);

  const messages = buildMessages();

  if (step >= TOTAL) {
    return (
      <main className={styles.root}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerTitleWrap}>
              <span className={styles.headerTitle}>
                <span className={styles.headerTitlePrimary}>{BOT_HEADER_PRIMARY}</span>
                <span className={styles.headerTitleSecondary}>{BOT_HEADER_SECONDARY}</span>
              </span>
              <span className={styles.headerSubtitle}>Your personalized chat</span>
            </div>
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: '100%' }} />
              </div>
              <span className={styles.progressPct} aria-hidden="true">100% complete</span>
            </div>
          </div>
          <div className={styles.messages}>
            {messages.map((m, i) => {
              const isTransition = m.role === 'assistant' && 'isTransition' in m && (m as { isTransition?: boolean }).isTransition;
              const isUser = m.role === 'user';
              const questionIndexForEdit = isUser ? messages.slice(0, i).filter((m) => m.role === 'user').length : -1;
              const canEditAnswer = isUser && questionIndexForEdit >= 0 && questionIndexForEdit < TOTAL;
              return (
                <div
                  key={`complete-msg-${i}-${m.role}`}
                  className={`${styles.bubbleRow} ${isUser ? styles.bubbleRowUser : ''}`}
                >
                  <div className={styles.bubbleCell}>
                    <span className={isUser ? styles.avatarUser : styles.avatarBot}>
                      {isUser ? 'You' : BOT_AVATAR_LETTER}
                    </span>
                    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : isTransition ? styles.bubbleTransition : styles.bubbleBot}`}>
                      {m.content}
                      {canEditAnswer && submitStatus !== 'loading' && (
                        <button
                          type="button"
                          onClick={() => {
                            completionSubmitted.current = false;
                            setStep(questionIndexForEdit);
                          }}
                          className={styles.editAnswerBtn}
                          aria-label={`Edit answer to question ${questionIndexForEdit + 1}`}
                        >
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
                  <span className={styles.avatarBot}>{BOT_AVATAR_LETTER}</span>
                  <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.loadingBubble}`}>
                    <span>Building your personalized report…</span>
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
                  <span className={styles.avatarBot}>{BOT_AVATAR_LETTER}</span>
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
                                clearDraft();
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
                  <span className={styles.avatarBot}>{BOT_AVATAR_LETTER}</span>
                  <div className={`${styles.bubble} ${styles.completionBubble} ${styles.completionCelebration}`}>
                    <p className={styles.completionHeading}>Mission accomplished.</p>
                    <p className={styles.completionGoal}>✓ Goal achieved</p>
                    <p style={{ marginTop: 16 }}>
                      <strong>
                        {getFirstName() ? `All set, ${getFirstName()}! ` : 'All set! '}
                        {BOT_SHORT_NAME}'s got your assessment.
                      </strong>
                    </p>
                    <p style={{ marginTop: 12 }}>
                      Next: we’ll build out your custom PowerPrint™ — with career matches, job market info, skills to focus on, and insight into how you’re wired for work.
                    </p>
                    <p style={{ marginTop: 12 }}>🧠 This was your personalized chat. Your report isn't auto-generated — it's personalized by a real coach who gets it.</p>
                    <p style={{ marginTop: 12 }}>
                      You’ll hear from us soon.
                    
                    </p>
                    <p style={{ marginTop: 12 }}>
                      Have questions? Email us at{' '}
                      <a href="mailto:bianca@bianomics.com" className={styles.link}>bianca@bianomics.com</a>.
                    </p>
                    {participantCode && (
                      <p style={{ marginTop: 12 }} className={styles.participantCodeWrap}>
                        <strong>Your participant code:</strong>{' '}
                        <span className={styles.participantCode}>{participantCode}</span>
                        <br />
                        <span className={styles.participantCodeHint}>Save this code to look up your report later (stored securely).</span>
                      </p>
                    )}
                    {pdfUrl && (
                      <p style={{ marginTop: 12 }}>
                        <strong>Your report is ready.</strong>{' '}
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                          Download your PowerPrint™ report (PDF)
                        </a>
                      </p>
                    )}
                    {submitStatus === 'done' && !pdfUrl && participantCode && (
                      <p style={{ marginTop: 12 }} className={styles.hint}>
                        Your responses were saved. Use your participant code above to look up your report later (Report → Look up).
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
          <div className={styles.headerTitleWrap}>
            <span className={styles.headerTitle}>
              <span className={styles.headerTitlePrimary}>{BOT_HEADER_PRIMARY}</span>
              <span className={styles.headerTitleSecondary}>{BOT_HEADER_SECONDARY}</span>
            </span>
            <span className={styles.headerSubtitle}>Your personalized chat</span>
          </div>
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressPct} aria-hidden="true">{Math.round(progress)}% complete</span>
          </div>
        </div>

        <div className={styles.messages}>
          {messages.map((m, i) => {
            const isTransition = m.role === 'assistant' && 'isTransition' in m && (m as { isTransition?: boolean }).isTransition;
            const isUser = m.role === 'user';
            const questionIndexForEdit = isUser ? messages.slice(0, i).filter((m) => m.role === 'user').length : -1;
            const canEditAnswer = isUser && questionIndexForEdit >= 0 && questionIndexForEdit < step;
            return (
              <div
                key={`msg-${i}-${m.role}-${typeof m.content === 'string' ? m.content.slice(0, 30) : ''}`}
                className={`${styles.bubbleRow} ${isUser ? styles.bubbleRowUser : ''}`}
              >
                <div className={styles.bubbleCell}>
                  <span className={isUser ? styles.avatarUser : styles.avatarBot}>
                    {isUser ? 'You' : BOT_AVATAR_LETTER}
                  </span>
                  <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : isTransition ? styles.bubbleTransition : styles.bubbleBot}`}>
                    {m.content}
                    {canEditAnswer && (
                      <button
                        type="button"
                        onClick={() => {
                          completionSubmitted.current = false;
                          setStep(questionIndexForEdit);
                        }}
                        className={styles.editAnswerBtn}
                        aria-label={`Edit answer to question ${questionIndexForEdit + 1}`}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          {!optionsRevealed && step < TOTAL ? (
            <p className={styles.optionsPauseHint}>One moment…</p>
          ) : hasSelectableOptions && optionsWithLabels.length > 0 ? (
            <>
              <div className={styles.optionsScrollWrap}>
                <div
                  ref={optionsScrollRef}
                  className={styles.optionsScrollArea}
                  role="listbox"
                  aria-label="Answer options — use arrow keys to move, Enter to select"
                >
                  <div className={styles.optionsRow}>
                    {optionsWithLabels.map((opt, idx) => {
                      const isSelected = selected.includes(opt.id);
                      const isRadio = !isMultiSelect;
                      const canAutoAdvance = isRadio && opt.id !== 'other' && opt.id !== 'yes';
                      return (
                        <button
                          key={opt.id}
                          ref={(el) => { optionRefs.current[idx] = el; }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            handleSelect(opt.id);
                            if (canAutoAdvance) setTimeout(sendAndNext, 150);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown' && idx < optionsWithLabels.length - 1) {
                              e.preventDefault();
                              optionRefs.current[idx + 1]?.focus();
                              optionRefs.current[idx + 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            } else if (e.key === 'ArrowUp' && idx > 0) {
                              e.preventDefault();
                              optionRefs.current[idx - 1]?.focus();
                              optionRefs.current[idx - 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                          }}
                          className={`${styles.optionChip} ${isSelected ? styles.optionChipSelected : ''}`}
                        >
                          {opt.icon && <span className={styles.optionIcon} aria-hidden="true">{opt.icon}</span>}
                          {isRadio ? (isSelected ? '◉' : '○') : (isSelected ? '☑' : '☐')} {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.optionsScrollArrows} role="group" aria-label="Scroll options list — use arrows to see all options">
                  <button
                    type="button"
                    className={styles.optionsScrollArrowBtn}
                    onClick={() => optionsScrollRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}
                    aria-label="Scroll options up to see all choices"
                  >
                    ∧
                  </button>
                  <button
                    type="button"
                    className={styles.optionsScrollArrowBtn}
                    onClick={() => optionsScrollRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}
                    aria-label="Scroll options down to see all choices"
                  >
                    ∨
                  </button>
                </div>
              </div>
              {isMultiSelect && (
                <p className={styles.hint}>Select up to 2, then send. Selected: {selected.length}. Use arrows (∧ ∨) to scroll options.</p>
              )}
              {(isOtherSelected || isQ54LinkSelected) && (
                <div className={styles.inputRow}>
                  <input
                    type={question.id === 54 ? 'url' : 'text'}
                    placeholder={question.id === 54 ? 'Paste your LinkedIn URL...' : 'Please specify...'}
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className={styles.textInput}
                  />
                </div>
              )}
              {/* Send row only for multi-select or when Other/yes needs input; single-select auto-advances on tap, no Send button */}
              {(isMultiSelect || isOtherSelected || isQ54LinkSelected) && (
                <div className={styles.inputRow}>
                  {question.scored && isMultiSelect ? (
                    <input
                      type="text"
                      placeholder="Add a note (optional)"
                      value={customText}
                      onChange={(e) => handleTextChange(e.target.value)}
                      className={styles.textInput}
                    />
                  ) : null}
                  {question.id === 54 && isQ54LinkSelected && (
                    <button
                      type="button"
                      onClick={() => {
                        setResponses((prev) => ({ ...prev, 54: { selected_options: ['no'], custom_text: '' } }));
                        sendAndNext({ selected_options: ['no'], custom_text: '' });
                      }}
                      className={styles.skipBtn}
                    >
                      Skip
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={sendAndNext}
                    disabled={!canSend()}
                    className={styles.sendBtn}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {question.id === 7 ? (
                <div className={styles.inputRow} style={{ alignItems: 'flex-end' }}>
                  <textarea
                    placeholder="Type your answer..."
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={3}
                    className={styles.textArea}
                  />
                  <button
                    type="button"
                    onClick={sendAndNext}
                    disabled={!canSend()}
                    className={styles.sendBtn}
                  >
                    Send
                  </button>
                </div>
              ) : question.id === 5 || question.id === 53 ? (
                <div className={styles.fileZone}>
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
                  {customText && customText !== 'Skipped' && <span className={styles.fileName}>{customText}</span>}
                  {question.id === 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        setResponses((prev) => ({ ...prev, 5: { selected_options: [], custom_text: 'Skipped' } }));
                        sendAndNext({ selected_options: [], custom_text: 'Skipped' });
                      }}
                      className={styles.skipBtn}
                    >
                      Skip
                    </button>
                  )}
                  {question.id === 53 && (
                    <button
                      type="button"
                      onClick={() => {
                        setResponses((prev) => ({ ...prev, 53: { selected_options: [], custom_text: 'Skipped' } }));
                        sendAndNext({ selected_options: [], custom_text: 'Skipped' });
                      }}
                      className={styles.skipBtn}
                    >
                      I'll upload later
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={sendAndNext}
                    disabled={!canSend()}
                    className={styles.sendBtn}
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className={styles.inputRow}>
                  <input
                    type={question.id === 4 ? 'email' : 'text'}
                    placeholder="Type your answer..."
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canSend() && sendAndNext()}
                    className={styles.textInput}
                  />
                  <button
                    type="button"
                    onClick={sendAndNext}
                    disabled={!canSend()}
                    className={styles.sendBtn}
                  >
                    Send
                  </button>
                </div>
              )}
            </>
          )}

          {step > 0 && (
            <button type="button" onClick={goBack} className={styles.backLink} aria-label="Back to edit previous answer">
              ← Back to edit
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
