import { useEffect, useId, useMemo, useState } from 'react';
import type { ParkEvent } from '../../types/event';
import { getEventCategoryLabel } from '../../utils/categoryLabels';
import { eventDetailPath } from '../../utils/eventLinks';
import {
  filterEventsByQuery,
  parseAgendaFilters,
  uniqueCategories,
  type AgendaFilters,
} from '../../utils/eventFilters';
import {
  eventFreshness,
  freshnessCopy,
  selectCurrentPlans,
  selectStaleButDated,
  selectTodayEvents,
} from '../../utils/eventFreshness';
import { eventTimePrecision, nextValidSession, todaysSessions } from '../../utils/eventSchedule';
import { eventWhenLabel, sessionBadge } from '../../utils/eventPresentation';
import { useParkClock } from '../../utils/useParkClock';
import './agenda.css';

interface Props {
  events: ParkEvent[];
  baseUrl: string;
  generatedAt: string;
}

function withBase(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

function filtersToSearch(filters: AgendaFilters): string {
  const params = new URLSearchParams();
  if (filters.categoria) params.set('categoria', filters.categoria);
  if (filters.publico) params.set('publico', filters.publico);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export default function AgendaExplorer({ events, baseUrl, generatedAt }: Props) {
  const now = useParkClock();
  const liveId = useId();
  const [filters, setFilters] = useState<AgendaFilters>(() =>
    typeof window === 'undefined'
      ? { categoria: '', publico: '' }
      : parseAgendaFilters(window.location.search),
  );

  useEffect(() => {
    const onPop = () => setFilters(parseAgendaFilters(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const next = `${window.location.pathname}${filtersToSearch(filters)}${window.location.hash}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === next) {
      return;
    }
    window.history.pushState(null, '', next);
  }, [filters]);

  const current = useMemo(() => selectCurrentPlans(events, now), [events, now]);
  const today = useMemo(() => selectTodayEvents(events, now), [events, now]);
  const stale = useMemo(() => selectStaleButDated(events, now), [events, now]);
  const categories = useMemo(() => uniqueCategories(events), [events]);
  const filteredToday = useMemo(() => filterEventsByQuery(today, filters), [today, filters]);
  const todayIds = useMemo(() => new Set(filteredToday.map((event) => event.id)), [filteredToday]);
  const filteredCurrent = useMemo(
    () => filterEventsByQuery(current, filters).filter((event) => !todayIds.has(event.id)),
    [current, filters, todayIds],
  );
  const filteredStale = useMemo(() => filterEventsByQuery(stale, filters), [stale, filters]);
  const band = eventFreshness(current[0] ?? events[0] ?? ({} as ParkEvent), now);
  const hasFilters = Boolean(filters.categoria || filters.publico);
  // Sin ningún evento vigente y sin filtros: la agenda está pendiente de actualización.
  const pendingUpdate =
    current.length === 0 && today.length === 0 && (band === 'stale' || band === 'unknown');
  const lastChecked = latestCheckedLabel(events);
  const pendingCopy = lastChecked
    ? `Ahora mismo no hay eventos con información actualizada. La última consulta a la fuente oficial fue el ${lastChecked}; la agenda se actualiza automáticamente cada día. Mientras tanto, consulta la agenda oficial del Ayuntamiento de Madrid.`
    : 'Ahora mismo no hay eventos con información actualizada. Consulta la agenda oficial del Ayuntamiento de Madrid.';

  const reset = () => setFilters({ categoria: '', publico: '' });

  return (
    <div>
      <p className="agenda-freshness" data-freshness={band}>
        {freshnessCopy(band, current[0]?.lastCheckedAt ?? events[0]?.lastCheckedAt)}
      </p>

      <form
        className="filters"
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          Categoría
          <select
            name="categoria"
            value={filters.categoria}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, categoria: event.target.value }))
            }
          >
            <option value="">Todas</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {getEventCategoryLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Público
          <input
            type="search"
            name="publico"
            value={filters.publico}
            placeholder="p. ej. Familias"
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, publico: event.target.value }))
            }
          />
        </label>
        <button className="btn" type="button" onClick={reset}>
          Quitar filtros
        </button>
      </form>

      <p id={liveId} className="agenda-count" aria-live="polite">
        {filteredToday.length + filteredCurrent.length === 0
          ? pendingUpdate && !hasFilters
            ? 'Agenda pendiente de actualización: no hay eventos vigentes que mostrar.'
            : 'Ningún resultado con estos filtros.'
          : `${filteredToday.length} hoy · ${filteredCurrent.length} en la programación vigente`}
      </p>

      <section aria-labelledby="hoy-title" className="block">
        <h2 id="hoy-title">Hoy</h2>
        {filteredToday.length === 0 ? (
          <p className="empty">
            {band === 'stale' || band === 'unknown'
              ? 'No hay una agenda actualizada para hoy. Consulta la fuente oficial.'
              : 'No hay actividades vigentes para hoy en el ámbito del parque.'}
          </p>
        ) : (
          <ul className="card-list">
            {filteredToday.map((event) => (
              <AgendaCard
                key={event.id}
                event={event}
                now={now}
                baseUrl={baseUrl}
                section="today"
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="prox-title" className="block">
        <h2 id="prox-title">Próximamente</h2>
        {filteredCurrent.length === 0 ? (
          <p className="empty" data-agenda-pending={pendingUpdate ? 'true' : undefined}>
            {pendingUpdate
              ? pendingCopy
              : hasFilters
                ? 'No hay próximos eventos publicados con estos filtros. Prueba sin filtro o consulta la fuente oficial.'
                : 'No hay más eventos próximos publicados en el ámbito del parque. Consulta la fuente oficial.'}
          </p>
        ) : (
          <ul className="card-list">
            {filteredCurrent.map((event) => (
              <AgendaCard
                key={event.id}
                event={event}
                now={now}
                baseUrl={baseUrl}
                section="upcoming"
              />
            ))}
          </ul>
        )}
      </section>

      {filteredStale.length > 0 ? (
        <section aria-labelledby="stale-title" className="block">
          <h2 id="stale-title">Información anterior</h2>
          <p className="empty">
            Estos registros ya no se muestran como plan vigente porque la última consulta supera
            siete días o no tiene fecha fiable.
          </p>
          <ul className="card-list">
            {filteredStale.map((event) => (
              <AgendaCard
                key={event.id}
                event={event}
                now={now}
                baseUrl={baseUrl}
                section="stale"
              />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="footnote">
        Fechas absolutas generadas el{' '}
        {new Intl.DateTimeFormat('es-ES', {
          timeZone: 'Europe/Madrid',
          dateStyle: 'long',
          timeStyle: 'short',
        }).format(new Date(generatedAt))}
        . Sin JavaScript esta página no actualiza «Hoy».
      </p>
    </div>
  );
}

function latestCheckedLabel(events: ParkEvent[]): string | null {
  let latest = Number.NaN;
  for (const event of events) {
    const value = event.lastCheckedAt ? Date.parse(event.lastCheckedAt) : Number.NaN;
    if (!Number.isNaN(value) && (Number.isNaN(latest) || value > latest)) latest = value;
  }
  if (Number.isNaN(latest)) return null;
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(latest));
}

function AgendaCard({
  event,
  now,
  baseUrl,
  section,
}: {
  event: ParkEvent;
  now: number;
  baseUrl: string;
  section: 'today' | 'upcoming' | 'stale';
}) {
  const precision = eventTimePrecision(event);
  const next = nextValidSession(event, now);
  const todayItems = todaysSessions(event, now);
  return (
    <li className="content-card">
      <h3>
        <a href={withBase(baseUrl, eventDetailPath(event.slug))}>{event.title}</a>
      </h3>
      <p>{event.shortDescription}</p>
      {section === 'today'
        ? todayItems.map(({ session, state }) => (
            <p key={session.startMs} className="meta">
              {sessionBadge(state, precision) ? `${sessionBadge(state, precision)} · ` : ''}
              {eventWhenLabel(event, session)} · {event.venue}
            </p>
          ))
        : (
            <p className="meta">
              {eventWhenLabel(event, next)} · {event.venue} · {getEventCategoryLabel(event.category)}
            </p>
          )}
      <p className="actions">
        <a className="btn btn--secondary" href={withBase(baseUrl, eventDetailPath(event.slug))}>
          Ver ficha
        </a>
        {event.coordinates ? (
          <a className="btn btn--secondary" href={`${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}?evento=${event.slug}`}>
            Ver en el mapa
          </a>
        ) : null}
      </p>
    </li>
  );
}
