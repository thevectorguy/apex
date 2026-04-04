export function buildPreviousVisitSummary(reportJson) {
  if (!reportJson || typeof reportJson !== 'object') return null;

  const strengths = ensureStringArray(reportJson.strengths).slice(0, 2).join('; ');
  const improvements = ensureStringArray(reportJson.improvements).slice(0, 2).join('; ');
  const nextVisitPreparation = ensureStringArray(reportJson.nextVisitPreparation).slice(0, 3).join('; ');
  const missedQuestions = Array.isArray(reportJson.questionCoverage)
    ? reportJson.questionCoverage
        .filter((item) => String(item?.status || '').toUpperCase() === 'MISSED')
        .slice(0, 5)
        .map((item) => item?.id)
        .filter(Boolean)
        .join(', ')
    : '';

  return `
Overall score: ${Number(reportJson.overallScore ?? 0)} (${String(reportJson.grade || 'Unrated')})
Key strengths: ${strengths || 'None recorded'}
Key gaps: ${improvements || 'None recorded'}
Next visit actions committed: ${nextVisitPreparation || 'None recorded'}
Open questions from last visit: ${missedQuestions || 'None recorded'}
`.trim();
}

function ensureStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}
