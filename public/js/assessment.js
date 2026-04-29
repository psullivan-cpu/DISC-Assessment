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
  const hearAgainBtn   = document.getElementById('retryBtn');
  const ratingBtns     = document.querySelectorAll('.rating-btn');

  function setStatus(state, text) {
    micDot.className = 'mic-dot' + (state ? ` ${state}` : '');
    voiceStatusEl.textContent = text;
  }

  // ── Wait for a button click — the only input method ───────────────────────
  let answerResolve = null;

  ratingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!answerResolve) return;
      const val = parseInt(btn.dataset.val);
      ratingBtns.forEach(b => b.classList.toggle('active', b === btn));
      const r = answerResolve;
      answerResolve = null;
      r(val);
    });
  });

  function waitForClick() {
    setStatus('', 'Click an answer below.');
    return new Promise(resolve => { answerResolve = resolve; });
  }

  // ── "Hear Again" button re-speaks the current question ───────────────────
  hearAgainBtn.style.display = 'block';
  hearAgainBtn.addEventListener('click', async () => {
    if (!answerResolve) return;
    setStatus('speaking', 'Repeating question…');
    await Voice.speak(QUESTIONS[currentIndex].text);
    setStatus('', 'Click an answer below.');
  });

  // ── Main assessment loop ──────────────────────────────────────────────────
  async function runAssessment() {
    for (currentIndex = 0; currentIndex < QUESTIONS.length; currentIndex++) {
      const q = QUESTIONS[currentIndex];

      counterEl.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
      progressFill.style.width = `${(currentIndex / QUESTIONS.length) * 100}%`;
      questionTextEl.textContent = q.text;
      ratingBtns.forEach(b => b.classList.remove('active'));

      setStatus('speaking', 'Speaking question…');
      await Voice.speak(q.text);

      const answer = await waitForClick();

      answers[q.id] = answer;
      setStatus('speaking', `Got it — ${answer}.`);
      await Voice.speak(`Got it, ${answer}.`);
    }

    // Complete
    answerResolve = null;
    hearAgainBtn.style.display = 'none';
    setStatus('speaking', 'Assessment complete!');
    progressFill.style.width = '100%';
    counterEl.textContent = 'Complete!';
    questionTextEl.textContent = 'Great job! Calculating your results…';
    ratingBtns.forEach(b => { b.disabled = true; });

    await Voice.speak('Excellent! You have completed all 24 questions. Preparing your results now.');
    sessionStorage.setItem('disc_answers', JSON.stringify(answers));
    window.location.href = 'results.html';
  }

  // ── Welcome — instructs clicking, not speaking ────────────────────────────
  setStatus('speaking', 'Speaking welcome message…');
  await Voice.speak(
    `Welcome, ${name}. Before we begin, please know that this DISC assessment is purely for informational purposes. ` +
    `There are no right or wrong profiles — every style has unique strengths. ` +
    `The goal is to give you insights that help improve communication and teamwork. ` +
    `You will hear 24 statements read aloud. After each one, click the button on screen that best matches you. ` +
    `1 means not at all like me. 2 means somewhat like me. 3 means mostly like me. 4 means very much like me. ` +
    `Let's begin.`
  );

  await runAssessment();
})();
