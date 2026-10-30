export const FEATURE_KEYS = [
  'ai.ask.message',
  'ai.mcq.generate',
  'ai.mains.evaluate',
  'ai.plan.weekly',
  'practice.mock.full',
  'practice.all_india',
  'learn.content.premium',
  'notes.offline',
  'progress.advanced',
  'forum.post',
  'messages.send',
  'planner.calendar_sync',
  'revision.basic',
  'planner.basic',
  'study.session',
  'practice.session',
  'practice.pyq',
  'practice.mistake_notebook',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
