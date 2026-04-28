const profiles = {
  D: {
    name: 'Dominance',
    color: '#E74C3C',
    description: 'You are a results-driven, direct, and decisive individual. You thrive when given authority and respond best to challenges that test your limits. Others see you as confident and determined.',
    strengths: ['Bold decision-making', 'Goal-oriented drive', 'Direct communication', 'Problem-solving under pressure'],
    blindspot: 'You may sometimes overlook others\' emotional needs or move too fast for your team.',
    tip: 'Slow down occasionally to invite input from others — their perspective can sharpen your decisions.',
  },
  I: {
    name: 'Influence',
    color: '#F39C12',
    description: 'You are enthusiastic, optimistic, and people-focused. You excel at building relationships, inspiring others, and creating energy in a room. People are naturally drawn to your warmth.',
    strengths: ['Building relationships', 'Motivating and inspiring others', 'Creative brainstorming', 'Adaptability'],
    blindspot: 'You may struggle with follow-through on details or become distracted by new ideas.',
    tip: 'Pair your enthusiasm with written plans or a detail-oriented partner to ensure ideas land.',
  },
  S: {
    name: 'Steadiness',
    color: '#27AE60',
    description: 'You are patient, dependable, and a natural team supporter. You value harmony, consistency, and deep relationships. Others trust you to follow through and to listen without judgment.',
    strengths: ['Reliability and follow-through', 'Active listening', 'Team cohesion', 'Calm under pressure'],
    blindspot: 'You may resist change or avoid difficult conversations longer than needed.',
    tip: 'Practice voicing your own needs directly — your perspective is more valuable than you realize.',
  },
  C: {
    name: 'Conscientiousness',
    color: '#2980B9',
    description: 'You are analytical, precise, and committed to quality. You ask the right questions, verify facts, and raise the standard of everything you touch. Others respect your thoroughness.',
    strengths: ['Attention to detail', 'Critical thinking', 'High standards', 'Systematic planning'],
    blindspot: 'You may over-analyze or delay decisions while seeking perfect information.',
    tip: 'Set a decision deadline for yourself — done well enough today often beats perfect next month.',
  },
};

function score(answers) {
  const totals = { D: 0, I: 0, S: 0, C: 0 };
  const questions = require('./questions');

  questions.forEach(q => {
    totals[q.dimension] += answers[q.id] || 0;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const [primaryKey, primaryScore] = sorted[0];
  const [secondaryKey, secondaryScore] = sorted[1];

  const isBlended = primaryScore - secondaryScore <= 3;

  return {
    totals,
    primaryKey,
    secondaryKey,
    isBlended,
    primary: profiles[primaryKey],
    secondary: profiles[secondaryKey],
    profiles,
  };
}

module.exports = { score, profiles };
