// ────────────────────────────────────────────────────────
// PDF generation for Wyrd Pharm intake responses.
// Uses pdfkit built-in fonts (Times-Roman + Helvetica).
// Design mirrors the Wyrd Pharm palette: cream on charcoal
// with an amber-gold accent for section headers.
// ────────────────────────────────────────────────────────

const PDFDocument = require('pdfkit');
const { STEPS, isVisible, formatAnswer } = require('./questions');

// Brand palette (Wyrd Pharm)
const COLORS = {
  bg:        '#0D100E',
  panel:     '#171B18',
  text:      '#EDE8DD',
  textMuted: '#B8B2A5',
  textDim:   '#7B776D',
  gold:      '#C08A4A',
  goldHi:    '#D8A96E',
  hair:      '#2A2E2A',
};

function fmtDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtDateTime(d = new Date()) {
  return d.toLocaleString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
}

/** Generate PDF, resolve to Buffer. */
function generatePdf({ answers, submittedAt }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        bufferPages: true,
        info: {
          Title: `Wyrd Pharm Intake — ${answers.full_name || 'Guest'}`,
          Author: 'Wyrd Pharm',
          Subject: 'Retreat intake questionnaire',
          CreationDate: submittedAt || new Date(),
        },
      });

      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Cover page ───────────────────────────────────
      // Full-page dark background
      doc.save();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
      doc.restore();

      // Top-left brand mark
      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.text)
        .text('W Y R D   P H A R M', 60, 60, { characterSpacing: 3 });

      // Amber accent line
      doc.save();
      doc.rect(60, 92, 60, 1).fill(COLORS.gold);
      doc.restore();

      // Big title, vertical centre
      const midY = doc.page.height / 2 - 80;
      doc.font('Times-Italic')
        .fontSize(38)
        .fillColor(COLORS.text)
        .text('Retreat intake', 60, midY, { width: doc.page.width - 120 });

      doc.moveDown(0.3);
      doc.font('Times-Roman')
        .fontSize(15)
        .fillColor(COLORS.textMuted)
        .text('A confidential pre-arrival questionnaire', { width: doc.page.width - 120 });

      // Guest name block, lower
      const nameY = doc.page.height - 220;
      doc.save();
      doc.rect(60, nameY, 3, 60).fill(COLORS.gold);
      doc.restore();

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.gold)
        .text('SUBMITTED BY', 80, nameY + 4, { characterSpacing: 2 });

      doc.font('Times-Roman')
        .fontSize(22)
        .fillColor(COLORS.text)
        .text(answers.full_name || 'Guest', 80, nameY + 18, { width: doc.page.width - 140 });

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(answers.email || '', 80, nameY + 46);

      // Footer date
      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.textDim)
        .text(`Received ${fmtDateTime(submittedAt || new Date())}`, 60, doc.page.height - 80, {
          width: doc.page.width - 120, align: 'left'
        });

      // ─── Content pages ────────────────────────────────
      doc.addPage();
      applyPageBg(doc);
      let pageIndex = 2;

      // Track when we roll onto new pages so we re-paint bg
      doc.on('pageAdded', () => {
        applyPageBg(doc);
        pageIndex++;
      });

      // Summary strip at top of first content page
      renderTopStrip(doc, answers, submittedAt);

      // Sections
      for (const step of STEPS) {
        renderSection(doc, step, answers);
      }

      // Footer on every page. pdfkit's .text() auto-adds a page if the y position
      // is beyond the bottom margin, so we temporarily shrink the bottom margin
      // for each page while drawing its footer, then restore.
      const range = doc.bufferedPageRange();
      const totalContent = range.count - 1;
      for (let i = range.start; i < range.start + range.count; i++) {
        if (i === 0) continue; // skip cover
        doc.switchToPage(i);
        const originalBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 20;
        // Footer hair line
        doc.save();
        doc.rect(60, doc.page.height - 50, doc.page.width - 120, 0.5).fill(COLORS.hair);
        doc.restore();
        doc.font('Helvetica')
          .fontSize(7)
          .fillColor(COLORS.textDim)
          .text(
            `Wyrd Pharm  ·  Confidential intake  ·  ${answers.full_name || ''}  ·  Page ${i} of ${totalContent}`,
            60, doc.page.height - 40,
            { width: doc.page.width - 120, align: 'center', characterSpacing: 0.5, lineBreak: false }
          );
        doc.page.margins.bottom = originalBottom;
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function applyPageBg(doc) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
  doc.restore();
}

function renderTopStrip(doc, answers, submittedAt) {
  const top = 60;
  doc.save();
  doc.rect(60, top, 3, 44).fill(COLORS.gold);
  doc.restore();

  doc.font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.gold)
    .text('WYRD PHARM  ·  RETREAT INTAKE', 78, top + 2, { characterSpacing: 2 });

  doc.font('Times-Roman')
    .fontSize(15)
    .fillColor(COLORS.text)
    .text(answers.full_name || 'Guest', 78, top + 12, { width: doc.page.width - 140 });

  doc.font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.textMuted)
    .text(
      `${answers.email || ''}${answers.dob ? '   ·   DOB: ' + fmtIsoDate(answers.dob) : ''}   ·   Received ${fmtDate(submittedAt || new Date())}`,
      78, top + 30, { width: doc.page.width - 140 }
    );

  doc.moveDown(2);
  doc.y = top + 62;

  // Thin divider
  doc.save();
  doc.rect(60, doc.y, doc.page.width - 120, 0.5).fill(COLORS.hair);
  doc.restore();
  doc.y += 18;
}

function fmtIsoDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function renderSection(doc, step, answers) {
  const visibleQs = step.questions.filter(q => isVisible(q, answers));
  if (visibleQs.length === 0) return;

  // Ensure at least ~120pt of space; otherwise new page
  if (doc.y > doc.page.height - 160) doc.addPage();
  doc.moveDown(0.6);

  // Section header
  const yStart = doc.y;
  doc.font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.gold)
    .text(step.tag.toUpperCase(), 60, yStart, { characterSpacing: 2 });

  doc.font('Times-Roman')
    .fontSize(18)
    .fillColor(COLORS.text)
    .text(step.title, 60, yStart + 10, { width: doc.page.width - 120 });

  doc.y = yStart + 40;

  // Underline accent
  doc.save();
  doc.rect(60, doc.y, 30, 1).fill(COLORS.gold);
  doc.restore();
  doc.y += 16;

  // Q&A
  for (const q of visibleQs) {
    renderQA(doc, q, answers[q.id]);
  }

  doc.moveDown(1);
}

function renderQA(doc, q, rawValue) {
  // Reserve room; if it won't fit, new page
  const remaining = doc.page.height - 100 - doc.y;
  if (remaining < 60) doc.addPage();

  const answer = formatAnswer(q, rawValue);
  const isEmpty = answer === '—';

  // Question label
  doc.font('Helvetica')
    .fontSize(8.5)
    .fillColor(COLORS.textMuted)
    .text(q.label, 60, doc.y, {
      width: doc.page.width - 120,
      lineGap: 2,
    });

  doc.moveDown(0.25);

  // Answer
  if (q.type === 'confirm') {
    doc.font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(isEmpty ? COLORS.textDim : COLORS.goldHi)
      .text(isEmpty ? 'NOT CONFIRMED' : 'CONFIRMED', {
        width: doc.page.width - 120,
        characterSpacing: 1.5,
      });
  } else {
    // Nicely format ISO dates
    let display = answer;
    if (q.type === 'date' && !isEmpty) display = fmtIsoDate(answer);
    doc.font(q.type === 'long' ? 'Times-Roman' : 'Helvetica')
      .fontSize(q.type === 'long' ? 11.5 : 10.5)
      .fillColor(isEmpty ? COLORS.textDim : COLORS.text)
      .text(display, {
        width: doc.page.width - 120,
        lineGap: q.type === 'long' ? 3 : 1,
      });
  }

  // Trailing space + hair line
  doc.moveDown(0.5);
  doc.save();
  doc.rect(60, doc.y, doc.page.width - 120, 0.4).fillOpacity(0.5).fill(COLORS.hair).fillOpacity(1);
  doc.restore();
  doc.y += 10;
}

module.exports = { generatePdf };
