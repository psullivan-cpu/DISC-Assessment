const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4,
  won: 1, to: 2, too: 2, fore: 4, for: 4,
  '1': 1, '2': 2, '3': 3, '4': 4,
};

// Priority list — Microsoft neural voices are far more natural than default
const VOICE_PRIORITY = [
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Michelle Online (Natural) - English (United States)',
  'Microsoft Eric Online (Natural) - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Aria - English (United States)',
  'Google US English',
  'Microsoft Zira - English (United States)',
  'Microsoft David - English (United States)',
];

let selectedVoice = null;

function pickVoice(voices) {
  for (const name of VOICE_PRIORITY) {
    const match = voices.find(v => v.name === name);
    if (match) return match;
  }
  return voices.find(v => v.lang && v.lang.startsWith('en')) || null;
}

// Voices load asynchronously — kick off early so they're ready by first speak()
function loadVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    selectedVoice = pickVoice(voices);
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      selectedVoice = pickVoice(window.speechSynthesis.getVoices());
    };
  }
}
loadVoice();

function speak(text) {
  return new Promise(resolve => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate  = 0.9;
    utter.pitch = 1.05;
    utter.lang  = 'en-US';
    utter.onend   = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

let activeRecognition = null;

function stopListening() {
  if (activeRecognition) {
    try { activeRecognition.stop(); } catch (_) {}
    activeRecognition = null;
  }
}

function listen(timeoutMs = 10000) {
  return new Promise(resolve => {
    if (!SpeechRecognition) { resolve(null); return; }

    const recognition = new SpeechRecognition();
    activeRecognition = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    let settled = false;
    function done(val) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (activeRecognition === recognition) activeRecognition = null;
      resolve(val);
    }

    const timer = setTimeout(() => done(null), timeoutMs);

    recognition.onresult = event => {
      for (let i = 0; i < event.results[0].length; i++) {
        const raw = event.results[0][i].transcript.trim().toLowerCase();
        for (const word of raw.split(/\s+/)) {
          if (WORD_TO_NUM[word] !== undefined) { done(WORD_TO_NUM[word]); return; }
        }
      }
      done(null);
    };

    recognition.onerror = () => done(null);
    recognition.onend   = () => done(null);
    recognition.start();
  });
}

window.Voice = { speak, listen, stopListening };
