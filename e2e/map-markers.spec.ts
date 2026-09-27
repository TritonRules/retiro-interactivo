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

async function stopScale(page: Page): Promise<number> {
  return page
    .locator('.mapa-canvas')
    .evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--stop-scale') || '1'));
}

test.describe('eventos y paradas adaptados al zoom', () => {
  // Datos de agenda del fixture: vigentes el domingo 6 sep a las 10:00 (Madrid).
  const FROZEN = new Date('2026-09-06T08:00:00.000Z');

  test('eventos de la misma sede en un marcador con número; al alejar ganan a los lugares', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(FROZEN);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.maplibregl-marker.place-marker').first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('Eventos').check();
    const group = page.getByRole('button', {
      name: 'Ver 2 eventos en Teatro de Títeres de El Retiro',
    });
    await expect(group).toBeAttached();
    await expect(group.locator('.place-marker__count')).toHaveText('2');
    // Un solo marcador por sede (no dos círculos apilados).
    await expect(page.locator('.place-marker--event[data-event-count="2"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Abrir evento Exposición BIC del Retiro' })).toBeAttached();

    await zoomTimes(page, 'Alejar mapa', 1);
    await expect.poll(() => markerScale(page)).toBeLessThan(0.75);
    // El evento queda completo; el lugar de la misma sede se pliega a punto por debajo.
    await expect(group).toHaveAttribute('data-marker-state', 'full');
    await expect(
      page.getByRole('button', { name: 'Abrir ficha de Teatro de Títeres de El Retiro' }),
    ).toHaveAttribute('data-marker-state', 'dot');

    // Pulsar el grupo abre la lista; elegir uno abre su ficha.
    await group.dispatchEvent('click');
    const list = page.getByRole('dialog', { name: '2 eventos aquí' });
    await expect(list).toBeVisible();
    await list.getByRole('button', { name: /Concierto junto al teatro de títeres/ }).click();
    await expect(page.getByRole('heading', { name: 'Concierto junto al teatro de títeres' })).toBeVisible();
    // El grupo del evento seleccionado va a tamaño completo y marcado.
    await expect(group).toHaveClass(/is-active/);

    await zoomTimes(page, 'Acercar mapa', 3);
    await expect.poll(() => markerScale(page)).toBe(1);
    const box = await group.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(errors).toEqual([]);
  });

  test('las paradas encogen pero nunca se ocultan ni se tapan entre sí', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?ruta=ruta-fotografica', { waitUntil: 'domcontentloaded' });

    const stops = page.locator('.maplibregl-marker.route-stop-marker');
    await expect(stops).toHaveCount(7, { timeout: 30_000 });
    // Con ruta activa no se pintan iconos de lugar que dupliquen las paradas.
    await expect(page.locator('.maplibregl-marker.place-marker')).toHaveCount(0);
    await page.waitForTimeout(900);

    await zoomTimes(page, 'Alejar mapa', 3);
    await expect.poll(() => stopScale(page)).toBeLessThan(0.85);

    const badges = await stops.evaluateAll((els) =>
      els.map((el) => {
        const r = el.querySelector('.route-stop-marker__badge')!.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        return {
          text: el.textContent,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          hitW: b.width,
          hitH: b.height,
          display: getComputedStyle(el).display,
        };
      }),
    );
    expect(badges.map((b) => b.text)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    for (const badge of badges) {
      expect(badge.display).not.toBe('none');
      expect(badge.w).toBeGreaterThanOrEqual(20);
      expect(badge.w).toBeLessThan(28);
      expect(badge.hitW).toBeGreaterThanOrEqual(44);
      expect(badge.hitH).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < badges.length; i += 1) {
      for (let j = i + 1; j < badges.length; j += 1) {
        const a = badges[i];
        const b = badges[j];
        const d = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
        expect(d, `paradas ${a.text} y ${b.text}`).toBeGreaterThanOrEqual((a.w + b.w) / 2 - 1);
      }
    }
    await expect(page.locator('.route-stop-marker[data-stop-shifted="true"]').first()).toBeAttached();

    // La parada elegida pasa a tamaño completo.
    await stops.nth(2).dispatchEvent('click');
    await expect(stops.nth(2)).toHaveClass(/is-active/);
    await expect
      .poll(() =>
        stops
          .nth(2)
          .locator('.route-stop-marker__badge')
          .evaluate((el) => el.getBoundingClientRect().width),
      )
      .toBeGreaterThanOrEqual(27.5);
    expect(errors).toEqual([]);
  });
});
