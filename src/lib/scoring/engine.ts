/**
 * STEP 2.1 — Deterministic Scoring Engine (NO AI).
 * Reads selected options → maps each option to trait values → sums trait scores → produces trait vector.
 * Isolated in its own module; testable (tests/scoring/engine.test.ts); works even if AI is removed.
 */

import type {
  UserResponsePayload,
  TraitVector,
  StressProfile,
  FinalScoringOutput,
  ArchetypeId,
} from '@/lib/schemas';
import {
  getOptionMap,
  POINTS_PER_OPTION,
  STRESS_POINT,
  BLEND_THRESHOLD,
} from '@/questions';

const ARCHETYPES: ArchetypeId[] = ['decoder', 'signal', 'bridge', 'heartbeat'];

/** Motivation cluster labels per archetype (for top_motivation_cluster). Aligns with Q32/Q37 themes. */
const MOTIVATION_CLUSTER_BY_ARCHETYPE: Record<ArchetypeId, string> = {
  decoder: 'Discovery & clarity — Uncovering truths and understanding the big picture.',
  signal: 'Innovation & impact — Driving change, bold steps, and authentic expression.',
  bridge: 'Connection & empowerment — Helping others thrive and uplifting people.',
  heartbeat: 'Excellence & stability — Mastery, recognition, and steady progress.',
};

function createEmptyTraitVector(): TraitVector {
  return { decoder: 0, signal: 0, bridge: 0, heartbeat: 0 };
}

function createEmptyStressProfile(): StressProfile {
  return {};
}

/**
 * Compute trait vector and stress profile from user responses.
 * +2 per selected option to its archetype; +1 to stress tag when present.
 */
export function computeTraitVector(payload: UserResponsePayload): {
  traitVector: TraitVector;
  stressProfile: StressProfile;
} {
  const traitVector = createEmptyTraitVector();
  const stressProfile = createEmptyStressProfile();
  const optionMap = getOptionMap();

  for (const r of payload.responses) {
    const qMap = optionMap[r.question_id];
    if (!qMap) continue;

    for (const optionId of r.selected_options) {
      const mapping = qMap[optionId];
      if (!mapping) continue;

      traitVector[mapping.archetype] =
        (traitVector[mapping.archetype] ?? 0) + POINTS_PER_OPTION;

      if (mapping.stress_tag) {
        stressProfile[mapping.stress_tag] =
          (stressProfile[mapping.stress_tag] ?? 0) + STRESS_POINT;
      }
    }
  }

  return { traitVector, stressProfile };
}

/**
 * Get archetypes sorted by score descending.
 */
function getArchetypesByScore(traitVector: TraitVector): ArchetypeId[] {
  return [...ARCHETYPES].sort(
    (a, b) => (traitVector[b] ?? 0) - (traitVector[a] ?? 0)
  );
}

/**
 * Dominant stress = tag with highest count.
 */
function getDominantStressTag(stressProfile: StressProfile): string {
  const entries = Object.entries(stressProfile);
  if (entries.length === 0) return '';
  return entries.reduce<string>(
    (bestTag, [tag, count]) =>
      count > (bestTag ? stressProfile[bestTag] : 0) ? tag : bestTag,
    ''
  );
}

/**
 * Build final scoring output from trait vector and stress profile.
 * Tie rule: if top two archetypes within BLEND_THRESHOLD points → is_blended.
 */
export function computeFinalOutput(
  traitVector: TraitVector,
  stressProfile: StressProfile
): FinalScoringOutput {
  const ordered = getArchetypesByScore(traitVector);
  const primary_type = ordered[0];
  const secondary_type = ordered[1];
  const lowest_domain = ordered[ordered.length - 1];

  const topScore = traitVector[primary_type] ?? 0;
  const secondScore = traitVector[secondary_type] ?? 0;
  const is_blended =
    primary_type != null &&
    secondary_type != null &&
    Math.abs(topScore - secondScore) <= BLEND_THRESHOLD;

  const top_motivation_cluster = primary_type ? MOTIVATION_CLUSTER_BY_ARCHETYPE[primary_type] : '';

  return {
    primary_type,
    secondary_type,
    is_blended,
    archetype_scores: { ...traitVector },
    stress_profile: { ...stressProfile },
    lowest_domain,
    top_motivation_cluster,
  };
}

/**
 * Full pipeline: responses → trait vector + stress → final output.
 * Single entry point for the API.
 */
export function runScoringEngine(payload: UserResponsePayload): FinalScoringOutput {
  const { traitVector, stressProfile } = computeTraitVector(payload);
  return computeFinalOutput(traitVector, stressProfile);
}
