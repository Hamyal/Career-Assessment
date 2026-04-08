/**
 * 54 questions — option → archetype + stress mapping from Question Bank.docx.
 * Only questions 10–52 contribute to trait scoring.
 */

const ARCHETYPES = ['decoder', 'signal', 'bridge', 'heartbeat'] as const;
const POINTS_PER_OPTION = 2;
const STRESS_POINT = 1;
const BLEND_THRESHOLD = 3;

export { ARCHETYPES, POINTS_PER_OPTION, STRESS_POINT, BLEND_THRESHOLD };
export { questions, scoredQuestionIds, getChatPrompt } from './question-list';
export type { QuestionMeta } from './question-list';
export { getOptionLabels } from './option-labels';

export type OptionMap = Record<
  number,
  Record<string, { archetype: (typeof ARCHETYPES)[number]; stress_tag?: string }>
>;

const optionMap: OptionMap = {};

// Q10: single-select, 4 options → Decoder, Signal, Bridge, Heartbeat
optionMap[10] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'heartbeat' },
};

// Q11: single-select, 5 options with stress tags
optionMap[11] = {
  A: { archetype: 'decoder', stress_tag: 'fight_control' },
  B: { archetype: 'decoder', stress_tag: 'freeze' },
  C: { archetype: 'bridge', stress_tag: 'fawn' },
  D: { archetype: 'signal', stress_tag: 'flight' },
  E: { archetype: 'heartbeat', stress_tag: 'stabilize' },
};

// Q12–30: 4 options each, order Decoder, Signal, Bridge, Heartbeat
for (let q = 12; q <= 30; q++) {
  optionMap[q] = {
    A: { archetype: 'decoder' },
    B: { archetype: 'signal' },
    C: { archetype: 'bridge' },
    D: { archetype: 'heartbeat' },
  };
}

// Q31: 5 options — Building legacy→Heartbeat, Leading movement→Signal, Uplifting community→Bridge, Innovating→Signal, Solving mysteries→Decoder
optionMap[31] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q32: Checking off goals→Heartbeat, New possibilities→Signal, Helping others→Bridge, Bold steps→Signal, Uncovering truths→Decoder
optionMap[32] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q33: Over-plan→Heartbeat, Ghost/think→Decoder, Emotional rescue→Bridge, Rage→Signal, Escape ideas→Signal
optionMap[33] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'decoder' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'signal' },
};

// Q34: Organizing→Heartbeat, Deep-dive research→Decoder, Heart-to-hearts→Bridge, Quick wins→Signal, Creative jam→Signal
optionMap[34] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'decoder' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'signal' },
};

// Q35: Chaos into order→Heartbeat, Ideas into reality→Signal, Reading people→Bridge, Sparking momentum→Signal, Hidden game→Decoder
optionMap[35] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q36: Solid/dependable→Heartbeat, Bold/boundary-pushing→Signal, Warm/inclusive→Bridge, Thoughtful explorer→Decoder, Creative trailblazer→Signal
optionMap[36] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'decoder' },
  E: { archetype: 'signal' },
};

// Q37: Mastery/recognition→Heartbeat, Authentic expression→Signal, Uplifting others→Bridge, Driving change→Signal, Big picture→Decoder
optionMap[37] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q38: Losing control→Heartbeat, Losing originality→Signal, Losing connection→Bridge, Losing momentum→Signal, Losing clarity→Decoder
optionMap[38] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q39: Strategist→Decoder, Innovator→Signal, Collaborator→Bridge, Champion→Signal, Analyst→Decoder
optionMap[39] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'signal' },
  C: { archetype: 'bridge' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q40: Stand your ground→Signal, Step back/observe→Decoder, Soften/apologize→Bridge, Shut down/avoid→Heartbeat (4 options in doc)
optionMap[40] = {
  A: { archetype: 'signal' },
  B: { archetype: 'decoder' },
  C: { archetype: 'bridge' },
  D: { archetype: 'heartbeat' },
};

// Q41: Take it head-on→Signal, Ask for backup→Bridge, Step back to regroup→Decoder (doc had duplicate; 4th "Fake it"→Signal)
optionMap[41] = {
  A: { archetype: 'signal' },
  B: { archetype: 'bridge' },
  C: { archetype: 'decoder' },
  D: { archetype: 'signal' },
};

// Q42: Mobilize and blitz→Signal, Rally the team→Bridge, Lock in solo→Decoder, Break away→Heartbeat
optionMap[42] = {
  A: { archetype: 'signal' },
  B: { archetype: 'bridge' },
  C: { archetype: 'decoder' },
  D: { archetype: 'heartbeat' },
};

// Q43: Confront/negotiate→Signal, Overdeliver→Heartbeat, Quietly do less→Decoder, Search new settings→Signal
optionMap[43] = {
  A: { archetype: 'signal' },
  B: { archetype: 'heartbeat' },
  C: { archetype: 'decoder' },
  D: { archetype: 'signal' },
};

// Q44: Take control/action plan→Decoder, Lean on others→Bridge, Freeze/zone out→Heartbeat, Escape→Signal
optionMap[44] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'heartbeat' },
  D: { archetype: 'signal' },
};

// Q45: Offer solution→Decoder, Comfort/empathy→Bridge, Analyze facts→Decoder, Withdraw→Heartbeat, Reframing→Signal
optionMap[45] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'decoder' },
  D: { archetype: 'heartbeat' },
  E: { archetype: 'signal' },
};

// Q46: Exercising/problem-solving→Decoder, Talking it out→Bridge, Journaling/reflecting→Heartbeat, Creative hobby→Signal, Mentor's wisdom→Decoder
optionMap[46] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'heartbeat' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q47: Data and logic→Decoder, How it feels for everyone→Bridge, Gut/values→Signal, Safe options→Heartbeat, Growth/meaning→Signal
optionMap[47] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'signal' },
  D: { archetype: 'heartbeat' },
  E: { archetype: 'signal' },
};

// Q48: Clear expectations→Heartbeat, Encouragement/support→Bridge, Facts and data→Decoder, Room to improvise→Signal, Highest purpose→Signal
optionMap[48] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'bridge' },
  C: { archetype: 'decoder' },
  D: { archetype: 'signal' },
  E: { archetype: 'signal' },
};

// Q49: Achieve significance→Heartbeat, Connect deeply→Bridge, Abstract thinking→Decoder, Structured plan→Decoder, Risk/growth→Signal
optionMap[49] = {
  A: { archetype: 'heartbeat' },
  B: { archetype: 'bridge' },
  C: { archetype: 'decoder' },
  D: { archetype: 'decoder' },
  E: { archetype: 'signal' },
};

// Q50: Break down/plan comeback→Decoder, Lean on support→Bridge, Reflect quietly→Heartbeat, New challenges→Signal, Analyze wrong→Decoder
optionMap[50] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'heartbeat' },
  D: { archetype: 'signal' },
  E: { archetype: 'decoder' },
};

// Q51: Delegate/accountable→Decoder, Inspire/empathy→Bridge, Vision/insight→Signal, Strategize/logic→Decoder, Safe and heard→Heartbeat
optionMap[51] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'signal' },
  D: { archetype: 'decoder' },
  E: { archetype: 'heartbeat' },
};

// Q52: Direct and actionable→Decoder, Warm/supportive→Bridge, Structured/written→Heartbeat, Open-ended brainstorming→Signal, Reflective/vision→Signal
optionMap[52] = {
  A: { archetype: 'decoder' },
  B: { archetype: 'bridge' },
  C: { archetype: 'heartbeat' },
  D: { archetype: 'signal' },
  E: { archetype: 'signal' },
};

export function getOptionMap(): OptionMap {
  return optionMap;
}
