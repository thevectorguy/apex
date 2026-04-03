import crypto from 'node:crypto';
import { nowIso } from './db.js';
import { generateGroqAnalysis } from './groq.js';
import { trainingMasterCopy } from './masterCopy.js';

export function buildDeterministicAnalysis({ customer, session, transcriptTurns, audioAssets }) {
  const transcriptText = transcriptTurns.map((turn) => turn.text).join(' ');
  const lower = transcriptText.toLowerCase();
  const speed = scoreSpeedStages(lower, transcriptTurns);
  const questionCoverage = buildQuestionCoverage(lower, transcriptTurns);
  const objections = detectObjections(lower, transcriptTurns);
  const profile = inferCustomerProfile(lower);
  const productFit = assessProductFit(lower, profile, customer, session, transcriptTurns);
  const strengths = buildStrengths(speed, questionCoverage, objections, transcriptTurns);
  const improvements = buildImprovements(speed, questionCoverage, objections, productFit);
  const nextVisitPreparation = buildNextVisitActions(questionCoverage, objections, productFit);
  const researchTasks = buildResearchTasks(profile, improvements, productFit);
  const overallScore = calculateOverallScore(speed, questionCoverage, objections, productFit);
  const grade = gradeForScore(overallScore);

  return {
    id: crypto.randomUUID(),
    source: 'deterministic',
    generatedAt: nowIso(),
    overallScore,
    grade,
    customerProfile: profile,
    speed,
    questionCoverage,
    objections,
    productFit,
    strengths,
    improvements,
    nextVisitPreparation,
    researchTasks,
    transcriptSummary: transcriptText.slice(0, 1200),
    transcriptTurns,
    audioAssets: audioAssets.map((asset) => ({
      id: asset.id,
      filename: asset.filename,
      source: asset.source,
      transcriptText: asset.transcriptText || '',
    })),
  };
}

export async function buildReport({ customer, session, transcriptTurns, audioAssets, masterCopy = trainingMasterCopy }) {
  const deterministic = buildDeterministicAnalysis({ customer, session, transcriptTurns, audioAssets });
  const prompt = buildGroqPrompt({ customer, session, transcriptTurns, analysis: deterministic, masterCopy });
  const schema = {
    name: 'my_coach_report',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        overallScore: { type: 'integer' },
        grade: { type: 'string' },
        summary: { type: 'string' },
        reportHighlights: { type: 'array', items: { type: 'string' } },
        coachNotes: { type: 'array', items: { type: 'string' } },
        nextVisitPreparation: { type: 'array', items: { type: 'string' } },
        researchTasks: { type: 'array', items: { type: 'string' } },
      },
      required: ['overallScore', 'grade', 'summary', 'reportHighlights', 'coachNotes', 'nextVisitPreparation', 'researchTasks'],
    },
  };

  const groqReport = await generateGroqAnalysis({ prompt, schema });
  if (!groqReport) return deterministic;

  return {
    ...deterministic,
    source: 'groq+deterministic',
    overallScore: clampInt(groqReport.overallScore ?? deterministic.overallScore),
    grade: String(groqReport.grade || deterministic.grade),
    summary: String(groqReport.summary || ''),
    reportHighlights: ensureStringArray(groqReport.reportHighlights),
    coachNotes: ensureStringArray(groqReport.coachNotes),
    nextVisitPreparation: ensureStringArray(groqReport.nextVisitPreparation, deterministic.nextVisitPreparation),
    researchTasks: ensureStringArray(groqReport.researchTasks, deterministic.researchTasks),
    groqReport,
  };
}

function scoreSpeedStages(lower, transcriptTurns) {
  const stages = trainingMasterCopy.speedFramework || [];
  return stages.reduce((acc, stage) => {
    const turnSignals = transcriptTurns.filter((turn) => stage.keywords?.some((keyword) => turn.text.toLowerCase().includes(keyword.toLowerCase())));
    const hitCount = stage.keywords?.reduce((count, keyword) => count + (lower.includes(keyword.toLowerCase()) ? 1 : 0), 0) || 0;
    const base = (stage.weight || 0) * 0.3;
    const bonus = Math.min((stage.weight || 0) * 0.7, hitCount * ((stage.weight || 0) * 0.12) + turnSignals.length * 2);
    acc[stage.id] = {
      id: stage.id,
      label: stage.label,
      weight: stage.weight,
      score: clampInt(base + bonus),
      evidence: turnSignals.slice(0, 3).map((turn) => turn.text),
      rationale: stage.purpose,
    };
    return acc;
  }, {});
}

function buildQuestionCoverage(lower, transcriptTurns) {
  return (trainingMasterCopy.fundamentalQuestions || []).map((question) => {
    const evidenceTurns = transcriptTurns.filter((turn) => question.keywords?.some((keyword) => turn.text.toLowerCase().includes(keyword.toLowerCase())));
    const mentioned = question.keywords?.some((keyword) => lower.includes(keyword.toLowerCase())) || false;
    return {
      id: question.id,
      section: question.section,
      question: question.question,
      whyItMatters: question.why,
      status: mentioned ? (evidenceTurns.length > 1 ? 'covered' : 'partial') : 'missing',
      evidence: evidenceTurns.slice(0, 2).map((turn) => turn.text),
    };
  });
}

function detectObjections(lower, transcriptTurns) {
  return (trainingMasterCopy.objectionLibrary || []).flatMap((objection) => {
    const matchedTurns = transcriptTurns.filter((turn) => objection.keywords?.some((keyword) => turn.text.toLowerCase().includes(keyword.toLowerCase())));
    if (!matchedTurns.length) return [];
    const resolutionSignals = ['understand', 'fair point', 'let me show', 'here is', 'what if', 'does that address', 'compare'];
    const handled = resolutionSignals.some((signal) => lower.includes(signal));
    return [{
      id: objection.id,
      label: objection.label,
      strategy: objection.strategy,
      evidence: matchedTurns.slice(0, 2).map((turn) => turn.text),
      handled: handled ? 'likely' : 'unclear',
    }];
  });
}

function inferCustomerProfile(lower) {
  const profiles = trainingMasterCopy.customerProfiles || [];
  const ranked = profiles.map((profile) => ({
    ...profile,
    score: profile.signals?.reduce((count, signal) => count + (lower.includes(signal.toLowerCase()) ? 1 : 0), 0) || 0,
  })).sort((a, b) => b.score - a.score);

  const selected = ranked[0] || {
    id: 'unknown',
    label: 'Unknown',
    idealRecommendation: [],
    avoid: [],
    score: 0,
  };

  return {
    id: selected.id,
    label: selected.label,
    confidence: selected.score,
    idealRecommendation: selected.idealRecommendation || [],
    avoid: selected.avoid || [],
  };
}

function assessProductFit(lower, profile, customer, session, transcriptTurns) {
  const catalog = trainingMasterCopy.productCatalog || [];
  const mentionedModels = catalog.map((car) => car.model).filter((model) => lower.includes(model.toLowerCase()));
  const recommendedModel = mentionedModels[0] || profile.idealRecommendation[0] || 'Unspecified';
  const idealSet = new Set((profile.idealRecommendation || []).map((item) => item.toLowerCase()));
  const matched = idealSet.has(recommendedModel.toLowerCase()) || [...idealSet].some((item) => recommendedModel.toLowerCase().includes(item));
  return {
    verdict: matched ? 'pass' : 'needs_review',
    recommendedModel,
    idealRecommendation: profile.idealRecommendation || [],
    why: matched
      ? `The recommendation aligns with the ${profile.label} pattern in the current training master copy.`
      : `The recommendation does not clearly match the ${profile.label} pattern in the current training master copy.`,
    evidence: transcriptTurns.filter((turn) => recommendedModel && turn.text.toLowerCase().includes(recommendedModel.toLowerCase())).slice(0, 3).map((turn) => turn.text),
    customerContext: { customerId: customer.id, sessionId: session.id },
  };
}

function buildStrengths(speed, questionCoverage, objections, transcriptTurns) {
  const strengths = [];
  const bestStage = Object.values(speed).sort((a, b) => b.score - a.score)[0];
  if (bestStage && bestStage.score >= Math.max(8, bestStage.weight * 0.6)) strengths.push(`Strong execution in ${bestStage.label}.`);
  const covered = questionCoverage.filter((item) => item.status === 'covered').slice(0, 3);
  if (covered.length) strengths.push(`Good discovery coverage on ${covered.map((q) => q.id).join(', ')}.`);
  if (objections.length) strengths.push(`The conversation surfaced ${objections.length} objection signal(s).`);
  if (!strengths.length && transcriptTurns.length) strengths.push('Conversation captured enough detail to generate a review.');
  return strengths;
}

function buildImprovements(speed, questionCoverage, objections, productFit) {
  const items = [];
  const weakStages = Object.values(speed).filter((stage) => stage.score < Math.max(5, stage.weight * 0.55)).map((stage) => stage.label);
  if (weakStages.length) items.push(`Tighten SPEED stages: ${weakStages.join(', ')}.`);
  const missingQuestions = questionCoverage.filter((item) => item.status === 'missing').slice(0, 5);
  if (missingQuestions.length) items.push(`Close discovery gaps on ${missingQuestions.map((q) => q.id).join(', ')}.`);
  if (objections.some((item) => item.handled === 'unclear')) items.push('Use clearer acknowledge-clarify-evidence handling when objections appear.');
  if (productFit.verdict !== 'pass') items.push('Re-check product recommendation against the current training master copy.');
  if (!items.length) items.push('Keep the same flow but add more specific proof and a sharper close.');
  return items;
}

function buildNextVisitActions(questionCoverage, objections, productFit) {
  const actions = [];
  const missing = questionCoverage.filter((item) => item.status === 'missing').slice(0, 4);
  if (missing.length) actions.push(`Ask the missing questions next time: ${missing.map((item) => item.id).join(', ')}.`);
  if (objections.length) actions.push(`Revisit the objection(s): ${objections.map((item) => item.label).join(', ')}.`);
  if (productFit.verdict !== 'pass') actions.push(`Confirm whether ${productFit.recommendedModel} is really the right recommendation for this customer.`);
  if (!actions.length) actions.push('Continue the same conversational momentum and move to closure sooner.');
  return actions;
}

function buildResearchTasks(profile, improvements, productFit) {
  const tasks = new Set((trainingMasterCopy.researchTaskLibrary || []).slice(0, 4));
  if (profile.label) tasks.add(`Review the playbook for ${profile.label} buyers.`);
  if (productFit.verdict !== 'pass') tasks.add('Re-read the product matching decision tree and the ideal recommendation set.');
  if (improvements.length) tasks.add('Practice asking deeper follow-up questions and summarising the customer’s needs.');
  return [...tasks].slice(0, 6);
}

function calculateOverallScore(speed, questionCoverage, objections, productFit) {
  const stageTotal = Object.values(speed).reduce((sum, stage) => sum + stage.score, 0);
  const questionScore = Math.round((questionCoverage.filter((item) => item.status !== 'missing').length / Math.max(1, questionCoverage.length)) * 100);
  const objectionScore = objections.length ? Math.max(40, 100 - objections.length * 12) : 100;
  const fitScore = productFit.verdict === 'pass' ? 100 : 62;
  return clampInt(Math.round((stageTotal / 100) * 0.4 + questionScore * 0.3 + objectionScore * 0.15 + fitScore * 0.15));
}

function gradeForScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function ensureStringArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return fallback;
}

function clampInt(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function buildGroqPrompt({ customer, session, transcriptTurns, analysis, masterCopy }) {
  return JSON.stringify({
    instructions: {
      role: 'My Coach report writer',
      language: 'English',
      sourceOfTruth: masterCopy.version,
      requirement: 'Use the training master copy only and return concise coaching output.',
    },
    customer,
    session,
    transcriptTurns,
    analysis,
  });
}
