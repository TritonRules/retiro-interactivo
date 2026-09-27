import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Paradas reales de «El Retiro imprescindible» [lat, lon] (src/data/places.json), con un
// pequeño desplazamiento hacia el camino para no usar la coordenada exacta de la parada.
const STOPS = {
  felipeIV: { latitude: 40.415275, longitude: -3.68865 },
  parterre: { latitude: 40.41525, longitude: -3.68735 },
  estanque: { latitude: 40.41665, longitude: -3.68405 },
  alfonsoXII: { latitude: 40.41745, longitude: -3.68295 },
  cristal: { latitude: 40.41375, longitude: -3.68195 },
  angelCaido: { latitude: 40.41115, longitude: -3.68245 },
};
// Punto del trazado entre la Puerta de Felipe IV y el Parterre (~50 m de ambos).
const BETWEEN_FIRST_STOPS = { latitude: 40.415227, longitude: -3.688 };
const BARCELONA = { latitude: 41.3874, longitude: 2.1686 };

test.beforeEach(async ({ page }) => {
  await page.route(/(ytimg\.com|youtube\.com|youtube-nocookie\.com)/, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
});

async function moveTo(context: BrowserContext, coords: { latitude: number; longitude: number }) {
  await context.setGeolocation({ ...coords, accuracy: 8 });
}

function walkPanel(page: Page) {
  return page.getByRole('region', { name: 'Modo paseo' });
}

test.describe('modo paseo guiado', () => {
  test('empieza desde la ficha de la ruta, avanza al llegar y termina', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(['geolocation']);
    await moveTo(context, BETWEEN_FIRST_STOPS);

    await page.goto('rutas/retiro-imprescindible/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Empezar ruta' }).click();

    const panel = walkPanel(page);
    await expect(panel).toBeVisible();
    await expect(page).not.toHaveURL(/paseo=/);
    await expect(page).toHaveURL(/ruta=retiro-imprescindible/);
    await expect(page.getByRole('region', { name: 'Ruta activa' })).toHaveCount(0);
    await expect(panel).toContainText('Parada 1 de 6');
    await expect(panel.locator('.walk-panel__stop')).toHaveText('Puerta de Felipe IV');
    await expect(panel.getByTestId('walk-distance')).toHaveText(/^\d+ m · ~1 min a pie$/);

    // Llegada a la primera parada: se marca, se abre su ficha y se avanza.
    await moveTo(context, STOPS.felipeIV);
    await expect(panel).toContainText('Has llegado a Puerta de Felipe IV');
    await expect(page.getByRole('dialog')).toContainText('Puerta de Felipe IV');
    await expect(panel).toContainText('Parada 2 de 6');
    await expect(panel.locator('.walk-panel__stop')).toHaveText('Parterre Francés');

    await moveTo(context, STOPS.parterre);
    await expect(panel).toContainText('Parada 3 de 6');
    await expect(page.getByRole('dialog')).toContainText('Parterre Francés');

    // Saltar y volver atrás a mano.
    await panel.getByRole('button', { name: 'Saltar parada' }).click();
    await expect(panel.locator('.walk-panel__stop')).toHaveText('Monumento a Alfonso XII');
    await panel.getByRole('button', { name: 'Parada anterior' }).click();
    await expect(panel.locator('.walk-panel__stop')).toHaveText('Estanque Grande del Retiro');

    // Una parada lejana no cuenta hasta llegar a la siguiente en orden.
    await moveTo(context, STOPS.cristal);
    await expect(panel).toContainText('Parada 3 de 6');

    await moveTo(context, STOPS.estanque);
    await expect(panel).toContainText('Parada 4 de 6');
    await moveTo(context, STOPS.alfonsoXII);
    await expect(panel).toContainText('Parada 5 de 6');

    // Palacio de Cristal: la ficha llega con su bloque de vídeo (datos e2e).
    await moveTo(context, STOPS.cristal);
    await expect(panel).toContainText('Parada 6 de 6');
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Palacio de Cristal' })).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Vídeos' })).toBeVisible();

    await moveTo(context, STOPS.angelCaido);
    await expect(panel).toContainText('Ruta completada');
    await expect(panel).toContainText('Has visitado 6 de 6 paradas');
    await expect(page.getByRole('dialog')).toContainText('Fuente del Ángel Caído');

    await panel.getByRole('button', { name: 'Terminar' }).click();
    await expect(walkPanel(page)).toHaveCount(0);
    const card = page.getByRole('region', { name: 'Ruta activa' });
    await expect(card.getByRole('button', { name: 'Empezar ruta' })).toBeVisible();
  });

  test('permiso denegado: aviso claro y modo demostración', async ({ page }) => {
    // Sin conceder el permiso, Chromium de Playwright deniega la geolocalización.
    await page.goto('?ruta=retiro-imprescindible', { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('region', { name: 'Ruta activa' })
      .getByRole('button', { name: 'Empezar ruta' })
      .click();
    const panel = walkPanel(page);
    await expect(panel.getByRole('status')).toContainText('Permiso de ubicación denegado');
    await expect(panel.getByTestId('walk-distance')).toHaveText('Distancia no disponible');

    await panel.getByRole('button', { name: 'Modo demostración' }).click();
    await expect(panel).toContainText('Demostración');
    await expect(panel).toContainText('Has llegado a Puerta de Felipe IV');
    await expect(panel.locator('.walk-panel__stop')).toHaveText('Parterre Francés');
    // La simulación avanza sola por el trazado hasta la siguiente parada.
    await expect(panel).toContainText('Has llegado a Parterre Francés', { timeout: 30_000 });
    await expect(panel).toContainText('Parada 3 de 6');
  });

  test('fuera del Retiro se ofrece el modo demostración', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await moveTo(context, BARCELONA);
    await page.goto('?ruta=retiro-imprescindible&paseo=1', { waitUntil: 'domcontentloaded' });
    const panel = walkPanel(page);
    await expect(panel.getByRole('status')).toContainText('Parece que estás fuera del Retiro');
    await expect(panel.getByRole('button', { name: 'Modo demostración' })).toBeVisible();
    await expect(panel).toContainText('Parada 1 de 6');
  });

  test('sin WebGL el panel sigue funcionando', async ({ page, context }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...args: unknown[]
      ) {
        if (/webgl/i.test(type)) return null;
        return (original as (...a: unknown[]) => RenderingContext | null).call(this, type, ...args);
      } as typeof original;
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await context.grantPermissions(['geolocation']);
    await moveTo(context, STOPS.felipeIV);

    await page.goto('?ruta=retiro-imprescindible&paseo=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('alert')).toContainText('No se puede mostrar el mapa');
    const panel = walkPanel(page);
    await expect(panel).toContainText('Parada 2 de 6');
    await expect(page.getByRole('dialog')).toContainText('Puerta de Felipe IV');
    await moveTo(context, STOPS.parterre);
    await expect(panel).toContainText('Parada 3 de 6');
    expect(errors).toEqual([]);
  });
});
