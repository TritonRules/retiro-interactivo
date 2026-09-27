import { expect, test } from '@playwright/test';

test.describe('mapa sin WebGL', () => {
  test.beforeEach(async ({ page }) => {
    // Simula un navegador sin WebGL2 (p. ej. Firefox headless en CI).
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
  });

  test('degrada con aviso accesible y mantiene fichas y controles', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('?lugar=palacio-de-cristal', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mapa-explorer')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'No se puede mostrar el mapa en este navegador',
    );
    await expect(page.getByRole('heading', { name: /Palacio de Cristal/i })).toBeVisible();
    await expect(page.getByText(/puntos? visibles/)).toBeVisible();

    await page.goto('?ruta=retiro-imprescindible', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mapa-explorer')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Ruta activa' })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
