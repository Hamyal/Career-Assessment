/**
 * 54 questions for UI — text, multi_select, required.
 * Source: Question Bank.docx (PowerPrint Career Decoder).
 */

export interface QuestionMeta {
  id: number;
  text: string;
  /** Conversational prompt shown in chat (asks the user); falls back to text if missing */
  chatPrompt?: string;
  multi_select: boolean;
  required: boolean;
  /** Questions 10–52 are archetype-scored; 1–9, 53–54 are info/upload only */
  scored: boolean;
}

export const questions: QuestionMeta[] = [
  { id: 1, text: 'Full Name (Required)', chatPrompt: "What's your full name?", multi_select: false, required: true, scored: false },
  { id: 2, text: 'High School Graduation Date (Required)', chatPrompt: 'When did you graduate from high school — or when will you?', multi_select: false, required: true, scored: false },
  { id: 3, text: 'Anticipated College Graduation Date (If applicable)', chatPrompt: 'When do you expect to graduate from college? (If applicable)', multi_select: false, required: false, scored: false },
  { id: 4, text: 'Email Address (Required)', chatPrompt: "What's your email address?", multi_select: false, required: true, scored: false },
  { id: 5, text: 'Upload a photo (Optional – used for AI visual rendering)', chatPrompt: 'Want to upload a photo? It\'s optional — we use it for AI visual rendering.', multi_select: false, required: false, scored: false },
  { id: 6, text: 'Current or Intended Industry', chatPrompt: "What's your current or intended industry?", multi_select: false, required: true, scored: false },
  { id: 7, text: "What career or major are you most drawn to — and what do you imagine that path looking like? (Paragraph)", chatPrompt: "What career or major are you most drawn to — and what do you imagine that path looking like?", multi_select: false, required: true, scored: false },
  { id: 8, text: "Industries you're curious about (Optional)", chatPrompt: "Any industries you're curious about? (Optional)", multi_select: false, required: false, scored: false },
  { id: 9, text: 'Where do you see yourself living after graduation? (City/Region)', chatPrompt: 'Where do you see yourself living after graduation? (City or region)', multi_select: false, required: true, scored: false },
  // --- Section 2: Archetype Engine (10–52) ---
  { id: 10, text: "Your energy spikes when you're…", multi_select: false, required: true, scored: true },
  { id: 11, text: "When things feel overwhelming, your default move is…", multi_select: false, required: true, scored: true },
  { id: 12, text: 'In group projects, you usually…', multi_select: false, required: true, scored: true },
  { id: 13, text: 'Work feels meaningful when it…', multi_select: false, required: true, scored: true },
  { id: 14, text: 'When facing a roadblock, you…', multi_select: false, required: true, scored: true },
  { id: 15, text: 'What drains you the fastest?', multi_select: false, required: true, scored: true },
  { id: 16, text: 'People count on you for…', multi_select: false, required: true, scored: true },
  { id: 17, text: 'When making big decisions, you prioritize…', multi_select: false, required: true, scored: true },
  { id: 18, text: 'Your ideal workspace feels…', multi_select: false, required: true, scored: true },
  { id: 19, text: "Work feels frustrating when it's…", multi_select: false, required: true, scored: true },
  { id: 20, text: 'You feel most confident when you…', multi_select: false, required: true, scored: true },
  { id: 21, text: 'Feedback is hardest when it…', multi_select: false, required: true, scored: true },
  { id: 22, text: 'Success means…', multi_select: false, required: true, scored: true },
  { id: 23, text: "Growing up, you were praised for…", multi_select: false, required: true, scored: true },
  { id: 24, text: 'In team settings, you gravitate toward…', multi_select: false, required: true, scored: true },
  { id: 25, text: 'Your biggest career fear is…', multi_select: false, required: true, scored: true },
  { id: 26, text: 'When projects collapse, you…', multi_select: false, required: true, scored: true },
  { id: 27, text: 'Your core value is closest to…', multi_select: false, required: true, scored: true },
  { id: 28, text: 'Quietly, you often think…', multi_select: false, required: true, scored: true },
  { id: 29, text: 'You go after opportunities that offer…', multi_select: false, required: true, scored: true },
  { id: 30, text: 'Growth feels best when…', multi_select: false, required: true, scored: true },
  { id: 31, text: "Your future dream looks like… (Select up to 2)", multi_select: true, required: true, scored: true },
  { id: 32, text: 'What fuels you? (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 33, text: 'Under stress, you… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 34, text: 'You recharge by… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 35, text: 'Your superpower is… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 36, text: 'Your preferred career vibe is… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 37, text: 'Your prime motivation is… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 38, text: 'Your fear at work is… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 39, text: 'If life is a game, you play… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 40, text: 'When you sense conflict or criticism, your first impulse is to… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 41, text: 'Facing a big unknown at work, you… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 42, text: 'Under tight deadlines or crisis, you… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 43, text: 'If you feel undervalued, you tend to… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 44, text: 'In moments of overwhelm, you… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 45, text: 'When someone shares bad news, you first… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 46, text: 'Your go-to stress relief is… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 47, text: 'When making tough choices, you rely on… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 48, text: 'To feel secure in your role, you need… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 49, text: 'Your emotional energy peaks when… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 50, text: 'When you face failure, you usually… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 51, text: 'At your leadership best, you… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 52, text: 'Your ideal feedback environment is… (Select up to 2)', multi_select: true, required: true, scored: true },
  { id: 53, text: 'Upload Current Resume (optional)', chatPrompt: 'Want to upload your current resume? (Optional)', multi_select: false, required: false, scored: false },
  { id: 54, text: 'Provide a link to your LinkedIn if you have one. (Optional)', chatPrompt: 'Do you have a LinkedIn profile? If so, paste the link here. (Optional)', multi_select: false, required: false, scored: false },
];

/** Message to show in chat for this question (conversational ask). */
export function getChatPrompt(q: QuestionMeta): string {
  return q.chatPrompt ?? q.text;
}

export const scoredQuestionIds = questions.filter((q) => q.scored).map((q) => q.id);
