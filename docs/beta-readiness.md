# Preparación beta privada — actualización Fase 3

Fecha: 2026-08-06. Rama: `feature/fase-3-private-beta` (base `6fcbce2`).

| Área | Estado | Evidencia | Pendiente | Bloquea beta |
| --- | --- | --- | --- | --- |
| Contenido | Listo técnico | 80 fichas; sin inflación | Revisión humana puntual `needs-review` | No |
| Rutas | Listo técnico | 5 rutas; salto niños corregido | Validación física | No |
| Agenda | Listo técnico | 73 eventos; coords CIEA corregidas | Confirmación CIEA/Cabaña in situ | No |
| Privacidad | Listo | Geo solo por gesto | Prueba real permiso denegado | No |
| PWA | Parcial | sw/manifest OK; SW viejo puede confundir | Install real + update flow | Parcial |
| Responsive | Parcial | Chromium OK | Safari/Firefox/Android | Parcial |
| Accesibilidad | Parcial | Nav/semántica OK | axe en dispositivo | No |
| Datos | Listo | Zod + pipeline + tests | Monitor diario fuentes | No |
| Rendimiento | Aceptable | MapLibre chunked; tiles NetworkOnly | LCP móvil | No |
| Compat. deps | Documentado | `--legacy-peer-deps` por peer Astro≤5 | Upgrade `@vite-pwa/astro` | No |

## Veredicto

**beta técnica viable**

No es «beta privada lista» hasta completar Safari/Firefox/Android, geo real e install PWA en dispositivo.  
No está «beta bloqueada»: los defectos altos de deep-link y coords CIEA están corregidos.

Niveles de evidencia:

- verificado automáticamente: CLI, tests, build;
- probado en navegador: Chromium Cursor;
- revisado editorialmente: eventos (docs/event-editorial-review.md);
- pendiente de validación física: rutas y geo.
