const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4,
  won: 1, to: 2, too: 2, fore: 4, for: 4,
  '1': 1, '2': 2, '3': 3, '4': 4,
};

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────
// Cache blob URLs so repeated phrases (e.g. "Say or tap 1, 2, 3, or 4.")
// only hit the server once per session.
const audioCache = new Map();
let currentAudio  = null;

async function speak(text) {
  // Stop anything already playing
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis.cancel();

  try {
    let blobUrl = audioCache.get(text);
    if (!blobUrl) {
      const res = await fetch('/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}`);
      blobUrl = URL.createObjectURL(await res.blob());
      audioCache.set(text, blobUrl);
    }

    const audio = new Audio(blobUrl);
    currentAudio = audio;

    return new Promise(resolve => {
      audio.onended = () => {
        currentAudio = null;
        setTimeout(resolve, 350); // gap after audio so mic doesn't catch the tail
      };
      audio.onerror = () => { currentAudio = null; resolve(); };
      audio.play().catch(() => resolve());
    });
  } catch (err) {
    console.warn('ElevenLabs unavailable, using browser TTS:', err.message);
    return browserSpeak(text);
  }
}

// ── Browser TTS fallback ──────────────────────────────────────────────────────
const VOICE_PRIORITY = [
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Michelle Online (Natural) - English (United States)',
  'Google US English',
  'Microsoft Zira - English (United States)',
];
let selectedVoice = null;

(function loadVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    for (const name of VOICE_PRIORITY) {
      const v = voices.find(v => v.name === name);
      if (v) { selectedVoice = v; return; }
    }
    selectedVoice = voices.find(v => v.lang?.startsWith('en')) || null;
  } else {
    window.speechSynthesis.onvoiceschanged = loadVoice;
  }
})();

function browserSpeak(text) {
  return new Promise(resolve => {
    const utter = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate  = 0.9;
    utter.pitch = 1.0;
    utter.lang  = 'en-US';
    utter.onend   = () => setTimeout(resolve, 250);
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

// ── Speech recognition ────────────────────────────────────────────────────────
let activeRecognition = null;

function stopListening() {
  if (activeRecognition) {
    const r = activeRecognition;
    activeRecognition = null; // nullify BEFORE stop so onend doesn't restart
    try { r.stop(); } catch (_) {}
  }
}

function listen(timeoutMs = 12000) {
  return new Promise(resolve => {
    if (!SpeechRecognition) { resolve(null); return; }

    let settled = false;
    const timer = setTimeout(() => done(null), timeoutMs);

    function done(val) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    }

    function startRecognition() {
      if (settled) return;

      const rec = new SpeechRecognition();
      activeRecognition = rec;
      rec.lang              = 'en-US';
      rec.interimResults    = false;
      rec.maxAlternatives   = 5;
      rec.continuous        = false;

      rec.onresult = event => {
        if (settled || activeRecognition !== rec) return;
        for (let i = 0; i < event.results[0].length; i++) {
          const raw = event.results[0][i].transcript.trim().toLowerCase();
          for (const word of raw.split(/\s+/)) {
            if (WORD_TO_NUM[word] !== undefined) {
              activeRecognition = null;
              done(WORD_TO_NUM[word]);
              return;
            }
          }
        }
        // Words heard but no valid number — restart immediately
        if (!settled && activeRecognition === rec) setTimeout(startRecognition, 100);
      };

      rec.onerror = e => {
        if (!settled && activeRecognition === rec && e.error !== 'aborted') {
          setTimeout(startRecognition, 300);
        }
      };

      // Chrome's recognition often ends after a short silence — just restart it
      rec.onend = () => {
        if (!settled && activeRecognition === rec) setTimeout(startRecognition, 150);
      };

      try {
        rec.start();
      } catch (_) {
        if (!settled && activeRecognition === rec) setTimeout(startRecognition, 400);
      }
    }

    startRecognition();
  });
}

window.Voice = { speak, stopListening, listen };
