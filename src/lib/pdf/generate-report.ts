/**
 * STEP 4 — PDF Generation. Uses pdf-lib (no Puppeteer).
 * Includes: cover page, trait breakdown, top 3 traits explanation, career suggestions, summary narrative, BIA branding.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { FinalScoringOutput, ArchetypeId } from '@/lib/schemas';
import path from 'path';
import fs from 'fs/promises';

const ARCHETYPE_LABELS: Record<ArchetypeId, string> = {
  decoder: 'Decoder',
  signal: 'Signal',
  bridge: 'Bridge',
  heartbeat: 'Heartbeat',
};

const TRAIT_EXPLANATIONS: Record<ArchetypeId, string> = {
  decoder: 'You excel at breaking down complexity, finding patterns, and making data-driven decisions. You bring clarity and structure to ambiguous problems.',
  signal: 'You thrive on momentum, new ideas, and bold moves. You inspire change and drive action with energy and vision.',
  bridge: 'You connect people and ideas. You create safety, foster collaboration, and help others feel understood and supported.',
  heartbeat: 'You bring stability, consistency, and follow-through. You keep systems running and teams grounded.',
};

const CAREER_SUGGESTIONS: Record<ArchetypeId, string> = {
  decoder: 'Consider roles in analysis, research, strategy, engineering, or operations where logic and structure are valued.',
  signal: 'Consider roles in innovation, leadership, sales, marketing, or entrepreneurship where initiative and vision matter.',
  bridge: 'Consider roles in HR, counseling, community work, facilitation, or client success where connection is central.',
  heartbeat: 'Consider roles in project management, administration, quality assurance, or support where reliability is key.',
};

const BRAND_COLOR = rgb(0.1, 0.21, 0.36); // #1a365d
const ACCENT_COLOR = rgb(0.33, 0.21, 0.85); // #5436da
const LOGO_MAX_WIDTH = 180;
const FOOTER_LOGO_HEIGHT = 14;

function getStartupName(): string {
  const name = typeof process.env.REPORT_STARTUP_NAME === 'string'
    ? process.env.REPORT_STARTUP_NAME.trim()
    : '';
  return name || 'biaPathways';
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.png');
    return await fs.readFile(logoPath);
  } catch {
    return null;
  }
}

/** Build a short placeholder narrative from scores when AI narrative is not used. */
export function buildPlaceholderNarrative(score: FinalScoringOutput): string {
  const primary = ARCHETYPE_LABELS[score.primary_type];
  const secondary = ARCHETYPE_LABELS[score.secondary_type];
  const growth = ARCHETYPE_LABELS[score.lowest_domain];
  const blended = score.is_blended
    ? ' Your profile shows a blended style, with strengths in both ' + primary + ' and ' + secondary + '.'
    : '';
  const stress =
    Object.keys(score.stress_profile).length > 0
      ? ' Your stress profile suggests areas to watch; consider support where you feel most stretched.'
      : '';
  return (
    `Your primary career archetype is ${primary}, with ${secondary} as a strong secondary. You thrive when work aligns with these strengths.` +
    blended +
    ` Your growth edge is ${growth}—leaning into this can round out your approach.` +
    stress
  );
}

function wrapLines(
  text: string,
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function orderedArchetypes(score: FinalScoringOutput): ArchetypeId[] {
  const s = score.archetype_scores;
  return (['decoder', 'signal', 'bridge', 'heartbeat'] as ArchetypeId[]).sort(
    (a, b) => (s[b] ?? 0) - (s[a] ?? 0)
  );
}

export type ReportPdfOptions = {
  participantName?: string | null;
};

export async function generateReportPdf(
  score: FinalScoringOutput,
  narrative: string,
  options: ReportPdfOptions = {}
): Promise<Uint8Array> {
  const { participantName } = options;
  const startupName = getStartupName();

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = { width: 595, height: 842 };
  const margin = 50;
  const lineHeight = 16;
  const titleSize = 22;
  const subtitleSize = 13;
  const headingSize = 14;
  const bodySize = 11;
  const footerY = margin - 8;

  let logoImage: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null;
  const logoBytes = await loadLogoBytes();
  if (logoBytes) {
    try {
      logoImage = await doc.embedPng(logoBytes);
    } catch {
      logoImage = null;
    }
  }

  const addPage = () => {
    const p = doc.addPage([width, height]);
    if (logoImage) {
      const logoW = (FOOTER_LOGO_HEIGHT / logoImage.height) * logoImage.width;
      p.drawImage(logoImage, {
        x: margin,
        y: footerY - 2,
        width: Math.min(logoW, 100),
        height: FOOTER_LOGO_HEIGHT,
      });
    }
    const footerText = `${getStartupName()} · PowerPrint™ Career Assessment Report`;
    p.drawText(footerText, {
      x: margin + (logoImage ? 110 : 0),
      y: footerY,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    return p;
  };

  let currentPage = addPage();
  let y = height - margin;

  // ——— COVER: Startup name at top (so recipients know who the report is from) ———
  currentPage.drawText(startupName, {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: ACCENT_COLOR,
  });
  y -= lineHeight;

  // Accent line under startup name
  currentPage.drawRectangle({
    x: margin,
    y: y - 4,
    width: 80,
    height: 3,
    color: ACCENT_COLOR,
  });
  y -= lineHeight * 1.5;

  // BIA logo on cover (top-right)
  if (logoImage) {
    const scale = LOGO_MAX_WIDTH / logoImage.width;
    const logoH = logoImage.height * scale;
    currentPage.drawImage(logoImage, {
      x: width - margin - LOGO_MAX_WIDTH,
      y: y - logoH,
      width: LOGO_MAX_WIDTH,
      height: logoH,
    });
    y -= logoH + lineHeight;
  }

  const drawText = (
    text: string,
    opts: { size?: number; bold?: boolean; indent?: number } = {}
  ) => {
    const size = opts.size ?? bodySize;
    const f = opts.bold ? fontBold : font;
    const maxW = width - 2 * margin - (opts.indent ?? 0);
    const lines = wrapLines(text, f, maxW, size);
    const indent = opts.indent ?? 0;
    for (const line of lines) {
      if (y < margin + lineHeight + 20) {
        currentPage = addPage();
        y = height - margin;
      }
      currentPage.drawText(line, {
        x: margin + indent,
        y,
        size,
        font: f,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= lineHeight;
    }
  };

  const newPageIfNeeded = (needLines: number) => {
    if (y < margin + lineHeight * needLines + 20) {
      currentPage = addPage();
      y = height - margin;
    }
  };

  // ——— COVER PAGE ———
  currentPage.drawText('PowerPrint™ Career Assessment Report', {
    x: margin,
    y,
    size: titleSize,
    font: fontBold,
    color: BRAND_COLOR,
  });
  y -= lineHeight * 1.2;
  currentPage.drawText('Your personalized results and career insights', {
    x: margin,
    y,
    size: subtitleSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= lineHeight * 2;

  // Prepared for [Name] — so the report is clearly identified
  if (participantName) {
    currentPage.drawText('Prepared for', {
      x: margin,
      y,
      size: bodySize,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= lineHeight;
    currentPage.drawText(participantName, {
      x: margin,
      y,
      size: headingSize,
      font: fontBold,
      color: BRAND_COLOR,
    });
    y -= lineHeight * 1.5;
  }

  const primary = ARCHETYPE_LABELS[score.primary_type];
  const secondary = ARCHETYPE_LABELS[score.secondary_type];
  currentPage.drawText(`Primary: ${primary}  ·  Secondary: ${secondary}`, {
    x: margin,
    y,
    size: headingSize,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight * 1.2;
  if (score.top_motivation_cluster && score.top_motivation_cluster.trim()) {
    const clusterLines = wrapLines(
      score.top_motivation_cluster,
      font,
      width - 2 * margin,
      bodySize
    );
    currentPage.drawText('Top motivation cluster', {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= lineHeight * 0.8;
    for (const line of clusterLines) {
      if (y < margin + lineHeight + 20) break;
      currentPage.drawText(line, {
        x: margin,
        y,
        size: bodySize,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
      y -= lineHeight;
    }
    y -= lineHeight * 0.5;
  }
  y -= lineHeight * 1.5;

  // ——— TRAIT BREAKDOWN ———
  currentPage = addPage();
  y = height - margin;
  currentPage.drawRectangle({
    x: margin,
    y: y - 2,
    width: 4,
    height: headingSize + 4,
    color: ACCENT_COLOR,
  });
  currentPage.drawText('Trait breakdown', {
    x: margin + 10,
    y,
    size: headingSize,
    font: fontBold,
    color: BRAND_COLOR,
  });
  y -= lineHeight;
  const scores = score.archetype_scores;
  currentPage.drawText(
    `Decoder: ${scores.decoder ?? 0}  ·  Signal: ${scores.signal ?? 0}  ·  Bridge: ${scores.bridge ?? 0}  ·  Heartbeat: ${scores.heartbeat ?? 0}`,
    { x: margin, y, size: bodySize, font, color: rgb(0.3, 0.3, 0.3) }
  );
  y -= lineHeight;
  currentPage.drawText(`Growth edge: ${ARCHETYPE_LABELS[score.lowest_domain]}`, {
    x: margin,
    y,
    size: bodySize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= lineHeight * 1.5;

  // ——— TOP 3 TRAITS EXPLANATION ———
  const top3 = orderedArchetypes(score).slice(0, 3);
  currentPage.drawRectangle({
    x: margin,
    y: y - 2,
    width: 4,
    height: headingSize + 4,
    color: ACCENT_COLOR,
  });
  currentPage.drawText('Top traits explained', {
    x: margin + 10,
    y,
    size: headingSize,
    font: fontBold,
    color: BRAND_COLOR,
  });
  y -= lineHeight;
  for (const id of top3) {
    newPageIfNeeded(4);
    currentPage.drawText(ARCHETYPE_LABELS[id], {
      x: margin,
      y,
      size: bodySize,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;
    drawText(TRAIT_EXPLANATIONS[id], { indent: 12 });
    y -= lineHeight * 0.5;
  }
  y -= lineHeight * 0.5;

  // ——— CAREER SUGGESTIONS ———
  newPageIfNeeded(6);
  currentPage.drawRectangle({
    x: margin,
    y: y - 2,
    width: 4,
    height: headingSize + 4,
    color: ACCENT_COLOR,
  });
  currentPage.drawText('Career suggestions', {
    x: margin + 10,
    y,
    size: headingSize,
    font: fontBold,
    color: BRAND_COLOR,
  });
  y -= lineHeight;
  drawText(CAREER_SUGGESTIONS[score.primary_type], {});
  y -= lineHeight;
  if (score.secondary_type !== score.primary_type) {
    drawText(`You may also enjoy: ${CAREER_SUGGESTIONS[score.secondary_type]}`, {});
  }
  y -= lineHeight * 1.2;

  // ——— SUMMARY NARRATIVE ———
  currentPage.drawRectangle({
    x: margin,
    y: y - 2,
    width: 4,
    height: headingSize + 4,
    color: ACCENT_COLOR,
  });
  currentPage.drawText('Summary narrative', {
    x: margin + 10,
    y,
    size: headingSize,
    font: fontBold,
    color: BRAND_COLOR,
  });
  y -= lineHeight;
  drawText(narrative, { size: bodySize });
  y -= lineHeight * 1.2;

  // ——— STRESS PROFILE (optional) ———
  if (Object.keys(score.stress_profile).length > 0) {
    newPageIfNeeded(4);
    currentPage.drawRectangle({
      x: margin,
      y: y - 2,
      width: 4,
      height: headingSize + 4,
      color: ACCENT_COLOR,
    });
    currentPage.drawText('Stress profile', {
      x: margin + 10,
      y,
      size: headingSize,
      font: fontBold,
      color: BRAND_COLOR,
    });
    y -= lineHeight;
    const stressText = Object.entries(score.stress_profile)
      .map(([tag, count]) => `${tag}: ${count}`)
      .join('  ·  ');
    drawText(stressText, { size: bodySize });
  }

  return doc.save();
}
