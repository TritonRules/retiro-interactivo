import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ServiceSheet } from '../components/places/ServiceSheet';
import type { ParkService } from '../types/service';
import {
  AGGREGATOR_HOSTS,
  formatDateEs,
  formatEuros,
  monthsBetween,
  priceFreshness,
  serviceInfoDatasetSchema,
  serviceInfoSchema,
  statusIsCurrent,
  type ServiceInfo,
  type ServicePrices,
} from './serviceInfo.shared.mjs';
import { applyServiceInfo, serviceInfoList, services } from './services';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');
const stylesheets = ['src/styles/global.css', 'src/styles/map.css'].map(read).join('\n');
const raw = JSON.parse(read('src/data/services-info.json'));

const BARCAS = 'osm-node-3274328970';
const VIVAZ = 'osm-way-194853751';
const ROSALEDA = 'osm-way-467641934';
const FLORIDA = 'osm-way-722360392';
const NACIONAL = 'osm-way-243351606';
const HELADERIA_MEJICO = 'osm-node-3135948608';
const LA_GRUTA = 'osm-way-562746418';

const byId = (id: string) => {
  const service = services.find((s) => s.id === id);
  if (!service) throw new Error(`falta ${id}`);
  return service;
};

const render = (service: ParkService, today = '2026-10-03') =>
  renderToStaticMarkup(
    createElement(ServiceSheet, { service, onClose: () => {}, variant: 'mobile', today }),
  );

function unstyledClasses(markup: string): string[] {
  const classes = new Set<string>();
  for (const attr of markup.matchAll(/class="([^"]*)"/g)) {
    attr[1]
      .split(/\s+/)
      .filter(Boolean)
      .forEach((name) => classes.add(name));
  }
  return [...classes].filter((name) => !new RegExp(`\\.${name}\\b`).test(stylesheets));
}

const venuePrices = (sourceDate: string): ServicePrices => ({
  sourceType: 'venue',
  sourceDate,
  checkedAt: '2026-09-28',
  sourceLabel: 'carta',
  sourceUrl: 'https://example.org/carta.pdf',
  currency: 'EUR',
  items: [{ item: 'Café', price: 2 }],
});

describe('services-info.json', () => {
  it('cumple el esquema y todos los ids existen', () => {
    const parsed = serviceInfoDatasetSchema.safeParse(raw);
    expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
    const ids = new Set(services.map((s) => s.id));
    for (const info of serviceInfoList) expect(ids.has(info.id), info.id).toBe(true);
  });

  it('solo incluye los locales con datos fiables (sin La Gruta ni agregadores)', () => {
    expect(serviceInfoList.map((i) => i.id).sort()).toEqual(
      [BARCAS, VIVAZ, ROSALEDA, FLORIDA, NACIONAL, HELADERIA_MEJICO].sort(),
    );
    expect(serviceInfoList.find((i) => i.id === LA_GRUTA)).toBeUndefined();
    const urls = JSON.stringify(raw).match(/https?:\/\/[^"]+/g) ?? [];
    for (const url of urls) {
      const host = new URL(url).hostname;
      expect(
        AGGREGATOR_HOSTS.some((bad) => host.includes(bad)),
        url,
      ).toBe(false);
    }
    expect(urls.some((url) => url.includes('floridaretiro.com'))).toBe(false);
  });

  it('rechaza precios de agregadores, sin fecha o precios públicos sin año', () => {
    const base: ServiceInfo = { id: 'x', prices: venuePrices('2026-09-01') };
    expect(serviceInfoSchema.safeParse(base).success).toBe(true);
    const aggregator = { ...base, prices: { ...base.prices!, sourceUrl: 'https://carta.menu/x' } };
    expect(serviceInfoSchema.safeParse(aggregator).success).toBe(false);
    const { sourceDate: _omit, ...undated } = base.prices!;
    expect(serviceInfoSchema.safeParse({ ...base, prices: undated }).success).toBe(false);
    const official = { ...base, prices: { ...base.prices!, sourceType: 'official' } };
    expect(serviceInfoSchema.safeParse(official).success).toBe(false);
  });

  it('las barcas llevan los precios públicos 2026 y la motora no se asigna al Barco Solar', () => {
    const barcas = byId(BARCAS).info!;
    expect(barcas.prices?.sourceType).toBe('official');
    expect(barcas.prices?.validYear).toBe(2026);
    expect(barcas.prices?.items.map((i) => i.price)).toEqual([6, 8, 1.8]);
    expect(barcas.phone?.tel).toBe('+34915744024');
    expect(byId('osm-node-9872610414').info).toBeUndefined();
  });

  it('aplica nombre, web y carta verificados', () => {
    expect(byId(ROSALEDA).name).toBe('Vivaz La Rosaleda');
    expect(byId(ROSALEDA).mapLabel).toBe('Vivaz La Rosaleda');
    expect(byId(FLORIDA).website).toBe('https://www.floridapark.es/');
    expect(byId(VIVAZ).menuUrl).toMatch(/smartmenu\.agorapos\.com/);
    const plain = { id: 'a', name: 'A' } as ParkService;
    expect(applyServiceInfo([plain], serviceInfoList)).toEqual([plain]);
  });
});

describe('caducidad de precios', () => {
  it('cuenta meses completos', () => {
    expect(monthsBetween('2025-12-06', '2026-09-05')).toBe(8);
    expect(monthsBetween('2025-12-06', '2026-09-06')).toBe(9);
    expect(monthsBetween('2025-12-06', '2026-12-05')).toBe(11);
    expect(monthsBetween('2025-12-06', '2026-12-06')).toBe(12);
  });

  it('marca desde 9 meses y oculta desde 12', () => {
    expect(priceFreshness(venuePrices('2026-02-16'), '2026-10-03')).toBe('fresh');
    expect(priceFreshness(venuePrices('2025-12-06'), '2026-10-03')).toBe('aging');
    expect(priceFreshness(venuePrices('2025-12-06'), '2026-12-06')).toBe('expired');
  });

  it('los precios públicos valen durante su año', () => {
    const official = {
      ...venuePrices('2026-03-16'),
      sourceType: 'official',
      validYear: 2026,
    } as const;
    expect(priceFreshness(official, '2026-12-31')).toBe('fresh');
    expect(priceFreshness(official, '2027-01-01')).toBe('expired');
  });

  it('el estado «cerrado temporalmente» también caduca a los 12 meses', () => {
    const status = {
      value: 'temporarily-closed',
      sourceType: 'google',
      checkedAt: '2026-09-28',
    } as const;
    expect(statusIsCurrent(status, '2027-09-27')).toBe(true);
    expect(statusIsCurrent(status, '2027-09-28')).toBe(false);
  });

  it('formatea fechas y euros en español', () => {
    expect(formatDateEs('2026-09-28')).toBe('28/09/2026');
    expect(formatEuros(6)).toBe('6 €');
    expect(formatEuros(1.8)).toBe('1,80 €');
    expect(formatEuros(9.9)).toBe('9,90 €');
  });
});

describe('ficha de servicio con información verificada', () => {
  it('barcas: precio público sin «orientativo», horario oficial y teléfono', () => {
    const markup = render(byId(BARCAS));
    expect(markup).toContain('Barcas del Estanque');
    expect(markup).toContain('Precio público 2026 · Ayuntamiento');
    expect(markup).not.toContain('orientativo');
    expect(markup).toContain('6 €');
    expect(markup).toContain('8 €');
    expect(markup).toContain('1,80 €');
    expect(markup).toContain('45 min · máx. 4 personas');
    expect(markup).toContain('10:00–14:00 y 15:15–puesta de sol');
    expect(markup).toContain('según el Ayuntamiento, 28/09/2026');
    expect(markup).toContain('href="tel:+34915744024"');
    expect(markup).not.toContain('según OpenStreetMap');
    expect(unstyledClasses(markup)).toEqual([]);
    // En 2027 el precio de 2026 deja de mostrarse.
    expect(render(byId(BARCAS), '2027-01-02')).not.toContain('Precio público');
  });

  it('Vivaz: precio orientativo con fecha, carta, horario del local y «puede variar»', () => {
    const markup = render(byId(VIVAZ));
    expect(markup).toContain('Precio orientativo · carta del local · consultado el 28/09/2026');
    expect(markup).toContain('Café con leche');
    expect(markup).toContain('2,80 €');
    expect(markup).toContain('lun–vie 13:00–21:30 · sáb, dom 11:00–21:30');
    expect(markup).toContain('según la web del local, 28/09/2026 · puede variar');
    expect(markup).toContain('href="tel:+34644005669"');
    expect(markup).toContain('Café de comercio justo');
    expect(markup).toMatch(/>Carta</);
    expect(markup).toContain('data-price-freshness="fresh"');
    expect(unstyledClasses(markup)).toEqual([]);
  });

  it('Vivaz La Rosaleda: indica la fecha de la carta y que el horario es de Google', () => {
    const markup = render(byId(ROSALEDA));
    expect(markup).toContain('carta del 16/02/2026');
    expect(markup).toContain('según Google, 28/09/2026');
  });

  it('Florida Park: carta de más de 9 meses en ámbar y oculta al cumplir 12', () => {
    const markup = render(byId(FLORIDA));
    expect(markup).toContain('data-price-freshness="aging"');
    expect(markup).toContain('ficha__prices--aging');
    expect(markup).toContain('los precios pueden haber cambiado');
    expect(markup).toContain('carta del 06/12/2025');
    expect(markup).toContain('Pincho de tortilla');
    expect(markup).toContain('href="tel:+34918275275"');
    const later = render(byId(FLORIDA), '2026-12-06');
    expect(later).not.toContain('Pincho de tortilla');
    expect(later).not.toContain('Precio orientativo');
    expect(later).toContain('href="tel:+34918275275"');
  });

  it('Nacional Retiro: horario de la web, sin precios', () => {
    const markup = render(byId(NACIONAL));
    expect(markup).toContain('lun–dom 11:00–21:00');
    expect(markup).toContain('puede variar');
    expect(markup).not.toContain('Precio');
    expect(markup).toContain('href="https://nacionalretiro.com/"');
  });

  it('heladería de la avenida de Méjico: cerrado temporalmente según Google, con fecha', () => {
    const markup = render(byId(HELADERIA_MEJICO));
    expect(markup).toContain('Cerrado temporalmente');
    expect(markup).toContain('según Google,');
    expect(markup).toContain('28/09/2026');
    expect(markup).toContain('Casa Remigio');
    expect(render(byId(HELADERIA_MEJICO), '2027-10-01')).not.toContain('Cerrado temporalmente');
    expect(unstyledClasses(markup)).toEqual([]);
  });

  it('La Gruta no muestra precios', () => {
    expect(render(byId(LA_GRUTA))).not.toMatch(/Precio|€/);
  });
});
