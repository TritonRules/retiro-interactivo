import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Chromium headless no expone WebGL2 por defecto: SwiftShader por software basta.
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

type Coord = [number, number];
const places = JSON.parse(readFileSync(join(process.cwd(), 'src/data/places.json'), 'utf8')) as Array<{
  id: string;
  name: string;
  category: string;
  coordinates: Coord;
}>;
const routes = JSON.parse(readFileSync(join(process.cwd(), 'src/data/routes.json'), 'utf8')) as Array<{
  slug: string;
  stopIds: string[];
}>;
const placeById = new Map(places.map((place) => [place.id, place]));
const statues = places.filter((place) => place.category === 'escultura');
const ruta = routes.find((route) => route.slug === 'ruta-estatuas')!;

// Estilo mínimo local: el test no depende de las teselas de OpenFreeMap.
const EMPTY_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e8efe4' } }],
};

test.beforeEach(async ({ page }) => {
  await page.route(/tiles\.openfreemap\.org/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_STYLE) }),
  );
  await page.route(/(ytimg\.com|youtube\.com|youtube-nocookie\.com)/, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
});

async function zoomIn(page: Page, times: number) {
  for (let i = 0; i < times; i += 1) {
    await page.getByRole('button', { name: 'Acercar mapa' }).click();
    await page.waitForTimeout(350);
  }
}

function marker(page: Page, name: string) {
  return page.getByRole('button', { name: `Abrir ficha de ${name}`, exact: true });
}

test.describe('estatuas en el mapa', () => {
  test('aparecen por tramos de zoom y el filtro «Estatuas» las muestra todas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.maplibregl-marker.place-marker').first()).toBeVisible({ timeout: 30_000 });

    // Vista de parque (15,2): grandes monumentos sí, reyes y bustos todavía no.
    const campos = page.locator('.place-marker[aria-label="Abrir ficha de Monumento al General Martínez Campos"]');
    const fernando = page.locator('.place-marker[aria-label="Abrir ficha de Estatua de Fernando IV"]');
    await expect(campos).toHaveAttribute('data-marker-state', /full|dot/);
    await expect(fernando).toHaveAttribute('data-marker-state', 'hidden');
    await expect(fernando).toBeHidden();

    // De cerca aparecen también los reyes del Paseo de las Estatuas.
    await zoomIn(page, 2);
    await expect(fernando).toHaveAttribute('data-marker-state', /full|dot/);

    // Filtro propio: todas las estatuas, a cualquier zoom, y solo ellas.
    await page.getByRole('button', { name: `Estatuas (${statues.length})` }).click();
    await expect(page.locator('.maplibregl-marker.place-marker')).toHaveCount(statues.length);
    await expect(page.locator('.place-marker[data-marker-state="hidden"]')).toHaveCount(0);

    // Ficha con autoría y fecha.
    await marker(page, 'Monumento a Santiago Ramón y Cajal').dispatchEvent('click');
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Monumento a Santiago Ramón y Cajal' })).toBeVisible();
    await expect(sheet).toContainText('Victorio Macho · 1926');
    expect(errors).toEqual([]);
  });

  test('la página de una estatua muestra la obra y sus fuentes', async ({ page }) => {
    await page.goto('lugares/monumento-martinez-campos/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'La obra' })).toBeVisible();
    await expect(page.locator('.place-facts')).toContainText('Mariano Benlliure');
    await expect(page.locator('.place-facts')).toContainText('1907');
    await expect(page.locator('.place-layout__sources a').first()).toHaveAttribute('href', /openstreetmap\.org/);
  });
});

async function moveTo(context: BrowserContext, [longitude, latitude]: Coord) {
  await context.setGeolocation({ latitude, longitude, accuracy: 8 });
}

test.describe('Ruta de las estatuas en modo paseo', () => {
  test('recorre todas las paradas en orden hasta completar la ruta', async ({ page, context }) => {
    const total = ruta.stopIds.length;
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(['geolocation']);
    await moveTo(context, placeById.get(ruta.stopIds[0])!.coordinates);

    await page.goto('rutas/ruta-estatuas/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Ruta de las estatuas', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Empezar ruta' }).click();

    const panel = page.getByRole('region', { name: 'Modo paseo' });
    await expect(panel).toBeVisible();
    await expect(page.locator('.maplibregl-marker.route-stop-marker')).toHaveCount(total, { timeout: 30_000 });

    for (const [index, id] of ruta.stopIds.entries()) {
      const stop = placeById.get(id)!;
      if (index > 0) await moveTo(context, stop.coordinates);
      if (index < total - 1) {
        await expect(panel).toContainText(`Parada ${index + 2} de ${total}`);
      }
    }
    await expect(panel).toContainText('Ruta completada');
    await expect(panel).toContainText(`Has visitado ${total} de ${total} paradas`);
  });
});
