/**
 * Runtime validation for payloads (user responses, config).
 * Use these before scoring or DB write.
 */

import type { UserResponsePayload, UserResponseItem } from './types';
import { getOptionMap } from '@/questions';

const MAX_MULTI_SELECT = 2;
const TOTAL_QUESTIONS = 54;
const MAX_CUSTOM_TEXT_LENGTH = 5000;
/** Q1 (name), Q4 (email) require text */
const REQUIRED_TEXT_ONLY_QUESTION_IDS = [1, 4] as const;
/** Info questions that are required: must have at least one selected_options or non-empty custom_text */
const INFO_TAP_REQUIRED_QUESTION_IDS = [2, 6, 7, 9] as const;
const SCORED_QUESTION_ID_MIN = 10;
const SCORED_QUESTION_ID_MAX = 52;

export function validateUserResponsePayload(
  payload: unknown
): { ok: true; data: UserResponsePayload } | { ok: false; error: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Payload must be an object' };
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.email !== 'string' || !p.email.trim()) {
    return { ok: false, error: 'email is required and must be a non-empty string' };
  }

  if (!Array.isArray(p.responses)) {
    return { ok: false, error: 'responses must be an array' };
  }

  const responses = p.responses as unknown[];
  if (responses.length !== TOTAL_QUESTIONS) {
    return {
      ok: false,
      error: `Exactly ${TOTAL_QUESTIONS} responses required, got ${responses.length}`,
    };
  }

  const validatedResponses: UserResponseItem[] = [];
  const seenIds = new Set<number>();
  const optionMap = getOptionMap();
  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    const result = validateResponseItem(r, i);
    if (!result.ok) return result;
    if (seenIds.has(result.data.question_id)) {
      return { ok: false, error: `Duplicate question_id: ${result.data.question_id}` };
    }
    seenIds.add(result.data.question_id);
    validatedResponses.push(result.data);
  }

  for (const item of validatedResponses) {
    if (REQUIRED_TEXT_ONLY_QUESTION_IDS.includes(item.question_id as 1 | 4)) {
      const text = (item.custom_text ?? '').trim();
      if (!text) {
        return { ok: false, error: `Question ${item.question_id} requires a non-empty answer` };
      }
    }
    if (INFO_TAP_REQUIRED_QUESTION_IDS.includes(item.question_id as 2 | 6 | 7 | 9)) {
      if (item.selected_options.length === 0 && !(item.custom_text ?? '').trim()) {
        return { ok: false, error: `Question ${item.question_id} requires a selection or answer` };
      }
    }
    if (item.question_id >= SCORED_QUESTION_ID_MIN && item.question_id <= SCORED_QUESTION_ID_MAX && item.selected_options.length > 0) {
      const qMap = optionMap[item.question_id];
      if (qMap) {
        for (const optId of item.selected_options) {
          if (!(optId in qMap)) {
            return { ok: false, error: `Invalid option for question ${item.question_id}` };
          }
        }
      }
    }
  }

  const data: UserResponsePayload = {
    email: (p.email as string).trim().toLowerCase(),
    responses: validatedResponses,
  };

  if (typeof p.user_id === 'string' && p.user_id) data.user_id = p.user_id;
  if (typeof p.resume_file_url === 'string' && p.resume_file_url) data.resume_file_url = p.resume_file_url;
  if (typeof p.photo_file_url === 'string' && p.photo_file_url) data.photo_file_url = p.photo_file_url;

  return { ok: true, data };
}

function validateResponseItem(
  item: unknown,
  _index: number
): { ok: true; data: UserResponseItem } | { ok: false; error: string } {
  if (!item || typeof item !== 'object') {
    return { ok: false, error: 'Each response must be an object' };
  }

  const r = item as Record<string, unknown>;
  const qId = r.question_id;
  if (typeof qId !== 'number' || qId < 1 || qId > TOTAL_QUESTIONS) {
    return { ok: false, error: `question_id must be 1–${TOTAL_QUESTIONS}` };
  }

  if (!Array.isArray(r.selected_options)) {
    return { ok: false, error: 'selected_options must be an array' };
  }

  const opts = r.selected_options as unknown[];
  const maxOpts = qId >= SCORED_QUESTION_ID_MIN && qId <= SCORED_QUESTION_ID_MAX ? MAX_MULTI_SELECT : 10;
  if (opts.length > maxOpts) {
    return {
      ok: false,
      error: `Max ${maxOpts} options per question, got ${opts.length}`,
    };
  }

  const selected_options = opts.filter((o): o is string => typeof o === 'string');
  let custom_text = typeof r.custom_text === 'string' ? r.custom_text : undefined;
  if (custom_text !== undefined && custom_text.length > MAX_CUSTOM_TEXT_LENGTH) {
    return {
      ok: false,
      error: `custom_text for question ${qId} must be at most ${MAX_CUSTOM_TEXT_LENGTH} characters`,
    };
  }

  return {
    ok: true,
    data: { question_id: qId, selected_options, ...(custom_text !== undefined && { custom_text }) },
  };
}

export function validateEmail(email: unknown): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
