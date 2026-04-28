import type { Screen } from '../types';
import type { AppBootstrap } from './appTypes';
import type { CoachReportListItem, CustomerThreadDetail, ObjectionReviewItem, QuestionCoverageItem } from './myCoachApi';

export type AssistantContextSnapshot = {
  screen: Screen;
  thread: CustomerThreadDetail | null;
  reportItem: CoachReportListItem | null;
  bootstrap: AppBootstrap | null;
};

export type AssistantPrompt = {
  id: string;
  label: string;
  kind: 'discovery' | 'objection';
  response: string;
};

export type AssistantBlueprint = {
  intro: string;
  fallback: string;
  discoveryTitle: string;
  objectionTitle: string;
  discoveryPrompts: AssistantPrompt[];
  objectionPrompts: AssistantPrompt[];
};

type PromptTemplate = {
  id: string;
  label: string;
  keywords: string[];
  question: string;
  why: string;
};

const DISCOVERY_TEMPLATES: PromptTemplate[] = [
  {
    id: 'budget',
    label: 'Budget and EMI',
    keywords: ['budget', 'emi', 'finance', 'loan', 'price', 'cost'],
    question: 'What budget range or monthly EMI feels comfortable so I only show realistic options?',
    why: 'This prevents a mismatch before you get pulled into the wrong variant or discount conversation.',
  },
  {
    id: 'usage',
    label: 'Usage pattern',
    keywords: ['city', 'highway', 'commute', 'drive', 'running', 'mileage', 'daily'],
    question: 'Will this car be used mostly in the city, mostly on highways, or a true mix of both?',
    why: 'Usage decides the right fuel type, body style, and ownership-cost story.',
  },
  {
    id: 'family',
    label: 'Family needs',
    keywords: ['family', 'kids', 'children', 'elderly', 'parents', 'school', 'passengers'],
    question: 'Who usually travels with you, and are there kids, parents, or elderly family members to plan for?',
    why: 'This opens seating, comfort, safety, and entry-exit needs without sounding like an interrogation.',
  },
  {
    id: 'timeline',
    label: 'Decision timing',
    keywords: ['delivery', 'urgent', 'soon', 'timeline', 'month', 'booking'],
    question: 'How soon are you hoping to take delivery if we find the right fit today?',
    why: 'Timing helps you decide whether to drive urgency, finance, stock, or just relationship-building.',
  },
  {
    id: 'current-car',
    label: 'Current car gap',
    keywords: ['current car', 'upgrade', 'existing', 'replace', 'trade', 'exchange'],
    question: 'What feels missing in the current car, so the next one actually feels like an upgrade?',
    why: 'A pain point gives you a much sharper bridge into value and objections.',
  },
  {
    id: 'decision-maker',
    label: 'Decision makers',
    keywords: ['wife', 'husband', 'spouse', 'family approval', 'decision', 'joint'],
    question: 'Is anyone else involved in the decision so we can make sure the shortlist works for everyone?',
    why: 'This surfaces silent blockers before they appear at the close.',
  },
];

const DEFAULT_OBJECTIONS = [
  {
    id: 'price',
    label: 'Why is this more expensive than the other quote?',
    kind: 'objection' as const,
    response:
      'Acknowledge first, then narrow the comparison. Try: "Fair question. Which difference matters most to you right now, upfront price, features, or running cost?" Once they answer, bring the response back to ownership value, not just sticker price.',
  },
  {
    id: 'competitor',
    label: 'Another showroom is offering a better deal',
    kind: 'objection' as const,
    response:
      'Do not defend immediately. Say: "I understand. Apart from the number, what is making that offer feel stronger?" Then answer only that gap, whether it is variant value, delivery confidence, exchange support, or finance structure.',
  },
  {
    id: 'timing',
    label: 'Let me think about it and come back later',
    kind: 'objection' as const,
    response:
      'Treat this as an open loop, not a rejection. Ask: "Of course. Before you go, what still feels unresolved for you right now?" Their answer tells you whether the real blocker is trust, price, approval, or product fit.',
  },
  {
    id: 'family',
    label: 'I need to bring my family before deciding',
    kind: 'objection' as const,
    response:
      'Support the need instead of resisting it. Try: "That makes sense. What would your family want to see or feel before saying yes?" Then turn it into a planned revisit, not a vague maybe.',
  },
];

const DASHBOARD_DISCOVERY_PROMPTS: AssistantPrompt[] = [
  {
    id: 'dashboard-baleno-features',
    label: 'What are the Maruti Baleno features?',
    kind: 'discovery',
    response:
      'Maruti Baleno highlights include a premium hatchback design, a spacious cabin, a 360 View Camera, a head-up display, smart infotainment, strong city-driving comfort, and an easy everyday ownership story.',
  },
  {
    id: 'dashboard-baleno-city',
    label: 'Why should I suggest Baleno for city driving?',
    kind: 'discovery',
    response:
      'Position Baleno around daily ease. Talk about light steering, compact size for traffic and parking, smooth drive quality, premium cabin feel, and features the customer uses every day instead of only talking spec sheet numbers.',
  },
  {
    id: 'dashboard-budget',
    label: 'What budget question should I ask first?',
    kind: 'discovery',
    response:
      'Start with a range, not a price quote. Ask: "What budget range or monthly EMI feels comfortable so I can suggest the right variant without stretching you?" This keeps the conversation consultative and helps you control the shortlist early.',
  },
  {
    id: 'dashboard-comparison',
    label: 'How do I compare two models simply?',
    kind: 'discovery',
    response:
      'Do not compare everything. First ask what matters most: space, city driving, highway presence, features, or budget. Then compare only on those two or three points so the customer feels clarity instead of overload.',
  },
];

const DASHBOARD_OBJECTION_PROMPTS: AssistantPrompt[] = [
  {
    id: 'dashboard-baleno-grand-vitara',
    label: 'How is Baleno better than Grand Vitara?',
    kind: 'objection',
    response:
      'Do not claim Baleno is better in every way. Reframe it around fit: "If the customer wants a premium hatchback that is easier in the city, more compact to park, and feels feature-rich for daily use, Baleno can feel like the smarter choice. If they want SUV stance, more road presence, and a different space story, Grand Vitara may fit better." That keeps the answer credible and sales-focused.',
  },
  {
    id: 'dashboard-price',
    label: 'Why is Baleno worth the price?',
    kind: 'objection',
    response:
      'Anchor the answer in value the customer can feel. Tie the price to premium cabin experience, daily convenience features, refinement, brand trust, and the ease of living with the car instead of defending the number line by line.',
  },
  {
    id: 'dashboard-competitor',
    label: 'What if the customer prefers another model?',
    kind: 'objection',
    response:
      'Slow the comparison down. Ask what exactly is pulling them toward the other model, then respond only to that gap. If it is space, talk space. If it is features, talk features. If it is style, talk identity and use case.',
  },
  {
    id: 'dashboard-delay',
    label: 'What if the customer wants to decide later?',
    kind: 'objection',
    response:
      'Treat that as unfinished confidence. Ask: "Before you leave, what would you want to feel clearer about so your decision becomes easier?" Their answer usually exposes whether the blocker is budget, comparison, family approval, or product understanding.',
  },
];

const SCREEN_LABELS: Record<Screen, string> = {
  dashboard: 'Dashboard',
  profile: 'Profile',
  my_coach: 'My Coach',
  my_coach_recommendations: 'Recommendations',
  my_coach_recording: 'Live Session',
  my_coach_processing: 'Processing',
  my_coach_reports: 'Report Library',
  my_coach_report_detail: 'Report Detail',
  my_coach_report_section: 'Report Section',
  my_coach_report_speed: 'Speed Breakdown',
  my_coach_customers: 'Customers',
  my_coach_steps: 'Coach Steps',
  my_coach_transcript: 'Transcript',
  catalog: 'Catalog',
  brochures: 'Brochures',
  communications: 'Communications',
  pitch_practice: 'Pitch Practice',
  live_scenario: 'Live Scenario',
  studio_config: 'Studio Config',
};

export function buildAssistantBlueprint(snapshot: AssistantContextSnapshot): AssistantBlueprint {
  if (snapshot.screen === 'dashboard') {
    return {
      intro:
        `Hi${snapshot.bootstrap?.me.firstName ? ` ${snapshot.bootstrap.me.firstName}` : ''}, what would you like to ask today? ${
          snapshot.bootstrap?.assistant.currentFocus ? `Current focus: ${snapshot.bootstrap.assistant.currentFocus}. ` : ''
        }I can help with model features, quick comparisons, and objection handling.`,
      fallback:
        `Ask for model features, a simple comparison angle, or an objection response and I will shape it into a short sales-ready answer.${
          snapshot.bootstrap?.readiness ? ` Your readiness score is ${snapshot.bootstrap.readiness.score}.` : ''
        }`,
      discoveryTitle: 'Common Questions',
      objectionTitle: 'Likely Customer Objections',
      discoveryPrompts: DASHBOARD_DISCOVERY_PROMPTS,
      objectionPrompts: DASHBOARD_OBJECTION_PROMPTS,
    };
  }

  const discoveryPrompts = buildDiscoveryPrompts(snapshot);
  const objectionPrompts = buildObjectionPrompts(snapshot);
  const screenLabel = SCREEN_LABELS[snapshot.screen];
  const customerName = snapshot.thread?.customerName || snapshot.reportItem?.customerName;
  const summaryGap = getTopQuestionGap(snapshot.reportItem?.report.questionCoverageItems ?? []);
  const unresolvedObjection = getTopUnresolvedObjection(snapshot.reportItem?.report.objections ?? []);

  return {
    intro: customerName
      ? `You are on ${screenLabel} for ${customerName}. ${summaryGap ? `The clearest next discovery move is "${summaryGap.question}".` : 'I am ready to help sharpen the next question.'} ${unresolvedObjection ? `The objection to prepare for is "${unresolvedObjection.label}".` : 'I can also prep you for likely customer pushback.'}`
      : `You are on ${screenLabel}. I will keep the suggestions grounded in this screen so the assistant feels like a sales coach, not a generic chatbot.`,
    fallback: buildFallback(snapshot),
    discoveryTitle: 'Questions To Ask Next',
    objectionTitle: 'Likely Customer Objections',
    discoveryPrompts,
    objectionPrompts,
  };
}

export function buildAssistantReply(query: string, snapshot: AssistantContextSnapshot): string {
  const normalized = query.trim().toLowerCase();
  const blueprint = buildAssistantBlueprint(snapshot);
  const exactPrompt =
    [...blueprint.discoveryPrompts, ...blueprint.objectionPrompts].find(
      (prompt) => prompt.label.toLowerCase() === normalized || normalized.includes(prompt.label.toLowerCase()),
    ) ?? null;

  if (exactPrompt) {
    return exactPrompt.response;
  }

  if (normalized.includes('summary') || normalized.includes('what should i ask') || normalized.includes('next question')) {
    return blueprint.fallback;
  }

  if (snapshot.screen === 'dashboard') {
    if (hasAnyKeyword(normalized, ['baleno']) && hasAnyKeyword(normalized, ['feature', 'features'])) {
      return DASHBOARD_DISCOVERY_PROMPTS[0].response;
    }

    if (
      hasAnyKeyword(normalized, ['baleno']) &&
      hasAnyKeyword(normalized, ['grand vitara', 'compare', 'better'])
    ) {
      return DASHBOARD_OBJECTION_PROMPTS[0].response;
    }
  }

  if (hasAnyKeyword(normalized, ['budget', 'emi', 'finance', 'loan', 'price'])) {
    return buildFinanceReply(snapshot);
  }

  if (hasAnyKeyword(normalized, ['competitor', 'compare', 'other showroom', 'other quote'])) {
    return 'Lead with comparison criteria before defending the car. Ask what the customer is really comparing, then answer that one gap with proof, not a brochure dump.';
  }

  if (hasAnyKeyword(normalized, ['family', 'wife', 'husband', 'parents', 'kids', 'children'])) {
    return 'Shift the conversation from product to household use. Ask who travels most, who influences the decision, and what comfort or safety concern matters most for them.';
  }

  if (hasAnyKeyword(normalized, ['message', 'whatsapp', 'follow up'])) {
    const followUp = snapshot.reportItem?.report.followUpMessage;
    return followUp || 'Keep the follow-up short: mention the model discussed, the main need you heard, and one clean next step such as a callback, quotation review, or revisit slot.';
  }

  if (hasAnyKeyword(normalized, ['objection', 'pushback', 'expensive', 'discount', 'deal'])) {
    const objection = getTopUnresolvedObjection(snapshot.reportItem?.report.objections ?? []);
    if (objection) {
      return buildObjectionResponse(objection, snapshot);
    }
  }

  return blueprint.fallback;
}

function buildDiscoveryPrompts(snapshot: AssistantContextSnapshot) {
  const reportQuestions = snapshot.reportItem?.report.questionCoverageItems ?? [];
  const prioritizedFromReport = reportQuestions
    .filter((item) => item.status !== 'COVERED')
    .slice(0, 4)
    .map((item) => ({
      id: `question-${item.id}`,
      label: item.question,
      kind: 'discovery' as const,
      response: buildQuestionResponse(item, snapshot),
    }));

  if (prioritizedFromReport.length >= 3) {
    return prioritizedFromReport;
  }

  const contextText = [
    snapshot.thread?.customerContext,
    snapshot.thread?.summary,
    snapshot.reportItem?.summary,
    snapshot.reportItem?.report.summary,
    snapshot.reportItem?.report.productFit.why,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matchedTemplates = DISCOVERY_TEMPLATES.filter((template) => hasAnyKeyword(contextText, template.keywords));
  const orderedTemplates = [...matchedTemplates, ...DISCOVERY_TEMPLATES].filter(
    (template, index, array) => array.findIndex((entry) => entry.id === template.id) === index,
  );

  const templatePrompts = orderedTemplates.slice(0, 4).map((template) => ({
    id: `template-${template.id}`,
    label: template.question,
    kind: 'discovery' as const,
    response: `Ask this next: "${template.question}" ${template.why}`,
  }));

  return [...prioritizedFromReport, ...templatePrompts]
    .filter((prompt, index, array) => array.findIndex((entry) => entry.label === prompt.label) === index)
    .slice(0, 4);
}

function buildObjectionPrompts(snapshot: AssistantContextSnapshot) {
  const reportObjections = snapshot.reportItem?.report.objections ?? [];
  const prioritizedFromReport = reportObjections
    .filter((item) => item.handled !== 'HANDLED')
    .slice(0, 4)
    .map((item, index) => ({
      id: `objection-${index}-${item.label}`,
      label: normalizeObjectionLabel(item),
      kind: 'objection' as const,
      response: buildObjectionResponse(item, snapshot),
    }));

  if (prioritizedFromReport.length >= 3) {
    return prioritizedFromReport;
  }

  const screenDefaults = getScreenSpecificObjections(snapshot.screen);

  return [...prioritizedFromReport, ...screenDefaults]
    .filter((prompt, index, array) => array.findIndex((entry) => entry.label === prompt.label) === index)
    .slice(0, 4);
}

function buildQuestionResponse(item: QuestionCoverageItem, snapshot: AssistantContextSnapshot) {
  const evidence = item.evidence ? ` What I already know: ${item.evidence}.` : '';
  const contextLabel = snapshot.thread?.customerName || snapshot.reportItem?.customerName;
  return `Ask this next${contextLabel ? ` with ${contextLabel}` : ''}: "${item.question}" ${item.status === 'MISSED' ? 'It was missed earlier, so bring it in before you recommend the next model.' : 'It was only partially explored, so go one layer deeper before you pitch.'}${evidence}`;
}

function buildObjectionResponse(item: ObjectionReviewItem, snapshot: AssistantContextSnapshot) {
  const customerName = snapshot.thread?.customerName || snapshot.reportItem?.customerName;
  const advice = item.advice ? ` Coach note: ${item.advice}.` : '';
  const how = item.how ? ` If it came up before, the handling landed like this: ${item.how}.` : '';

  if (item.category === 'price') {
    return `Use ACE with${customerName ? ` ${customerName}` : ' the customer'}. Acknowledge the concern, ask what part of the number feels off, then compare value in running cost, fit, and delivery confidence instead of dropping straight to discount.${how}${advice}`;
  }

  if (item.category === 'competitor') {
    return `Do not fight the competitor head-on. Clarify what is pulling the customer away, then show where your option fits better for their real use case.${how}${advice}`;
  }

  if (item.category === 'timing') {
    return `Treat timing objections as unfinished discovery. Ask what still feels unresolved, then solve that blocker before trying to close again.${how}${advice}`;
  }

  return `Slow the moment down and handle this with empathy first. Clarify the real blocker, answer with proof, and then ask for one concrete next step.${how}${advice}`;
}

function buildFallback(snapshot: AssistantContextSnapshot) {
  if (snapshot.screen === 'dashboard') {
    return 'Ask for model features, a simple comparison angle, or an objection response and I will shape it into a short sales-ready answer.';
  }

  const topQuestion = getTopQuestionGap(snapshot.reportItem?.report.questionCoverageItems ?? []);
  const topObjection = getTopUnresolvedObjection(snapshot.reportItem?.report.objections ?? []);
  const productFit = snapshot.reportItem?.report.productFit;

  return [
    topQuestion ? `Lead with "${topQuestion.question}" before pushing a model.` : null,
    topObjection ? `Be ready to handle "${topObjection.label}" without becoming defensive.` : null,
    productFit?.idealMatch && productFit.idealMatch !== productFit.salesmanPick
      ? `The cleaner product direction is ${productFit.idealMatch}, so keep the conversation tied to that fit.`
      : null,
    snapshot.thread?.customerContext ? `Customer context: ${snapshot.thread.customerContext}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildFinanceReply(snapshot: AssistantContextSnapshot) {
  const customerName =
    snapshot.screen === 'dashboard' ? null : snapshot.thread?.customerName || snapshot.reportItem?.customerName;
  const question =
    getPromptByTemplateId(buildDiscoveryPrompts(snapshot), 'budget')?.label ||
    'What budget range or EMI feels comfortable each month?';

  return `Before quoting variants${customerName ? ` for ${customerName}` : ''}, anchor the money conversation. Ask: "${question}" Then narrow the shortlist so the customer feels guided, not sold at.`;
}

function getPromptByTemplateId(prompts: AssistantPrompt[], templateId: string) {
  return prompts.find((prompt) => prompt.id === `template-${templateId}`);
}

function getTopQuestionGap(items: QuestionCoverageItem[]) {
  return items.find((item) => item.status === 'MISSED') || items.find((item) => item.status === 'PARTIALLY') || null;
}

function getTopUnresolvedObjection(items: ObjectionReviewItem[]) {
  return items.find((item) => item.handled === 'NOT_HANDLED') || items.find((item) => item.handled === 'PARTIALLY') || null;
}

function normalizeObjectionLabel(item: ObjectionReviewItem) {
  const label = item.label.trim();
  if (!label) {
    return 'What if the customer pushes back here?';
  }

  if (label.endsWith('?')) {
    return label;
  }

  return label.startsWith('I ') || label.startsWith('My ') || label.startsWith('Why ') ? label : `What if they say "${label}"?`;
}

function getScreenSpecificObjections(screen: Screen): AssistantPrompt[] {
  if (screen === 'brochures') {
    return [
      {
        id: 'brochure-later',
        label: 'Send me the brochure, I will decide later',
        kind: 'objection' as const,
        response:
          'Use the brochure as a bridge, not the ending. Ask what they want to evaluate after reading it, then lock a follow-up time while the interest is still warm.',
      },
      ...DEFAULT_OBJECTIONS,
    ].slice(0, 4);
  }

  if (screen === 'catalog') {
    return [
      {
        id: 'variant-cheaper',
        label: 'Why should I not just buy the cheaper variant?',
        kind: 'objection' as const,
        response:
          'Go back to use case first. Show which everyday need breaks on the cheaper variant, then explain the upgrade in practical terms rather than feature bragging.',
      },
      ...DEFAULT_OBJECTIONS,
    ].slice(0, 4);
  }

  return DEFAULT_OBJECTIONS.slice(0, 4);
}

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
