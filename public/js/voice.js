const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const WORD_TO_NUM = {
  one: 1, two: 2, three: 3, four: 4,
  won: 1, to: 2, too: 2, fore: 4, for: 4,
  '1': 1, '2': 2, '3': 3, '4': 4,
};

function speak(text) {
  return new Promise(resolve => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.92;
    utter.pitch = 1.0;
    utter.lang  = 'en-US';
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

function listen(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!SpeechRecognition) {
      reject(new Error('SpeechRecognition not supported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        recognition.stop();
        resolve(null);
      }
    }, timeoutMs);

    recognition.onresult = event => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      for (let i = 0; i < event.results[0].length; i++) {
        const raw = event.results[0][i].transcript.trim().toLowerCase();
        for (const word of raw.split(/\s+/)) {
          if (WORD_TO_NUM[word] !== undefined) {
            resolve(WORD_TO_NUM[word]);
            return;
          }
        }
      }
      resolve(null);
    };

    recognition.onerror = () => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
    };

    recognition.onend = () => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
    };

    recognition.start();
  });
}

window.Voice = { speak, listen };
