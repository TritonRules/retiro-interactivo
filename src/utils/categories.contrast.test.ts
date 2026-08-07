import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { CategoryFilters } from '../components/map/CategoryFilters';
import { CATEGORY_META, FILTER_OPTIONS } from './categories';
import type { CategoryFilter } from './filterPlaces';

/** Fondo real de los chips no seleccionados (`--color-surface`). */
const FONDO_CHIP = '#FFFFFF';

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((inicio) => {
    const canal = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(frente: string, fondo: string): number {
  const [claro, oscuro] = [luminancia(frente), luminancia(fondo)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

const counts = Object.fromEntries(FILTER_OPTIONS.map((option) => [option.id, 1])) as Record<
  CategoryFilter,
  number
>;

describe('contraste de los filtros de categoría', () => {
  it('calcula el contraste como WCAG 2.1', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    // Los dos valores detectados por axe antes de la corrección.
    expect(contraste('#C45C26', FONDO_CHIP)).toBeCloseTo(4.28, 2);
    expect(contraste('#B8860B', FONDO_CHIP)).toBeCloseTo(3.25, 2);
  });

  it('alcanza AA en el texto de todos los chips', () => {
    for (const option of FILTER_OPTIONS) {
      const texto = option.textColor ?? option.color;
      expect.soft(contraste(texto, FONDO_CHIP), `${option.label} (${texto})`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('mantiene el borde y la forma por encima de 3:1 con el color de identidad', () => {
    for (const option of FILTER_OPTIONS) {
      expect.soft(contraste(option.color, FONDO_CHIP), `${option.label} (${option.color})`).toBeGreaterThanOrEqual(3);
    }
  });

  it('no cambia los colores de identidad usados por los marcadores', () => {
    expect(CATEGORY_META.monumento.color).toBe('#C45C26');
    expect(CATEGORY_META.familias.color).toBe('#B8860B');
  });

  it('pinta el texto con la variante accesible y el borde con el color de identidad', () => {
    const markup = renderToStaticMarkup(
      createElement(CategoryFilters, { active: 'todos', counts, onChange: () => {} }),
    );

    expect(markup).toContain('border-color:#C45C26;color:#B45523');
    expect(markup).toContain('border-color:#B8860B;color:#906909');
    // Las categorías que ya cumplían AA siguen usando un único color.
    expect(markup).toContain('border-color:#2F6F8F;color:#2F6F8F');
  });
});
