export const APPLICATION_STAGES = [
  'Saved',
  'Applied',
  'Screening',
  'Assessment',
  'Interview',
  'Final interview',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export function isApplicationStage(value: string): value is ApplicationStage {
  return APPLICATION_STAGES.includes(value as ApplicationStage);
}
