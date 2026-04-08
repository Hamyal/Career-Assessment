/**
 * Questions and answers integrity tests.
 * - Exactly 54 questions, ids 1–54, no duplicates.
 * - Scored questions have option maps; option IDs are valid.
 * - Required/scored flags align with question bank.
 */

import { questions, getOptionMap, getOptionLabels, scoredQuestionIds } from '@/questions';

const TOTAL_QUESTIONS = 54;

describe('questions array', () => {
  it('has exactly 54 questions', () => {
    expect(questions).toHaveLength(TOTAL_QUESTIONS);
  });

  it('has unique question ids 1 through 54', () => {
    const ids = questions.map((q) => q.id);
    const sorted = [...ids].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i + 1));
    expect(new Set(ids).size).toBe(TOTAL_QUESTIONS);
  });

  it('each question has required fields: id, text, multi_select, required, scored', () => {
    questions.forEach((q, i) => {
      expect(typeof q.id).toBe('number');
      expect(typeof q.text).toBe('string');
      expect(q.text.length).toBeGreaterThan(0);
      expect(typeof q.multi_select).toBe('boolean');
      expect(typeof q.required).toBe('boolean');
      expect(typeof q.scored).toBe('boolean');
    });
  });

  it('scored questions are 10–52', () => {
    expect(scoredQuestionIds).toEqual(Array.from({ length: 43 }, (_, i) => i + 10));
  });
});

describe('option map (scored questions)', () => {
  const optionMap = getOptionMap();

  it('has option mapping for every scored question (10–52)', () => {
    for (let id = 10; id <= 52; id++) {
      expect(optionMap[id]).toBeDefined();
      expect(typeof optionMap[id]).toBe('object');
      const opts = optionMap[id];
      expect(Object.keys(opts).length).toBeGreaterThan(0);
    }
  });

  it('each option has archetype and optional stress_tag', () => {
    const archetypes = ['decoder', 'signal', 'bridge', 'heartbeat'];
    for (let id = 10; id <= 52; id++) {
      const opts = optionMap[id];
      for (const [optionId, config] of Object.entries(opts)) {
        expect(archetypes).toContain(config.archetype);
        if (config.stress_tag != null) {
          expect(typeof config.stress_tag).toBe('string');
        }
      }
    }
  });
});

describe('getOptionLabels', () => {
  const optionMap = getOptionMap();

  it('returns labels for scored question option ids', () => {
    const q10Ids = Object.keys(optionMap[10] ?? {});
    const labels = getOptionLabels(10, q10Ids);
    expect(labels).toHaveLength(q10Ids.length);
    labels.forEach((l) => {
      expect(l).toHaveProperty('id');
      expect(l).toHaveProperty('label');
      expect(typeof l.label).toBe('string');
    });
  });

  it('returns empty array for non-scored question', () => {
    const labels = getOptionLabels(1, []);
    expect(labels).toEqual([]);
  });
});
