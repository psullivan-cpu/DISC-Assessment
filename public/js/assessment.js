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
  let awaitingVoice = false;

  const counterEl      = document.getElementById('counter');
  const progressFill   = document.getElementById('progressFill');
  const questionTextEl = document.getElementById('questionText');
  const micDot         = document.getElementById('micDot');
  const voiceStatusEl  = document.getElementById('voiceStatusText');
  const retryBtn       = document.getElementById('retryBtn');
  const ratingBtns     = document.querySelectorAll('.rating-btn');

  function setStatus(state, text) {
    micDot.className = 'mic-dot' + (state ? ` ${state}` : '');
    voiceStatusEl.textContent = text;
  }

  async function recordAnswer(val) {
    if (awaitingVoice) return;
    const q = QUESTIONS[currentIndex];
    answers[q.id] = val;

    ratingBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) === val));

    setStatus('speaking', `Got it — ${val}.`);
    await Voice.speak(`Got it, ${val}.`);

    currentIndex++;
    if (currentIndex < QUESTIONS.length) {
      await askQuestion();
    } else {
      await finish();
    }
  }

  ratingBtns.forEach(btn => {
    btn.addEventListener('click', () => recordAnswer(parseInt(btn.dataset.val)));
  });

  retryBtn.addEventListener('click', async () => {
    retryBtn.style.display = 'none';
    await askQuestion(true);
  });

  async function askQuestion(repeatOnly = false) {
    const q = QUESTIONS[currentIndex];
    ratingBtns.forEach(b => b.classList.remove('active'));
    retryBtn.style.display = 'none';

    counterEl.textContent = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
    progressFill.style.width = `${(currentIndex / QUESTIONS.length) * 100}%`;
    questionTextEl.textContent = q.text;

    setStatus('speaking', 'Speaking…');
    await Voice.speak(q.text);
    await Voice.speak('Say 1, 2, 3, or 4.');

    setStatus('listening', 'Listening… say 1, 2, 3, or 4.');
    awaitingVoice = true;

    let attempts = 0;
    let answer = null;

    while (attempts < 3 && answer === null) {
      answer = await Voice.listen(8000);
      if (answer === null) {
        attempts++;
        if (attempts < 3) {
          setStatus('speaking', 'Please try again…');
          await Voice.speak("I didn't catch that. Please say 1, 2, 3, or 4.");
          setStatus('listening', 'Listening…');
        }
      }
    }

    awaitingVoice = false;

    if (answer !== null) {
      retryBtn.style.display = 'none';
      await recordAnswer(answer);
    } else {
      setStatus('', 'Voice not detected — tap a button or say the number again.');
      retryBtn.style.display = 'block';
    }
  }

  async function finish() {
    setStatus('speaking', 'Assessment complete!');
    progressFill.style.width = '100%';
    counterEl.textContent = 'Complete!';
    questionTextEl.textContent = 'Great job! Calculating your results…';
    ratingBtns.forEach(b => { b.disabled = true; });
    retryBtn.style.display = 'none';

    await Voice.speak('Excellent! You have completed all 24 questions. Preparing your results now.');

    sessionStorage.setItem('disc_answers', JSON.stringify(answers));
    window.location.href = 'results.html';
  }

  // Welcome and start
  setStatus('speaking', 'Speaking welcome message…');
  await Voice.speak(
    `Welcome, ${name}. You will hear 24 statements about yourself. ` +
    `After each one, say a number from 1 to 4. ` +
    `One means — Not at all like me. ` +
    `Two means — Somewhat like me. ` +
    `Three means — Mostly like me. ` +
    `Four means — Very much like me. ` +
    `You can also tap the buttons on screen at any time. Let\'s begin.`
  );

  await askQuestion();
})();
