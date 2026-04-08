/**
 * Submit API and question/answer validation tests.
 * - validateUserResponsePayload: email, exactly 54 responses, question_id 1–54, no duplicates, option limits.
 * - Ensures only valid payloads are accepted before scoring/DB.
 */

import { validateUserResponsePayload } from '@/lib/schemas/validation';

const TOTAL_QUESTIONS = 54;

function makeValidResponses(): { question_id: number; selected_options: string[]; custom_text?: string }[] {
  return Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
    question_id: i + 1,
    selected_options: i >= 9 && i <= 51 ? ['A'] : [],
    custom_text: [1, 2, 4, 6, 7, 9].includes(i + 1) ? `answer-${i + 1}` : undefined,
  }));
}

describe('validateUserResponsePayload', () => {
  it('accepts valid payload with 54 responses and valid email', () => {
    const payload = {
      email: ' user@example.com ',
      responses: makeValidResponses(),
    };
    const result = validateUserResponsePayload(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.responses).toHaveLength(TOTAL_QUESTIONS);
      expect(result.data.responses.map((r) => r.question_id)).toEqual(
        Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1)
      );
    }
  });

  it('rejects non-object payload', () => {
    expect(validateUserResponsePayload(null).ok).toBe(false);
    expect(validateUserResponsePayload(undefined).ok).toBe(false);
    expect(validateUserResponsePayload('string').ok).toBe(false);
    if (!validateUserResponsePayload(null).ok) {
      expect((validateUserResponsePayload(null) as { error: string }).error).toMatch(/object/i);
    }
  });

  it('rejects missing or empty email', () => {
    const base = { responses: makeValidResponses() };
    expect(validateUserResponsePayload({ ...base, email: '' }).ok).toBe(false);
    expect(validateUserResponsePayload({ ...base, email: '   ' }).ok).toBe(false);
    const noEmail = validateUserResponsePayload({ responses: makeValidResponses() });
    expect(noEmail.ok).toBe(false);
    if (!noEmail.ok) expect(noEmail.error).toMatch(/email/i);
  });

  it('rejects when responses is not an array', () => {
    const res = validateUserResponsePayload({ email: 'a@b.com', responses: 'not-array' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/array/i);
  });

  it('rejects when response count is not exactly 54', () => {
    const tooFew = validateUserResponsePayload({
      email: 'a@b.com',
      responses: makeValidResponses().slice(0, 53),
    });
    expect(tooFew.ok).toBe(false);
    if (!tooFew.ok) expect(tooFew.error).toMatch(/54|53/);

    const tooMany = validateUserResponsePayload({
      email: 'a@b.com',
      responses: [...makeValidResponses(), { question_id: 1, selected_options: [] }],
    });
    expect(tooMany.ok).toBe(false);
  });

  it('rejects duplicate question_id', () => {
    const responses = makeValidResponses();
    responses[1] = { ...responses[0], question_id: 1 };
    const res = validateUserResponsePayload({ email: 'a@b.com', responses });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/duplicate|question_id/i);
  });

  it('rejects question_id out of range', () => {
    const responses = makeValidResponses();
    responses[0] = { question_id: 0, selected_options: [] };
    expect(validateUserResponsePayload({ email: 'a@b.com', responses }).ok).toBe(false);

    responses[0] = { question_id: 55, selected_options: [] };
    expect(validateUserResponsePayload({ email: 'a@b.com', responses }).ok).toBe(false);
  });

  it('rejects when selected_options has more than 2 items', () => {
    const responses = makeValidResponses();
    responses[30] = { question_id: 31, selected_options: ['A', 'B', 'C'] };
    const res = validateUserResponsePayload({ email: 'a@b.com', responses });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/max|2|3/i);
  });

  it('rejects when a response item is not an object', () => {
    const responses = makeValidResponses();
    (responses as unknown[])[5] = 'not-object';
    const res = validateUserResponsePayload({ email: 'a@b.com', responses });
    expect(res.ok).toBe(false);
  });

  it('allows optional photo_file_url and resume_file_url', () => {
    const payload = {
      email: 'a@b.com',
      responses: makeValidResponses(),
      photo_file_url: 'https://example.com/photo.jpg',
      resume_file_url: 'https://example.com/resume.pdf',
    };
    const result = validateUserResponsePayload(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveProperty('photo_file_url', 'https://example.com/photo.jpg');
      expect(result.data).toHaveProperty('resume_file_url', 'https://example.com/resume.pdf');
    }
  });
});
