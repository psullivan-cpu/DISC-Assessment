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
  let currentIndex = 0;

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

  // ── Button / voice answer racing ─────────────────────────────────────────
  // buttonResolver is set while we're waiting for an answer.
  // Clicking a rating button resolves it immediately (cancelling the mic).
  let buttonResolver = null;

  ratingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!buttonResolver) return;
      const val = parseInt(btn.dataset.val);
      ratingBtns.forEach(b => b.classList.toggle('active', b === btn));
      Voice.stopListening();
      const resolve = buttonResolver;
      buttonResolver = null;
      resolve(val);
    });
  });

  // Races mic recognition against a button tap — whichever comes first wins.
  function listenOrButton() {
    return new Promise(resolve => {
      const myResolve = val => {
        if (buttonResolver === myResolve) buttonResolver = null;
        resolve(val);
      };
      buttonResolver = myResolve;

      Voice.listen(10000).then(val => {
        if (buttonResolver === myResolve) { // mic won (button didn't fire)
          buttonResolver = null;
          resolve(val); // val may be null on timeout
        }
        // else: button already resolved — ignore mic result
      });
    });
  }

  // ── Question flow ─────────────────────────────────────────────────────────
  repeatBtn.style.display = 'block';
  repeatBtn.addEventListener('click', async () => {
    Voice.stopListening();
    buttonResolver = null;
    setStatus('speaking', 'Repeating question…');
    await Voice.speak(QUESTIONS[currentIndex].text);
    await Voice.speak('Say or tap 1, 2, 3, or 4.');
    setStatus('listening', 'Listening… or tap a button below.');
    restartListen();
  });

  let listenLoopActive = false;
  function restartListen() {
    if (listenLoopActive) return;
    listenLoopActive = true;
    listenLoop().finally(() => { listenLoopActive = false; });
  }

  async function listenLoop() {
    let silentRounds = 0;
    let answer = null;
    while (answer === null) {
      setStatus('listening', 'Listening… or tap 1, 2, 3, or 4 below.');
      answer = await listenOrButton();
      if (answer === null) {
        silentRounds++;
        if (silentRounds >= 2) {
          silentRounds = 0;
          setStatus('speaking', 'Please respond when ready…');
          await Voice.speak('Please say or tap 1, 2, 3, or 4.');
        } else {
          setStatus('listening', 'Still listening… tap a button if preferred.');
        }
      }
    }

    // Answer received
    ratingBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) === answer));
    answers[QUESTIONS[currentIndex].id] = answer;
    setStatus('speaking', `Got it — ${answer}.`);
    await Voice.speak(`Got it, ${answer}.`);

    currentIndex++;
    if (currentIndex < QUESTIONS.length) {
      await askQuestion();
    } else {
      await finish();
    }
  }

  async function askQuestion() {
    const q = QUESTIONS[currentIndex];
    ratingBtns.forEach(b => b.classList.remove('active'));

    counterEl.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
    progressFill.style.width = `${(currentIndex / QUESTIONS.length) * 100}%`;
    questionTextEl.textContent = q.text;

    setStatus('speaking', 'Speaking question…');
    await Voice.speak(q.text);
    await Voice.speak('Say or tap 1, 2, 3, or 4.');

    restartListen();
  }

  async function finish() {
    buttonResolver = null;
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

  // ── Welcome + disclaimer ──────────────────────────────────────────────────
  setStatus('speaking', 'Speaking welcome message…');
  await Voice.speak(
    `Welcome, ${name}. Before we begin, please know that this DISC assessment is purely for informational purposes. ` +
    `There are no right or wrong profiles — every style has unique strengths. ` +
    `The goal is simply to give you insights that help improve communication and teamwork. ` +
    `You will hear 24 statements about yourself. After each one, say a number from 1 to 4, or tap the buttons on screen at any time. ` +
    `1 means — Not at all like me. ` +
    `2 means — Somewhat like me. ` +
    `3 means — Mostly like me. ` +
    `4 means — Very much like me. ` +
    `Let's begin.`
  );

  await askQuestion();
})();
