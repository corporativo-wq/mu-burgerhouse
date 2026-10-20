# muburgers.mx — sitio oficial de Mu. Burgerhouse (hamburguesas, Playa del Carmen y Cancún)

Publica con **GitHub Pages** desde `main` (raíz), repo `corporativo-wq/mu-burgerhouse`, dominio `muburgers.mx`.
Los HTML de la raíz y de `en/` se GENERAN: no los edites a mano. Mismo sistema que ambymu.mx (AM by Mu).

## Cómo cambiar algo
1. Edita **`contenido.json`** (fuente única de verdad): sitio, marca, precios, redes, contacto, sucursales, SEO, textos, FAQ, menú.
   Campos `null` no se muestran; nunca se inventa relleno.
   - Todos los precios +10 %: `"precios": {"ajuste_pct": 10, "redondeo": 5}`.
   - Platillo: `n` (nombre {es,en}), `p` (precio), `d` (descripción {es,en}), `tags` (`new`), `solo_en` (sucursales),
     `foto` (foto normal, archivo en `src/img/`), `recorte` (foto sin fondo), `variantes` (precios por tipo de carne;
     la sección define `columnas`), `p_nota` (texto corto junto al precio), `destacado` vía la lista `destacados`.
   - Sucursal: `horario` día por día (`null` = cerrado), `telefono`, `whatsapp` (si es `null` usa `contacto.whatsapp`),
     `pedidos` (Rappi / Uber Eats), `maps_url`, `resenas_url`, `reservas` (`null` = no se menciona).
   - GA4: `sitio.ga4_id` (`G-XXXX`). Search Console por meta: `sitio.search_console_meta`.
2. `./build.sh` (python3 + `pip install jinja2 pillow`).
3. Publicar. La sesión de Claude NO tiene el repo vinculado (push directo da 403), así que se publica igual que ambymu.mx:
   por el Chrome de Fernando (extensión Claude in Chrome; preferir la Mac Studio, siempre encendida, con su sesión de GitHub abierta).
   **Método rápido (2026-10-15):** copiar los archivos cambiados a `/mnt/user-data/uploads/mu-pub/<ruta>` y, por carpeta,
   abrir `https://github.com/corporativo-wq/mu-burgerhouse/upload/main/<carpeta>` (raíz, `assets`, `en`, `img`, `src`, `src/css`,
   `src/tpl`, `src/img`), localizar el `input[type=file]` con `find` y subir con la herramienta `file_upload` de Claude in Chrome
   (acepta rutas bajo `/mnt/user-data/uploads/`; NO acepta `/mnt/user-data/outputs/` ni rutas de la Mac). Luego tomar una captura,
   hacer clic por coordenadas en el campo "Commit summary", escribir el mensaje y pulsar Return (los clics por `ref` fallan tras la
   subida). Sirve también para binarios (webp, video) — ya no hace falta que Fernando arrastre nada.
   Método anterior (respaldo): inyectar por JavaScript gzip+base64 en `window.__B` (trozos ≤20 KB) → atob → Blob.stream().pipeThrough(
   new DecompressionStream('gzip')) → DataTransfer + File → dispatch 'change' (fetch de data: URLs lo bloquea el CSP de GitHub).
   Subir siempre `contenido.json` + los HTML regenerados (y `assets/` si cambió el hash). Pages publica en ~1 min.
   Verificación en vivo: los shells (nube y Mac) tienen bloqueado muburgers.mx por la lista de dominios; verificar con
   `javascript_tool` en Chrome (fetch de cada archivo + naturalWidth de las imágenes).
   Copia espejo en la Mac: Documentos → "Mu Web" (iCloud), vía device_commit_files.
4. Verificar en vivo (descargar las páginas publicadas y compararlas con el build).

## Estructura
- `src/tpl/` plantillas Jinja: `_base`, `_macros`, `inicio`, `menu`, `sucursal`, `404`. `{BI:es|en}` = texto bilingüe; `{{ x|t }}` toma el idioma del diccionario `{es,en}`.
- Idiomas: español en la raíz (`/`, `/menu`, `/mu-10`, `/mu-40`, `/mu-nichupte`) e inglés en `/en/`, con hreflang y sitemap con alternates. El selector ES/EN son enlaces (sin redirección automática).
- `src/css/` estilos (`base`, `inicio`, `menu`, `sucursal`); `src/site.js` (GA4, eventos, barra, aparición, horario de hoy), `src/inicio.js` (loader, modo loco, vitrina, parallax), `src/game.js` (Torre Mu), `src/menu.js` (chips).
- Tipografías en `assets/fonts/` (Fontsource, OFL, subconjunto latino): Archivo variable + JetBrains Mono. No Google Fonts.
- `src/img/` originales (WebP, recortes sin fondo, logo SVG, favicon) → `img/` (hero con versión 2x), `og.jpg`.
- `build.py --preview` escribe `preview/*.html` con todo incrustado para previsualizar como artefacto en Claude (no se publica).

## Medición
Cada CTA lleva `data-ev` (`como_llegar`, `whatsapp`, `phone`, `order_rappi`, `order_ubereats`, `menu_nav`, `branch_page`, `home_nav`, `review`, `social_*`, `game_play`; además `noche` al cambiar el modo)
y `data-branch`. Un clic = `dataLayer.push({event:'cta_click',…})` + `gtag('event', ev, {branch})`. Sin GTM.
Eventos clave en GA4: como_llegar, whatsapp, phone, menu_nav (sin valor monetario). Dimensión personalizada "Sucursal" = parámetro `branch`.

## Reglas de marca (acordadas con Fernando)
- No cambiar tipografías, colores ni textos existentes sin que él lo pida. Diseño editorial: negro / crema / ámbar, Archivo + JetBrains Mono.
- Burgers siempre con foto sin fondo (`recorte`). Fotos reales únicamente; nada generado con IA.
- No cambiar nombre, horarios, teléfonos, direcciones ni datos del Perfil de Google sin su aprobación.
- No mencionar otras marcas del grupo (AM, Papaya Slice, Marola) en el sitio.
- Teléfonos: solo los de Mu. WhatsApp general (Wati): +52 984 179 2682 (confirmado por Fernando 2026-10-07; el 984 168 8926 del sitio Wix anterior era incorrecto).
- Interruptores de la barra: **Noche** (invierte papel/tinta en todo el sitio, se recuerda por dispositivo) en todas las páginas y **Modo loco** solo en el inicio. El logo aparece grande en el hero y se encoge hasta la barra al hacer scroll.
- Especiales (`contenido.especial`): lista `items` de ids del menú con `video`; el intro del menú muestra uno por visita y los alterna (contador `mu-intro-n` en localStorage), vigencia `desde`/`hasta`. Platillos con `video` usan el loop en la tarjeta. Oct 2026: `diablo` (Diablo Chipotle Burger, 290) y `bloody` (The Bloody Mary, 290; el reel original dice "The Bloody Mu Burger", se cortó en 7.3 s antes del rótulo).
- GitHub "Upload files" acepta máximo 100 archivos por subida: la carpeta `video/` suele ir en una segunda subida (`/upload/main/video`).
- Postres (`layout: "postres"`): platillos con `foto` van en tarjetas grandes (2 columnas) con `foto2` (close-up al pasar el mouse / tocar) y `foto_sq` (miniatura); los sin foto, en lista. Fotos de postre con fondo igualado al papel (#f2f0eb) salvo los close-ups. `menu.postre_band` = banda "¿Y de postre?" tras las secciones en `despues_de` (burgers, hotdogs). `solo_en: ["mu-40"]` muestra la etiqueta "Solo Av. 40". Oct 2026: Chocoflan 80 y Pay de limón verde y amarillo 85 (la rebanada, solo Av. 40).
- Torre Mu (juego) se queda en el inicio. Marcador general pendiente de un endpoint propio (`MU_SCORE_API`); mientras, guarda por dispositivo.

## Datos reales (octubre 2026)
- Mu 10: 10 Avenida Norte esq. Calle 24, Gonzalo Guerrero, 77720 Playa del Carmen. Todos los días 13:30–23:30. Tel +52 984 231 2980. Google 4.6 (2 761).
- Mu 40: 40 Avenida Norte 11, entre calles 4 y 6, Centro, 77710 Playa del Carmen. Lun cerrado; Mar–Mié y Dom 14:00–22:00; Jue–Sáb 14:00–23:00. Tel +52 984 879 4525. Google 4.6 (5 743).
- Mu Nichupté: Av. Nichupté, SM 51 MZ 51 Lote 11, 77533 Cancún. Mismo horario que Mu 40. Tel +52 998 138 2813. Google 4.5 (2 716).
- Redes: instagram.com/muburgerhouse · facebook.com/MUBURGERHOUSE · tiktok.com/@muburgerhouse
- Proteína estimada (por carne cruda, ~18 g/100 g; wagyu ~16 g/100 g): smash ≈17 g, classic cut ≈34 g, wagyu ≈32 g. Big Mu (carne+queso+pan): sencilla ≈29 g, doble ≈50 g, triple ≈70 g. Campos `carnes[].proteina_g` e `items[].proteina`.
- Fundación: 2017. Menú vigente: octubre 2026 (sin la Burger en Nogada; la Croissant Burger se retiró el 2026-10-01). Precios oct 2026: Hawai 290/390, Deseo 260/390, Mu 2.0 390, Mezcalita/copeo Montelobos 220, Tehuacán 65, Megacero solo botella 1490, Beyond Meat +20.
