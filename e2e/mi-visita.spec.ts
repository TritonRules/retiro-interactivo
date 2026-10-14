import { expect, test } from '@playwright/test';

// Chromium headless no expone WebGL2 por defecto: SwiftShader por software basta.
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

test.beforeEach(async ({ page }) => {
  await page.route(/tiles\.openfreemap\.org/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        sources: {},
        layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e8efe4' } }],
      }),
    }),
  );
  await page.route(/(ytimg\.com|youtube\.com|youtube-nocookie\.com)/, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
});

test('guardar → Mi visita → empezar ruta propia (390×844)', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 40.415227, longitude: -3.688, accuracy: 8 });

  for (const slug of ['palacio-de-cristal', 'estanque-grande']) {
    await page.goto(`?lugar=${slug}`, { waitUntil: 'domcontentloaded' });
    const save = page.getByRole('button', { name: /^Guardar .* en Mi visita$/ });
    await save.click();
    await expect(page.getByRole('button', { name: /^Quitar .* de Mi visita$/ })).toHaveText(
      /Guardado/,
    );
  }
  await page.getByRole('button', { name: 'Cerrar ficha del lugar' }).click();
  await expect(page.getByRole('button', { name: /Favoritos \(2\)/ })).toBeVisible();

  // Sobrevive a datos de otra versión o ids retirados.
  await page.evaluate(() => {
    const key = 'retiro-interactivo:mi-visita:v1';
    const data = JSON.parse(localStorage.getItem(key)!);
    data.items.push({ kind: 'place', id: 'lugar-retirado', savedAt: 1 });
    localStorage.setItem(key, JSON.stringify(data));
  });

  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Mi visita' })
    .click();
  await expect(page.getByRole('heading', { name: 'Mi visita', level: 1 })).toBeVisible();
  await expect(page.locator('.mi-visita__item')).toHaveCount(2);
  await expect(page.getByTestId('mi-visita-resumen')).toContainText('2 paradas');
  // El orden empieza por lo más cercano a la puerta elegida: el Estanque antes que el Palacio.
  await expect(page.locator('.mi-visita__stops li').first()).toHaveText(/Estanque Grande/);

  await page.getByRole('link', { name: 'Empezar ruta' }).click();
  const panel = page.getByRole('region', { name: 'Modo paseo' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Parada 1 de 2');
  await expect(page.locator('.route-stop-marker')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('quitar un favorito desde Mi visita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('mi-visita/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Aún no has guardado nada')).toBeVisible();
  await page.getByRole('button', { name: /Imprescindibles/ }).click();
  const count = await page.locator('.mi-visita__item').count();
  expect(count).toBeGreaterThan(2);
  await page
    .locator('.mi-visita__item')
    .first()
    .getByRole('button', { name: /^Quitar/ })
    .click();
  await expect(page.locator('.mi-visita__item')).toHaveCount(count - 1);
});
