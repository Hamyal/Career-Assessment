/**
 * Bot branding — Randy, the Career Decoder (RandyBot-style).
 * Matches the concept design: dark blue + orange palette, two-tone logo, clean chat UI.
 * Drop avatar image at public/randy-avatar.png and set BOT_AVATAR_IMAGE_URL to use it.
 */

/** Full name shown in header and introductions */
export const BOT_DISPLAY_NAME = 'Randy, the Career Decoder';

/** Short name for casual copy (e.g. "Randy's got your form") */
export const BOT_SHORT_NAME = 'Randy';

/** Header: first part of logo (orange in design) */
export const BOT_HEADER_PRIMARY = 'Randy';

/** Header: second part of logo (blue in design) */
export const BOT_HEADER_SECONDARY = ', the Career Decoder';

/** Tagline under logo (optional) */
export const BOT_TAGLINE = 'AI CAREER COACH';

/** Single letter or initials for avatar pill when no image */
export const BOT_AVATAR_LETTER = 'R';

/** Optional: path to bot avatar image (e.g. /randy-avatar.png if placed in public/) */
export const BOT_AVATAR_IMAGE_URL: string | null = null;

/** Brand colors from concept design */
export const BRAND = {
  /** Dark blue — header accent, user bubbles, primary UI */
  blue: '#01074C',
  /** Vibrant orange — logo primary, buttons, progress, bot avatar */
  orange: '#FB6322',
  /** Softer orange for hover */
  orangeHover: '#e55518',
  /** White / light backgrounds */
  white: '#ffffff',
  /** Light grey for secondary text */
  muted: '#6e6e80',
} as const;
