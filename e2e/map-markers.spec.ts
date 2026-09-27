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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_STYLE) }),
  );
});

async function markerScale(page: Page): Promise<number> {
  return page
    .locator('.mapa-canvas')
    .evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--marker-scale') || '1'));
}

async function zoomTimes(page: Page, name: 'Acercar mapa' | 'Alejar mapa', times: number) {
  for (let i = 0; i < times; i += 1) {
    await page.getByRole('button', { name }).click();
    await page.waitForTimeout(350);
  }
}

test.describe('iconos del mapa adaptados al zoom', () => {
  test('encogen y se pliegan a punto al alejar; recuperan tamaño al acercar', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('', { waitUntil: 'domcontentloaded' });

    const markers = page.locator('.maplibregl-marker.place-marker');
    await expect(markers.first()).toBeVisible({ timeout: 30_000 });
    await expect(markers.first()).toHaveAttribute('data-marker-state', /full|dot/);

    // Todos los marcadores posicionados por MapLibre (ninguno en flujo normal).
    const positions = await markers.evaluateAll((els) =>
      [...new Set(els.map((el) => getComputedStyle(el).position))],
    );
    expect(positions).toEqual(['absolute']);

    await zoomTimes(page, 'Alejar mapa', 1);
    await expect.poll(() => markerScale(page)).toBeLessThan(0.75);
    await expect.poll(() => page.locator('[data-marker-state="dot"]').count()).toBeGreaterThan(0);
    // Los icónicos no ceden.
    await expect(page.getByRole('button', { name: 'Abrir ficha de Estanque Grande del Retiro' })).toHaveAttribute(
      'data-marker-state',
      'full',
    );

    // Un punto sigue siendo un botón accesible que abre la ficha.
    const dot = page.locator('[data-marker-state="dot"]').first();
    await expect(dot).toHaveAttribute('aria-label', /Abrir ficha/);
    await dot.dispatchEvent('click');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Cerrar/ }).first().click();

    await zoomTimes(page, 'Acercar mapa', 3);
    await expect.poll(() => markerScale(page)).toBe(1);

    // Área táctil de 44 px a tamaño completo.
    const box = await page.locator('[data-marker-state="full"]').first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    // Los filtros siguen funcionando.
    await page.getByLabel('Mostrar servicios').check();
    await expect(page.locator('.place-marker--service').first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  test('el lugar seleccionado sigue visible y a tamaño completo al alejar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?lugar=palacio-de-cristal', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Palacio de Cristal/i })).toBeVisible();

    const selected = page.getByRole('button', { name: 'Abrir ficha de Palacio de Cristal' });
    await expect(selected).toHaveClass(/is-active/, { timeout: 30_000 });
    await page.waitForTimeout(800);
    await zoomTimes(page, 'Alejar mapa', 4);
    await expect.poll(() => markerScale(page)).toBeLessThan(0.75);

    await expect(selected).toHaveAttribute('data-marker-state', 'full');
    const shapeScale = await selected
      .locator('.place-marker__shape')
      .evaluate((el) => getComputedStyle(el).scale);
    expect(['1', 'none']).toContain(shapeScale);
  });
});
