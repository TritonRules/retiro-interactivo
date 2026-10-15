import { useEffect, useMemo, useState } from 'react';
import type { ParkEvent } from '../../types/event';
import {
  EVENING_SWITCH_HOUR,
  buildDayPlan,
  countPlan,
  defaultTimelineDay,
  itemState,
  madridHour,
  timelineDayKeys,
  type DayPlan,
  type TimelineDay,
  type TimelineItem,
} from '../../utils/dayTimeline';

interface Props {
  events: ParkEvent[];
  baseUrl: string;
  /** Reloj del parque (se refresca en medianoche y al volver a la pestaña). */
  now: number;
}

/** Píxeles por minuto en el eje vertical: 1 h ≈ 102 px a 390 px de ancho. */
const PX_PER_MIN = 1.7;
const MIN_BAR_PX = 100;

const timeFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dayFmt = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function withBase(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

/** Reloj por minuto para la línea «ahora»; barato porque solo compara números. */
function useMinuteClock(parkNow: number): number {
  const [value, setValue] = useState(parkNow);
  useEffect(() => {
    setValue(Date.now());
    const id = window.setInterval(() => setValue(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [parkNow]);
  return value;
}

const STATE_LABEL = { past: 'Terminado', ongoing: 'Ahora', upcoming: 'Próximo' } as const;

export default function HoyTimeline({ events, baseUrl, now: parkNow }: Props) {
  const now = useMinuteClock(parkNow);
  const keys = useMemo(() => timelineDayKeys(parkNow), [parkNow]);
  // Precalculado una vez por día: el tick por minuto no recalcula sesiones.
  const plans = useMemo<Record<TimelineDay, DayPlan>>(
    () => ({
      hoy: buildDayPlan(events, keys.hoy, parkNow),
      manana: buildDayPlan(events, keys.manana, parkNow),
    }),
    [events, keys.hoy, keys.manana, parkNow],
  );
  const autoDay = defaultTimelineDay(plans.hoy, now);
  const [choice, setChoice] = useState<TimelineDay | null>(null);
  useEffect(() => setChoice(null), [keys.hoy]);
  const day = choice ?? autoDay;
  const plan = plans[day];
  const todayCounts = countPlan(plans.hoy, now);
  const evening = madridHour(now) >= EVENING_SWITCH_HOUR;

  let hint: string | null = null;
  if (choice == null && autoDay === 'manana') {
    hint = evening
      ? `Desde las ${EVENING_SWITCH_HOUR}:00 te mostramos el programa de mañana.`
      : 'Hoy ya no quedan actividades: te mostramos el programa de mañana.';
  }

  const rawDay = dayFmt.format(new Date(Date.parse(`${plan.dayKey}T12:00:00Z`)));
  const dayLabel = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

  return (
    <section className="hoy" aria-label="Programa del día" data-dia={day}>
      <div className="hoy__head">
        <h2 id="hoy-retiro-title">{day === 'hoy' ? 'Hoy en el Retiro' : 'Mañana en el Retiro'}</h2>
        <div className="hoy__switch" role="group" aria-label="Día del programa">
          {(['hoy', 'manana'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="hoy__switch-btn"
              aria-pressed={day === value}
              onClick={() => setChoice(value)}
            >
              {value === 'hoy' ? 'Hoy' : 'Mañana'}
            </button>
          ))}
        </div>
      </div>
      <p className="hoy__sub">
        <span className="hoy__day">{dayLabel}</span>
        {day === 'hoy' && todayCounts.total > 0
          ? ` · ${todayCounts.ongoing} en curso · ${todayCounts.upcoming} por empezar`
          : ''}
      </p>
      {hint ? (
        <p className="hoy__hint" role="status">
          {hint}{' '}
          <button type="button" className="hoy__link-btn" onClick={() => setChoice('hoy')}>
            Ver hoy
          </button>
        </p>
      ) : null}

      {plan.timed.length + plan.allDay.length === 0 ? (
        <p className="empty hoy__empty">
          {day === 'hoy'
            ? 'Hoy no hay actividades publicadas en el ámbito del parque. Echa un vistazo a mañana o a la programación vigente.'
            : 'Mañana no hay actividades publicadas en el ámbito del parque por ahora.'}
        </p>
      ) : null}

      {plan.allDay.length > 0 ? (
        <div className="hoy__allday" aria-label="Todo el día o sin hora fija">
          <p className="hoy__allday-label">Todo el día · sin hora fija</p>
          <ul>
            {plan.allDay.map((item) => (
              <li
                key={item.key}
                className="hoy__chip"
                data-state={day === 'hoy' ? itemState(item, now) : 'upcoming'}
              >
                <span className="hoy__chip-title">{item.title}</span>
                <span className="hoy__chip-venue">{item.venue}</span>
                {item.hasCoordinates ? (
                  <a className="hoy__map" href={withBase(baseUrl, `?evento=${item.slug}`)}>
                    Ver en el mapa
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.timed.length > 0 ? (
        <Strip plan={plan} now={now} isToday={day === 'hoy'} baseUrl={baseUrl} />
      ) : null}
    </section>
  );
}

function Strip({
  plan,
  now,
  isToday,
  baseUrl,
}: {
  plan: DayPlan;
  now: number;
  isToday: boolean;
  baseUrl: string;
}) {
  const totalMin = (plan.axisEndMs - plan.axisStartMs) / 60_000;
  const height = totalMin * PX_PER_MIN;
  const hours: number[] = [];
  for (let t = plan.axisStartMs; t <= plan.axisEndMs; t += 3_600_000) hours.push(t);
  const nowVisible = isToday && now >= plan.axisStartMs && now <= plan.axisEndMs;
  const toPx = (ms: number) => ((ms - plan.axisStartMs) / 60_000) * PX_PER_MIN;

  return (
    <div className="hoy__strip" style={{ height }} role="list" aria-label="Actividades por hora">
      {hours.map((t) => (
        <div key={t} className="hoy__hour" style={{ top: toPx(t) }} aria-hidden="true">
          <span>{timeFmt.format(new Date(t))}</span>
        </div>
      ))}
      {nowVisible ? (
        <div className="hoy__now" style={{ top: toPx(now) }} data-testid="linea-ahora">
          <span aria-label={`Ahora, ${timeFmt.format(new Date(now))}`}>
            {timeFmt.format(new Date(now))}
          </span>
        </div>
      ) : null}
      <div className="hoy__lanes">
        {plan.timed.map((item) => (
          <Bar
            key={item.key}
            item={item}
            state={isToday ? itemState(item, now) : 'upcoming'}
            top={toPx(item.startMs)}
            height={Math.max(MIN_BAR_PX, toPx(item.endMs) - toPx(item.startMs) - 4)}
            left={(item.lane * 100) / item.groupLanes}
            width={100 / item.groupLanes}
            baseUrl={baseUrl}
          />
        ))}
      </div>
    </div>
  );
}

function Bar({
  item,
  state,
  top,
  height,
  left,
  width,
  baseUrl,
}: {
  item: TimelineItem;
  state: 'past' | 'ongoing' | 'upcoming';
  top: number;
  height: number;
  left: number;
  width: number;
  baseUrl: string;
}) {
  const start = timeFmt.format(new Date(item.startMs));
  const when = item.endKnown ? `${start}–${timeFmt.format(new Date(item.endMs))}` : start;
  return (
    <article
      role="listitem"
      className="hoy__bar"
      data-state={state}
      style={{ top, height, left: `${left}%`, width: `calc(${width}% - 4px)` }}
      aria-label={`${when} · ${item.title} · ${STATE_LABEL[state]}`}
    >
      <p className="hoy__bar-time">
        {when}
        {state !== 'upcoming' ? <span className="hoy__badge">{STATE_LABEL[state]}</span> : null}
      </p>
      <p className="hoy__bar-title">{item.title}</p>
      <p className="hoy__bar-venue">{item.venue}</p>
      {item.hasCoordinates ? (
        <a className="hoy__map" href={withBase(baseUrl, `?evento=${item.slug}`)}>
          Ver en el mapa
        </a>
      ) : null}
    </article>
  );
}
