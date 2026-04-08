/**
 * Deterministic scoring engine tests. Run: npm test
 */

import {
  computeTraitVector,
  computeFinalOutput,
  runScoringEngine,
} from '../../src/lib/scoring/engine';
import type { UserResponsePayload } from '../../src/lib/schemas';

function makePayload(responses: { question_id: number; selected_options: string[] }[]): UserResponsePayload {
  return {
    email: 'test@example.com',
    responses: responses.map((r) => ({ ...r })),
  };
}

describe('computeTraitVector', () => {
  it('sums +2 per option to archetype, +1 to stress when present', () => {
    const payload = makePayload([
      { question_id: 10, selected_options: ['A'] }, // decoder +2
      { question_id: 11, selected_options: ['D'] }, // signal + flight stress +1
    ]);
    const { traitVector, stressProfile } = computeTraitVector(payload);
    expect(traitVector.decoder).toBe(2);
    expect(traitVector.signal).toBe(2);
    expect(stressProfile.flight).toBe(1);
  });
});

describe('computeFinalOutput', () => {
  it('sets primary/secondary from highest scores, lowest_domain from lowest', () => {
    const out = computeFinalOutput(
      { decoder: 10, signal: 20, bridge: 5, heartbeat: 8 },
      {}
    );
    expect(out.primary_type).toBe('signal');
    expect(out.secondary_type).toBe('decoder');
    expect(out.lowest_domain).toBe('bridge');
    expect(out.is_blended).toBe(false);
  });

  it('sets is_blended when top two within 3 points', () => {
    const out = computeFinalOutput(
      { decoder: 12, signal: 10, bridge: 2, heartbeat: 4 },
      {}
    );
    expect(out.primary_type).toBe('decoder');
    expect(out.secondary_type).toBe('signal');
    expect(out.is_blended).toBe(true);
  });
});

describe('runScoringEngine', () => {
  it('returns full FinalScoringOutput from payload', () => {
    const responses = Array.from({ length: 54 }, (_, i) => ({
      question_id: i + 1,
      selected_options: ['A'],
    }));
    const payload = makePayload(responses);
    const result = runScoringEngine(payload);
    expect(result.primary_type).toBeDefined();
    expect(result.secondary_type).toBeDefined();
    expect(result.archetype_scores).toBeDefined();
    expect(result.stress_profile).toBeDefined();
    expect(result.lowest_domain).toBeDefined();
  });
});
