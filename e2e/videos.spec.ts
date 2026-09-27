import { expect, test } from '@playwright/test';

// Los datos e2e (e2e/fixtures/videos.json) dan un vídeo al Palacio de Cristal y a la
// ruta imprescindible. Nada de YouTube sale a la red durante el test.
test.beforeEach(async ({ page }) => {
  await page.route(/(ytimg\.com|youtube\.com|youtube-nocookie\.com)/, (route) =>
    route.fulfill({ status: 204, body: '' }),
  );
});

test.describe('vídeos de lugares y rutas', () => {
  test('sin vídeos no hay bloque', async ({ page }) => {
    await page.goto('?lugar=palacio-de-velazquez', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Palacio de Velázquez/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vídeos' })).toHaveCount(0);

    await page.goto('lugares/palacio-de-velazquez/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vídeos' })).toHaveCount(0);
  });

  test('ficha del mapa: miniatura primero, iframe nocookie solo tras el clic', async ({ page }) => {
    await page.goto('?lugar=palacio-de-cristal', { waitUntil: 'domcontentloaded' });
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { name: 'Vídeos' })).toBeVisible();
    await expect(sheet.locator('iframe')).toHaveCount(0);
    await expect(sheet.getByRole('link', { name: /Ver en YouTube/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    );

    const play = sheet.getByRole('button', {
      name: 'Reproducir vídeo: Vídeo de prueba del Palacio de Cristal',
    });
    await play.focus();
    await page.keyboard.press('Enter');
    const frame = sheet.locator('iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/,
    );
    await expect(frame).toHaveAttribute('title', 'Vídeo de prueba del Palacio de Cristal');
  });

  test('página del lugar y de la ruta muestran el bloque', async ({ page }) => {
    await page.goto('lugares/palacio-de-cristal/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Vídeos', level: 2 })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);

    await page.goto('rutas/retiro-imprescindible/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Vídeos', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: /Reproducir vídeo: Vídeo de prueba de la ruta/ }).click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/aqz-KE-bpKQ"]')).toHaveCount(1);

    await page.goto('?ruta=retiro-imprescindible', { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('region', { name: 'Ruta activa' });
    await expect(card.getByRole('heading', { name: 'Vídeos' })).toBeVisible();
    await expect(card.locator('iframe')).toHaveCount(0);
  });
});
