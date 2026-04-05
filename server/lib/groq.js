import fs from 'node:fs';
import './networkTls.js';
import { MASTER_COPY_HASH, MASTER_COPY_PROMPT, MASTER_COPY_VERSION, trainingMasterCopy } from './masterCopy.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const SPEED_STAGE_DEFINITIONS = trainingMasterCopy.speedFramework.map((stage) => {
  const basicAliases = [
    stage.id,
    stage.id.replace(/_/g, ' '),
    stage.id.replace(/_/g, ''),
    stage.label.toLowerCase(),
  ];
  return {
    key: stage.id,
    label: stage.label,
    aliases: Array.from(new Set([...basicAliases, ...(stage.keywords || [])])),
  };
});
const QUESTION_LOOKUP = new Map(trainingMasterCopy.fundamentalQuestions.map((question) => [question.id, question.question]));
const GRADE_BANDS = [...trainingMasterCopy.reportTemplate.gradeBands].sort((left, right) => right.min - left.min);
const MY_COACH_TRANSCRIPTION_PROMPT =
  'Car showroom sales conversation in India. Mix of English and Hindi or regional language. Maruti Suzuki showroom. ex-showroom price, on-road price, EMI, down payment, exchange bonus, booking amount, registration, insurance, accessories, test drive, finance, loan, variant, mileage, sunroof, automatic, manual, petrol, diesel, CNG, hybrid, Baleno, Brezza, Fronx, Ertiga, Swift, Dzire, WagonR, Alto, Celerio, Ignis, Grand Vitara, Jimny, Invicto, S-Presso, XL6, competitor brands may include Hyundai, Tata, Kia, Mahindra, Honda, Toyota';

function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

function getTranscribeModel() {
  return process.env.GROQ_TRANSCRIPTION_MODEL || process.env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo';
}

function getAnalysisModel() {
  return process.env.GROQ_MODEL || process.env.GROQ_ANALYSIS_MODEL || 'llama-3.3-70b-versatile';
}

async function groqFetch(path, init = {}) {
  if (!hasGroqKey()) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(`${GROQ_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text}`);
  }

  return response;
}

export async function transcribeAudioFile({ fileBuffer, fileName = 'audio.webm', mimeType, language = null }) {
  const transcribeModel = getTranscribeModel();
  const form = new FormData();
  form.append('model', transcribeModel);

  const langCode = typeof language === 'string' ? language.toLowerCase().trim() : null;
  const whisperLangCode = langCode ? ({
    english: 'en', en: 'en',
    hindi: 'hi', hi: 'hi',
    marathi: 'mr', mr: 'mr',
    gujarati: 'gu', gu: 'gu',
    tamil: 'ta', ta: 'ta',
    telugu: 'te', te: 'te',
    kannada: 'kn', kn: 'kn',
    malayalam: 'ml', ml: 'ml',
    bengali: 'bn', bn: 'bn',
    punjabi: 'pa', pa: 'pa',
    odia: 'or', or: 'or',
    assamese: 'as', as: 'as',
    urdu: 'ur', ur: 'ur'
  }[langCode] || null) : null;

  if (whisperLangCode) {
    form.append('language', whisperLangCode);
  }

  let promptStr = MY_COACH_TRANSCRIPTION_PROMPT;
  if (language && language.trim().length > 0) {
    promptStr = `Car showroom sales conversation in India. The conversation is primarily in ${language} and English. ` +
      promptStr.replace(/^Car showroom sales conversation in India\. Mix of English and Hindi or regional language\. /, '');
  }

  form.append('prompt', promptStr);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  form.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);

  const response = await groqFetch('/audio/transcriptions', {
    method: 'POST',
    body: form,
  });

  const payload = await response.json();
  const segments = Array.isArray(payload.segments)
    ? payload.segments.map((segment, index) => ({
        id: `seg_${index + 1}`,
        start: segment.start ?? null,
        end: segment.end ?? null,
        text: String(segment.text || '').trim(),
        confidence: normalizeSegmentConfidence(segment),
      }))
    : [];

  return {
    text: String(payload.text || '').trim(),
    segments,
    provider: 'groq',
    model: transcribeModel,
    raw: payload,
  };
}

function normalizeSegmentConfidence(segment) {
  const averageLogProb = Number(segment?.avg_logprob);
  if (!Number.isFinite(averageLogProb)) return null;
  return Math.min(1, Math.max(0, Number(Math.exp(averageLogProb).toFixed(3))));
}

const COACHING_REPORT_SCHEMA = {
  name: 'my_coach_report',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      overallScore: { type: 'integer' },
      grade: { type: 'string' },
      summary: { type: 'string' },
      generatedAt: { type: 'string' },
      masterCopyVersion: { type: 'string' },
      customerProfile: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          confidence: { type: 'integer' },
          keyNeeds: { type: 'array', items: { type: 'string' } },
          keyConstraints: { type: 'array', items: { type: 'string' } },
        },
        required: ['label', 'confidence', 'keyNeeds', 'keyConstraints'],
      },
      speed: {
        type: 'object',
        additionalProperties: false,
        properties: SPEED_STAGE_DEFINITIONS.reduce((acc, stage) => {
          acc[stage.key] = speedStageSchema(stage.label);
          return acc;
        }, {}),
        required: SPEED_STAGE_DEFINITIONS.map(stage => stage.key),
      },
      questionCoverage: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            question: { type: 'string' },
            status: { type: 'string' },
            evidence: { type: ['string', 'null'] },
          },
          required: ['id', 'question', 'status', 'evidence'],
        },
      },
      objections: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            label: { type: 'string' },
            category: { type: 'string' },
            handled: { type: 'string' },
            how: { type: ['string', 'null'] },
            advice: { type: ['string', 'null'] },
            strategy: { type: ['string', 'null'] },
            evidence: { type: 'array', items: { type: 'string' } },
          },
          required: ['label', 'category', 'handled', 'how', 'advice', 'strategy', 'evidence'],
        },
      },
      productFit: {
        type: 'object',
        additionalProperties: false,
        properties: {
          verdict: { type: 'string' },
          pitchedModels: { type: 'array', items: { type: 'string' } },
          salesmanPick: { type: ['string', 'null'] },
          customerPreferred: { type: ['string', 'null'] },
          idealMatch: { type: ['string', 'null'] },
          avoidModels: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                model: { type: 'string' },
                rationale: { type: 'string' },
                evidence: { type: 'array', items: { type: 'string' } },
              },
              required: ['model', 'rationale', 'evidence'],
            },
          },
          why: { type: 'string' },
          recommendedModel: { type: ['string', 'null'] },
          betterAlternative: { type: ['string', 'null'] },
        },
        required: [
          'verdict',
          'pitchedModels',
          'salesmanPick',
          'customerPreferred',
          'idealMatch',
          'avoidModels',
          'why',
          'recommendedModel',
          'betterAlternative',
        ],
      },
      strengths: { type: 'array', items: { type: 'string' } },
      improvements: { type: 'array', items: { type: 'string' } },
      coachAdvice: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
            priority: { type: 'string' },
          },
          required: ['title', 'detail', 'priority'],
        },
      },
      nextVisitOpener: { type: 'string' },
      nextVisitPreparation: { type: 'array', items: { type: 'string' } },
      researchTasks: { type: 'array', items: { type: 'string' } },
      reportHighlights: { type: 'array', items: { type: 'string' } },
      coachNotes: { type: 'array', items: { type: 'string' } },
      transcriptTurns: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            speaker: { type: 'string' },
            text: { type: 'string' },
            start: { type: ['number', 'null'] },
            end: { type: ['number', 'null'] },
          },
          required: ['id', 'speaker', 'text', 'start', 'end'],
        },
      },
      customerSentiment: {
        type: 'object',
        additionalProperties: false,
        properties: {
          start: { type: 'string' },
          end: { type: 'string' },
          shift: { type: 'string' },
        },
        required: ['start', 'end', 'shift'],
      },
      turningPoints: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            detail: { type: 'string' },
            timestamp: { type: ['string', 'null'] },
          },
          required: ['title', 'detail', 'timestamp'],
        },
      },
      followUpMessage: { type: 'string' },
      drivingIndex: {
        type: 'object',
        additionalProperties: false,
        properties: {
          primaryDriver: { type: 'string' },
          insight: { type: 'string' },
        },
        required: ['primaryDriver', 'insight'],
      },
      comparisonToPrevious: { type: ['string', 'null'] },
      warnings: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'overallScore',
      'grade',
      'summary',
      'generatedAt',
      'masterCopyVersion',
      'customerProfile',
      'speed',
      'questionCoverage',
      'objections',
      'productFit',
      'strengths',
      'improvements',
      'coachAdvice',
      'nextVisitOpener',
      'nextVisitPreparation',
      'researchTasks',
      'reportHighlights',
      'coachNotes',
      'transcriptTurns',
      'customerSentiment',
      'turningPoints',
      'followUpMessage',
      'drivingIndex',
      'comparisonToPrevious',
      'warnings',
    ],
  },
};

export async function generateCoachingReport({
  transcriptText,
  transcriptTurns = [],
  customerName,
  visitNumber,
  sessionDate,
  previousVisitSummary = null,
}) {
  if (!hasGroqKey()) throw new Error('GROQ_API_KEY is not set');

  const userMessage = `
CUSTOMER NAME: ${customerName || 'Unknown Customer'}
VISIT NUMBER: ${visitNumber ?? 1}
SESSION DATE: ${sessionDate || new Date().toISOString()}
${previousVisitSummary ? `PREVIOUS VISIT SUMMARY:\n${previousVisitSummary}\n` : ''}

TRANSCRIPT:
${transcriptText}

Generate the full coaching report JSON now.
masterCopyVersion must be "${MASTER_COPY_VERSION}".
If there is no clear product recommendation in the transcript, mark verdict as NOT_MADE.
  `.trim();

  const analysisModel = getAnalysisModel();
  const response = await groqFetch('/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: analysisModel,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: MASTER_COPY_PROMPT }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userMessage }],
        },
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
    }),
  });

  const payload = await response.json();
  const rawReport = extractResponseJson(payload);
  if (!rawReport) throw new Error('Groq returned empty or invalid JSON response');

  const report = normalizeCoachingReport(rawReport, {
    transcriptText,
    transcriptTurns,
    sessionDate,
  });
  validateCoachingReportShape(report);

  return {
    ...report,
    masterCopyVersion: MASTER_COPY_VERSION,
    masterCopyHash: MASTER_COPY_HASH,
  };
}

export function extractResponseJson(payload) {
  if (!payload) return null;

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return safeParse(payload.output_text);
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === 'string' && part.text.trim()) {
        const parsed = safeParse(part.text);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function speedStageSchema(label) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      label: { type: 'string' },
      score: { type: 'integer' },
      rationale: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string' } },
    },
    required: ['label', 'score', 'rationale', 'evidence'],
  };
}

function validateCoachingReportShape(report) {
  if (!report || typeof report !== 'object') {
    throw new Error('Groq returned a non-object coaching report');
  }

  for (const key of COACHING_REPORT_SCHEMA.schema.required) {
    if (!(key in report)) {
      throw new Error(`Groq response is missing required field "${key}"`);
    }
  }

  if (!Number.isFinite(report.overallScore)) {
    throw new Error('Groq response overallScore is not a valid number after normalization');
  }

  if (!report.grade || typeof report.grade !== 'string') {
    throw new Error('Groq response grade is not a valid string after normalization');
  }

  if (!report.summary || typeof report.summary !== 'string') {
    throw new Error('Groq response summary is not a valid string after normalization');
  }

  if (!report.generatedAt || Number.isNaN(Date.parse(report.generatedAt))) {
    throw new Error('Groq response generatedAt is not a valid ISO date after normalization');
  }

  for (const stage of SPEED_STAGE_DEFINITIONS) {
    const value = report.speed?.[stage.key];
    if (!value || typeof value !== 'object') {
      throw new Error(`Groq response speed.${stage.key} is missing after normalization`);
    }
    if (!Number.isFinite(value.score)) {
      throw new Error(`Groq response speed.${stage.key}.score is invalid after normalization`);
    }
    if (typeof value.label !== 'string' || typeof value.rationale !== 'string' || !Array.isArray(value.evidence)) {
      throw new Error(`Groq response speed.${stage.key} is malformed after normalization`);
    }
  }

  if (!Array.isArray(report.transcriptTurns)) {
    throw new Error('Groq response transcriptTurns is not an array after normalization');
  }

  if (!Array.isArray(report.coachAdvice)) {
    throw new Error('Groq response coachAdvice is not an array after normalization');
  }

  if (!Array.isArray(report.productFit?.pitchedModels)) {
    throw new Error('Groq response productFit.pitchedModels is not an array after normalization');
  }

  if (!report.customerSentiment || typeof report.customerSentiment !== 'object') {
    throw new Error('Groq response customerSentiment is invalid after normalization');
  }

  if (!Array.isArray(report.turningPoints)) {
    throw new Error('Groq response turningPoints is not an array after normalization');
  }

  if (!report.drivingIndex || typeof report.drivingIndex !== 'object') {
    throw new Error('Groq response drivingIndex is invalid after normalization');
  }
}

function normalizeCoachingReport(report, context) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Groq returned a non-object coaching report');
  }

  const warnings = new Set(coerceStringArray(report.warnings ?? report.warning ?? report.alerts ?? report.limitations));
  const fallbackTranscriptTurns = normalizeTranscriptTurns(context.transcriptTurns, {
    transcriptText: context.transcriptText,
    fallbackTurns: [],
    warnings,
  });
  const normalizedSpeed = normalizeSpeed(report.speed ?? report.speedBreakdown ?? report.speedStages ?? report.speed_scores);
  const normalizedQuestionCoverage = normalizeQuestionCoverage(
    report.questionCoverage ?? report.questionCoverageSummary ?? report.coverage,
  );
  const normalizedTranscriptTurns = normalizeTranscriptTurns(
    report.transcriptTurns ?? report.transcript ?? report.turns ?? report.transcriptHighlights,
    {
      transcriptText: context.transcriptText,
      fallbackTurns: fallbackTranscriptTurns,
      warnings,
    },
  );
  const reportHighlights = coerceStringArray(report.reportHighlights ?? report.highlights ?? report.keyTakeaways);

  const normalized = {
    overallScore: normalizeOverallScore(report.overallScore ?? report.score ?? report.totalScore, normalizedSpeed),
    grade: normalizeGrade(report.grade, report.overallScore ?? report.score ?? report.totalScore, normalizedSpeed),
    summary: normalizeSummary(report.summary ?? report.overview ?? report.executiveSummary, reportHighlights),
    generatedAt: normalizeIsoTimestamp(report.generatedAt ?? report.createdAt ?? report.generated_at),
    masterCopyVersion: MASTER_COPY_VERSION,
    customerProfile: normalizeCustomerProfile(report.customerProfile ?? report.customer_segment ?? report.customerType),
    speed: normalizedSpeed,
    questionCoverage: normalizedQuestionCoverage,
    objections: normalizeObjections(report.objections ?? report.objectionHandling ?? report.objectionReviews),
    productFit: normalizeProductFit(report.productFit ?? report.productRecommendation ?? report.recommendation),
    strengths: coerceStringArray(report.strengths ?? report.wins ?? report.positives),
    improvements: coerceStringArray(report.improvements ?? report.gaps ?? report.opportunities),
    coachAdvice: normalizeCoachAdvice(report.coachAdvice ?? report.coachingAdvice ?? report.advice),
    nextVisitOpener: normalizeNextVisitOpener(
      report.nextVisitOpener ?? report.openingScript ?? report.nextVisit?.openingScript ?? report.nextVisit?.opener,
    ),
    nextVisitPreparation: coerceStringArray(
      report.nextVisitPreparation ??
        report.nextVisitPrep ??
        report.nextVisit?.preparation ??
        report.nextVisit?.prepChecklist ??
        report.nextSteps,
    ),
    researchTasks: coerceStringArray(report.researchTasks ?? report.homework ?? report.followUpResearch),
    reportHighlights,
    coachNotes: coerceStringArray(report.coachNotes ?? report.notes ?? report.coachingNotes),
    transcriptTurns: normalizedTranscriptTurns,
    customerSentiment: normalizeCustomerSentiment(
      report.customerSentiment ?? report.sentiment ?? report.customerMood ?? report.sentimentJourney,
    ),
    turningPoints: normalizeTurningPoints(report.turningPoints ?? report.keyTurningPoints ?? report.pivotalMoments),
    followUpMessage: normalizeFollowUpMessage(
      report.followUpMessage ?? report.followupMessage ?? report.whatsAppMessage ?? report.smsMessage,
    ),
    drivingIndex: normalizeDrivingIndex(report.drivingIndex ?? report.priceSensitivityIndex ?? report.primaryMotivation),
    comparisonToPrevious: normalizeNullableString(
      report.comparisonToPrevious ?? report.previousVisitComparison ?? report.previousComparison,
    ),
    warnings: Array.from(warnings),
  };

  if (!normalized.reportHighlights.length && normalized.summary) {
    normalized.reportHighlights = [normalized.summary];
  }

  if (!normalized.coachNotes.length) {
    normalized.coachNotes = [...normalized.improvements];
  }

  if (!normalized.summary) {
    throw new Error('Groq report normalization could not recover a summary');
  }

  return normalized;
}

function normalizeCustomerProfile(value) {
  if (typeof value === 'string') {
    return {
      label: value.trim() || 'Unclear customer profile',
      confidence: 50,
      keyNeeds: [],
      keyConstraints: [],
    };
  }

  const source = value && typeof value === 'object' ? value : {};
  return {
    label: coerceString(source.label ?? source.name ?? source.type ?? source.segment, 'Unclear customer profile'),
    confidence: normalizePercent(source.confidence ?? source.score ?? source.certainty, 50),
    keyNeeds: coerceStringArray(source.keyNeeds ?? source.needs ?? source.painPoints ?? source.requirements),
    keyConstraints: coerceStringArray(source.keyConstraints ?? source.constraints ?? source.concerns ?? source.barriers),
  };
}

function normalizeSpeed(value) {
  const entries = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        const key = findSpeedStageKey(item.label ?? item.stage ?? item.id ?? item.name);
        if (key) entries.push([key, item]);
      }
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const canonicalKey = findSpeedStageKey(key) || findSpeedStageKey(item?.label ?? item?.stage ?? item?.name);
      if (canonicalKey) entries.push([canonicalKey, item]);
    }
  }

  const normalized = {};
  for (const stage of SPEED_STAGE_DEFINITIONS) {
    const matched = entries.find(([key]) => key === stage.key)?.[1];
    normalized[stage.key] = {
      label: stage.label,
      score: normalizeStageScore(matched?.score ?? matched?.rating ?? matched?.value ?? matched?.points),
      rationale: coerceString(
        matched?.rationale ?? matched?.note ?? matched?.analysis ?? matched?.feedback ?? matched?.reason,
        'No rationale returned for this stage.',
      ),
      evidence: coerceStringArray(matched?.evidence ?? matched?.examples ?? matched?.proof ?? matched?.quotes),
    };
  }

  return normalized;
}

function normalizeQuestionCoverage(value) {
  const rawItems = [];

  if (Array.isArray(value)) {
    rawItems.push(...value);
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value.questions)) rawItems.push(...value.questions);
    else if (Array.isArray(value.items)) rawItems.push(...value.items);
    else {
      for (const [key, item] of Object.entries(value)) {
        rawItems.push(item && typeof item === 'object' ? { id: key, ...item } : { id: key, status: item });
      }
    }
  }

  return rawItems
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `Q${index + 1}`,
          question: item.trim(),
          status: 'MISSED',
          evidence: [],
        };
      }

      const id = coerceString(item?.id ?? item?.questionId ?? item?.key, `Q${index + 1}`);
      const question = coerceString(item?.question ?? item?.text ?? item?.prompt, QUESTION_LOOKUP.get(id) || id);
      return {
        id,
        question,
        status: normalizeCoverageStatus(item?.status ?? item?.coverage ?? item?.result),
        evidence: normalizeQuestionEvidence(
          item?.status ?? item?.coverage ?? item?.result,
          item?.evidence ?? item?.examples ?? item?.notes ?? item?.reason,
        ),
      };
    })
    .filter((item) => item.question);
}

function normalizeObjections(value) {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Array.isArray(value.items)
        ? value.items
        : Object.values(value)
      : [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return {
          label: item.trim(),
          category: 'other',
          handled: 'NOT_HANDLED',
          how: null,
          advice: null,
          strategy: null,
          evidence: [],
        };
      }

      const how = normalizeNullableString(item?.how ?? item?.handledHow ?? item?.resolutionDetail ?? item?.response);
      const advice = normalizeNullableString(item?.advice ?? item?.tip ?? item?.coachingTip ?? item?.recommendation);
      return {
        label: coerceString(item?.label ?? item?.objection ?? item?.name, 'Unspecified objection'),
        category: normalizeObjectionCategory(item?.category ?? item?.type ?? item?.bucket),
        handled: normalizeHandledStatus(item?.handled ?? item?.status ?? item?.resolution),
        how,
        advice,
        strategy: normalizeNullableString(item?.strategy ?? item?.approach ?? advice ?? how),
        evidence: coerceStringArray(item?.evidence ?? item?.examples ?? item?.notes),
      };
    })
    .filter((item) => item.label);
}

function normalizeProductFit(value) {
  if (typeof value === 'string') {
    return {
      verdict: 'NOT_MADE',
      pitchedModels: [],
      salesmanPick: null,
      customerPreferred: null,
      idealMatch: null,
      avoidModels: [],
      recommendedModel: null,
      betterAlternative: null,
      why: value.trim(),
    };
  }

  const source = value && typeof value === 'object' ? value : {};
  const pitchedModels = coerceStringArray(
    source.pitchedModels ?? source.modelsDiscussed ?? source.models ?? source.discussedModels,
  );
  const salesmanPick = normalizeNullableString(
    source.salesmanPick ?? source.salespersonPick ?? source.salesPick ?? source.primaryPitch,
  );
  const customerPreferred = normalizeNullableString(
    source.customerPreferred ?? source.customerChoice ?? source.customerPick ?? source.likedModel,
  );
  const idealMatch = normalizeNullableString(
    source.idealMatch ?? source.bestFit ?? source.idealModel ?? source.betterAlternative ?? source.alternative,
  );
  const avoidModels = normalizeAvoidModels(
    source.avoidModels ?? source.avoids ?? source.avoid ?? source.modelsToAvoid ?? source.badFits,
  );
  const recommendedModel = normalizeNullableString(
    source.recommendedModel ??
      source.recommendation ??
      source.model ??
      source.modelRecommendation ??
      customerPreferred ??
      salesmanPick,
  );
  const why = coerceString(source.why ?? source.rationale ?? source.reason ?? source.summary, '');
  return {
    verdict: normalizeProductVerdict(
      source.verdict ?? source.status ?? source.outcome,
      pitchedModels,
      customerPreferred ?? recommendedModel,
      why,
    ),
    pitchedModels,
    salesmanPick,
    customerPreferred,
    idealMatch,
    avoidModels,
    recommendedModel,
    betterAlternative: idealMatch,
    why: why || 'Product recommendation was not clearly stated in the transcript.',
  };
}

function normalizeAvoidModels(value) {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Array.isArray(value.items)
        ? value.items
        : Object.values(value)
      : [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        const model = coerceString(item, '');
        return model ? { model, rationale: '', evidence: [] } : null;
      }

      if (!item || typeof item !== 'object') return null;

      const model = coerceString(item.model ?? item.name ?? item.label ?? item.car, '');
      const rationale = coerceString(item.rationale ?? item.reason ?? item.why ?? item.detail, '');
      const evidence = coerceStringArray(item.evidence ?? item.signals ?? item.points);

      return model ? { model, rationale, evidence } : null;
    })
    .filter(Boolean)
    .slice(0, 2);
}

function normalizeCoachAdvice(value) {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Array.isArray(value.items)
        ? value.items
        : Object.values(value)
      : [];

  return items
    .map((item, index) => {
      if (typeof item === 'string') {
        const detail = item.trim();
        return detail
          ? {
              title: buildAdviceTitle(detail, index),
              detail,
              priority: 'medium',
            }
          : null;
      }

      if (!item || typeof item !== 'object') return null;

      const detail = coerceString(item.detail ?? item.advice ?? item.feedback ?? item.note, '');
      const title = coerceString(item.title ?? item.heading ?? item.label, buildAdviceTitle(detail, index));
      if (!title && !detail) return null;

      return {
        title: title || buildAdviceTitle(detail, index),
        detail: detail || title,
        priority: normalizeCoachPriority(item.priority ?? item.level ?? item.importance),
      };
    })
    .filter(Boolean);
}

function normalizeNextVisitOpener(value) {
  return coerceString(value, '');
}

function normalizeCustomerSentiment(value) {
  if (typeof value === 'string') {
    return {
      start: 'Neutral',
      end: value.trim() || 'Neutral',
      shift: 'Steady',
    };
  }

  const source = value && typeof value === 'object' ? value : {};
  return {
    start: coerceString(source.start ?? source.beginning ?? source.initial, 'Neutral'),
    end: coerceString(source.end ?? source.ending ?? source.final, 'Neutral'),
    shift: coerceString(source.shift ?? source.change ?? source.trajectory, 'Steady'),
  };
}

function normalizeTurningPoints(value) {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Array.isArray(value.items)
        ? value.items
        : Object.values(value)
      : [];

  return items
    .map((item, index) => {
      if (typeof item === 'string') {
        const detail = item.trim();
        return detail
          ? {
              title: `Turning Point ${index + 1}`,
              detail,
              timestamp: null,
            }
          : null;
      }

      if (!item || typeof item !== 'object') return null;

      const title = coerceString(item.title ?? item.label ?? item.moment, `Turning Point ${index + 1}`);
      const detail = coerceString(item.detail ?? item.description ?? item.summary ?? item.why, '');
      if (!detail && !title) return null;

      return {
        title: title || `Turning Point ${index + 1}`,
        detail: detail || title,
        timestamp: normalizeNullableString(item.timestamp ?? item.time ?? item.at),
      };
    })
    .filter(Boolean);
}

function normalizeFollowUpMessage(value) {
  return coerceString(value, '');
}

function normalizeDrivingIndex(value) {
  if (typeof value === 'string') {
    return {
      primaryDriver: value.trim() || 'Unclear',
      insight: '',
    };
  }

  const source = value && typeof value === 'object' ? value : {};
  return {
    primaryDriver: coerceString(source.primaryDriver ?? source.driver ?? source.theme ?? source.label, 'Unclear'),
    insight: coerceString(source.insight ?? source.summary ?? source.why, ''),
  };
}

function normalizeTranscriptTurns(value, { transcriptText, fallbackTurns, warnings }) {
  const items = Array.isArray(value) ? value : [];
  const normalized = items
    .map((item, index) => normalizeTranscriptTurn(item, index))
    .filter((item) => item && item.text);

  if (normalized.length) return normalized;
  if (fallbackTurns.length) {
    warnings.add('Transcript turns were synthesized from the browser transcript because Groq returned an invalid shape.');
    return fallbackTurns;
  }

  const synthesized = splitTranscriptIntoTurns(transcriptText).map((turn, index) => ({
    id: `turn_${index + 1}`,
    speaker: inferSpeaker(turn, index),
    text: turn,
    start: null,
    end: null,
  }));
  if (synthesized.length) {
    warnings.add('Transcript turns were synthesized from transcript text because Groq returned an invalid shape.');
  }
  return synthesized;
}

function normalizeTranscriptTurn(value, index) {
  if (typeof value === 'string') {
    return {
      id: `turn_${index + 1}`,
      speaker: inferSpeaker(value, index),
      text: value.trim(),
      start: null,
      end: null,
    };
  }

  if (!value || typeof value !== 'object') return null;

  const text = coerceString(value.text ?? value.quote ?? value.content, '');
  if (!text) return null;

  return {
    id: coerceString(value.id, `turn_${index + 1}`),
    speaker: normalizeSpeaker(value.speaker ?? value.role ?? value.participant, inferSpeaker(text, index)),
    text,
    start: normalizeOptionalNumber(value.start ?? value.timestamp ?? value.startTime),
    end: normalizeOptionalNumber(value.end ?? value.endTime),
  };
}

function normalizeSummary(value, reportHighlights) {
  const summary = coerceString(value, '');
  if (summary) return summary;
  if (reportHighlights.length) return reportHighlights.join(' ');
  return '';
}

function normalizeOverallScore(value, speed) {
  const parsed = normalizePercent(value, null);
  if (parsed !== null) return parsed;

  const scores = Object.values(speed)
    .map((stage) => stage.score)
    .filter((score) => Number.isFinite(score));
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function normalizeGrade(value, scoreValue, speed) {
  const normalized = coerceString(value, '').toUpperCase();
  if (normalized) return normalized;

  const score = normalizeOverallScore(scoreValue, speed);
  return GRADE_BANDS.find((band) => score >= band.min)?.grade || 'D';
}

function normalizeIsoTimestamp(value) {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function normalizeCoverageStatus(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return 'MISSED';
  if (['covered', 'complete', 'completed', 'done', 'yes', 'asked'].includes(normalized)) return 'COVERED';
  if (['partial', 'partially', 'incomplete', 'somewhat'].includes(normalized)) return 'PARTIALLY';
  return 'MISSED';
}

function normalizeQuestionEvidence(status, value) {
  if (normalizeCoverageStatus(status) === 'MISSED') return null;
  const evidence = coerceStringArray(value);
  return evidence.length ? evidence.join(' | ') : null;
}

function normalizeHandledStatus(value) {
  if (typeof value === 'boolean') {
    return value ? 'HANDLED' : 'NOT_HANDLED';
  }

  const normalized = normalizeKey(value);
  if (!normalized) return 'NOT_HANDLED';
  if (['handled', 'resolved', 'addressed', 'yes'].includes(normalized)) return 'HANDLED';
  if (['partial', 'partially', 'mixed', 'somewhat', 'incomplete'].includes(normalized)) return 'PARTIALLY';
  if (['missed', 'unhandled', 'no', 'pending'].includes(normalized)) return 'NOT_HANDLED';
  return 'NOT_HANDLED';
}

function normalizeObjectionCategory(value) {
  const normalized = normalizeKey(value);
  if (['price', 'pricing', 'cost', 'budget', 'emi', 'finance'].includes(normalized)) return 'price';
  if (['competitor', 'competition', 'comparison', 'brand'].includes(normalized)) return 'competitor';
  if (['features', 'feature', 'variant', 'specs', 'technology'].includes(normalized)) return 'features';
  if (['timing', 'timeline', 'delivery', 'wait', 'delay'].includes(normalized)) return 'timing';
  if (['trust', 'credibility', 'quality', 'reliability', 'build'].includes(normalized)) return 'trust';
  return 'other';
}

function normalizeProductVerdict(value, pitchedModels, recommendedModel, why) {
  const normalized = normalizeKey(value);
  if (normalized) {
    if (['correct', 'rightfit', 'right_fit', 'match', 'goodfit', 'good_fit'].includes(normalized)) return 'CORRECT';
    if (['partial', 'partiallycorrect', 'partially_correct', 'close'].includes(normalized)) {
      return 'PARTIALLY_CORRECT';
    }
    if (['incorrect', 'wrong', 'badfit', 'bad_fit', 'mismatch'].includes(normalized)) return 'INCORRECT';
    if (['notmade', 'not_made', 'norecommendation', 'none', 'unknown'].includes(normalized)) return 'NOT_MADE';
  }

  if (!pitchedModels.length && !recommendedModel) return 'NOT_MADE';
  if (recommendedModel && why) return 'PARTIALLY_CORRECT';
  return 'NOT_MADE';
}

function normalizeCoachPriority(value) {
  const normalized = normalizeKey(value);
  if (['high', 'urgent', 'critical'].includes(normalized)) return 'high';
  if (['low', 'minor', 'nice_to_have'].includes(normalized)) return 'low';
  return 'medium';
}

function buildAdviceTitle(detail, index) {
  const normalized = coerceString(detail, '');
  if (!normalized) return `Coach Tip ${index + 1}`;
  const firstChunk = normalized.split(/[.!?]/)[0].trim();
  if (!firstChunk) return `Coach Tip ${index + 1}`;
  return firstChunk.length > 70 ? `${firstChunk.slice(0, 67).trim()}...` : firstChunk;
}

function findSpeedStageKey(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return null;

  for (const stage of SPEED_STAGE_DEFINITIONS) {
    if (stage.aliases.some((alias) => normalizeKey(alias) === normalized)) {
      return stage.key;
    }
  }

  return null;
}

function normalizeStageScore(value) {
  return normalizePercent(value, 0);
}

function normalizePercent(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric > 0 && numeric < 1 && !Number.isInteger(numeric)) return clamp(Math.round(numeric * 100), 0, 100);
  return clamp(Math.round(numeric), 0, 100);
}

function normalizeOptionalNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeNullableString(value) {
  const normalized = coerceString(value, '');
  return normalized || null;
}

function normalizeSpeaker(value, fallback = 'coach') {
  const normalized = normalizeKey(value);
  if (['salesperson', 'sales', 'advisor', 'coach'].includes(normalized)) {
    return normalized === 'coach' ? 'coach' : 'salesperson';
  }
  if (['customer', 'client', 'buyer', 'prospect'].includes(normalized)) return 'customer';
  if (['system', 'assistant'].includes(normalized)) return 'coach';
  return fallback;
}

function coerceString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function coerceStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceString(item, ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|[.;]\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
      .map((item) => coerceString(item, ''))
      .filter(Boolean);
  }

  return [];
}

function splitTranscriptIntoTurns(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function inferSpeaker(text, index) {
  const normalized = String(text || '').trim().toLowerCase();
  if (normalized.startsWith('customer:') || normalized.startsWith('buyer:')) return 'customer';
  if (normalized.startsWith('salesperson:') || normalized.startsWith('advisor:') || normalized.startsWith('coach:')) {
    return 'salesperson';
  }
  return index % 2 === 0 ? 'salesperson' : 'customer';
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
