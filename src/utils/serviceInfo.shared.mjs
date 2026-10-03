/**
 * Datos verificados que completan las fichas de servicio (src/data/services-info.json):
 * teléfono, web, carta, horario con su fuente, precios con fecha y estado.
 *
 * Lo usan la app (src/utils/services.ts) y `npm run validate:data`. Reglas en
 * docs/servicios-osm.md («Información verificada de los locales»).
 */
import { z } from 'zod';

/** A partir de estos meses (según la fecha de la carta) el precio se marca en ámbar. */
export const PRICE_FLAG_MONTHS = 9;
/** A partir de estos meses el precio deja de mostrarse. */
export const PRICE_MAX_MONTHS = 12;

/** Dominios de agregadores y webs de reseñas: nunca valen como fuente de precios. */
export const AGGREGATOR_HOSTS = [
  'carta.menu',
  'sluurpy',
  'gastroranking',
  'restaurantguru',
  'tripadvisor',
  'thefork',
  'eltenedor',
  'maps.google.',
  'maps.app.goo.gl',
  'g.page',
  'yelp',
  'web.archive.org',
];

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const phoneSchema = z.object({
  /** Como se muestra: «915 744 024». */
  display: z.string().min(9),
  /** Para el enlace tel:, en formato E.164: «+34915744024». */
  tel: z.string().regex(/^\+\d{9,15}$/),
  sourceType: z.enum(['official', 'venue', 'google']),
});

const hoursSchema = z.object({
  /** `opening_hours` de OSM (se traduce al español) o texto ya redactado en español. */
  openingHours: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  sourceType: z.enum(['official', 'venue', 'google']),
  sourceUrl: z.url().optional(),
  checkedAt: dateSchema,
  /** Las fuentes no coinciden (se da prioridad a la del propio local). */
  mayVary: z.boolean().optional(),
  note: z.string().min(1).optional(),
});

const priceItemSchema = z.object({
  item: z.string().min(1),
  price: z.number().nonnegative(),
  note: z.string().min(1).optional(),
});

const pricesSchema = z
  .object({
    /** `official`: precio público municipal; `venue`: carta publicada por el propio local. */
    sourceType: z.enum(['official', 'venue']),
    /** Año de vigencia de un precio público (se oculta al terminar el año). */
    validYear: z.number().int().min(2025).optional(),
    /** Fecha del documento (carta o cartel); de ella depende la caducidad. */
    sourceDate: dateSchema,
    /** Día en que se consultó la fuente. */
    checkedAt: dateSchema,
    sourceLabel: z.string().min(1),
    sourceUrl: z.url(),
    currency: z.literal('EUR'),
    items: z.array(priceItemSchema).min(1).max(8),
    /** Detalles del servicio (duración, aforo…), en una línea. */
    details: z.string().min(1).optional(),
  })
  .superRefine((prices, ctx) => {
    if (prices.sourceType === 'official' && !prices.validYear) {
      ctx.addIssue({
        code: 'custom',
        message: 'un precio público necesita validYear',
        path: ['validYear'],
      });
    }
    if (prices.sourceDate > prices.checkedAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'sourceDate posterior a checkedAt',
        path: ['sourceDate'],
      });
    }
    const host = new URL(prices.sourceUrl).hostname;
    if (AGGREGATOR_HOSTS.some((bad) => host.includes(bad))) {
      ctx.addIssue({
        code: 'custom',
        message: `fuente de precios no admitida: ${host}`,
        path: ['sourceUrl'],
      });
    }
  });

const statusSchema = z.object({
  value: z.literal('temporarily-closed'),
  sourceType: z.enum(['official', 'venue', 'google']),
  checkedAt: dateSchema,
  note: z.string().min(1).optional(),
});

export const serviceInfoSchema = z
  .object({
    id: z.string().min(1),
    /** Nombre comercial verificado (sustituye al de OSM). */
    name: z.string().min(1).optional(),
    phone: phoneSchema.optional(),
    website: z.url().optional(),
    menuUrl: z.url().optional(),
    hours: hoursSchema.optional(),
    prices: pricesSchema.optional(),
    status: statusSchema.optional(),
    /** Distintivos breves comprobados en la fuente («Café de comercio justo»). */
    highlights: z.array(z.string().min(1).max(60)).max(4).optional(),
    /** Notas internas de verificación (no se muestran). */
    notes: z.string().optional(),
  })
  .strict();

export const serviceInfoDatasetSchema = z.object({
  description: z.string().min(1),
  updatedAt: dateSchema,
  services: z.array(serviceInfoSchema).superRefine((list, ctx) => {
    const ids = new Set();
    list.forEach((entry, index) => {
      if (ids.has(entry.id)) {
        ctx.addIssue({ code: 'custom', message: `id duplicado: ${entry.id}`, path: [index, 'id'] });
      }
      ids.add(entry.id);
    });
  }),
});

/* ---------- Fechas y caducidad ---------- */

function parseDay(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  return { y, m, d };
}

/** Meses completos transcurridos entre dos fechas AAAA-MM-DD. */
export function monthsBetween(from, to) {
  const a = parseDay(from);
  const b = parseDay(to);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months -= 1;
  return months;
}

/** Fecha local AAAA-MM-DD (zona del navegador). */
export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** «2026-09-28» → «28/09/2026». */
export function formatDateEs(value) {
  const { y, m, d } = parseDay(value);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/** 6 → «6 €»; 1.8 → «1,80 €». */
export function formatEuros(value) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
  return `${text} €`;
}

/**
 * Vigencia de un bloque de precios en una fecha:
 * - `fresh`: se muestra;
 * - `aging`: se muestra marcado en ámbar (desde PRICE_FLAG_MONTHS);
 * - `expired`: no se muestra (desde PRICE_MAX_MONTHS, o año vencido si es precio público).
 */
export function priceFreshness(prices, today) {
  if (prices.sourceType === 'official') {
    return Number(today.slice(0, 4)) > prices.validYear ? 'expired' : 'fresh';
  }
  const age = monthsBetween(prices.sourceDate, today);
  if (age >= PRICE_MAX_MONTHS) return 'expired';
  if (age >= PRICE_FLAG_MONTHS) return 'aging';
  return 'fresh';
}

/** Un estado («cerrado temporalmente») deja de mostrarse con la misma caducidad. */
export function statusIsCurrent(status, today) {
  return monthsBetween(status.checkedAt, today) < PRICE_MAX_MONTHS;
}

export const SOURCE_TYPE_LABEL = {
  official: 'Ayuntamiento de Madrid',
  venue: 'web del local',
  google: 'Google',
};
