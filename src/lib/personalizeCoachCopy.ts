export function personalizeCoachCopy(text?: string | null): string {
  const value = String(text ?? '');
  if (!value) return '';

  return value
    .replace(/\bHow the salesperson should\b/g, 'How you should')
    .replace(/\bIf the salesperson\b/g, 'If you')
    .replace(/\bWhen the salesperson\b/g, 'When you')
    .replace(/\bThe salesperson has\b/g, 'You have')
    .replace(/\bThe salesperson is\b/g, 'You are')
    .replace(/\bThe salesperson was\b/g, 'You were')
    .replace(/\bThe salesperson should\b/g, 'You should')
    .replace(/\bThe salesperson needs to\b/g, 'You need to')
    .replace(/\bThe salesperson need to\b/g, 'You need to')
    .replace(/\bThe salesperson's\b/g, 'Your')
    .replace(/\bThe salesperson\b/g, 'You')
    .replace(/\bhow the salesperson should\b/g, 'how you should')
    .replace(/\bif the salesperson\b/g, 'if you')
    .replace(/\bwhen the salesperson\b/g, 'when you')
    .replace(/\bthe salesperson has\b/g, 'you have')
    .replace(/\bthe salesperson is\b/g, 'you are')
    .replace(/\bthe salesperson was\b/g, 'you were')
    .replace(/\bthe salesperson should\b/g, 'you should')
    .replace(/\bthe salesperson needs to\b/g, 'you need to')
    .replace(/\bthe salesperson need to\b/g, 'you need to')
    .replace(/\bthe salesperson's\b/g, 'your')
    .replace(/\bthe salesperson\b/g, 'you');
}
