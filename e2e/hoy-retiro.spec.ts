import { expect, test, type Page } from '@playwright/test';

// 13:15 Madrid del domingo 6 de septiembre de 2026 (fixture con varios eventos).
const MIDDAY = new Date('2026-09-06T11:15:00.000Z');
const EVENING = new Date('2026-09-06T18:15:00.000Z'); // 20:15 Madrid

test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'America/New_York' });

async function openAgenda(page: Page, at: Date) {
  await page.clock.install({ time: new Date(at.getTime() - 60_000) });
  await page.goto('agenda/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Agenda del Retiro' })).toBeVisible();
  await page.clock.pauseAt(at);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

const programa = (page: Page) => page.getByRole('region', { name: 'Programa del día' });

test('mediodía: línea ahora, pasados atenuados, en curso destacado y fila de todo el día', async ({
  page,
}) => {
  await openAgenda(page, MIDDAY);
  const hoy = programa(page);
  await expect(hoy.getByRole('heading', { name: 'Hoy en el Retiro' })).toBeVisible();
  await expect(hoy.getByRole('button', { name: 'Hoy', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // Hora de Madrid aunque el navegador esté en Nueva York.
  await expect(hoy.getByTestId('linea-ahora')).toContainText('13:15');

  await expect(hoy.locator('.hoy__bar[data-state="past"]').first()).toContainText(
    'Exposición BIC del Retiro',
  );
  await expect(hoy.locator('.hoy__bar[data-state="ongoing"]').first()).toContainText('13:00');
  await expect(
    hoy.locator('.hoy__bar[data-state="upcoming"]', { hasText: 'Taller de botánica' }),
  ).toContainText('16:30–18:00');
  await expect(hoy.getByLabel('Todo el día o sin hora fija')).toContainText(
    'La ruta de los libros vivos',
  );

  await hoy
    .locator('.hoy__bar', { hasText: 'Taller de botánica' })
    .getByRole('link', { name: 'Ver en el mapa' })
    .click();
  await expect(page).toHaveURL(/\?evento=taller-botanica-tarde/);
});

test('desde las 20:00 propone mañana y permite volver a hoy', async ({ page }) => {
  await openAgenda(page, EVENING);
  const hoy = programa(page);
  await expect(hoy.getByRole('heading', { name: 'Mañana en el Retiro' })).toBeVisible();
  await expect(hoy.getByRole('status')).toContainText('Desde las 20:00');
  await expect(
    hoy.locator('.hoy__bar', { hasText: 'Banda municipal junto al Estanque' }),
  ).toContainText('12:00');
  await hoy.getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(hoy.getByRole('heading', { name: 'Hoy en el Retiro' })).toBeVisible();
  await expect(hoy.locator('.hoy__bar[data-state="ongoing"]')).toHaveCount(0);
});

test('día sin actividades muestra estado vacío', async ({ page }) => {
  await openAgenda(page, new Date('2026-10-02T10:00:00.000Z')); // programa de septiembre ya terminado
  await expect(programa(page).getByText('Hoy no hay actividades publicadas')).toBeVisible();
});
