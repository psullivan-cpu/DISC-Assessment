(async () => {
  const name       = sessionStorage.getItem('disc_name');
  const email      = sessionStorage.getItem('disc_email');
  const rawAnswers = sessionStorage.getItem('disc_answers');

  if (!name || !email || !rawAnswers) { window.location.href = 'index.html'; return; }

  const answers = JSON.parse(rawAnswers);
  const micDot       = document.getElementById('micDot');
  const voiceStatusEl= document.getElementById('voiceStatusText');
  const scoreBarsEl  = document.getElementById('scoreBars');
  const profileEl    = document.getElementById('profileSection');
  const errorNoteEl  = document.getElementById('errorNote');
  const actionBtns   = document.getElementById('actionBtns');
  const downloadBtn  = document.getElementById('downloadBtn');

  function setStatus(state, text) {
    micDot.className = 'mic-dot' + (state ? ` ${state}` : '');
    voiceStatusEl.textContent = text;
  }

  // Score the assessment
  setStatus('speaking', 'Calculating your results…');
  let result;
  try {
    const res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, answers }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Server error');
    result = data.result;
  } catch (err) {
    errorNoteEl.textContent = `Could not calculate results: ${err.message}`;
    errorNoteEl.style.display = 'block';
    setStatus('', 'Something went wrong — please try again.');
    return;
  }

  // Build score bars
  const COLORS = { D: '#E74C3C', I: '#F39C12', S: '#27AE60', C: '#2980B9' };
  const LABELS = { D: 'D — Dominance', I: 'I — Influence', S: 'S — Steadiness', C: 'C — Conscientiousness' };
  const MAX = 24;

  scoreBarsEl.innerHTML = Object.entries(result.totals).map(([dim, score]) => `
    <div class="score-row">
      <div class="score-label">${LABELS[dim]}</div>
      <div class="score-bar-wrap">
        <div class="score-bar-fill" style="width:0%;background:${COLORS[dim]}"
          data-pct="${(score / MAX * 100).toFixed(1)}"></div>
      </div>
      <div class="score-num">${score} / ${MAX}</div>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-bar-fill').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    });
  });

  // Build profile section
  const p = result.primary;
  let html = `
    <div class="profile-card" style="border-color:${p.color}">
      <h3 style="color:${p.color}">Primary Style: ${result.primaryKey} — ${p.name}</h3>
      <p>${p.description}</p>
      <div class="strengths">${p.strengths.map(s => `<span class="tag">${s}</span>`).join('')}</div>
      <div class="tip-box">${p.tip}</div>
    </div>
  `;

  if (result.isBlended) {
    const s = result.secondary;
    html += `
      <div class="profile-card" style="border-color:${s.color}">
        <h3 style="color:${s.color}">Secondary Style: ${result.secondaryKey} — ${s.name}</h3>
        <p>Your profile shows a blended ${result.primaryKey}/${result.secondaryKey} style — you draw strengths from both dimensions.</p>
        <p>${s.description}</p>
      </div>
    `;
  }

  profileEl.innerHTML = html;

  document.getElementById('resultsHeading').textContent = `${name}'s DISC Results`;
  document.getElementById('resultsSubtitle').textContent =
    `Primary style: ${p.name}${result.isBlended ? ' / ' + result.secondary.name : ''}`;

  actionBtns.style.display = 'block';

  // PDF download handler
  downloadBtn.addEventListener('click', async () => {
    downloadBtn.textContent = 'Generating PDF…';
    downloadBtn.disabled = true;
    try {
      const res = await fetch('/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, answers }),
      });
      if (!res.ok) throw new Error('Server error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DISC-Report-${name.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      errorNoteEl.textContent = `PDF download failed: ${err.message}`;
      errorNoteEl.style.display = 'block';
    } finally {
      downloadBtn.textContent = 'Download PDF Report';
      downloadBtn.disabled = false;
    }
  });

  // Verbal overview summary
  setStatus('speaking', 'Reading your results aloud…');

  const scoreLines = Object.entries(result.totals)
    .sort((a, b) => b[1] - a[1])
    .map(([dim, val]) => `${LABELS[dim].replace(' — ', ': ')} scored ${val} out of 24`)
    .join('. ');

  const summaryText =
    `${name}, here is your DISC assessment overview. ` +
    `Your four dimension scores are: ${scoreLines}. ` +
    `Your primary DISC style is ${result.primaryKey} — ${p.name}. ` +
    `${p.description} ` +
    (result.isBlended
      ? `You also show a strong secondary style of ${result.secondaryKey} — ${result.secondary.name}. ${result.secondary.description} `
      : '') +
    `Your key strengths include: ${p.strengths.join(', ')}. ` +
    `One area to watch: ${p.blindspot} ` +
    `A development tip for you: ${p.tip} ` +
    `Use the Download PDF button to save your full report. Well done, ${name}!`;

  await Voice.speak(summaryText);
  setStatus('', 'Results delivered.');
})();
