/**
 * Tap/select options for info questions (2, 3, 6, 7, 8, 9).
 * Minimizes typing for teenagers; add "Other" when necessary.
 */

export interface InfoOption {
  id: string;
  label: string;
  /** Optional emoji/icon shown before the label */
  icon?: string;
}

export interface InfoQuestionConfig {
  options: InfoOption[];
  hasOther: boolean;
  multiSelect: boolean;
}

const INFO_OPTIONS: Record<number, InfoQuestionConfig> = {
  // Q2: High School Graduation Date
  2: {
    options: [
      { id: '2024', label: '2024', icon: '📅' },
      { id: '2025', label: '2025', icon: '📅' },
      { id: '2026', label: '2026', icon: '📅' },
      { id: '2027', label: '2027', icon: '📅' },
      { id: '2028', label: '2028', icon: '📅' },
      { id: 'other', label: 'Other', icon: '✏️' },
    ],
    hasOther: true,
    multiSelect: false,
  },
  // Q3: College Graduation Date (if applicable)
  3: {
    options: [
      { id: 'na', label: 'Not applicable', icon: '—' },
      { id: '2025', label: '2025', icon: '🎓' },
      { id: '2026', label: '2026', icon: '🎓' },
      { id: '2027', label: '2027', icon: '🎓' },
      { id: '2028', label: '2028', icon: '🎓' },
      { id: '2029', label: '2029', icon: '🎓' },
      { id: 'other', label: 'Other', icon: '✏️' },
    ],
    hasOther: true,
    multiSelect: false,
  },
  // Q6: Current or Intended Industry
  6: {
    options: [
      { id: 'technology', label: 'Technology', icon: '💻' },
      { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
      { id: 'business', label: 'Business', icon: '💼' },
      { id: 'arts', label: 'Arts', icon: '🎨' },
      { id: 'other', label: 'Other', icon: '✏️' },
    ],
    hasOther: true,
    multiSelect: false,
  },
  // Q7: Career or major drawn to (minimize paragraph typing)
  7: {
    options: [
      { id: 'tech', label: 'Tech / coding', icon: '💻' },
      { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
      { id: 'business', label: 'Business / finance', icon: '💼' },
      { id: 'arts', label: 'Arts / design', icon: '🎨' },
      { id: 'sciences', label: 'Sciences', icon: '🔬' },
      { id: 'education', label: 'Education', icon: '📚' },
      { id: 'other', label: 'Other', icon: '✏️' },
    ],
    hasOther: true,
    multiSelect: false,
  },
  // Q8: Industries curious about (optional, multi-select)
  8: {
    options: [
      { id: 'technology', label: 'Technology', icon: '💻' },
      { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
      { id: 'business', label: 'Business', icon: '💼' },
      { id: 'arts', label: 'Arts', icon: '🎨' },
      { id: 'sciences', label: 'Sciences', icon: '🔬' },
      { id: 'education', label: 'Education', icon: '📚' },
      { id: 'other', label: 'Other', icon: '✏️' },
    ],
    hasOther: true,
    multiSelect: true,
  },
  // Q9: Where see yourself living after graduation
  9: {
    options: [
      { id: 'same_area', label: 'Same area', icon: '🏠' },
      { id: 'another_city', label: 'Another city / state', icon: '🌆' },
      { id: 'different_country', label: 'Different country', icon: '🌍' },
      { id: 'not_sure', label: 'Not sure yet', icon: '🤔' },
      { id: 'other', label: 'Other', icon: '✏️' },
    ],
    hasOther: true,
    multiSelect: false,
  },
};

/** Labels only, for getOptionLabels fallback (questionId -> optionId -> label) */
export function getInfoOptionLabelsMap(): Record<number, Record<string, string>> {
  const map: Record<number, Record<string, string>> = {};
  for (const [qIdStr, config] of Object.entries(INFO_OPTIONS)) {
    const qId = Number(qIdStr);
    map[qId] = {};
    for (const o of config.options) {
      map[qId][o.id] = o.label;
    }
  }
  return map;
}

export function getInfoOptions(questionId: number): InfoQuestionConfig | null {
  return INFO_OPTIONS[questionId] ?? null;
}
