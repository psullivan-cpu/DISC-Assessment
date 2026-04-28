const PDFDocument = require('pdfkit');
const { profiles } = require('./scoring');

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function generatePDF(name, date, scores, result) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill('#2C3E50');
    doc.fillColor('#FFFFFF')
      .fontSize(22).font('Helvetica-Bold')
      .text('DISC Personality Assessment Report', 50, 25, { width: pageWidth });

    doc.moveDown(3);

    // ── Taker info ───────────────────────────────────────────────────────────
    doc.fillColor('#2C3E50').fontSize(13).font('Helvetica-Bold')
      .text('Assessment Results For:', 50, 100);
    doc.fillColor('#333333').fontSize(16).font('Helvetica')
      .text(name, 50, 118);
    doc.fontSize(11).fillColor('#777777')
      .text(`Date: ${date}`, 50, 138);

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.moveTo(50, 158).lineTo(doc.page.width - 50, 158).strokeColor('#DDDDDD').stroke();

    // ── Score summary + bar chart ─────────────────────────────────────────────
    doc.fillColor('#2C3E50').fontSize(13).font('Helvetica-Bold')
      .text('Your DISC Scores', 50, 170);

    const dimensions = ['D', 'I', 'S', 'C'];
    const labels = { D: 'D  Dominance', I: 'I  Influence', S: 'S  Steadiness', C: 'C  Conscientiousness' };
    const maxScore = 24;
    const barMaxWidth = 300;
    let y = 192;

    dimensions.forEach(dim => {
      const raw = scores[dim] || 0;
      const pct = raw / maxScore;
      const barWidth = Math.round(pct * barMaxWidth);
      const color = hexToRgb(profiles[dim].color);

      doc.fillColor('#555555').fontSize(11).font('Helvetica')
        .text(labels[dim], 50, y + 3, { width: 160 });

      doc.rect(215, y, barWidth, 18).fill(profiles[dim].color);
      doc.rect(215 + barWidth, y, barMaxWidth - barWidth, 18).fill('#EEEEEE');

      doc.fillColor('#333333').fontSize(11).font('Helvetica-Bold')
        .text(`${raw} / ${maxScore}`, 525, y + 3);

      y += 32;
    });

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.moveTo(50, y + 8).lineTo(doc.page.width - 50, y + 8).strokeColor('#DDDDDD').stroke();
    y += 22;

    // ── Primary style ─────────────────────────────────────────────────────────
    const primary = result.primary;
    const primaryColor = hexToRgb(primary.color);

    doc.rect(50, y, pageWidth, 22).fill(primary.color);
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold')
      .text(`Primary Style: ${result.primaryKey} — ${primary.name}`, 58, y + 4);
    y += 30;

    doc.fillColor('#333333').fontSize(11).font('Helvetica')
      .text(primary.description, 50, y, { width: pageWidth });
    y += doc.heightOfString(primary.description, { width: pageWidth }) + 10;

    doc.fillColor('#2C3E50').fontSize(12).font('Helvetica-Bold').text('Key Strengths:', 50, y);
    y += 18;
    primary.strengths.forEach(s => {
      doc.fillColor('#444444').fontSize(11).font('Helvetica')
        .text(`• ${s}`, 58, y);
      y += 16;
    });

    doc.fillColor('#555555').fontSize(11).font('Helvetica-Oblique')
      .text(`Potential blind spot: ${primary.blindspot}`, 50, y + 6, { width: pageWidth });
    y += doc.heightOfString(`Potential blind spot: ${primary.blindspot}`, { width: pageWidth }) + 18;

    // ── Secondary style ───────────────────────────────────────────────────────
    if (result.isBlended) {
      doc.rect(50, y, pageWidth, 22).fill(result.secondary.color);
      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold')
        .text(`Secondary Style: ${result.secondaryKey} — ${result.secondary.name}`, 58, y + 4);
      y += 30;

      doc.fillColor('#333333').fontSize(11).font('Helvetica')
        .text(`Your scores show a blended ${result.primaryKey}/${result.secondaryKey} profile. ${result.secondary.description}`, 50, y, { width: pageWidth });
      y += doc.heightOfString(result.secondary.description, { width: pageWidth }) + 14;
    }

    // ── Communication tip ─────────────────────────────────────────────────────
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#DDDDDD').stroke();
    y += 14;

    doc.rect(50, y, 4, 52).fill(primary.color);
    doc.fillColor('#2C3E50').fontSize(12).font('Helvetica-Bold').text('Development Tip', 62, y);
    y += 18;
    doc.fillColor('#444444').fontSize(11).font('Helvetica')
      .text(primary.tip, 62, y, { width: pageWidth - 12 });
    y += doc.heightOfString(primary.tip, { width: pageWidth - 12 }) + 20;

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc.moveTo(50, footerY - 10).lineTo(doc.page.width - 50, footerY - 10).strokeColor('#DDDDDD').stroke();
    doc.fillColor('#AAAAAA').fontSize(9).font('Helvetica')
      .text('Generated by DISC Assessment Tool  •  For personal and professional development purposes only.', 50, footerY, { align: 'center', width: pageWidth });

    doc.end();
  });
}

module.exports = { generatePDF };
