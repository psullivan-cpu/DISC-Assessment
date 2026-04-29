// ── ElevenLabs TTS ────────────────────────────────────────────────────────────
// Blob URLs are cached so repeated phrases only hit the server once per session.
const audioCache = new Map();
let currentAudio  = null;

async function speak(text) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  try {
    let blobUrl = audioCache.get(text);
    if (!blobUrl) {
      const res = await fetch('/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blobUrl = URL.createObjectURL(await res.blob());
      audioCache.set(text, blobUrl);
    }

    const audio = new Audio(blobUrl);
    currentAudio = audio;
    return new Promise(resolve => {
      audio.onended = () => { currentAudio = null; resolve(); };
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
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate  = 0.9;
    utter.pitch = 1.0;
    utter.lang  = 'en-US';
    utter.onend   = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

window.Voice = { speak };
