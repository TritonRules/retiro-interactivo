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

    // Página de ruta: desplegado por defecto, con selector y escenario por defecto «Soleado».
    await page.goto('rutas/retiro-imprescindible/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Vídeos', level: 2 })).toBeVisible();
    const group = page.getByRole('radiogroup', { name: 'Escenario del vídeo' });
    await expect(group.getByRole('radio', { name: 'Soleado' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page
      .getByRole('button', { name: /Reproducir vídeo: Vídeo de prueba de la ruta · Soleado/ })
      .click();
    await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/aqz-KE-bpKQ"]')).toHaveCount(
      1,
    );
  });
});

test.describe('escenarios en la tarjeta de ruta', () => {
  test('plegado por defecto, se despliega y el selector cambia de vídeo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?ruta=retiro-imprescindible', { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('region', { name: 'Ruta activa' });
    const toggle = card.locator('button.videos__toggle');
    await expect(toggle).toHaveAccessibleName(/Ver vídeos del recorrido/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText('3 vídeos · Lluvia, Soleado, Otoño');
    await expect(card.getByRole('radiogroup')).toHaveCount(0);
    await expect(card.locator('img.video__thumb')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAccessibleName(/Ocultar vídeos/);
    const group = card.getByRole('radiogroup', { name: 'Escenario del vídeo' });
    const soleado = group.getByRole('radio', { name: 'Soleado' });
    await expect(soleado).toHaveAttribute('aria-checked', 'true');
    await expect(card.locator('.video__title')).toHaveText('Vídeo de prueba de la ruta · Soleado');
    await expect(card.locator('img.video__thumb')).toHaveAttribute('src', /\/vi\/aqz-KE-bpKQ\//);
    await expect(card.locator('iframe')).toHaveCount(0);

    await group.getByRole('radio', { name: 'Lluvia' }).click();
    await expect(card.locator('.video__title')).toHaveText('Vídeo de prueba de la ruta · Lluvia');
    await expect(card.locator('img.video__thumb')).toHaveAttribute('src', /\/vi\/eRsGyueVLvQ\//);
    await expect(card.locator('iframe')).toHaveCount(0);

    // Reproducir y cambiar de escenario vuelve a la miniatura.
    await card.getByRole('button', { name: /Reproducir vídeo: .*Lluvia/ }).click();
    await expect(card.locator('iframe[src*="embed/eRsGyueVLvQ"]')).toHaveCount(1);
    await group.getByRole('radio', { name: 'Otoño' }).click();
    await expect(card.locator('iframe')).toHaveCount(0);
    await expect(card.locator('.video__title')).toHaveText('Vídeo de prueba de la ruta · Otoño');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(card.getByRole('radiogroup')).toHaveCount(0);
  });

  test('teclado: Enter despliega y las flechas cambian de escenario', async ({ page }) => {
    await page.goto('?ruta=retiro-imprescindible', { waitUntil: 'domcontentloaded' });
    const card = page.getByRole('region', { name: 'Ruta activa' });
    const toggle = card.getByRole('button', { name: /Ver vídeos del recorrido/ });
    await toggle.focus();
    await page.keyboard.press('Enter');
    const group = card.getByRole('radiogroup', { name: 'Escenario del vídeo' });
    await expect(group).toBeVisible();

    // Solo la opción marcada está en el orden de tabulación.
    await page.keyboard.press('Tab');
    await expect(group.getByRole('radio', { name: 'Soleado' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    const otono = group.getByRole('radio', { name: 'Otoño' });
    await expect(otono).toBeFocused();
    await expect(otono).toHaveAttribute('aria-checked', 'true');
    await expect(card.locator('.video__title')).toHaveText('Vídeo de prueba de la ruta · Otoño');
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Lluvia' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(otono).toHaveAttribute('aria-checked', 'true');

    await page.keyboard.press('Tab');
    await expect(card.getByRole('button', { name: /Reproducir vídeo: .*Otoño/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(card.locator('iframe[src*="embed/WhWc3b3KhnY"]')).toHaveCount(1);
  });

  test('deep link ?escenario= abre la tarjeta en ese escenario', async ({ page }) => {
    await page.goto('?ruta=retiro-imprescindible&escenario=lluvia', {
      waitUntil: 'domcontentloaded',
    });
    const card = page.getByRole('region', { name: 'Ruta activa' });
    await expect(card.getByRole('button', { name: /Ocultar vídeos/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(card.getByRole('radio', { name: 'Lluvia' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(card.locator('iframe')).toHaveCount(0);
    await expect(page).toHaveURL(/escenario=lluvia/);

    // Escenario desconocido: se ignora y la tarjeta sigue plegada.
    await page.goto('?ruta=retiro-imprescindible&escenario=granizo', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('region', { name: 'Ruta activa' }).getByRole('button', { name: /Ver vídeos/ }),
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
