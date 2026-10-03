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
  Carta/Web si están etiquetadas, y fuente con fecha. Si el servicio tiene información
  verificada (ver abajo), la ficha añade teléfono, horario con su fuente, precios con fecha
  y estado.
- Con ruta activa o modo paseo no se pintan servicios (igual que los demás iconos).

## Información verificada de los locales (`src/data/services-info.json`)

Completa las fichas de algunos servicios con datos comprobados a mano: nombre comercial,
teléfono, web, carta, horario con su fuente, precios con fecha y estado («cerrado
temporalmente»). El esquema está en `src/utils/serviceInfo.shared.mjs`; lo validan la app y
`npm run validate:data` (ids existentes, fuentes admitidas, fechas coherentes).

### Reglas

- **Fuentes de precios**: solo el Ayuntamiento (`official`) o la carta publicada por el
  propio local (`venue`), siempre con la fecha del documento (`sourceDate`) y el día de la
  consulta (`checkedAt`). **Nunca** agregadores ni webs de reseñas (carta.menu, sluurpy,
  gastroranking, Restaurant Guru, Tripadvisor, TheFork, Google Maps, copias de Wayback…): el
  esquema los rechaza.
- **Precios del local**: se muestran como «Precio orientativo · carta del local ·
  consultado el DD/MM/AAAA», con enlace a la fuente y, si es distinta, la fecha de la carta.
- **Caducidad** (según la fecha de la carta, calculada en el navegador el día de la visita):
  desde **9 meses** el bloque se marca en ámbar («los precios pueden haber cambiado»); desde
  **12 meses** deja de mostrarse solo. `validate:data` avisa, sin fallar, de los precios
  marcados o caducados para que se actualicen.
- **Precios públicos** (barcas): «Precio público AAAA · Ayuntamiento», sin «orientativo»;
  valen durante su año (`validYear`) y se ocultan al empezar el siguiente.
- **Horarios**: «(según la web del local / el Ayuntamiento / Google, DD/MM/AAAA)», con
  enlace a la fuente si la hay. Si las fuentes no coinciden se da prioridad a la del propio
  local y se añade «puede variar». Sustituyen al horario de OSM en la ficha.
- **Teléfono**: enlace `tel:`; si sale de Google se indica «(según Google)».
- **Estado** «Cerrado temporalmente (según Google, DD/MM/AAAA)»: se deja de mostrar a los
  12 meses de la comprobación.

### Contenido (comprobado el 28/09/2026; horario de Florida Park, el 03/10/2026)

| Servicio (id) | Datos | Fuente |
| --- | --- | --- |
| Barcas del Estanque (`osm-node-3274328970`) | Precios públicos 2026: 6 € L–V laborables, 8 € sáb., dom. y festivos, 1,80 € mayores de 65 (L–V laborables); 45 min, máx. 4 personas; horario 10:00–14:00 y 15:15–puesta de sol; tel. 915 744 024 | madrid.es (CDM Estanque del Retiro y cartel «Precios públicos 2026») |
| Vivaz Retiro (`osm-way-194853751`) | 6 precios de la carta, horario, teléfono, carta digital, café de comercio justo | Carta digital del local (SmartMenu) y PDF de 16/02/2026 |
| Vivaz La Rosaleda (`osm-way-467641934`, en OSM «Bar Mirador La Rosaleda») | 6 precios, carta en PDF; teléfono y horario (solo el lunes) de Google | PDF «Carta Vivaz La Rosaleda» de 16/02/2026 (enlazado desde linktr.ee/VivazRetiro) |
| Florida Park (`osm-way-722360392`) | 5 precios de Los Kioskos, La Galería y El Pabellón; horario general y teléfono de reservas | PDF de 06/12/2025 y floridapark.es/es/contacto |
| Nacional Retiro (`osm-way-243351606`) | Horario, web y teléfono (Google); sin precios: la web solo publica un plato | nacionalretiro.com |
| Heladería de la avenida de Méjico (`osm-node-3135948608`) | «Cerrado temporalmente»; en Google, «Casa Remigio» (Av. de Méjico 2, a < 2 m del nodo) | Google Maps |

**No se incluyen**: La Gruta (su carta solo se conserva en una copia de agosto de 2025 y la
web está caída), el Barco Solar (la «motora» a 2 € del cartel municipal no consta que sea
ese servicio) ni los bares-mirador sin web propia (Estanque, Estatuas, Galápagos, Ángel
Caído…), de los que solo hay agregadores o el horario de un día en Google.

Los precios de los quioscos del Retiro no están regulados por el Ayuntamiento: son
concesiones demaniales del Distrito de Retiro y cada concesionario fija los suyos.

### Campo antiguo `featuredPrices` (sin uso)

`services.json` y `services-osm.json` siguen admitiendo `featuredPrices` (diseño previo), pero
la interfaz no lo pinta: los precios se mantienen solo en `services-info.json`, con las reglas
de arriba (antes se proponía ocultarlos a los 90 días; la regla vigente es 9 meses en ámbar y
12 meses ocultos).
