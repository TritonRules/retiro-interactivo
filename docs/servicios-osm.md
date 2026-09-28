# Servicios del Retiro desde OpenStreetMap

Cafeterías, bares, heladerías, quioscos, aseos, fuentes de agua potable, parques infantiles,
gimnasios al aire libre y otros servicios útiles dentro del parque, extraídos de
OpenStreetMap y mostrados en el mapa con pictogramas propios.

## Datos y licencia

- **Fuente**: OpenStreetMap vía Overpass API. **© colaboradores de OpenStreetMap**, datos
  bajo licencia **ODbL 1.0** (<https://www.openstreetmap.org/copyright>).
- **Fichero generado** (se versiona): `src/data/services-osm.json`. Incluye `license`,
  `attribution`, fecha de extracción (`extractedAt`, fecha base de OSM), recuentos, el
  contorno simplificado del parque (`boundary`) y los duplicados detectados (`matches`).
- La ficha de cada servicio OSM enlaza al elemento en openstreetmap.org con el texto
  «© colaboradores de OpenStreetMap · datos a AAAA-MM-DD». La atribución general del mapa
  (OpenStreetMap · OpenFreeMap) sigue en el control de atribución y en «Acerca de».
- El fichero es una base de datos derivada de OSM: si se redistribuye, mantener la ODbL y
  la atribución.

## Script reproducible

```bash
npm run services:osm                                   # consulta Overpass y reescribe el fichero
npm run services:osm -- --check                        # solo informa (recuentos, duplicados)
npm run services:osm -- --save-raw /tmp/osm-raw.json   # guarda además la respuesta cruda
npm run services:osm -- --input /tmp/osm-raw.json      # reconstruye sin red, idéntico
OVERPASS_URL=https://maps.mail.ru/osm/tools/overpass/api/interpreter npm run services:osm
```

Sin `OVERPASS_URL` prueba por orden `overpass-api.de`, la réplica de mail.ru y kumi.systems.

Proceso (`scripts/services-osm.mjs`, lógica en `src/utils/osmServices.shared.mjs`):

1. **Consulta** por el área de la relación OSM **13616929 «Parque del Retiro»** (límite del
   parque) con estas etiquetas: `amenity` = cafe, bar, pub, biergarten, restaurant,
   fast_food, ice_cream, toilets, drinking_water, boat_rental, bicycle_rental,
   bicycle_parking, first_aid; `shop` = kiosk, ice_cream, ticket (barcas);
   `leisure` = playground, fitness_station, sports_centre, dog_park;
   `tourism=information` solo `office`/`visitor_centre`; `emergency=defibrillator`.
   Se excluyen a propósito bancos (238), papeleras, fuentes ornamentales, paneles
   informativos y pistas deportivas sueltas (ya están en el polideportivo).
2. **Filtro por polígono**: se reconstruye el contorno de la relación y se descarta todo
   punto (o centro de vía) que quede fuera.
3. **Normalización**: id `osm-<tipo>-<id>`, `osmId`, nombre OSM o genérico en español
   («Aseos públicos», «Fuente de agua potable», «Parque infantil», «Gimnasio al aire
   libre», «Quiosco»…), subtipo de pictograma, coordenadas, `openingHours`,
   `wheelchair` (yes/limited/no), `fee` (`false` = gratuito), `website`, `menuUrl`
   (`website:menu`/`menu`), `osmCheckDate` y `lastCheckedAt`. Los genéricos llevan
   `near` (lugar curado más cercano a ≤ 200 m) para distinguirlos en la ficha.
4. **Deduplicación** (el dato curado gana siempre):
   1. coincidencia manual (`MANUAL_MATCHES` en el script);
   2. mismo elemento OSM en el `sourceUrl` de un servicio de `services.json` o de un
      lugar de `places.json`;
   3. mismo grupo de servicio a ≤ 25 m de un servicio curado;
   4. mismo nombre que un lugar curado a ≤ 60 m.

   De cada duplicado se guardan horario, accesibilidad, gratuidad y web en `matches[].enrich`
   y la app los añade al servicio curado solo si le faltan.
5. Informe: recuentos por tipo, duplicados y servicios curados cuyo elemento OSM no aparece
   en la extracción (fuera del polígono o con etiquetas no incluidas).

`npm run validate:data` valida el esquema, que no haya ids repetidos con los curados y que
todos los puntos estén dentro del contorno. Los servicios OSM **no cuentan** en el cupo de
60–160 fichas curadas.

### Extracción 2026-09-28

93 servicios dentro del parque; 28 ya estaban en `services.json`; **65 nuevos**.

| Subtipo | Encontrados | Nuevos | Ya curados |
| --- | ---: | ---: | ---: |
| Cafetería | 4 | 4 | 0 |
| Bar / terraza | 4 | 4 | 0 |
| Restaurante | 1 | 1 | 0 |
| Heladería | 3 | 3 | 0 |
| Quiosco | 3 | 3 | 0 |
| Aseos | 8 | 2 | 6 |
| Agua potable | 34 | 21 | 13 |
| Parque infantil | 21 | 14 | 7 |
| Gimnasio al aire libre | 6 | 6 | 0 |
| Deporte (polideportivo La Chopera) | 1 | 0 | 1 |
| Información | 3 | 2 | 1 (manual: CIEA El Huerto) |
| Barcas (taquilla y barco solar) | 2 | 2 | 0 |
| Desfibrilador | 1 | 1 | 0 |
| Aparcabicis | 1 | 1 | 0 |
| Zona canina | 1 | 1 | 0 |

Servicios curados que no aparecen en la extracción (revisar en una próxima iteración):
`aseo-parterre` y `aseo-suroeste` (quedan justo fuera del contorno de la relación),
`fuente-potable-cecilio` y `fuente-potable-este-parque` (ídem), `info-estanque-alcachofa` e
`info-rosaleda` (en OSM son paneles, no oficinas).

**Retirados de `services.json`** (2026-09-28): `restauracion-piloto-ii` (Piloto II, calle del
Doce de Octubre 2) y `restauracion-euronews-cafe` (en OSM además `shop=travel_agency`,
«Gourmet Madrid Tours»). Ambos quedan fuera del contorno del parque, al otro lado de la
avenida de Menéndez Pelayo, y no son servicios del Retiro; se quitan también de
`public/data/services.{json,geojson}`. Quedan 42 servicios curados.

## En el mapa

- **Pictogramas SVG** por subtipo (taza, copa, cubiertos, cucurucho, quiosco, WC, gota,
  columpio, mancuerna, barca, corazón con rayo, bici, huella…) sobre un cuadrado
  redondeado del color del grupo: Comer y beber (teja), Aseos (frambuesa, para no confundirse con el morado de las estatuas), Agua (azul),
  Parques infantiles (ocre), Deporte (verde azulado), Más servicios (pizarra).
- **Aparición progresiva** en «Todos» con «Mostrar servicios» (activado por defecto):
  comer y beber, aseos, parques infantiles e información desde zoom **15,5**; fuentes,
  gimnasios y el resto desde **16,5**. A zoom inicial (15,2) el recuento indica
  «acerca para ver servicios». Desmarcar la casilla los quita.
- **Prioridad**: siempre por debajo de cualquier lugar (acceso = 30; servicios 11–18), así
  que en las colisiones ceden y se pliegan a punto; el punto sigue siendo pulsable (44 px).
- **Nombre propio** (cafés, bares, restaurante, barcas…) rotulado bajo el icono desde zoom 17.
- **Filtro «Servicio»**: muestra todos los servicios a cualquier zoom y una segunda fila de
  chips (Todos los servicios, Comer y beber, Aseos, Agua, Parques infantiles, Deporte, Más
  servicios). El chip elegido va en la URL (`?categoria=servicio&servicios=aseos`).
- **Mapa base**: dentro del contorno del parque se ocultan los POI grises equivalentes de
  OpenFreeMap (cafés, bares, aseos, fuentes, parques infantiles…) para no duplicarlos;
  fuera del parque el mapa base no cambia. Si se ocultan los servicios, vuelven.
- **Ficha compacta**: tipo, nombre, «Cerca de…», horario (traducido de `opening_hours`,
  «según OpenStreetMap»), accesibilidad y gratuidad, **Cómo llegar** (Google Maps a pie),
  Carta/Web si están etiquetadas, y fuente con fecha.
- Con ruta activa o modo paseo no se pintan servicios (igual que los demás iconos).

## Precios (investigación, sin uso en la interfaz)

No se muestran precios. Solo se aceptarían de una fuente primaria (carta publicada por el
propio local o foto fechada in situ); Google, TheFork, Tripadvisor y agregadores de cartas
no son fiables para precios exactos. Ningún servicio OSM tiene etiqueta `menu`/`website:menu`.

Comprobado el **2026-09-28**:

| Local (OSM) | ¿Carta con precios pública? | Fuente | Notas |
| --- | --- | --- | --- |
| Florida Retiro (restaurante) | **Sí** | PDF oficiales en <https://www.floridapark.es/> (El Pabellón, La Galería, Los Kioskos) | Nombre de los PDF fechado 2025-12-06. El dominio `floridaretiro.com` carga scripts ajenos: no usarlo. |
| La Gruta (heladería/terraza) | **Sí**, sin fecha | <https://www.barmiradorterrazalagruta.com/> | Carta con precios (cerveza 1/3 l 4,50 €, copas de helado 6,50–8 €…). Servidor intermitente (error 500 al consultarlo). |
| Nacional Retiro (cafetería) | Parcial | <https://nacionalretiro.com/> | Solo un «plato estrella» con precio (arroz negro 24,50 €); sin carta completa. |
| Vivaz Retiro (cafetería) | Carta enlazada, precios sin verificar | <https://linktr.ee/VivazRetiro> → vivazretiro.com | La carta se carga dinámicamente; no se pudo comprobar si lleva precios. |
| Bar Mirador La Rosaleda | Carta enlazada, precios sin verificar | <https://linktr.ee/VivazRetiro> («Vivaz La Rosaleda») | Parece gestionado ahora por Vivaz. |
| Casa Remigio (bar) | No | grupocasaremigio.com (sin carta del quiosco del Retiro) | El grupo publica cartas de otros locales. |
| Bar Mirador El Estanque | No | — | Solo agregadores no oficiales. |
| Galápagos (bar) | No | — | Portal no oficial kioscosdelparquedelretiro.com sin precios. |
| Kiosko Las Estatuas (cafetería) | No | — | Solo directorios. |
| Mirador (cafetería, Palacio de Cristal) | No | — | Sin web localizada. |
| Ángel Caído Heladería | No | — | Solo redes sociales y portal no oficial. |
| Heladería junto al Teatro de Títeres, 3 quioscos sin nombre | No | — | Sin nombre en OSM: no identificables. |

**Conclusión**: solo Florida Retiro (y con reservas La Gruta) publican precios propios; no
compensa mostrar precios en esta fase.

### Campo opcional `featuredPrices` (diseño, sin uso)

Admitido por el esquema de `services.json` y `services-osm.json`, no se pinta en la ficha:

```json
"featuredPrices": [
  {
    "item": "Café con leche",
    "price": 2.5,
    "currency": "EUR",
    "checkedAt": "2026-09-28",
    "source": "https://www.floridapark.es/…/carta.pdf"
  }
]
```

Reglas si algún día se usa: solo fuentes primarias, `checkedAt` obligatorio, ocultar
precios con más de 90 días y mostrarlos siempre como «orientativo (fecha)».
