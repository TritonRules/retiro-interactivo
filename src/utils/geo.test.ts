import { describe, expect, it } from 'vitest';
import { haversineMeters, formatDistance } from './geo';
import { isInsideRetiro } from './geolocation';

describe('haversineMeters', () => {
  it('devuelve ~0 para el mismo punto', () => {
    expect(haversineMeters([-3.68, 40.415], [-3.68, 40.415])).toBeLessThan(1);
  });

  it('estima distancia razonable dentro del Retiro', () => {
    const meters = haversineMeters([-3.6839, 40.4172], [-3.6821, 40.4136]);
    expect(meters).toBeGreaterThan(300);
    expect(meters).toBeLessThan(600);
  });
});

describe('formatDistance', () => {
  it('formatea metros y kilómetros', () => {
    expect(formatDistance(120)).toBe('120 m');
    expect(formatDistance(1500)).toBe('1,5 km');
  });
});

describe('isInsideRetiro', () => {
  it('detecta dentro y fuera', () => {
    expect(isInsideRetiro([-3.6835, 40.4155])).toBe(true);
    expect(isInsideRetiro([-3.7, 40.42])).toBe(false);
  });
});
