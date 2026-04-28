require('dotenv').config();
const express = require('express');
const { score } = require('./src/scoring');
const { generatePDF } = require('./src/pdf');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/submit', async (req, res) => {
  const { name, email, answers } = req.body;

  if (!name || !email || !answers) {
    return res.status(400).json({ error: 'Missing name, email, or answers.' });
  }

  try {
    const result = score(answers);

    res.json({
      success: true,
      result: {
        totals: result.totals,
        primaryKey: result.primaryKey,
        secondaryKey: result.secondaryKey,
        isBlended: result.isBlended,
        primary: {
          name: result.primary.name,
          color: result.primary.color,
          description: result.primary.description,
          strengths: result.primary.strengths,
          blindspot: result.primary.blindspot,
          tip: result.primary.tip,
        },
        secondary: {
          name: result.secondary.name,
          color: result.secondary.color,
          description: result.secondary.description,
        },
      },
    });
  } catch (err) {
    console.error('Error scoring assessment:', err);
    res.status(500).json({ error: 'Failed to score assessment. Check server logs.' });
  }
});

app.post('/download-pdf', async (req, res) => {
  const { name, answers } = req.body;

  if (!name || !answers) {
    return res.status(400).json({ error: 'Missing name or answers.' });
  }

  try {
    const result = score(answers);
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const pdfBuffer = await generatePDF(name, date, result.totals, result);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="DISC-Report-${name.replace(/\s+/g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF. Check server logs.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DISC Assessment running at http://localhost:${PORT}`);
  console.log('Open in Chrome or Edge for full voice support.');
});
