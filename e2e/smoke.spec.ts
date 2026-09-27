import { expect, test } from '@playwright/test';

test.describe('smoke del candidato real', () => {
  test('agenda, fichas críticas y cinco rutas cargan', async ({ page }) => {
    await page.goto('', { waitUntil: 'networkidle' });
    await expect(page.locator('.mapa-explorer')).toBeVisible({ timeout: 30_000 });

    await page.goto('agenda/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Agenda del Retiro' })).toBeVisible();

    for (const path of [
      'lugares/palacio-de-cristal/',
      'lugares/palacio-de-velazquez/',
      'lugares/casa-de-vacas/',
      'lugares/biblioteca-eugenio-trias/',
      'lugares/teatro-titeres/',
      'lugares/centro-educacion-ambiental-retiro/',
      'lugares/aula-ambiental-la-cabana/',
    ]) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.ok(), path).toBeTruthy();
    }

    await page.goto('rutas/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Rutas/i })).toBeVisible();
    const routeLinks = page.locator('a[href*="/rutas/"]');
    expect(await routeLinks.count()).toBeGreaterThanOrEqual(5);

    await page.goto('?lugar=palacio-de-cristal', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mapa-explorer')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Palacio de Cristal/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('?ruta=retiro-imprescindible', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.mapa-explorer')).toBeVisible({ timeout: 30_000 });
  });
});
