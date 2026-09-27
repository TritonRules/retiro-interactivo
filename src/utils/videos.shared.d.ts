import type { z } from 'zod';
import type { ParkVideo, VideoKind, VideoScenario } from '../types/video';

export const YOUTUBE_ID_PATTERN: RegExp;
export const VIDEO_KIND_LABELS: Record<VideoKind, string>;
export const VIDEO_SCENARIO_LABELS: Record<VideoScenario, string>;
export const GENERAL_SCENARIO_LABEL: string;
export const VIDEO_KINDS: readonly VideoKind[];
export const VIDEO_SCENARIOS: readonly VideoScenario[];
export function parseYoutubeId(input: unknown): string | null;
export const videoSchema: z.ZodType<ParkVideo, unknown>;
export const videosSchema: z.ZodOptional<z.ZodType<ParkVideo[], unknown>>;
