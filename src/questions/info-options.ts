/**
 * Selectable options for info questions (1–9, 54) to minimize typing and feel like a guided journey.
 * Add "Other" when necessary; selecting Other can show an optional text field.
 */

export interface InfoOption {
  id: string;
  label: string;
  /** Optional emoji or icon for visual engagement */
  icon?: string;
}

export interface InfoQuestionOptions {
  options: InfoOption[];
  /** If true, show a text field when "Other" is selected (or always for short custom input) */
  hasOther: boolean;
  multi_select?: boolean;
}

const INFO_OPTIONS: Record<number, InfoQuestionOptions> = {};

// Q2: High school graduation date
INFO_OPTIONS[2] = {
  options: [
    { id: '2023', label: '2023 or earlier', icon: '📅' },
    { id: '2024', label: '2024', icon: '📅' },
    { id: '2025', label: '2025', icon: '📅' },
    { id: '2026', label: '2026', icon: '📅' },
    { id: '2027', label: '2027', icon: '📅' },
    { id: '2028', label: '2028 or later', icon: '📅' },
    { id: 'other', label: 'Other', icon: '✏️' },
  ],
  hasOther: true,
};

// Q3: College graduation date (optional)
INFO_OPTIONS[3] = {
  options: [
    { id: 'na', label: 'Not applicable / Not sure', icon: '—' },
    { id: '2025', label: '2025', icon: '🎓' },
    { id: '2026', label: '2026', icon: '🎓' },
    { id: '2027', label: '2027', icon: '🎓' },
    { id: '2028', label: '2028', icon: '🎓' },
    { id: '2029', label: '2029 or later', icon: '🎓' },
    { id: 'other', label: 'Other', icon: '✏️' },
  ],
  hasOther: true,
};

// Q6: Current or intended industry
INFO_OPTIONS[6] = {
  options: [
    { id: 'technology', label: 'Technology', icon: '💻' },
    { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { id: 'business', label: 'Business', icon: '💼' },
    { id: 'arts', label: 'Arts & Creative', icon: '🎨' },
    { id: 'education', label: 'Education', icon: '📚' },
    { id: 'science', label: 'Science & Research', icon: '🔬' },
    { id: 'other', label: 'Other', icon: '✏️' },
  ],
  hasOther: true,
};

// Q7: Career or major most drawn to
INFO_OPTIONS[7] = {
  options: [
    { id: 'technology', label: 'Technology / Engineering', icon: '💻' },
    { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { id: 'business', label: 'Business / Finance', icon: '💼' },
    { id: 'arts', label: 'Arts & Design', icon: '🎨' },
    { id: 'science', label: 'Science / Research', icon: '🔬' },
    { id: 'education', label: 'Education', icon: '📚' },
    { id: 'creative', label: 'Creative / Media', icon: '🎬' },
    { id: 'other', label: 'Other (I\'ll describe)', icon: '✏️' },
  ],
  hasOther: true,
};

// Q8: Industries curious about (optional, multi-select)
INFO_OPTIONS[8] = {
  options: [
    { id: 'technology', label: 'Technology', icon: '💻' },
    { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { id: 'business', label: 'Business', icon: '💼' },
    { id: 'arts', label: 'Arts', icon: '🎨' },
    { id: 'education', label: 'Education', icon: '📚' },
    { id: 'other', label: 'Other', icon: '✏️' },
  ],
  hasOther: true,
  multi_select: true,
};

// Q9: Where do you see yourself living after graduation
INFO_OPTIONS[9] = {
  options: [
    { id: 'us_northeast', label: 'US – Northeast', icon: '🗽' },
    { id: 'us_south', label: 'US – South', icon: '🌴' },
    { id: 'us_midwest', label: 'US – Midwest', icon: '🌾' },
    { id: 'us_west', label: 'US – West', icon: '🏔️' },
    { id: 'canada', label: 'Canada', icon: '🍁' },
    { id: 'international', label: 'International', icon: '🌍' },
    { id: 'other', label: 'Other', icon: '✏️' },
  ],
  hasOther: true,
};

// Q54: LinkedIn (optional) — tap "No LinkedIn" or type link
INFO_OPTIONS[54] = {
  options: [
    { id: 'no', label: "I don't have one", icon: '—' },
    { id: 'yes', label: "I'll paste my link", icon: '🔗' },
  ],
  hasOther: false,
};

export function getInfoOptions(questionId: number): InfoQuestionOptions | null {
  return INFO_OPTIONS[questionId] ?? null;
}

export function hasInfoOptions(questionId: number): boolean {
  return questionId in INFO_OPTIONS;
}
