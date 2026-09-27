import { expect, test } from '@playwright/test';

test.describe('service worker', () => {
  test('ficha visitada queda en caché; una no visitada no es la shell', async ({ page, context }) => {
    await page.goto('agenda/expo-retiro-bic/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Exposición BIC del Retiro' })).toBeVisible();

    await page.waitForFunction(async () => {
      const ready = await navigator.serviceWorker.ready;
      return Boolean(ready);
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Exposición BIC del Retiro' })).toBeVisible();

    await context.setOffline(true);
    await page.goto('agenda/expo-retiro-bic/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Exposición BIC del Retiro' })).toBeVisible();
    await expect(page.locator('h1.sr-only')).toHaveCount(0);

    await page.goto('agenda/ruta-libros-vivos/', { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1');
    await expect(heading).not.toContainText('mapa del Parque del Retiro');
  });
});
