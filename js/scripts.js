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

// Función heredada de la plantilla original (formulario de contacto).
// Ya no se usa porque quitamos ese formulario, pero la dejamos por si
// en algún momento quieres agregar un formulario propio.
function handleSubmit(e) {
  e.preventDefault();
  alert("Thank you for your message! We will get back to you soon.");
  e.target.reset();
  closeOverlay("contact");
}


/* ---------- 4. CÍRCULOS DECORATIVOS FLOTANTES ---------- */
// Son los dos círculos borrosos que aparecen y cambian de posición
// solos cada cierto tiempo (o al hacer clic sobre ellos).

// Elige una posición al azar, pero SOLO dentro de 4 "zonas seguras"
// en las esquinas de la pantalla — así nunca tapan la ventana central
// donde va la foto de reemplazo. Si quieres que se muevan por más
// espacio, agranda estos rangos (son porcentajes de la pantalla).
function moveShapeToRandomPosition(shape) {
  const zones = [
    { top: [6, 18],  left: [2, 16] },   // esquina superior izquierda
    { top: [6, 18],  left: [80, 94] },  // esquina superior derecha
    { top: [74, 88], left: [2, 16] },   // esquina inferior izquierda
    { top: [74, 88], left: [80, 94] },  // esquina inferior derecha
  ];
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const top = zone.top[0] + Math.random() * (zone.top[1] - zone.top[0]);
  const left = zone.left[0] + Math.random() * (zone.left[1] - zone.left[0]);

  shape.style.top = top + "%";
  shape.style.left = left + "%";
  shape.style.bottom = "auto";
  shape.style.right = "auto";

  // Le da una vuelta aleatoria al moverse, como efecto visual.
  const rotation = 360 * Math.random();
  shape.style.transform = `rotate(${rotation}deg)`;
  setTimeout(() => { shape.style.transform = ""; }, 800);
}

// Mueve los círculos automáticamente, uno tras otro (con 2s de diferencia).
function autoMoveShapes() {
  document.querySelectorAll(".parallax-shape").forEach((shape, i) => {
    setTimeout(() => moveShapeToRandomPosition(shape), 2000 * i);
  });
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
    uiToggleBtn.click();
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

// Clic directo sobre un círculo decorativo: lo manda a otra esquina al azar.
document.querySelectorAll(".parallax-shape").forEach(shape => {
  shape.addEventListener("click", function (e) {
    e.stopPropagation();
    moveShapeToRandomPosition(this);
  });
});

// Mueve los círculos solos cada 15 segundos (y una vez a los 5s de cargar).
setInterval(autoMoveShapes, 15000);
setTimeout(autoMoveShapes, 5000);

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
const NUMERO_WHATSAPP = "573000000000";
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

