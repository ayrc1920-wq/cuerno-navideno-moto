/* ============================================================
   CUERNO NAVIDEÑO PARA MOTO KIT — script.js
   Basado en la plantilla Tooplate 2150 Living Parallax
   (https://www.tooplate.com/view/2150-living-parallax),
   adaptado y comentado para que puedas seguir personalizándolo.

   Índice rápido de este archivo:
   1. Referencias a elementos del DOM
   2. Motor del slider (cambiar de foto, autoplay, barra de progreso)
   3. Sistema de paneles / overlays (Kit, Manual, Galería, etc.)
   4. Círculos decorativos flotantes (parallax shapes)
   5. Menú de navegación (abrir/cerrar, incluye el arreglo del
      "flash" al cambiar de tamaño de pantalla)
   6. Botón de pantalla completa
   7. Botón de reproducir/pausar
   8. Control de duración de cada foto (segundos)
   9. Botón de ocultar/mostrar toda la interfaz (tecla H)
   10. Formulario de cotización de envío (panel Envíos → WhatsApp)
   11. Sugerencias de ciudad y departamento (panel Envíos)
   12. El ojito se oculta mientras hay un panel abierto
   13. Barra de progreso centrada sobre los botones −, 5s, +
   14. Letras temporales de las ventanas de foto
   ============================================================ */


/* ---------- 1. REFERENCIAS A ELEMENTOS DEL DOM ---------- */
// Guardamos en variables los elementos que vamos a usar varias veces,
// así no hay que buscarlos en el HTML cada vez.
const slider = document.getElementById("slider");
const slides = document.querySelectorAll(".slide");           // las 5 fotos del slider
const dots = document.querySelectorAll(".dot");               // los puntitos de abajo
const prevBtn = document.querySelector(".nav-arrow.prev");    // flecha ‹
const nextBtn = document.querySelector(".nav-arrow.next");    // flecha ›
const menuToggle = document.getElementById("menuToggle");     // ícono ☰ (hamburguesa)
const mainNav = document.getElementById("mainNav");           // el menú de enlaces

// Variables de estado (van cambiando mientras el usuario interactúa)
let autoPlayInterval;      // guarda el temporizador que pasa las fotos solas
let progressInterval;      // temporizador de la barra de progreso
let progressStart;         // marca de tiempo en la que empezó la foto actual
let currentSlide = 0;      // índice de la foto que se está mostrando (0 a 4)
let isAnimating = false;   // true mientras una foto está en transición
let mouseX = 0, mouseY = 0; // posición del mouse (para el efecto parallax)
let isPausedByUser = false; // true si el usuario le dio al botón de pausa
let slideDuration = 5000;   // cuánto dura cada foto en pantalla (ms) — 5000 = 5s


/* ---------- 2. MOTOR DEL SLIDER ---------- */

// Mueve ligeramente la foto de fondo y los círculos decorativos
// según la posición del mouse, para dar sensación de profundidad.
function updateParallax() {
  const bg = slides[currentSlide].querySelector(".background-layer");
  const shapes = document.querySelectorAll(".parallax-shape");

  if (bg) {
    bg.style.transform = `translate(${20 * mouseX}px, ${20 * mouseY}px)`;
  }
  shapes.forEach((shape, i) => {
    // Si el círculo está en medio de su animación de "salto" (rotate),
    // no lo movemos también por el mouse para evitar que se vea raro.
    if (shape.style.transform && shape.style.transform.includes("rotate")) return;
    const intensity = 15 * (i + 1);
    shape.style.transform = `translate(${mouseX * intensity}px, ${mouseY * intensity}px)`;
  });
}

// Cuánto debe durar la transición (el "cross-fade") entre una foto y la
// siguiente. Si el usuario configuró fotos muy rápidas (3s o menos),
// usamos una transición más corta para que no se vea lenta.
// EDITA AQUÍ si quieres que la transición sea más rápida o más lenta:
function getTransitionDuration() {
  return currentDuration <= 3 ? 200 : 300; // en milisegundos (0.2s / 0.3s)
}

// Cambia a la foto con índice "index".
function showSlide(index) {
  if (isAnimating) return; // evita que se encimen dos transiciones
  isAnimating = true;

  const duration = getTransitionDuration();
  document.documentElement.style.setProperty("--slide-transition-duration", duration + "ms");

  // Quitamos las clases "active" y "prev" de TODAS las fotos primero,
  // para partir de un estado limpio.
  slides.forEach(s => s.classList.remove("active", "prev"));
  dots.forEach(d => d.classList.remove("active"));

  // La foto que estaba activa pasa a "prev" (se ve al 50% mientras
  // se desvanece) — la guardamos en una variable para poder borrarle
  // esa clase apenas termine la transición (ver el setTimeout de abajo).
  // OJO: si esto no se limpia, la foto anterior se queda "fantasma"
  // detrás de la nueva — ese fue un bug que corregimos.
  const prevSlideEl = currentSlide !== index ? slides[currentSlide] : null;
  if (prevSlideEl) prevSlideEl.classList.add("prev");

  slides[currentSlide = index].classList.add("active");
  dots[currentSlide].classList.add("active");
  updateParallax();

  // Al terminar la transición: ya no estamos animando, Y borramos
  // la clase "prev" para que la foto anterior desaparezca del todo.
  setTimeout(() => {
    isAnimating = false;
    if (prevSlideEl) prevSlideEl.classList.remove("prev");
  }, duration);
}

function nextSlide() { showSlide((currentSlide + 1) % slides.length); }
function prevSlide() { showSlide((currentSlide - 1 + slides.length) % slides.length); }

// Arranca el pase automático de fotos (a menos que el usuario haya pausado).
function startAutoPlay() {
  clearInterval(autoPlayInterval);
  stopProgressBar();
  if (isPausedByUser) return;
  startProgressBar();
  autoPlayInterval = setInterval(() => {
    nextSlide();
    stopProgressBar();
    startProgressBar();
  }, slideDuration);
}

// Anima la barra delgada de progreso que ves abajo a la izquierda.
function startProgressBar() {
  const bar = document.getElementById("progressBar");
  function tick() {
    const elapsed = Date.now() - progressStart;
    const ratio = Math.min(elapsed / slideDuration, 1);
    bar.style.width = (100 * ratio) + "%";
    if (ratio >= 1) bar.style.width = "100%";
  }
  if (!bar) return;
  bar.style.width = "0%";
  progressStart = Date.now();
  clearInterval(progressInterval);
  progressInterval = setInterval(tick, 50);
  tick();
}

function stopProgressBar() {
  clearInterval(progressInterval);
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = "0%";
}


/* ---------- 3. SISTEMA DE PANELES / OVERLAYS ---------- */
// Cada botón del menú (Quiénes somos, Kit, Manual, Galería, Envíos,
// Preguntas) llama a openOverlay("nombre"), que busca un elemento con
// id="nombreOverlay" en el HTML y lo muestra. Para agregar un panel
// nuevo, solo tienes que crear un <div class="overlay" id="loQueSeaOverlay">
// en el HTML y un botón con onclick="openOverlay('loQueSea')".

function openOverlay(name) {
  const overlay = document.getElementById(name + "Overlay");
  overlay.classList.add("active");
  clearInterval(autoPlayInterval); // pausa el slider mientras hay un panel abierto

  // Muestra un indicador de "hay más para scrollear" si el contenido
  // del panel es más alto que la pantalla.
  const content = overlay.querySelector(".overlay-content");
  if (content) {
    setTimeout(() => {
      const indicator = content.querySelector(".scroll-indicator");
      if (indicator && content.scrollHeight > content.clientHeight) {
        indicator.classList.add("show");
        content.classList.add("has-scroll");
      }
    }, 100);
  }
}

function closeOverlay(name) {
  document.getElementById(name + "Overlay").classList.remove("active");
  if (!isPausedByUser) startAutoPlay(); // reanuda el slider de fondo

  // en vez de quedar mirando la pantalla de inicio, reabrimos el menú
  // para que el usuario pueda entrar directo a otra sección
  if (window.innerWidth <= 768) {
    menuToggle.classList.add("active");
    mainNav.classList.add("active");
  }
}


/* ---------- 4. CÍRCULOS DECORATIVOS FLOTANTES ---------- */
// Son los dos círculos borrosos que cambian de posición solos cada cierto
// tiempo. Si los tocas (o les haces clic), viajan hacia el lado contrario de
// la pantalla, deslizándose sin saltos.

// Cómo se mueven las burbujas:
//   · Solas, cada 15 segundos: cada una pasa a otro lugar libre.
//   · Al tocarlas (clic): viajan hacia el lado contrario de la pantalla,
//     deslizándose (sin saltos y sin rebote) por un camino que también está libre.
//     Si el pasillo es más angosto que la burbuja, se encoge para pasar.
// En los dos casos nunca deben tapar (con un margen de 24px alrededor):
//   · la ventana flotante de la foto      · el título y la descripción de la foto
//   · los botones −, 5s, + y la barra     · el botón de play/pausa
//   · el botón "Comprar"                  · el ojito, los puntitos y las flechas ‹ ›
// Si no cabe en ningún lado, la burbuja se achica hasta que quepa; solo si ni así
// cabe (pantallas diminutas), se desvanece y vuelve a aparecer sola cuando haya espacio.
const SHAPE_MARGIN = 24;  // aire (px) que debe quedar entre la burbuja y lo que no debe tapar
const SHAPE_PEEK = 0.5;   // en el viaje al otro lado pueden asomar hasta la mitad por el borde de la
                          // pantalla (así pueden pasar por arriba de la ventana de la foto)
const GLIDE_STEP = 20;    // tamaño (px) de la cuadrícula con la que se busca el camino
const GLIDE_SPEED = 320;  // velocidad media del viaje en px por segundo (más alto = más rápido)
const GLIDE_SCALES = [1, 0.75, 0.55, 0.4, 0.3, 0.2]; // tamaños con los que intenta pasar: primero normal (1) y, si el
                          // pasillo es muy angosto, cada vez más chica (75%, 55%, 40%, 30%, 20%)
const SHAPE_FIT_SCALES = [1, 0.8, 0.65, 0.5, 0.4, 0.3]; // si una burbuja no cabe en ningún lugar de la pantalla,
                          // se achica hasta que quepa (en vez de desaparecer)
const GLIDE_RESIZE_MS = 350; // lo que tarda en encogerse y en volver a crecer (milisegundos)

// Rectángulos de todo lo que las burbujas NO deben tapar, según lo que se ve ahora.
// Con forTravel=true se omiten las flechas ‹ › : durante el viaje al otro lado la
// burbuja (que en ese momento no responde a clics) puede pasar por encima de ellas,
// porque en pantallas angostas las flechas bloquearían el paso por los lados.
// El lugar donde la burbuja TERMINA sí se elige sin tapar las flechas.
function getKeepClearRects(forTravel = false) {
  const selectors = [
    ".slide.active .photo-placeholder", // ventana flotante de la foto
    ".slide.active .image-info",        // título + descripción de la foto
    ".duration-controls",               // botones −, 5s, +
    ".progress-bar-container",          // barra de progreso
    ".play-pause-btn",                  // play / pausa
    ".whatsapp-cta",                    // botón Comprar
    ".ref-btn",                         // botón "Invita y gana"
    ".ref-aviso-invitacion:not([hidden])", // aviso "Te invitó…"
    ".ui-toggle-btn",                   // el ojito
    ".dots-container",                  // puntitos del slider
    ".nav-arrow"                        // flechas ‹ ›
  ].filter((sel) => !(forTravel && sel === ".nav-arrow"));
  const rects = [];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) rects.push(r);
    });
  });
  return rects;
}

// ¿Este rectángulo está dentro de la pantalla y sin tocar nada de lo anterior?
// peek = qué parte de la burbuja puede asomar fuera de la pantalla (0 = ninguna).
function isSafeRect(rect, keepClear, peek = 0) {
  const px = (rect.right - rect.left) * peek;
  const py = (rect.bottom - rect.top) * peek;
  const inside = rect.left >= -px && rect.top >= -py &&
                 rect.right <= window.innerWidth + px && rect.bottom <= window.innerHeight + py;
  if (!inside) return false;
  return !keepClear.some((r) =>
    rect.left < r.right + SHAPE_MARGIN && rect.right > r.left - SHAPE_MARGIN &&
    rect.top < r.bottom + SHAPE_MARGIN && rect.bottom > r.top - SHAPE_MARGIN);
}

// Busca una posición libre. Si checkPath es true, además exige que el camino que va a
// recorrer la burbuja (se desliza ~0.8s) no pase por encima de nada.
// Primero prueba al azar; si no encuentra (pasillos muy angostos), revisa toda la
// pantalla casilla por casilla. Devuelve { x, y } o null si no hay lugar.
function findFreeSpot(shape, keepClear, checkPath) {
  const w = shape.offsetWidth, h = shape.offsetHeight;
  const minX = 8, minY = 8;
  const maxX = window.innerWidth - w - 8, maxY = window.innerHeight - h - 8;
  if (maxX < minX || maxY < minY) return null;
  const cur = shape.getBoundingClientRect();

  const isGood = (x, y) => {
    if (!isSafeRect({ left: x, top: y, right: x + w, bottom: y + h }, keepClear)) return false;
    if (!checkPath) return true;
    // se revisan puntos a lo largo del recorrido (hasta 1.12 por el pequeño "rebote" final)
    for (let t = 0.1; t <= 1.12; t += 0.1) {
      const px = cur.left + (x - cur.left) * t;
      const py = cur.top + (y - cur.top) * t;
      const r = { left: px, top: py, right: px + w, bottom: py + h };
      const overlapsSomething = keepClear.some((k) =>
        r.left < k.right + SHAPE_MARGIN && r.right > k.left - SHAPE_MARGIN &&
        r.top < k.bottom + SHAPE_MARGIN && r.bottom > k.top - SHAPE_MARGIN);
      if (overlapsSomething) return false;
    }
    return true;
  };

  for (let n = 0; n < 80; n++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    if (isGood(x, y)) return { x, y };
  }
  const found = [];
  for (let y = minY; y <= maxY; y += 8) {
    for (let x = minX; x <= maxX; x += 8) {
      if (isGood(x, y)) found.push({ x, y });
    }
  }
  return found.length ? found[Math.floor(Math.random() * found.length)] : null;
}

// Pone la burbuja en (x, y). Con animate=false se coloca de golpe, sin deslizarse.
function setShapePosition(shape, x, y, animate) {
  if (!animate) shape.style.transition = "none";
  shape.style.top = y + "px";
  shape.style.left = x + "px";
  shape.style.bottom = "auto";
  shape.style.right = "auto";
  if (!animate) {
    void shape.offsetWidth;        // fuerza al navegador a aplicar la posición ya
    shape.style.transition = "";   // y se devuelve la animación normal
  }
}

// Coloca la burbuja DE GOLPE en un lugar libre. Si con su tamaño normal no cabe en ningún
// lado, la va achicando (80%, 65%, 50%, 40%, 30%) hasta que quepa. Si ni así, se desvanece.
function placeWithFit(shape, keepClear) {
  shape.style.transition = "none"; // sin animar mientras se prueba cada tamaño
  shape.style.width = "";
  shape.style.height = "";
  const baseW = shape.offsetWidth, baseH = shape.offsetHeight;
  let spot = null;
  for (const k of SHAPE_FIT_SCALES) {
    if (k !== 1) {
      shape.style.width = (baseW * k).toFixed(2) + "px";
      shape.style.height = (baseH * k).toFixed(2) + "px";
    }
    spot = findFreeSpot(shape, keepClear, false);
    if (spot) break;
  }
  if (spot) {
    shape.style.top = spot.y + "px";
    shape.style.left = spot.x + "px";
    shape.style.bottom = "auto";
    shape.style.right = "auto";
    showShape(shape);
  } else {
    shape.style.width = "";
    shape.style.height = "";
    hideShape(shape);
  }
  void shape.offsetWidth;        // fuerza al navegador a aplicar todo ya
  shape.style.transition = "";   // y se devuelve la animación normal
  return !!spot;
}

function hideShape(shape) { shape.style.opacity = "0"; shape.style.pointerEvents = "none"; }
function showShape(shape) { shape.style.opacity = ""; shape.style.pointerEvents = ""; }

// Mueve una burbuja a otro lugar libre (automáticamente cada 15 segundos).
function moveShapeToRandomPosition(shape) {
  if (shape.dataset.gliding) return; // si está viajando por un clic, no se interrumpe
  const keepClear = getKeepClearRects();
  const wasSafe = isSafeRect(shape.getBoundingClientRect(), keepClear);
  // Si ya estaba tapando algo se recoloca de golpe; si no, se desliza por un camino libre.
  const spot = findFreeSpot(shape, keepClear, wasSafe);
  if (!spot) {
    if (!wasSafe) placeWithFit(shape, keepClear); // tapaba algo o estaba oculta: se recoloca (achicándola si hace falta)
    return;                                       // si estaba bien ubicada, simplemente se queda donde está
  }
  showShape(shape);
  setShapePosition(shape, spot.x, spot.y, wasSafe);

  // Le da una vuelta aleatoria al moverse, como efecto visual.
  const rotation = 360 * Math.random();
  shape.style.transform = `rotate(${rotation}deg)`;
  setTimeout(() => { shape.style.transform = ""; }, 800);
}

// Revisa que ninguna burbuja esté tapando algo; si lo hace, la recoloca al instante.
// Se llama al cargar la página y cuando cambia el tamaño de la ventana.
function settleShapes() {
  const keepClear = getKeepClearRects();
  document.querySelectorAll(".parallax-shape").forEach((shape) => {
    const wasGliding = !!shape.dataset.gliding;
    if (wasGliding) shape.dataset.glideAbort = "1"; // un viaje en curso se cancela
    // Una burbuja achicada se vuelve a colocar: quizá ahora ya cabe con su tamaño normal.
    const shrunk = shape.style.width !== "";
    if (!wasGliding && !shrunk && isSafeRect(shape.getBoundingClientRect(), keepClear)) { showShape(shape); return; }
    placeWithFit(shape, keepClear);
  });
}

// Mueve los círculos automáticamente, uno tras otro (con 2s de diferencia).
function autoMoveShapes() {
  document.querySelectorAll(".parallax-shape").forEach((shape, i) => {
    setTimeout(() => moveShapeToRandomPosition(shape), 2000 * i);
  });
}

/* ----- Viaje al lado contrario cuando se toca una burbuja ----- */

// Dónde está la burbuja ahora (aunque esté a mitad de una animación).
function currentShapePos(shape) {
  const cs = window.getComputedStyle(shape);
  const x = parseFloat(cs.left), y = parseFloat(cs.top);
  if (!isNaN(x) && !isNaN(y)) return { x, y };
  const r = shape.getBoundingClientRect();
  return { x: r.left, y: r.top };
}

// Busca el camino hacia el lado contrario de la pantalla. Divide la pantalla en
// una cuadrícula, marca qué casillas están libres para la burbuja y busca el
// camino más corto (el pasillo de arriba o el de en medio, por ejemplo) hasta un
// lugar libre del otro lado. Si el pasillo es más angosto que la burbuja, prueba
// con la burbuja más chica: se encoge para pasar y vuelve a su tamaño al llegar.
// Devuelve { points, k } (puntos CENTRALES por los que pasa y la escala con que
// viaja, 1 = tamaño normal) o null si no hay camino.
function planGlideRoute(shape, travelClear, restClear) {
  const w0 = shape.offsetWidth, h0 = shape.offsetHeight;
  const start = currentShapePos(shape);
  const startC = { x: start.x + w0 / 2, y: start.y + h0 / 2 };
  // Primero se intenta llegar de verdad al otro lado (tier 0), probando cada tamaño de
  // burbuja. Solo si con ninguno se puede, se acepta avanzar "al menos hacia ese lado" (tier 1).
  for (const tier of [0, 1]) {
    for (const k of GLIDE_SCALES) {
      const points = planGlideRouteAtScale(w0, h0, k, startC, travelClear, restClear, tier);
      if (points) return { points, k };
    }
  }
  return null;
}

function planGlideRouteAtScale(w0, h0, k, startC, keepClear, restClear, tier) {
  const w = w0 * k, h = h0 * k;                 // tamaño con el que viaja
  const vw = window.innerWidth, vh = window.innerHeight;
  const minX = -w * SHAPE_PEEK, maxX = vw - w + w * SHAPE_PEEK;
  const minY = -h * SHAPE_PEEK, maxY = vh - h + h * SHAPE_PEEK;
  if (maxX <= minX || maxY <= minY) return null;
  const nx = Math.floor((maxX - minX) / GLIDE_STEP) + 1;
  const ny = Math.floor((maxY - minY) / GLIDE_STEP) + 1;
  const cellX = (i) => minX + i * GLIDE_STEP;     // esquina superior izquierda de la casilla
  const cellY = (j) => minY + j * GLIDE_STEP;
  const centerX = (idx) => cellX(idx % nx) + w / 2;
  const centerY = (idx) => cellY((idx - (idx % nx)) / nx) + h / 2;
  const rectAt = (x, y) => ({ left: x, top: y, right: x + w, bottom: y + h });

  const cache = new Int8Array(nx * ny); // 0 = sin calcular, 1 = libre, 2 = ocupada
  const isFree = (i, j) => {
    if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
    const idx = j * nx + i;
    if (!cache[idx]) cache[idx] = isSafeRect(rectAt(cellX(i), cellY(j)), keepClear, SHAPE_PEEK) ? 1 : 2;
    return cache[idx] === 1;
  };

  // casilla de salida: la más cercana a donde está la burbuja
  let si = Math.min(nx - 1, Math.max(0, Math.round((startC.x - w / 2 - minX) / GLIDE_STEP)));
  let sj = Math.min(ny - 1, Math.max(0, Math.round((startC.y - h / 2 - minY) / GLIDE_STEP)));
  if (!isFree(si, sj)) {
    let found = false;
    for (let r = 1; r <= 3 && !found; r++) {
      for (let dj = -r; dj <= r && !found; dj++) {
        for (let di = -r; di <= r && !found; di++) {
          if (isFree(si + di, sj + dj)) { si += di; sj += dj; found = true; }
        }
      }
    }
    if (!found) return null;
  }

  // búsqueda en anchura (BFS) por todas las casillas alcanzables
  const parent = new Int32Array(nx * ny).fill(-2); // -2 = no alcanzable, -1 = salida
  const startIdx = sj * nx + si;
  parent[startIdx] = -1;
  const queue = [startIdx];
  const moves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (let q = 0; q < queue.length; q++) {
    const idx = queue[q], i = idx % nx, j = (idx - i) / nx;
    for (const [di, dj] of moves) {
      const ni = i + di, nj = j + dj;
      if (!isFree(ni, nj)) continue;
      if (di !== 0 && dj !== 0 && (!isFree(i + di, j) || !isFree(i, j + dj))) continue; // sin cortar esquinas
      const nIdx = nj * nx + ni;
      if (parent[nIdx] !== -2) continue;
      parent[nIdx] = idx;
      queue.push(nIdx);
    }
  }

  // Destino: un lugar del otro lado donde la burbuja, YA con su tamaño normal, quepa sin tapar
  // nada (esta vez SÍ cuentan las flechas ‹ ›) y que esté cerca de una casilla alcanzable.
  // Se revisa la pantalla cada 10px (no solo las casillas), así no se pierden pasillos angostos.
  const goLeft = startC.x > vw / 2;
  const inZone = tier === 0
    ? (c) => (goLeft ? c <= vw * 0.4 : c >= vw * 0.6)          // bien al otro lado
    : (c) => (goLeft ? c < startC.x - 40 : c > startC.x + 40); // al menos hacia ese lado
  const nearestReachable = (cx, cy) => {
    const i0 = Math.round((cx - w / 2 - minX) / GLIDE_STEP);
    const j0 = Math.round((cy - h / 2 - minY) / GLIDE_STEP);
    let best = -1, bestD = Infinity;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
        const idx = j * nx + i;
        if (parent[idx] === -2) continue;
        const d = Math.hypot(centerX(idx) - cx, centerY(idx) - cy);
        if (d < bestD) { bestD = d; best = idx; }
      }
    }
    return bestD <= GLIDE_STEP * 1.5 ? best : -1;
  };
  let candidates = [];
  for (const peek of [0, SHAPE_PEEK]) { // primero lugares completamente a la vista
    for (let cy = h0 / 2 - h0 * peek; cy <= vh - h0 / 2 + h0 * peek; cy += 10) {
      for (let cx = w0 / 2 - w0 * peek; cx <= vw - w0 / 2 + w0 * peek; cx += 10) {
        if (!inZone(cx)) continue;
        const full = { left: cx - w0 / 2, top: cy - h0 / 2, right: cx + w0 / 2, bottom: cy + h0 / 2 };
        if (!isSafeRect(full, restClear, peek)) continue;
        const idx = nearestReachable(cx, cy);
        if (idx !== -1) candidates.push({ cx, cy, idx });
      }
    }
    if (candidates.length) break;
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs(b.cx - startC.x) - Math.abs(a.cx - startC.x));
  const target = candidates[Math.floor(Math.random() * Math.max(1, Math.ceil(candidates.length * 0.25)))]; // uno de los más lejanos

  // reconstruir el camino y quitarle los zigzags (solo se conservan los puntos donde hay que girar)
  const cells = [];
  for (let idx = target.idx; idx !== -1; idx = parent[idx]) cells.push({ x: centerX(idx), y: centerY(idx) });
  cells.reverse();
  cells[0] = { x: startC.x, y: startC.y };
  cells.push({ x: target.cx, y: target.cy });
  const clearSegment = (a, b) => {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(dist / 8));
    for (let t = 0; t <= n; t++) {
      const x = a.x + (b.x - a.x) * (t / n), y = a.y + (b.y - a.y) * (t / n);
      if (!isSafeRect(rectAt(x - w / 2, y - h / 2), keepClear, SHAPE_PEEK)) return false;
    }
    return true;
  };
  const route = [cells[0]];
  let a = 0;
  while (a < cells.length - 1) {
    let b = cells.length - 1;
    while (b > a + 1 && !clearSegment(cells[a], cells[b])) b--;
    route.push(cells[b]);
    a = b;
  }
  return route;
}

// Desliza la burbuja por la ruta, a velocidad pareja, empezando y terminando con
// suavidad (sin saltos ni rebote). Si la ruta pide una burbuja más chica (k < 1),
// primero se encoge en su lugar, viaja, y al llegar vuelve a su tamaño normal.
function glideShape(shape, plan) {
  const pts = plan.points, k = plan.k;
  const w0 = shape.offsetWidth, h0 = shape.offsetHeight;
  const last = pts[pts.length - 1];
  const finalX = last.x - w0 / 2, finalY = last.y - h0 / 2;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = lens[lens.length - 1];
  if (reduce || (!total && k === 1)) { setShapePosition(shape, finalX, finalY, false); return; }

  const travelMs = total ? Math.min(12, Math.max(0.9, total / GLIDE_SPEED)) * 1000 : 0;
  const resizeMs = k < 1 ? GLIDE_RESIZE_MS : 0;
  const totalMs = resizeMs * 2 + travelMs;
  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

  const keepW = shape.style.width, keepH = shape.style.height; // tamaño que tenía (puede venir achicada)
  shape.dataset.gliding = "1";
  delete shape.dataset.glideAbort;
  shape.style.transition = "none"; // la animación la hacemos nosotros, fotograma a fotograma
  shape.style.pointerEvents = "none"; // mientras viaja no atrapa clics (no bloquea lo que cruza)
  shape.style.bottom = "auto";
  shape.style.right = "auto";
  let t0 = null;

  // aborted = true cuando el viaje se cancela (p. ej. cambió el tamaño de la ventana): en ese
  // caso NO se mueve ni se cambia de tamaño, porque settleShapes ya la recolocó.
  function finish(aborted) {
    if (!aborted) {
      shape.style.width = keepW;   // vuelve al tamaño que tenía antes de viajar
      shape.style.height = keepH;
      shape.style.left = finalX.toFixed(2) + "px";
      shape.style.top = finalY.toFixed(2) + "px";
    }
    void shape.offsetWidth;
    shape.style.transition = "";
    if (shape.style.opacity !== "0") shape.style.pointerEvents = "";
    delete shape.dataset.gliding;
    delete shape.dataset.glideAbort;
  }
  function step(now) {
    if (shape.dataset.glideAbort) { finish(true); return; }
    if (t0 === null) t0 = now;
    const elapsed = now - t0;
    let f, c;
    if (elapsed < resizeMs) {                       // 1) se encoge en su lugar
      f = 1 - (1 - k) * ease(elapsed / resizeMs);
      c = pts[0];
    } else if (elapsed < resizeMs + travelMs) {     // 2) viaja
      const d = ease((elapsed - resizeMs) / travelMs) * total;
      let seg = 1;
      while (seg < lens.length - 1 && lens[seg] < d) seg++;
      const segLen = lens[seg] - lens[seg - 1] || 1;
      const g = Math.min(1, Math.max(0, (d - lens[seg - 1]) / segLen));
      f = k;
      c = { x: pts[seg - 1].x + (pts[seg].x - pts[seg - 1].x) * g, y: pts[seg - 1].y + (pts[seg].y - pts[seg - 1].y) * g };
    } else {                                        // 3) vuelve a su tamaño
      f = k + (1 - k) * ease((elapsed - resizeMs - travelMs) / resizeMs);
      c = last;
    }
    if (k < 1) { shape.style.width = (w0 * f).toFixed(2) + "px"; shape.style.height = (h0 * f).toFixed(2) + "px"; }
    shape.style.left = (c.x - (w0 * f) / 2).toFixed(2) + "px";
    shape.style.top = (c.y - (h0 * f) / 2).toFixed(2) + "px";
    if (elapsed < totalMs) requestAnimationFrame(step);
    else finish();
  }
  requestAnimationFrame(step);
}

// Al tocar una burbuja: viaja hacia el lado contrario por un camino libre.
// Si no hay camino posible (pantalla muy chica), se queda donde está.
function sendShapeToOtherSide(shape) {
  if (shape.dataset.gliding) return; // ya está viajando
  const plan = planGlideRoute(shape, getKeepClearRects(true), getKeepClearRects(false));
  if (!plan) return;
  showShape(shape);
  glideShape(shape, plan);
}

// Muestra/oculta la flechita de "sigue bajando" dentro de un panel,
// según si su contenido es más largo que lo que se ve en pantalla.
function handleScrollIndicator(content) {
  const indicator = content.querySelector(".scroll-indicator");
  if (!indicator) return;
  function check() {
    const hasOverflow = content.scrollHeight > content.clientHeight;
    const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10;
    const shouldShow = hasOverflow && !atBottom;
    indicator.classList.toggle("show", shouldShow);
    content.classList.toggle("has-scroll", shouldShow);
  }
  setTimeout(check, 100);
  content.addEventListener("scroll", check);
}


/* ---------- 5. MENÚ DE NAVEGACIÓN (abrir / cerrar) ---------- */

// Clic en el ícono ☰: abre o cierra el menú (solo tiene efecto visual
// en pantallas angostas, ver el CSS dentro de @media max-width:768px).
menuToggle.addEventListener("click", () => {
  menuToggle.classList.toggle("active");
  mainNav.classList.toggle("active");
});

// ARREGLO DE UN BUG: si el usuario abre el menú en modo móvil y luego
// agranda la ventana a modo escritorio, la clase "active" se quedaba
// pegada; al volver a achicar la ventana, el menú aparecía abierto
// solo, sin que nadie lo tocara. Estas dos líneas cierran el menú
// automáticamente en cuanto la pantalla vuelve a ser de escritorio.
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    menuToggle.classList.remove("active");
    mainNav.classList.remove("active");
  }
});
window.matchMedia("(min-width: 769px)").addEventListener("change", (e) => {
  if (e.matches) {
    menuToggle.classList.remove("active");
    mainNav.classList.remove("active");
  }
});

// Si el usuario toca un enlace del menú en modo móvil, lo cerramos.
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      menuToggle.classList.remove("active");
      mainNav.classList.remove("active");
    }
  });
});

// Efecto parallax al mover el mouse sobre el slider.
slider.addEventListener("mousemove", (e) => {
  const rect = slider.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) / rect.width - 0.5;
  mouseY = (e.clientY - rect.top) / rect.height - 0.5;
  updateParallax();
});

// Flechas ‹ › para cambiar de foto manualmente.
nextBtn.addEventListener("click", () => {
  clearInterval(autoPlayInterval);
  nextSlide();
  if (!isPausedByUser) startAutoPlay();
});
prevBtn.addEventListener("click", () => {
  clearInterval(autoPlayInterval);
  prevSlide();
  if (!isPausedByUser) startAutoPlay();
});

// Puntitos de abajo: clic en uno salta directo a esa foto.
dots.forEach(dot => {
  dot.addEventListener("click", () => {
    clearInterval(autoPlayInterval);
    showSlide(parseInt(dot.getAttribute("data-slide")));
    if (!isPausedByUser) startAutoPlay();
  });
});

// Flechas del teclado para cambiar de foto, y tecla "H" para
// ocultar/mostrar toda la interfaz (ver sección 9).
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    clearInterval(autoPlayInterval);
    prevSlide();
    if (!isPausedByUser) startAutoPlay();
  } else if (e.key === "ArrowRight") {
    clearInterval(autoPlayInterval);
    nextSlide();
    if (!isPausedByUser) startAutoPlay();
  } else if (e.key.toLowerCase() === "h") {
    // El atajo "H" no debe actuar mientras se escribe en un campo (por ejemplo
    // al teclear "Hola" o "Huila" en el formulario de Envíos) ni con un panel abierto.
    const t = e.target;
    const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (!typing && !document.querySelector(".overlay.active")) uiToggleBtn.click();
  }
});

// Clic FUERA del contenido de un panel (en el fondo oscuro) lo cierra.
document.querySelectorAll(".overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
      if (!isPausedByUser) startAutoPlay();
    }
  });
});

// Tecla Escape cierra cualquier panel abierto.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
    if (!isPausedByUser) startAutoPlay();
  }
});

// Arranque inicial: empieza el pase automático y coloca el parallax.
startAutoPlay();
updateParallax();

// En celulares no hay "mouse", así que no tiene sentido escuchar mousemove.
if (window.innerWidth <= 768) {
  slider.removeEventListener("mousemove", updateParallax);
}

// Clic (o toque) directo sobre un círculo decorativo: viaja al lado contrario de la pantalla.
document.querySelectorAll(".parallax-shape").forEach(shape => {
  shape.addEventListener("click", function (e) {
    e.stopPropagation();
    sendShapeToOtherSide(this);
  });
});

// Mueve los círculos solos cada 15 segundos (y una vez a los 5s de cargar).
setInterval(autoMoveShapes, 15000);
setTimeout(autoMoveShapes, 5000);

// Al cargar y cada vez que cambia el tamaño de la ventana, se comprueba que las
// burbujas no estén tapando nada (también cuando termina de cargar la tipografía,
// porque cambia el alto de la descripción).
settleShapes();
window.addEventListener("load", settleShapes);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(settleShapes);
let shapeResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(shapeResizeTimer);
  shapeResizeTimer = setTimeout(settleShapes, 200);
});

// Activa el indicador de scroll en todos los paneles.
document.querySelectorAll(".overlay-content").forEach(handleScrollIndicator);


/* ---------- 6. BOTÓN DE PANTALLA COMPLETA ---------- */
const fullscreenBtn = document.getElementById("fullscreenBtn");
const expandIcon = '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
const collapseIcon = '<svg viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';

fullscreenBtn.addEventListener("click", () => {
  // Si el menú móvil estaba abierto, lo cerramos antes de entrar a pantalla completa.
  if (window.innerWidth <= 768) {
    menuToggle.classList.remove("active");
    mainNav.classList.remove("active");
  }
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
  if (isFullscreen) {
    // Salir de pantalla completa (con los prefijos para distintos navegadores)
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
    fullscreenBtn.classList.remove("active");
    fullscreenBtn.innerHTML = expandIcon;
  } else {
    // Entrar a pantalla completa
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
    fullscreenBtn.classList.add("active");
    fullscreenBtn.innerHTML = collapseIcon;
  }
});

// Si el usuario sale de pantalla completa con Esc (en vez del botón),
// igual actualizamos el ícono.
["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange"].forEach(evt => {
  document.addEventListener(evt, () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.classList.remove("active");
      fullscreenBtn.innerHTML = expandIcon;
    }
  });
});


/* ---------- 7. BOTÓN DE REPRODUCIR / PAUSAR ---------- */
const playPauseBtn = document.getElementById("playPauseBtn");
const playIcon = '<svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>';
playPauseBtn.innerHTML = pauseIcon; // empieza reproduciendo, así que el ícono es "pausa"

playPauseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isPausedByUser) {
    // Estaba pausado -> reanudar
    isPausedByUser = false;
    startAutoPlay();
    playPauseBtn.innerHTML = pauseIcon;
    playPauseBtn.classList.remove("paused");
  } else {
    // Estaba reproduciendo -> pausar
    isPausedByUser = true;
    clearInterval(autoPlayInterval);
    stopProgressBar();
    playPauseBtn.innerHTML = playIcon;
    playPauseBtn.classList.add("paused");
  }
});


/* ---------- 8. CONTROL DE DURACIÓN (segundos por foto) ---------- */
const decreaseBtn = document.getElementById("decreaseDuration");
const increaseBtn = document.getElementById("increaseDuration");
const durationDisplay = document.getElementById("durationDisplay");
let currentDuration = 5; // valor inicial: 5 segundos por foto

// Cambia cuánto dura cada foto en pantalla (entre 1 y 9 segundos).
function updateDuration(newValue) {
  currentDuration = Math.max(1, Math.min(9, newValue)); // nunca menos de 1 ni más de 9
  slideDuration = 1000 * currentDuration;
  durationDisplay.innerHTML = currentDuration + "<span>s</span>";

  const t = getTransitionDuration();
  document.documentElement.style.setProperty("--slide-transition-duration", t + "ms");

  if (!isPausedByUser) startAutoPlay(); // reinicia el temporizador con la nueva duración
}

document.documentElement.style.setProperty("--slide-transition-duration", "700ms");

decreaseBtn.addEventListener("click", (e) => { e.stopPropagation(); updateDuration(currentDuration - 1); });
increaseBtn.addEventListener("click", (e) => { e.stopPropagation(); updateDuration(currentDuration + 1); });


/* ---------- 9. OCULTAR / MOSTRAR TODA LA INTERFAZ (tecla H) ---------- */
// Este botón (el ojito, arriba a la derecha) oculta todos los elementos
// marcados con la clase "ui-element" en el HTML (menú, flechas, textos,
// botones de control) para poder ver la foto sin nada encima.
// El botón de "Comprar" (WhatsApp) NO tiene esa clase a propósito,
// para que siga visible incluso con la interfaz oculta.
let uiVisible = true;
const uiToggleBtn = document.getElementById("uiToggleBtn");
const eyeIcon = document.getElementById("eyeIcon");
uiToggleBtn.title = "Hide UI Elements (Press H)";

const eyeOpenPath = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const eyeClosedPath = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

uiToggleBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const uiElements = document.querySelectorAll(".ui-element");

  if (uiVisible) {
    uiElements.forEach(el => el.classList.add("hidden"));
    uiVisible = false;
    uiToggleBtn.classList.add("ui-hidden");
    eyeIcon.innerHTML = eyeClosedPath;
    uiToggleBtn.title = "Show UI Elements (Press H)";
  } else {
    uiElements.forEach(el => el.classList.remove("hidden"));
    uiVisible = true;
    uiToggleBtn.classList.remove("ui-hidden");
    eyeIcon.innerHTML = eyeOpenPath;
    uiToggleBtn.title = "Hide UI Elements (Press H)";
  }
});


/* ---------- 10. FORMULARIO DE COTIZACIÓN DE ENVÍO (panel "Envíos") ----------
   Al llenar los datos y darle a "Cotizar por WhatsApp", este
   bloque arma un mensaje de texto con todos los campos (nombre,
   dirección, ciudad, peso, medidas...) y abre WhatsApp con ese
   mensaje ya escrito, listo para enviar.
   El número de WhatsApp de destino es el mismo que usan los
   demás botones de la página — si lo cambias en el HTML,
   cámbialo también aquí abajo (la constante NUMERO_WHATSAPP). */
const NUMERO_WHATSAPP = "573212122689";
const shippingForm = document.getElementById("shippingForm");

if (shippingForm) {
  shippingForm.addEventListener("submit", (e) => {
    e.preventDefault(); // evita que la página se recargue al enviar el formulario

    // leer cada campo del formulario
    const nombre = document.getElementById("envioNombre").value.trim();
    const telefono = document.getElementById("envioTelefono").value.trim();
    const direccion = document.getElementById("envioDireccion").value.trim();
    const ciudad = document.getElementById("envioCiudad").value.trim();
    const departamento = document.getElementById("envioDepartamento").value.trim();
    const peso = document.getElementById("envioPeso").value.trim();
    const medidas = document.getElementById("envioMedidas").value.trim();

    // arma el mensaje línea por línea, como se vería escrito a mano en WhatsApp
    const lineas = [
      "Hola, quiero cotizar el envío de mi Kit Cuerno Navideño Para Moto.",
      "",
      `Nombre: ${nombre}`,
      `Teléfono: ${telefono}`,
      `Dirección: ${direccion}`,
      `Ciudad: ${ciudad}`,
      `Departamento: ${departamento}`,
      `Medidas: ${medidas}`,
      `Peso: ${peso} kg`
    ];
    const mensaje = lineas.join("\n");

    // encodeURIComponent convierte tildes, espacios y saltos de línea
    // al formato que necesita una URL (igual que en los otros botones de WhatsApp)
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener");
  });
}


/* ---------- 11. PREDICCIÓN DE DEPARTAMENTO Y CIUDAD (panel "Envíos") ----------
   Mientras el cliente escribe en "Departamento" o en "Ciudad", aparece una
   lista de sugerencias justo debajo del campo:
     · Departamento → sugiere los 32 departamentos + Bogotá D.C. Pero si ya
                      hay una ciudad elegida, sugiere SOLO los departamentos
                      donde existe esa ciudad (Granada → Cundinamarca y Meta).
                      Si el cliente escribe algo que no coincide con esos,
                      muestra las sugerencias normales de lo que escribió.
     · Ciudad       → si ya hay un departamento válido, solo sugiere las
                      ciudades de ese departamento. Si no, sugiere de todos
                      (mostrando el departamento al lado para distinguir, por
                      ejemplo, Granada de Meta y de Cundinamarca). Elegir una
                      ciudad NO rellena el departamento: eso lo elige el cliente.
   La búsqueda ignora tildes y mayúsculas ("bogota" encuentra "Bogotá").
   OJO: la lista de ciudades (COLOMBIA, aquí abajo) incluye las principales de
   cada departamento, no los ~1.100 municipios. Los campos siguen siendo de
   texto libre: si el cliente escribe una ciudad que no está, igual se envía.
   Para agregar una ciudad: ponla en el arreglo de su departamento. */
(function () {
  const COLOMBIA = {
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Sabaneta", "La Estrella", "Caldas", "Copacabana", "Girardota", "Barbosa", "Rionegro", "Marinilla", "El Retiro", "La Ceja", "Guarne", "El Carmen de Viboral", "Santa Fe de Antioquia", "Apartadó", "Turbo", "Carepa", "Chigorodó", "Necoclí", "Caucasia", "Puerto Berrío", "Yarumal", "Santa Rosa de Osos", "Andes", "Jardín", "Jericó", "Támesis", "Sonsón", "Segovia", "Remedios", "Amagá", "Fredonia", "Urrao"],
    "Arauca": ["Arauca", "Arauquita", "Saravena", "Tame", "Fortul", "Cravo Norte", "Puerto Rondón"],
    "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Baranoa", "Puerto Colombia", "Galapa", "Santo Tomás", "Sabanagrande", "Palmar de Varela", "Luruaco", "Repelón", "Juan de Acosta", "Tubará"],
    "Bogotá D.C.": ["Bogotá"],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar", "Mompós", "San Juan Nepomuceno", "Santa Rosa del Sur", "San Jacinto", "Clemencia", "Mahates", "María la Baja", "Simití", "Villanueva", "Santa Catalina", "San Pablo"],
    "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa", "Villa de Leyva", "Moniquirá", "Puerto Boyacá", "Samacá", "Garagoa", "Nobsa", "Tibasosa", "Ramiriquí", "Soatá", "Miraflores", "Guateque", "Monguí", "Aquitania"],
    "Caldas": ["Manizales", "Villamaría", "Chinchiná", "La Dorada", "Riosucio", "Anserma", "Aguadas", "Salamina", "Supía", "Neira", "Palestina", "Viterbo", "Samaná"],
    "Caquetá": ["Florencia", "San Vicente del Caguán", "Puerto Rico", "Belén de los Andaquíes", "Cartagena del Chairá", "El Doncello", "El Paujil", "La Montañita", "Morelia"],
    "Casanare": ["Yopal", "Aguazul", "Villanueva", "Tauramena", "Paz de Ariporo", "Monterrey", "Maní", "Orocué", "Trinidad", "Sabanalarga"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía (El Bordo)", "Piendamó", "Silvia", "Guapi", "Timbío", "Miranda", "Corinto", "Caloto", "El Tambo", "Cajibío", "Páez (Belalcázar)"],
    "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia", "La Jagua de Ibirico", "Chimichagua", "Curumaní", "El Copey", "Pailitas", "San Alberto", "Pueblo Bello", "Chiriguaná", "Astrea"],
    "Chocó": ["Quibdó", "Istmina", "Tadó", "Condoto", "Bahía Solano", "Nuquí", "Acandí", "Riosucio", "Bajo Baudó", "Unguía", "Lloró"],
    "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún", "Planeta Rica", "Montelíbano", "Tierralta", "Ciénaga de Oro", "Puerto Libertador", "San Pelayo", "Ayapel", "Chinú", "Buenavista", "La Apartada", "San Andrés de Sotavento", "Canalete", "Los Córdobas", "Valencia"],
    "Cundinamarca": ["Soacha", "Zipaquirá", "Facatativá", "Chía", "Cajicá", "Fusagasugá", "Girardot", "Mosquera", "Madrid", "Funza", "Sopó", "Tocancipá", "La Calera", "Cota", "Tenjo", "Tabio", "Ubaté", "Villeta", "Guaduas", "Sibaté", "Silvania", "Anapoima", "Ricaurte", "Nilo", "Villapinzón", "Choachí", "Gachancipá", "Nemocón", "Cogua", "Pacho", "Fómeque", "Une", "Chocontá", "Sesquilé", "Guasca", "Guatavita", "El Rosal", "Bojacá", "Zipacón", "Subachoque", "San Antonio del Tequendama", "La Mesa", "Tocaima", "Agua de Dios", "Arbeláez", "Pasca", "Útica", "Quebradanegra", "Caparrapí", "Granada", "Tibacuy"],
    "Guainía": ["Inírida"],
    "Guaviare": ["San José del Guaviare", "Calamar", "El Retorno", "Miraflores"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre", "Gigante", "Rivera", "Aipe", "Hobo", "Palermo", "Santa María", "Tesalia", "Timaná", "Yaguará", "Altamira", "Tello", "Baraya", "Íquira", "Isnos", "San Agustín", "Suaza"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "Fonseca", "San Juan del Cesar", "Villanueva", "Dibulla", "Albania", "Barrancas", "Hatonuevo", "El Molino", "Distracción", "Manaure"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "El Banco", "Aracataca", "Zona Bananera (Sevilla)", "Plato", "Pivijay", "Santa Ana", "Guamal", "Remolino", "Algarrobo", "Pedraza", "Salamina", "Sitionuevo", "Tenerife"],
    "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López", "Puerto Gaitán", "Restrepo", "Cumaral", "San Martín", "Guamal", "La Macarena", "Mesetas", "Uribe", "Puerto Lleras", "Barranca de Upía", "Cubarral", "El Castillo", "Fuente de Oro", "Lejanías", "Mapiripán", "Vista Hermosa", "San Juan de Arama"],
    "Nariño": ["Pasto", "Ipiales", "Tumaco", "Túquerres", "La Unión", "Samaniego", "Sandoná", "Barbacoas", "Cumbal", "Guachucal", "La Cruz", "Consacá", "Taminango", "Tangua", "Yacuanquer", "Chachagüí", "Buesaco", "Funes", "Gualmatán", "Pupiales", "Cuaspud"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Los Patios", "Tibú", "Ábrego", "Convención", "El Zulia", "Chinácota", "Sardinata", "Toledo", "Cácota", "Teorama", "San Cayetano", "Villa Caro", "Bochalema", "Durania", "Herrán", "Lourdes", "Salazar", "Arboledas", "Gramalote", "Mutiscua"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez (La Hormiga)", "Puerto Guzmán", "Sibundoy", "Villagarzón", "Colón", "San Francisco", "Santiago", "Puerto Caicedo", "Puerto Leguízamo", "San Miguel"],
    "Quindío": ["Armenia", "Calarcá", "La Tebaida", "Montenegro", "Quimbaya", "Circasia", "Salento", "Filandia", "Génova", "Pijao", "Buenavista", "Córdoba"],
    "Risaralda": ["Pereira", "Dosquebradas", "La Virginia", "Santa Rosa de Cabal", "Marsella", "Belén de Umbría", "Quinchía", "Apía", "Pueblo Rico", "Balboa", "Guática", "La Celia", "Mistrató", "Santuario"],
    "San Andrés y Providencia": ["San Andrés", "Providencia"],
    "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "San Gil", "Socorro", "Barbosa", "Vélez", "Málaga", "Lebrija", "Rionegro", "Sabana de Torres", "Puerto Wilches", "Cimitarra", "Charalá", "Oiba", "Zapatoca", "Curití", "Aratoca", "Barichara", "Cepitá", "Los Santos", "Puente Nacional", "Suaita", "Villanueva", "Bolívar", "Landázuri", "Páramo", "Pinchote", "Mogotes", "Capitanejo", "Guadalupe", "Simacota"],
    "Sucre": ["Sincelejo", "Corozal", "Sampués", "San Marcos", "Santiago de Tolú", "Coveñas", "San Onofre", "Majagual", "Sucre", "Los Palmitos", "Morroa", "Ovejas", "Palmito", "Galeras", "Guaranda", "Caimito", "Buenavista", "El Roble", "San Pedro"],
    "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda", "Chaparral", "Líbano", "Mariquita", "Fresno", "Guamo", "Flandes", "Ortega", "Purificación", "Rovira", "Cajamarca", "Armero", "Lérida", "Venadillo", "Ambalema", "Planadas", "Rioblanco", "Saldaña", "Natagaima", "Coello", "Carmen de Apicalá", "Alvarado", "Piedras", "Prado", "Dolores"],
    "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago", "Buga", "Jamundí", "Yumbo", "Candelaria", "Florida", "Pradera", "Sevilla", "Caicedonia", "Zarzal", "Roldanillo", "La Unión", "Obando", "Bolívar", "Ginebra", "Guacarí", "El Cerrito", "Dagua", "La Cumbre", "Restrepo", "Calima (Darién)", "Toro", "Argelia", "Bugalagrande", "Trujillo", "Riofrío", "Yotoco", "Vijes", "Andalucía", "San Pedro"],
    "Vaupés": ["Mitú"],
    "Vichada": ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"]
  };

  const deptInput = document.getElementById("envioDepartamento");
  const cityInput = document.getElementById("envioCiudad");
  if (!deptInput || !cityInput) return;

  // minúsculas y sin tildes, para que "bogota" encuentre "Bogotá"
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  const DEPTS = Object.keys(COLOMBIA).map((name) => ({ label: name, norm: norm(name) }));
  const ALL_CITIES = [];
  Object.entries(COLOMBIA).forEach(([dept, cities]) => {
    cities.forEach((city) => ALL_CITIES.push({
      label: city,
      norm: norm(city),
      base: norm(city.replace(/\s*\(.*\)\s*$/, "")), // "Patía (El Bordo)" también se reconoce como "Patía"
      dept
    }));
  });

  const findDept = (value) => DEPTS.find((d) => d.norm === norm(value)) || null;

  // Departamentos donde existe la ciudad escrita en el campo Ciudad (puede ser más de uno: Granada)
  function deptsOfCity() {
    const n = norm(cityInput.value);
    if (!n) return [];
    const names = [];
    ALL_CITIES.forEach((c) => {
      if ((c.norm === n || c.base === n) && !names.includes(c.dept)) names.push(c.dept);
    });
    return DEPTS.filter((d) => names.includes(d.label));
  }

  // Ordena las coincidencias: primero las que EMPIEZAN con lo escrito,
  // luego las que tienen una palabra que empieza así, y al final las que lo contienen.
  function rank(items, q) {
    const scored = [];
    items.forEach((it, i) => {
      const idx = it.norm.indexOf(q);
      if (idx === -1) return;
      const score = idx === 0 ? 0 : it.norm.charAt(idx - 1) === " " ? 1 : 2;
      scored.push({ it, score, i });
    });
    scored.sort((a, b) => a.score - b.score || a.i - b.i);
    return scored.map((s) => s.it);
  }

  // Convierte un <input> + su <ul class="ac-list"> en un campo con sugerencias.
  //   getOptions(q) → lista de { label, sub?, ... } según lo escrito (q ya viene normalizado)
  //   onPick(opción) → qué hacer cuando el cliente elige una
  function setupAutocomplete(input, list, getOptions, onPick) {
    let options = [];
    let active = -1;

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("aria-expanded", "false");

    function close() {
      list.hidden = true;
      active = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }

    function highlight(i) {
      const items = list.children;
      if (active >= 0 && items[active]) items[active].classList.remove("active");
      active = i;
      if (i >= 0 && items[i]) {
        items[i].classList.add("active");
        items[i].scrollIntoView({ block: "nearest" });
        input.setAttribute("aria-activedescendant", items[i].id);
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function pick(i) {
      if (!options[i]) return;
      onPick(options[i]);
      close();
    }

    function refresh() {
      options = getOptions(norm(input.value));
      // si lo escrito ya es exactamente la única sugerencia, no hace falta mostrarla
      const q = norm(input.value);
      if (!options.length || (options.length === 1 && q && norm(options[0].label) === q)) {
        close();
        return;
      }
      list.textContent = "";
      options.forEach((opt, i) => {
        const li = document.createElement("li");
        li.className = "ac-item";
        li.id = list.id + "-" + i;
        li.setAttribute("role", "option");
        const name = document.createElement("span");
        name.textContent = opt.label;
        li.appendChild(name);
        if (opt.sub) {
          const sub = document.createElement("small");
          sub.textContent = opt.sub;
          li.appendChild(sub);
        }
        li.addEventListener("mousedown", (e) => e.preventDefault()); // el campo no pierde el foco
        li.addEventListener("click", () => pick(i));
        list.appendChild(li);
      });
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      active = -1;
    }

    input.addEventListener("input", refresh);
    input.addEventListener("focus", refresh);
    input.addEventListener("blur", () => setTimeout(close, 120));

    input.addEventListener("keydown", (e) => {
      const open = !list.hidden;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) refresh();
        else highlight((active + 1) % options.length);
      } else if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        highlight((active - 1 + options.length) % options.length);
      } else if (e.key === "Enter" && open && active >= 0) {
        e.preventDefault(); // elige la sugerencia en vez de enviar el formulario
        pick(active);
      } else if (e.key === "Escape" && open) {
        e.stopPropagation(); // cierra solo las sugerencias, no el panel completo
        close();
      } else if (e.key === "Tab") {
        close();
      }
    });
  }

  // Departamento: los de la ciudad elegida; si no hay ciudad, todos (o los que coincidan con lo escrito)
  setupAutocomplete(
    deptInput,
    document.getElementById("acListDepartamento"),
    (q) => {
      const mine = deptsOfCity();
      let list;
      if (mine.length) {
        // hay ciudad: primero los departamentos de esa ciudad...
        if (!q) list = mine;
        else {
          const hits = rank(mine, q);
          // ...y si lo escrito no coincide con ninguno, las sugerencias normales de lo escrito
          list = hits.length ? hits : rank(DEPTS, q).slice(0, 10);
        }
      } else {
        list = q ? rank(DEPTS, q).slice(0, 10) : DEPTS;
      }
      return list.map((d) => ({ label: d.label }));
    },
    (opt) => { deptInput.value = opt.label; }
  );

  // Ciudad: solo las del departamento escrito; si no hay, de todos
  setupAutocomplete(
    cityInput,
    document.getElementById("acListCiudad"),
    (q) => {
      const dept = findDept(deptInput.value);
      const pool = dept ? ALL_CITIES.filter((c) => c.dept === dept.label) : ALL_CITIES;
      const found = q ? rank(pool, q).slice(0, 10) : dept ? pool.slice(0, 12) : [];
      return found.map((c) => ({ label: c.label, dept: c.dept, sub: dept ? "" : c.dept }));
    },
    (opt) => {
      // solo se escribe la ciudad: el departamento NO se toca, lo elige el cliente
      cityInput.value = opt.label;
    }
  );
})();

/* ---------- 12. OCULTAR EL OJITO MIENTRAS HAY UN PANEL ABIERTO ----------
   El botón del ojito (ocultar/mostrar la interfaz) solo tiene sentido en la
   pantalla principal, la de las fotos. Cuando se abre cualquier panel (Quiénes
   somos, Kit, Manual, Galería, Envíos, Preguntas) se oculta, y reaparece al
   cerrarlo. Un MutationObserver vigila la clase "active" de todos los .overlay
   y le pone la clase "overlay-open" al <body>; el CSS
   (body.overlay-open .ui-toggle-btn) hace el resto. Así funciona sin importar
   cómo se abra o se cierre el panel (botón ×, clic afuera, tecla Escape...). */
(function () {
  const overlays = document.querySelectorAll(".overlay");
  function sync() {
    const anyOpen = Array.from(overlays).some((o) => o.classList.contains("active"));
    document.body.classList.toggle("overlay-open", anyOpen);
  }
  const observer = new MutationObserver(sync);
  overlays.forEach((o) => observer.observe(o, { attributes: true, attributeFilter: ["class"] }));
  sync();
})();

/* ---------- 13. BARRA DE PROGRESO CENTRADA SOBRE LOS BOTONES −, 5s, + ----------
   La barra de tiempo (la rayita) queda centrada, de lado a lado, justo encima de
   los botones de segundos. En vez de calcular números a mano para cada tamaño
   de pantalla, aquí se mide dónde están realmente los botones y se centra la
   barra sobre ellos. Se repite al cargar, al cambiar el tamaño de la ventana y
   si los botones cambian de ancho. (El "left" del CSS es solo un respaldo.) */
(function () {
  const controls = document.querySelector(".duration-controls");
  const bar = document.querySelector(".progress-bar-container");
  if (!controls || !bar) return;

  function centerBar() {
    const c = controls.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    if (!c.width || !b.width) return;
    bar.style.left = (c.left + (c.width - b.width) / 2).toFixed(2) + "px";
  }

  centerBar();
  window.addEventListener("load", centerBar);
  window.addEventListener("resize", centerBar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(centerBar);
  if (window.ResizeObserver) new ResizeObserver(centerBar).observe(controls);
})();

/* ---------- 14. LETRAS TEMPORALES DE LAS VENTANAS DE FOTO ----------
   Las ventanas de foto (la flotante de cada diapositiva y las 3 del panel Kit) traen
   letras temporales: ícono de cámara, nombre y "Foto — reemplaza por tu imagen real".
   En cuanto a una ventana le pones un <img> adentro, aquí se le marca la clase
   "has-photo" y el CSS esconde esas letras solas y deja la foto llenando la ventana.
   No hay que borrar nada del HTML: basta con agregar el <img>. */
document.querySelectorAll(".photo-placeholder, .kit-part-photo").forEach((box) => {
  if (box.querySelector(":scope > img")) box.classList.add("has-photo");
});
