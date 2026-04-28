require('dotenv').config();
const path = require('path');
const express = require('express');
const { score } = require('./src/scoring');
const { generatePDF } = require('./src/pdf');

const ELEVEN_VOICE = 'NNl6r8mD7vthiJatiJt1';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Hit GET /voice-test in a browser to verify ElevenLabs key + voice are working
app.get('/voice-test', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'your-elevenlabs-api-key') {
    return res.json({ ok: false, reason: 'ELEVENLABS_API_KEY not set in .env' });
  }
  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Voice test.', model_id: 'eleven_turbo_v2_5' }),
      }
    );
    if (!upstream.ok) {
      const body = await upstream.text();
      return res.json({ ok: false, status: upstream.status, body });
    }
    res.json({ ok: true, voice: ELEVEN_VOICE, message: 'ElevenLabs is working correctly.' });
  } catch (err) {
    res.json({ ok: false, reason: err.message });
  }
});

app.post('/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text.' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ELEVENLABS_API_KEY not configured.' });

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!upstream.ok) {
      console.error('ElevenLabs error:', upstream.status, await upstream.text());
      return res.status(502).json({ error: 'ElevenLabs API error.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('/speak error:', err);
    res.status(500).json({ error: 'Failed to generate speech.' });
  }
});

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

// Local dev only — Vercel imports the app as a module
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`DISC Assessment running at http://localhost:${PORT}`);
    console.log('Open in Chrome or Edge for full voice support.');
  });
}

module.exports = app;
