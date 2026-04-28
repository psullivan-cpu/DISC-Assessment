(async () => {
  const name  = sessionStorage.getItem('disc_name');
  const email = sessionStorage.getItem('disc_email');
  if (!name || !email) { window.location.href = 'index.html'; return; }

  const QUESTIONS = [
    { id: 1,  dimension: 'D', text: 'I take charge and make decisions quickly.' },
    { id: 2,  dimension: 'D', text: 'I enjoy competition and feel driven to win.' },
    { id: 3,  dimension: 'D', text: 'I am direct and get straight to the point.' },
    { id: 4,  dimension: 'D', text: 'I prefer to lead rather than follow.' },
    { id: 5,  dimension: 'D', text: 'I tackle problems head-on without hesitation.' },
    { id: 6,  dimension: 'D', text: 'I am confident I can achieve any goal I set.' },
    { id: 7,  dimension: 'I', text: 'I enjoy meeting new people and building friendships.' },
    { id: 8,  dimension: 'I', text: 'I am enthusiastic and energetic in group settings.' },
    { id: 9,  dimension: 'I', text: 'I inspire and motivate others with my ideas.' },
    { id: 10, dimension: 'I', text: 'I find it easy to start conversations with strangers.' },
    { id: 11, dimension: 'I', text: 'I prefer collaborating with a team over working alone.' },
    { id: 12, dimension: 'I', text: 'I use humor and storytelling to connect with people.' },
    { id: 13, dimension: 'S', text: 'I prefer a stable and predictable environment.' },
    { id: 14, dimension: 'S', text: 'I am patient and a genuinely good listener.' },
    { id: 15, dimension: 'S', text: 'I avoid conflict and support others around me.' },
    { id: 16, dimension: 'S', text: 'I follow through on commitments consistently.' },
    { id: 17, dimension: 'S', text: 'I prefer gradual change to sudden shifts.' },
    { id: 18, dimension: 'S', text: 'I build deep, long-lasting relationships.' },
    { id: 19, dimension: 'C', text: 'I pay close attention to details and accuracy.' },
    { id: 20, dimension: 'C', text: 'I analyze information thoroughly before deciding.' },
    { id: 21, dimension: 'C', text: 'I follow rules and established procedures carefully.' },
    { id: 22, dimension: 'C', text: 'I set high quality standards for my own work.' },
    { id: 23, dimension: 'C', text: 'I research a topic fully before taking action.' },
    { id: 24, dimension: 'C', text: 'I prioritize doing something right over doing it fast.' },
  ];

  const answers = {};

  const counterEl      = document.getElementById('counter');
  const progressFill   = document.getElementById('progressFill');
  const questionTextEl = document.getElementById('questionText');
  const micDot         = document.getElementById('micDot');
  const voiceStatusEl  = document.getElementById('voiceStatusText');
  const repeatBtn      = document.getElementById('retryBtn');
  const ratingBtns     = document.querySelectorAll('.rating-btn');

  function setStatus(state, text) {
    micDot.className = 'mic-dot' + (state ? ` ${state}` : '');
    voiceStatusEl.textContent = text;
  }

  // ── Input resolution ──────────────────────────────────────────────────────
  // currentResolve is set while waiting for user input.
  // Resolves with { type: 'answer', val } | { type: 'repeat' } | { type: 'timeout' }
  let currentResolve = null;

  ratingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentResolve) return;
      const val = parseInt(btn.dataset.val);
      ratingBtns.forEach(b => b.classList.toggle('active', b === btn));
      Voice.stopListening();
      const r = currentResolve;
      currentResolve = null;
      r({ type: 'answer', val });
    });
  });

  repeatBtn.style.display = 'block';
  repeatBtn.addEventListener('click', () => {
    if (!currentResolve) return;
    Voice.stopListening();
    const r = currentResolve;
    currentResolve = null;
    r({ type: 'repeat' });
  });

  function waitForInput() {
    return new Promise(resolve => {
      currentResolve = resolve;
      Voice.listen(12000).then(val => {
        if (currentResolve !== resolve) return; // already resolved by button/repeat
        currentResolve = null;
        resolve(val !== null ? { type: 'answer', val } : { type: 'timeout' });
      });
    });
  }

  // ── Single question: speak then listen until answered ─────────────────────
  async function askQuestion(q) {
    while (true) {
      setStatus('speaking', 'Speaking question…');
      await Voice.speak(q.text);
      await Voice.speak('Say or tap 1, 2, 3, or 4.');

      let silentRounds = 0;
      while (true) {
        setStatus('listening', 'Listening… or tap 1, 2, 3, or 4 below.');
        const result = await waitForInput();

        if (result.type === 'answer') return result.val;

        if (result.type === 'repeat') break; // break inner loop → re-speak question

        // timeout
        silentRounds++;
        if (silentRounds >= 2) {
          silentRounds = 0;
          setStatus('speaking', 'Please respond when ready…');
          await Voice.speak('Please say or tap 1, 2, 3, or 4.');
        } else {
          setStatus('listening', 'Still listening… tap a button if you prefer.');
        }
      }
    }
  }

  // ── Main assessment loop — simple, linear, no recursion ──────────────────
  async function runAssessment() {
    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];

      counterEl.textContent = `Question ${i + 1} of ${QUESTIONS.length}`;
      progressFill.style.width = `${(i / QUESTIONS.length) * 100}%`;
      questionTextEl.textContent = q.text;
      ratingBtns.forEach(b => b.classList.remove('active'));

      const answer = await askQuestion(q);

      answers[q.id] = answer;
      ratingBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) === answer));
      setStatus('speaking', `Got it — ${answer}.`);
      await Voice.speak(`Got it, ${answer}.`);
    }

    // All done
    currentResolve = null;
    setStatus('speaking', 'Assessment complete!');
    progressFill.style.width = '100%';
    counterEl.textContent = 'Complete!';
    questionTextEl.textContent = 'Great job! Calculating your results…';
    ratingBtns.forEach(b => { b.disabled = true; });
    repeatBtn.style.display = 'none';

    await Voice.speak('Excellent! You have completed all 24 questions. Preparing your results now.');
    sessionStorage.setItem('disc_answers', JSON.stringify(answers));
    window.location.href = 'results.html';
  }

  // ── Welcome + disclaimer then begin ──────────────────────────────────────
  setStatus('speaking', 'Speaking welcome message…');
  await Voice.speak(
    `Welcome, ${name}. Before we begin, please know that this DISC assessment is purely for informational purposes. ` +
    `There are no right or wrong profiles — every style has unique strengths. ` +
    `The goal is to give you insights that help improve communication and teamwork. ` +
    `You will hear 24 statements about yourself. After each one, say a number from 1 to 4, or tap the buttons on screen at any time. ` +
    `1 means not at all like me. 2 means somewhat like me. 3 means mostly like me. 4 means very much like me. ` +
    `Let's begin.`
  );

  await runAssessment();
})();
