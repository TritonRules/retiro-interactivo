import eventsData from '../data/events.json';
import type { ParkEvent } from '../types/event';
import { publishedUpcomingEvents, validateEvents } from './validateEvents';

const result = validateEvents(eventsData);

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
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = formatter.format(now);
  return getUpcomingEvents(now).filter((event) => {
    const key = formatter.format(new Date(event.startAt));
    return key === todayKey;
  });
}
