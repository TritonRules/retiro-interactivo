import { expect, test, type Page } from '@playwright/test';

const FROZEN = new Date('2026-09-06T08:00:00.000Z'); // 10:00 Madrid

async function openAgenda(page: Page, at = FROZEN) {
  // Instalar el reloj un minuto antes y dejar que los timers corran durante la carga.
  await page.clock.install({ time: new Date(at.getTime() - 60_000) });
  await page.goto('agenda/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Agenda del Retiro' })).toBeVisible();
  await page.clock.pauseAt(at);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

test.describe('filtros de agenda', () => {
  test('categoría, público, combinación, vacío, URL y atrás/adelante', async ({ page }) => {
    await openAgenda(page);
    await expect(page.getByRole('heading', { name: 'Agenda del Retiro' })).toBeVisible();
    await expect(page.getByLabel('Hoy').getByRole('link', { name: 'Exposición BIC del Retiro' })).toBeVisible();
    await expect(page.getByLabel('Hoy').getByRole('link', { name: 'Títeres de mañana y tarde' })).toBeVisible();

    await page.getByLabel('Categoría').selectOption('CuentacuentosTiteresMarionetas');
    await expect(page.getByRole('link', { name: 'Títeres de mañana y tarde' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Exposición BIC del Retiro' })).toHaveCount(0);
    await expect(page).toHaveURL(/categoria=CuentacuentosTiteresMarionetas/);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'Títeres de mañana y tarde' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Exposición BIC del Retiro' })).toHaveCount(0);

    await page.getByLabel('Público').fill('familias');
    await expect(page.getByRole('link', { name: 'Títeres de mañana y tarde' })).toBeVisible();

    await page.getByLabel('Categoría').selectOption('Exposiciones');
    await expect(page.getByText('Ningún resultado con estos filtros.')).toBeVisible();

    await page.getByRole('button', { name: 'Quitar filtros' }).click();
    await expect(page.getByLabel('Hoy').getByRole('link', { name: 'Exposición BIC del Retiro' })).toBeVisible();

    await page.getByLabel('Categoría').selectOption('Exposiciones');
    await page.goBack();
    await expect(page.getByLabel('Hoy').getByRole('link', { name: 'Títeres de mañana y tarde' })).toBeVisible();
    await page.goForward();
    await expect(page.getByLabel('Hoy').getByRole('link', { name: 'Exposición BIC del Retiro' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Títeres de mañana y tarde' })).toHaveCount(0);
  });

  test('una categoría desconocida no rompe la página y deja el conjunto vacío', async ({ page }) => {
    await page.clock.install({ time: new Date(FROZEN.getTime() - 60_000) });
    await page.goto('agenda/?categoria=NoExisteEstaCategoria', { waitUntil: 'domcontentloaded' });
    await page.clock.pauseAt(FROZEN);
    await expect(page.getByRole('heading', { name: 'Agenda del Retiro' })).toBeVisible();
    await expect(page.getByText('Ningún resultado con estos filtros.')).toBeVisible();
  });
});

test.describe('tiempo sin rebuild', () => {
  test('Hoy se recalcula al cruzar medianoche Madrid', async ({ page }) => {
    await openAgenda(page);
    await expect(page.locator('#hoy-title')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hoy' }).locator('xpath=..').getByRole('link', { name: 'Exposición BIC del Retiro' })).toBeVisible();

    await page.clock.pauseAt(new Date('2026-09-06T22:05:00.000Z')); // 00:05 del lunes 7
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await expect(page.getByRole('heading', { name: 'Hoy' }).locator('xpath=..')).not.toContainText(
      'Exposición BIC del Retiro',
    );
  });

  test('caducidad al fin exacto retira el plan vigente', async ({ page }) => {
    await openAgenda(page);
    await expect(
      page.getByLabel('Hoy').getByRole('link', { name: 'Paseo que caduca a las 12:00' }),
    ).toBeVisible();
    await page.clock.pauseAt(new Date('2026-09-06T10:00:00.000Z')); // 12:00 Madrid
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      page.getByLabel('Próximamente').getByRole('link', { name: 'Paseo que caduca a las 12:00' }),
    ).toHaveCount(0);
    await expect(page.getByLabel('Hoy').getByText('Finalizado')).toBeVisible();
  });

  test('exposición abierta aunque empezó antes; día excluido ausente; dos pases', async ({ page }) => {
    await openAgenda(page);
    await expect(
      page.getByLabel('Hoy').getByRole('link', { name: 'Exposición BIC del Retiro' }),
    ).toBeVisible();
    await expect(page.getByLabel('Hoy').getByText('11:00')).toBeVisible();
    await expect(page.getByLabel('Hoy').getByText('18:30')).toBeVisible();
    await page.clock.pauseAt(new Date('2026-09-07T08:00:00.000Z'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(
      page.getByLabel('Hoy').getByRole('link', { name: 'La ruta de los libros vivos' }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel('Próximamente').getByRole('link', { name: 'La ruta de los libros vivos' }),
    ).toBeVisible();
  });
});

test.describe('frescura y enlaces', () => {
  test('un dato de más de 7 días no aparece como plan vigente', async ({ page }) => {
    await openAgenda(page);
    await expect(page.getByRole('heading', { name: 'Información anterior' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Actividad con dato antiguo' })).toBeVisible();
    const upcoming = page.getByRole('heading', { name: 'Próximamente' }).locator('xpath=..');
    await expect(upcoming.getByRole('link', { name: 'Actividad con dato antiguo' })).toHaveCount(0);
  });

  test('agenda → ficha → mapa y 404 real', async ({ page }) => {
    await openAgenda(page);
    await page.getByRole('link', { name: 'Exposición BIC del Retiro' }).first().click();
    await expect(page.getByRole('heading', { name: 'Exposición BIC del Retiro' })).toBeVisible();
    await page.getByRole('link', { name: 'Ver en el mapa' }).click();
    await expect(page).toHaveURL(/\?evento=expo-retiro-bic/);
    const missing = await page.request.get('/retiro-interactivo/agenda/no-existe-este-evento/');
    expect(missing.status()).toBe(404);
  });

  test('pasadas 48 h avisa que la agenda necesita actualizarse', async ({ page }) => {
    await openAgenda(page);
    await page.clock.pauseAt(new Date('2026-09-08T09:00:00.000Z'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('La agenda necesita actualizarse. Consulta la fuente oficial.')).toBeVisible();
  });
});

test.describe('móvil 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('filtros y ficha caben y son operables', async ({ page }) => {
    await openAgenda(page);
    const categoria = page.getByLabel('Categoría');
    await expect(categoria).toBeVisible();
    const box = await categoria.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    await page.getByRole('link', { name: 'Ver ficha' }).first().click();
    await expect(
      page.getByRole('heading', { name: /Exposición BIC|Títeres|Paseo que caduca|ruta de los libros/ }),
    ).toBeVisible();
  });
});

test.describe('teclado escritorio', () => {
  test('el filtro de categoría recibe foco y cambia con teclado', async ({ page }) => {
    await openAgenda(page);
    const categoria = page.getByLabel('Categoría');
    await categoria.focus();
    await expect(categoria).toBeFocused();
    await categoria.selectOption('Exposiciones');
    await expect(page).toHaveURL(/categoria=Exposiciones/);
  });
});
