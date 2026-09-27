import type { z } from 'zod';
import type { ParkVideo, VideoKind } from '../types/video';

export const YOUTUBE_ID_PATTERN: RegExp;
export const VIDEO_KINDS: readonly VideoKind[];
export function parseYoutubeId(input: unknown): string | null;
export const videoSchema: z.ZodType<ParkVideo, unknown>;
export const videosSchema: z.ZodOptional<z.ZodType<ParkVideo[], unknown>>;
