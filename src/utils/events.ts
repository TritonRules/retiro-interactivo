import eventsData from '../data/events.json';
import e2eEvents from '../../e2e/fixtures/events.json';
import type { ParkEvent } from '../types/event';
import { selectCurrentPlans, selectTodayEvents } from './eventFreshness';
import { publishedUpcomingEvents, validateEvents } from './validateEvents';

const data = import.meta.env.PUBLIC_E2E_FIXTURE === '1' ? e2eEvents : eventsData;
const result = validateEvents(data);

if (!result.ok) {
  throw new Error(
    `Datos de eventos inválidos:\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
  );
}

export const events: ParkEvent[] = result.events;

export function getUpcomingEvents(now = new Date()): ParkEvent[] {
  return publishedUpcomingEvents(events, now);
}

export function getEventBySlug(slug: string): ParkEvent | undefined {
  return events.find((event) => event.slug === slug);
}

/** Eventos con ficha propia generada por `src/pages/agenda/[slug].astro`. */
export function eventsWithDetailPage(list: ParkEvent[] = events): ParkEvent[] {
  return list.filter((event) => event.status === 'published' || event.status === 'expired');
}

export function eventsToday(now = new Date()): ParkEvent[] {
  const nowMs = now instanceof Date ? now.getTime() : now;
  return selectTodayEvents(events, nowMs);
}

export function currentPlansAt(nowMs: number): ParkEvent[] {
  return selectCurrentPlans(events, nowMs);
}
