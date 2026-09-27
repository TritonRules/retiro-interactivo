import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Chromium headless no expone WebGL2 por defecto: SwiftShader por software basta.
test.use({
  launchOptions: {
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

// Posiciones reales de «El Retiro imprescindible» [lat, lon].
const STOPS = {
  felipeIV: { latitude: 40.415275, longitude: -3.68865 },
  parterre: { latitude: 40.41525, longitude: -3.68735 },
};
const BETWEEN_FIRST_STOPS = { latitude: 40.415227, longitude: -3.688 };

async function moveTo(context: BrowserContext, coords: { latitude: number; longitude: number }) {
  await context.setGeolocation({ ...coords, accuracy: 8 });
}

function walkPanel(page: Page) {
  return page.getByRole('region', { name: 'Modo paseo' });
}

test.describe('modo paseo sobre el mapa', () => {
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
  });

  async function userOffsetFromCenterX(page: Page): Promise<number> {
    const canvas = await page.locator('.mapa-canvas').boundingBox();
    const dot = await page.locator('.place-marker--user').boundingBox();
    if (!canvas || !dot) return Infinity;
    return Math.abs(dot.x + dot.width / 2 - (canvas.x + canvas.width / 2));
  }

  test('punto en vivo que sigue al usuario; arrastrar pausa el seguimiento', async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(['geolocation']);
    await moveTo(context, BETWEEN_FIRST_STOPS);
    await page.goto('?ruta=retiro-imprescindible&paseo=1', { waitUntil: 'domcontentloaded' });

    const dot = page.locator('.place-marker--user');
    await expect(dot).toHaveCount(1);
    await expect.poll(() => userOffsetFromCenterX(page)).toBeLessThan(6);

    // Varias posiciones seguidas: el punto se mueve y el mapa lo sigue (sin quedarse atascado).
    await moveTo(context, STOPS.felipeIV);
    await expect(walkPanel(page)).toContainText('Parada 2 de 6');
    await moveTo(context, BETWEEN_FIRST_STOPS);
    await expect.poll(() => userOffsetFromCenterX(page)).toBeLessThan(6);
    await expect(page.locator('.route-stop-marker.is-visited')).toHaveCount(1);
    await expect(page.locator('.route-stop-marker.is-next')).toHaveText('2');

    // Arrastrar el mapa detiene el seguimiento y aparece «Centrar».
    await page.getByRole('button', { name: 'Cerrar ficha del lugar' }).click();
    const canvas = (await page.locator('.mapa-canvas').boundingBox())!;
    const cx = canvas.x + canvas.width / 2;
    const cy = canvas.y + canvas.height / 3;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 60, cy + 10, { steps: 6 });
    await page.mouse.move(cx - 140, cy + 20, { steps: 6 });
    await page.mouse.up();
    const recenter = page.getByRole('button', { name: 'Centrar en mi posición y seguirla' });
    await expect(recenter).toBeVisible();
    await moveTo(context, STOPS.parterre);
    await expect(walkPanel(page)).toContainText('Parada 3 de 6');
    await page.getByRole('button', { name: 'Cerrar ficha del lugar' }).click();
    await expect.poll(() => userOffsetFromCenterX(page)).toBeGreaterThan(40);

    await recenter.click();
    await expect(recenter).toHaveCount(0);
    await expect.poll(() => userOffsetFromCenterX(page)).toBeLessThan(6);

    await walkPanel(page).getByRole('button', { name: 'Terminar' }).click();
    await expect(dot).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
