# Preparación beta privada

Fecha: 2026-08-05. Rama: `feature/fase-2b-content-routes-events`.

| Área | Estado | Evidencia | Pendiente | Bloquea beta |
| --- | --- | --- | --- | --- |
| Contenido | Parcial listo | 80 fichas trazables (36+44) | Revisión editorial humana de nuevas fichas y `needs-review` | No (para beta privada reducida) |
| Rutas | Listo técnico | 5 rutas, stopIds OK, páginas + `?ruta=` | Validación física de trazados | No |
| Agenda | Listo técnico | Pipeline A + 66 publicados filtrados | Revisión de falsos positivos / coords | No |
| Privacidad | Listo | Geo solo por gesto, sin persistencia | — | No |
| PWA | Listo | sw.js + manifest; agenda detalle excluida de precache masivo | Prueba install en dispositivo | No |
| Responsive | Parcial | Nav compacta; build OK | Prueba real iPhone/Android | No |
| Accesibilidad | Parcial | Estructura semántica, skip-link | Auditoría axe completa | No |
| Datos | Listo | Zod + validate:data + tests pipeline | Monitoreo diario fuentes | No |
| Rendimiento | Aceptable | MapLibre chunk separado; teselas NetworkOnly | Medir LCP móvil real | No |

## Veredicto

**No declarar “beta lista” pública.** Sí es razonable una **beta privada técnica** tras revisión humana del informe de eventos y smoke en dispositivo, distinguiendo:

- verificado automáticamente (CI local / scripts);
- probado en navegador (pendiente en esta pasada del agente);
- revisado editorialmente (pendiente);
- pendiente de validación física (rutas y servicios).
