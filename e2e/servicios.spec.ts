import { expect, test, type Page } from '@playwright/test';

// Chromium headless no expone WebGL2 por defecto: SwiftShader por software basta.
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

// Estilo mínimo local: el test no depende de las teselas de OpenFreeMap.
const EMPTY_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e8efe4' } }],
};

test.beforeEach(async ({ page }) => {
  await page.route(/tiles\.openfreemap\.org/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(EMPTY_STYLE),
    }),
  );
});

async function zoomTimes(page: Page, name: 'Acercar mapa' | 'Alejar mapa', times: number) {
  for (let i = 0; i < times; i += 1) {
    await page.getByRole('button', { name }).click();
    await page.waitForTimeout(350);
  }
}

const shown = (page: Page, subtype: string) =>
  page.locator(`.place-marker--service[data-service-subtype="${subtype}"]:not(.is-hidden)`);
const hidden = (page: Page, subtype: string) =>
  page.locator(`.place-marker--service[data-service-subtype="${subtype}"].is-hidden`);

test.describe('servicios del Retiro en el mapa', () => {
  test('aparecen al acercar, con pictograma por tipo, y abren una ficha compacta', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.maplibregl-marker.place-marker').first()).toBeVisible({
      timeout: 30_000,
    });

    // Zoom inicial (15,2): servicios cargados pero ocultos, con aviso.
    await expect(page.getByLabel('Mostrar servicios')).toBeChecked();
    await expect(hidden(page, 'cafe').first()).toBeAttached();
    await expect(shown(page, 'cafe')).toHaveCount(0);
    await expect(page.getByText('acerca para ver servicios')).toBeVisible();

    // Un nivel más: comer, aseos y parques infantiles; el agua todavía no.
    await zoomTimes(page, 'Acercar mapa', 1);
    await expect.poll(() => shown(page, 'cafe').count()).toBeGreaterThan(0);
    await expect.poll(() => shown(page, 'aseo').count()).toBeGreaterThan(0);
    await expect.poll(() => shown(page, 'parque-infantil').count()).toBeGreaterThan(0);
    await expect(shown(page, 'agua')).toHaveCount(0);
    await expect(page.getByText('acerca para ver servicios')).toHaveCount(0);

    // Otro nivel: también fuentes y gimnasios.
    await zoomTimes(page, 'Acercar mapa', 1);
    await expect.poll(() => shown(page, 'agua').count()).toBeGreaterThan(0);
    await expect.poll(() => shown(page, 'gimnasio').count()).toBeGreaterThan(0);

    // Cada servicio lleva su pictograma SVG y un área táctil de 44 px.
    const cafe = page.getByRole('button', { name: 'Abrir ficha del servicio Nacional Retiro' });
    await expect(cafe.locator('svg.place-marker__glyph--service')).toBeAttached();
    await cafe.dispatchEvent('click');
    const sheet = page.getByRole('dialog', { name: 'Nacional Retiro' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Cafetería');
    await expect(sheet).toContainText('Horario');
    await expect(sheet).toContainText('lun–dom');
    await expect(sheet).toContainText('Accesible en silla de ruedas');
    await expect(sheet.getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute(
      'href',
      /google\.com\/maps\/dir\/.*travelmode=walking/,
    );
    await expect(sheet.getByRole('link', { name: /OpenStreetMap/ })).toHaveAttribute(
      'href',
      /openstreetmap\.org\/way\//,
    );
    await expect(cafe).toHaveClass(/is-active/);
    const box = await cafe.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    await sheet.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(sheet).toHaveCount(0);

    // «Mostrar servicios» los quita del mapa.
    await page.getByLabel('Mostrar servicios').uncheck();
    await expect(page.locator('.place-marker--service')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('el filtro «Servicio» muestra chips por tipo y los enseña a cualquier zoom', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.maplibregl-marker.place-marker').first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /^Servicio \(\d+\)$/ }).click();
    const chips = page.getByRole('toolbar', { name: 'Filtrar servicios' });
    await expect(chips).toBeVisible();
    await chips.getByRole('button', { name: /^Aseos \(\d+\)$/ }).click();
    await expect(page).toHaveURL(
      /categoria=servicio&servicios=aseos|servicios=aseos.*categoria=servicio/,
    );

    const services = page.locator('.place-marker--service');
    await expect.poll(() => services.count()).toBeGreaterThan(5);
    const subtypes = await services.evaluateAll((els) => [
      ...new Set(els.map((el) => (el as HTMLElement).dataset.serviceSubtype)),
    ]);
    expect(subtypes).toEqual(['aseo']);
    // Sin ocultar por zoom: a zoom inicial se ven (a tamaño completo o como punto).
    await expect(page.locator('.place-marker--service.is-hidden')).toHaveCount(0);

    // Recargar conserva el chip elegido.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page
        .getByRole('toolbar', { name: 'Filtrar servicios' })
        .getByRole('button', { name: /^Aseos/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('toolbar', { name: 'Filtrar servicios' })
      .getByRole('button', { name: /^Comer y beber/ })
      .click();
    await expect.poll(() => services.count()).toBeGreaterThan(5);
    const food = await services.evaluateAll((els) => [
      ...new Set(els.map((el) => (el as HTMLElement).dataset.serviceSubtype)),
    ]);
    for (const subtype of food)
      expect(['cafe', 'bar', 'restaurante', 'helados', 'quiosco']).toContain(subtype);
    expect(errors).toEqual([]);
  });
});
