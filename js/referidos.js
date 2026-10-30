/* ============================================================
   SISTEMA DE REFERIDOS — referidos.js
   ------------------------------------------------------------
   Este archivo dibuja el panel "Invita y gana" y maneja todo lo que el
   visitante hace en él. IMPORTANTE: aquí NO se decide nada importante.
   El progreso, las recompensas y las reglas (no duplicados, no auto-
   recomendarse, etc.) las calcula la base de datos (archivo
   supabase/01_base_de_datos.sql). Este archivo solo PIDE los datos y los
   MUESTRA. Por eso nadie puede subirse el progreso desde su navegador.

   ÍNDICE
     1. Configuración y utilidades
     2. Capa de datos: DEMO (datos de mentira para ver el diseño)
     3. Capa de datos: SUPABASE (la real — se completa en la Fase 5)
     4. Estado y textos
     5. Piezas de la interfaz (barra de progreso, compartir, cupones…)
     6. Dibujar el panel según quién eres (visitante / participante)
     7. Aviso "Te invitó …" y entrada por enlace de referido
     8. Arranque
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. CONFIGURACIÓN Y UTILIDADES ---------- */
  const CFG = window.REFERIDOS_CONFIG || { MODO: "demo" };
  const MODO = CFG.MODO === "supabase" ? "supabase" : "demo";
  const PATRON_CODIGO = /^[A-HJ-NP-Z2-9]{8}$/; // 8 caracteres, sin I, O, 0, 1

  // Crea un elemento: el("div", "clase", "texto"). Usa textContent, así que
  // un nombre escrito por alguien NUNCA puede inyectar código en la página.
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  const peso = (n) => "$" + Number(n).toLocaleString("es-CO");
  function fechaCorta(iso) {
    try {
      return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" });
    } catch (e) { return ""; }
  }
  // Guardado local SOLO de cosas de comodidad (nunca del progreso).
  const memoria = {
    leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    borrar(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- 2. CAPA DE DATOS: DEMO ---------- */
  // Imita lo que hará la base de datos real, con los mismos nombres de datos,
  // para poder ver y probar el diseño sin conexión.
  function crearApiDemo() {
    const camp = { meta: 6, max_recompensas: 3, precio_lista: 75000, precio_con_descuento: 55000,
                   fin: "2026-12-15T23:59:59-05:00", abierta: true };
    const d = { sesion: null, part: null, validas: 0, pend: 0, premios: [] };
    const azar = (n) => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * 32)]; return s; };
    function otorgar() {
      const n = Math.min(Math.floor(d.validas / camp.meta), camp.max_recompensas);
      while (d.premios.length < n) {
        d.premios.push({ numero: d.premios.length + 1, codigo: "NAV-" + azar(6), estado: "aprobada", precio_con_descuento: camp.precio_con_descuento });
      }
    }
    return {
      async campana() { return camp; },
      async invitadoPor(codigo) { return PATRON_CODIGO.test(codigo) ? (d.invitador || "Juan") : null; },
      async visita() {},
      async sesion() { return d.sesion; },
      async entrarConGoogle() { d.sesion = { correo: "tucorreo@gmail.com" }; return true; },
      async salir() { d.sesion = null; d.part = null; },
      async unirse(nombre) {
        d.part = { nombre, codigo: azar(8) };
        return { ok: true, nuevo: true, codigo: d.part.codigo };
      },
      async usarReferido() { return { ok: true, resultado: "valida" }; },
      async progreso() {
        if (!d.part) return { participa: false };
        const ganadas = d.premios.length;
        const avance = ganadas >= camp.max_recompensas ? camp.meta : d.validas - ganadas * camp.meta;
        return { participa: true, nombre: d.part.nombre, codigo: d.part.codigo, validas: d.validas, pendientes: d.pend,
                 meta: camp.meta, avance, porcentaje: Math.round(avance * 100 / camp.meta),
                 recompensas_ganadas: ganadas, max_recompensas: camp.max_recompensas, completo: ganadas >= camp.max_recompensas,
                 recompensas: d.premios.slice(), campana_abierta: camp.abierta, fin: camp.fin };
      },
      // Solo del modo demo: simula que alguien entró con tu enlace.
      simular(tipo) {
        if (!d.part) return { resultado: "rechazada", motivo: "sin_participacion" };
        if (tipo === "valida") { d.validas++; otorgar(); return { resultado: "valida" }; }
        if (tipo === "pendiente") { d.pend++; return { resultado: "pendiente" }; }
        if (tipo === "duplicada") return { resultado: "duplicada" };
        return { resultado: "rechazada", motivo: "autorecomendacion" };
      },
      reiniciar() { d.validas = 0; d.pend = 0; d.premios = []; },
      ponerInvitador(n) { d.invitador = n; },
    };
  }

  /* ---------- 3. CAPA DE DATOS: SUPABASE ---------- */
  // La real. Usa la librería oficial supabase-js (se carga en index.html) con la clave PÚBLICA
  // (sb_publishable_…), que está hecha para ir en la página. Lo que protege los datos son las
  // reglas de la base de datos (RLS) y las funciones del archivo supabase/01_base_de_datos.sql:
  // desde aquí solo se pueden llamar las funciones permitidas, nunca leer tablas ajenas.
  // Tiene exactamente los mismos métodos que la demo.
  function crearApiSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("No se cargó la librería de Supabase (revisa la conexión o el <script> en index.html).");
    }
    const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_CLAVE_PUBLICA, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
    // Llama a una función de la base de datos y devuelve su respuesta (o lanza el error).
    async function rpc(nombre, args) {
      const { data, error } = await sb.rpc(nombre, args || {});
      if (error) throw error;
      return data;
    }
    return {
      campana: () => rpc("get_campana"),
      invitadoPor: (codigo) => rpc("nombre_de_quien_invita", { p_codigo: codigo }),
      visita: async (codigo, fuente) => { try { await rpc("registrar_visita", { p_codigo: codigo, p_fuente: fuente }); } catch (e) {} },
      async sesion() {
        const { data, error } = await sb.auth.getSession();
        if (error || !data.session) return null;
        return { correo: data.session.user.email };
      },
      async entrarConGoogle() {
        // Lleva a la persona a Google y, al terminar, la devuelve a la página (sin ?ref=; ese código
        // ya quedó guardado en el navegador por entradaPorEnlace).
        memoria.guardar("cn_abrir_panel", "1");
        const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: CFG.URL_PUBLICA } });
        if (error) throw error;
      },
      async salir() { await sb.auth.signOut(); },
      unirse: (nombre) => rpc("unirse_campana", { p_nombre: nombre }),
      usarReferido: (codigo) => rpc("usar_referido", { p_codigo: codigo }),
      progreso: () => rpc("mi_progreso"),
    };
  }

  let api;
  try { api = MODO === "demo" ? crearApiDemo() : crearApiSupabase(); }
  catch (e) { console.error(e); api = null; }

  /* ---------- 4. ESTADO Y TEXTOS ---------- */
  const S = { camp: null, sesion: null, prog: null, invitador: null, mensaje: null, ultimasValidas: null, ultimasPend: null };

  // Mensaje que se envía a los amigos (se puede cambiar aquí).
  function textoInvitacion(enlace) {
    return "🎄🏍️ ¡Hola! Te invito a ver este nuevo emprendimiento de Cuernos Navideños para Moto Kit: cuernos, nariz y cola de reno para tu moto, hechos a mano en Bogotá. " +
           "Entra y consigue tu descuento 👉 " + enlace + " Ingresa con Google y participa.";
  }
  const enlaceDe = (codigo, src) => CFG.URL_PUBLICA + "?ref=" + codigo + (src ? "&src=" + src : "");

  // Qué se le dice a la persona según el resultado de usar un enlace.
  function textoResultado(r, invitador) {
    const quien = invitador || "quien te invitó";
    if (r.resultado === "valida") return { tipo: "ok", t: "¡Listo! Tu registro quedó validado y ya cuenta para " + quien + ". 🎉" };
    if (r.resultado === "pendiente") return { tipo: "info", t: "Tu registro quedó en revisión. Te avisamos cuando se valide." };
    if (r.resultado === "duplicada") return { tipo: "info", t: "Este enlace ya había sido contado, no se suma dos veces." };
    const motivos = {
      autorecomendacion: "No puedes usar tu propio enlace. ¡Compártelo con tus amigos!",
      ya_fue_recomendado: "Ya habías entrado con el enlace de otra persona, así que esta recomendación no suma.",
      ya_era_participante: "Ya eras parte de la campaña, por eso este enlace no suma. ¡Pero puedes invitar a otros!",
      campana_cerrada: "La campaña ya terminó.",
      cuenta_bloqueada: "Esta cuenta no puede participar.",
      codigo_invalido: "Ese enlace no es válido.",
      sin_participacion: "Primero crea tu enlace para participar.",
    };
    return { tipo: "error", t: motivos[r.motivo] || "No pudimos validar esta recomendación." };
  }

  /* ---------- 5. PIEZAS DE LA INTERFAZ ---------- */
  const ICONO_G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const ICONO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.2 15l-.3-.18-3.1.82.83-3.02-.2-.31A8.1 8.1 0 0 1 12.04 3.8zm-3.1 4.2c-.17 0-.45.06-.69.32-.24.26-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.87 4.45 3.9 2.2.87 2.65.7 3.13.65.48-.04 1.55-.63 1.77-1.24.22-.6.22-1.13.15-1.24-.06-.1-.24-.17-.5-.3-.27-.13-1.55-.77-1.8-.86-.24-.09-.42-.13-.6.13-.17.26-.68.86-.83 1.03-.15.18-.3.2-.57.07-.26-.13-1.1-.4-2.1-1.3-.77-.69-1.3-1.54-1.45-1.8-.15-.26-.02-.4.12-.53.12-.12.26-.3.4-.46.13-.15.17-.26.26-.43.09-.18.04-.33-.02-.46-.07-.13-.6-1.43-.82-1.96-.21-.5-.43-.44-.6-.45h-.5z"/></svg>';
  const ICONO_FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>';
  const ICONO_IG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>';
  const ICONO_MAS = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  const ICONO_REGALO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8C10 8 7.5 7.2 7.5 5.3 7.5 3.9 9 3.3 10.2 4.1 11.2 4.8 12 8 12 8zM12 8c2 0 4.5-.8 4.5-2.7 0-1.4-1.5-2-2.7-1.2C12.8 4.8 12 8 12 8z"/></svg>';
  // Moto y regalo dibujados (más detallados que un emoji) para la barra de progreso.
  const ICONO_MOTO_GRANDE = '<svg viewBox="0 0 120 70" aria-hidden="true"><defs><linearGradient id="rmTanque" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3b52"/><stop offset="0.55" stop-color="#d6001c"/><stop offset="1" stop-color="#7d0010"/></linearGradient><radialGradient id="rmFaro" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#ffd25a"/></radialGradient></defs><ellipse cx="60" cy="67" rx="52" ry="3" fill="#000" opacity="0.35"/><path d="M54 53Q34 60 8 55" stroke="#cfd5da" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M54 53Q34 60 8 55" stroke="#7b848a" stroke-width="1.5" stroke-linecap="round" fill="none" transform="translate(0 1.5)"/><path d="M25 50L54 46" stroke="#4a4f54" stroke-width="4" stroke-linecap="round"/><g class="rm-rueda"><circle cx="25" cy="50" r="16" fill="#101010" stroke="#2a2a2a" stroke-width="1.5"/><circle cx="25" cy="50" r="11" fill="none" stroke="#b9c2c9" stroke-width="2"/><g class="rm-rayos" stroke="#8d979e" stroke-width="1"><path d="M25 40V60M15 50H35M18 43L32 57M18 57L32 43"/></g><circle cx="25" cy="50" r="3" fill="#d9dde0"/></g><g class="rm-rueda"><circle cx="97" cy="50" r="16" fill="#101010" stroke="#2a2a2a" stroke-width="1.5"/><circle cx="97" cy="50" r="11" fill="none" stroke="#b9c2c9" stroke-width="2"/><g class="rm-rayos" stroke="#8d979e" stroke-width="1"><path d="M97 40V60M87 50H107M90 43L104 57M90 57L104 43"/></g><circle cx="97" cy="50" r="3" fill="#d9dde0"/></g><path d="M97 50L84 22" stroke="#d3d9de" stroke-width="3.5" stroke-linecap="round"/><path d="M99 50L86 22" stroke="#7b848a" stroke-width="1.2" stroke-linecap="round"/><path d="M82 36Q96 27 111 40" stroke="#b30018" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M47 36H80L75 54H52Z" fill="#2c3034" stroke="#14171a" stroke-width="1"/><path d="M52 41H76M51 46H75M50 51H74" stroke="#4b5258" stroke-width="1.2"/><circle cx="64" cy="45" r="4.5" fill="#6a737a" stroke="#1d2125"/><path d="M50 28Q60 14 80 21L84 33L52 36Z" fill="url(#rmTanque)" stroke="#6d000e" stroke-width="1"/><path d="M57 24Q66 18 77 22" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M20 33Q22 29 30 29L52 28L50 36L26 37Q19 37 20 33Z" fill="#17191b" stroke="#000"/><path d="M14 33L22 31L24 36L15 37Z" fill="#b30018"/><path d="M78 20L92 17" stroke="#1c1f22" stroke-width="3.5" stroke-linecap="round"/><circle cx="79" cy="20" r="2.6" fill="#2b2f33"/><path d="M85 29Q84 22 90 22Q96 23 95 30Z" fill="#2b2f33" stroke="#0f1113"/><circle cx="92" cy="27" r="4.6" fill="url(#rmFaro)" stroke="#a8b0b6" stroke-width="1.2"/><path d="M90 16L88 8M89 12L84 9M89 12L92 6M94 17L97 9M95 13L100 11M95 13L94 7" stroke="#f3dc9a" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
  const ICONO_REGALO_GRANDE = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rgCaja" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2a44"/><stop offset="1" stop-color="#8a0014"/></linearGradient><linearGradient id="rgCinta" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8892a"/><stop offset="0.5" stop-color="#f7e29a"/><stop offset="1" stop-color="#b8892a"/></linearGradient><radialGradient id="rgBrillo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6c8"/><stop offset="0.45" stop-color="#ffd25a" stop-opacity="0.8"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="60" rx="24" ry="3" fill="#000" opacity="0.4"/><rect x="10" y="30" width="44" height="29" rx="3" fill="url(#rgCaja)"/><rect x="10" y="30" width="44" height="4" rx="2" fill="#3a0008"/><rect x="27.5" y="30" width="9" height="29" fill="url(#rgCinta)"/><path d="M13 34V56" stroke="#fff" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round"/><ellipse class="rg-brillo" cx="32" cy="30" rx="26" ry="14" fill="url(#rgBrillo)"/><g class="rg-tapa"><rect x="6.5" y="21" width="51" height="13" rx="3" fill="#e8142e"/><rect x="6.5" y="21" width="51" height="4" rx="2" fill="#fff" opacity="0.22"/><rect x="27.5" y="21" width="9" height="13" fill="url(#rgCinta)"/><path d="M32 21C27 4 9 6 16 17 20 23 30 22 32 21Z" fill="url(#rgCinta)" stroke="#9c7420" stroke-width="1"/><path d="M32 21C37 4 55 6 48 17 44 23 34 22 32 21Z" fill="url(#rgCinta)" stroke="#9c7420" stroke-width="1"/><path d="M19 16C22 11 27 12 30 19M45 16C42 11 37 12 34 19" stroke="#9c7420" stroke-width="1" fill="none"/><circle cx="32" cy="21" r="4.6" fill="#f3dc9a" stroke="#9c7420" stroke-width="1"/></g></svg>';
  const ICONO_CANDADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function boton(clase, html, texto, alClic) {
    const b = el("button", clase);
    b.type = "button";
    b.innerHTML = html || "";
    if (texto) b.appendChild(document.createTextNode(texto));
    if (alClic) b.addEventListener("click", alClic);
    return b;
  }

  // Enlace pequeño "Cerrar sesión (correo)" para quien quiera entrar con otra cuenta.
  function enlaceSalir() {
    const b = boton("ref-salir", "", "Cerrar sesión" + (S.sesion && S.sesion.correo ? " (" + S.sesion.correo + ")" : ""), async () => {
      try { await api.salir(); } catch (e) {}
      S.prog = null; S.mensaje = null; S.ultimasValidas = null; S._ganadas = 0;
      await refrescar();
    });
    return b;
  }

  // Aviso flotante breve ("Enlace copiado")
  let temporizadorAviso;
  function aviso(texto, tipo) {
    let a = $("#refAviso");
    if (!a) { a = el("div", "ref-aviso"); a.id = "refAviso"; a.setAttribute("role", "status"); document.body.appendChild(a); }
    a.textContent = texto;
    a.className = "ref-aviso ref-aviso--" + (tipo || "ok") + " show";
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => a.classList.remove("show"), 3200);
  }

  async function copiar(texto, mensajeOk) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const t = el("textarea"); t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (e2) {}
      t.remove();
    }
    aviso(mensajeOk || "¡Copiado!");
  }

  // Lluvia de confeti navideño (rojo, dorado, verde y blanco)
  function confeti(cantidad) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colores = ["#d6001c", "#f3dc9a", "#d9b45a", "#1f9d55", "#ffffff", "#ff4d5e"];
    const capa = el("div", "ref-confeti"); capa.setAttribute("aria-hidden", "true");
    for (let i = 0; i < cantidad; i++) {
      const p = el("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colores[i % colores.length];
      p.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.setProperty("--giro", Math.round(Math.random() * 720 - 360) + "deg");
      p.style.setProperty("--deriva", Math.round(Math.random() * 160 - 80) + "px");
      capa.appendChild(p);
    }
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), 3800);
  }

  // Explosión de confeti y serpentinas que sale del regalo de la barra de progreso.
  function explosionRegalo() {
    const g = $(".ref-progreso .ref-regalo");
    if (!g) { confeti(110); return; }
    g.classList.add("boom");
    setTimeout(() => g.classList.remove("boom"), 900);
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = g.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
    const colores = ["#d6001c", "#ff4d5e", "#f3dc9a", "#d9b45a", "#1f9d55", "#3ddc84", "#ffffff"];
    const capa = el("div", "ref-explosion"); capa.setAttribute("aria-hidden", "true");
    const destello = el("i", "ref-destello"); destello.style.left = cx + "px"; destello.style.top = cy + "px"; capa.appendChild(destello);
    function pieza(clase, i) {
      const e = el("i", clase);
      const ang = (Math.random() * 360) * Math.PI / 180;
      const dist = 90 + Math.random() * 230;
      e.style.left = cx + "px"; e.style.top = cy + "px";
      e.style.background = colores[i % colores.length];
      e.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
      e.style.setProperty("--dy", Math.round(Math.sin(ang) * dist - 70) + "px");
      e.style.setProperty("--giro", Math.round(Math.random() * 900 - 450) + "deg");
      e.style.animationDuration = (1.5 + Math.random() * 1.3) + "s";
      capa.appendChild(e);
    }
    for (let i = 0; i < 70; i++) pieza("ref-pieza", i);
    for (let i = 0; i < 22; i++) pieza("ref-serpentina", i);
    document.body.appendChild(capa);
    setTimeout(() => capa.remove(), 3500);
  }

  // Compartir
  function compartirWhatsApp(codigo) {
    const url = "https://wa.me/?text=" + encodeURIComponent(textoInvitacion(enlaceDe(codigo, "whatsapp")));
    window.open(url, "_blank", "noopener");
  }
  function compartirFacebook(codigo) {
    const enlace = enlaceDe(codigo, "facebook");
    const url = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(enlace) +
                "&quote=" + encodeURIComponent(textoInvitacion(enlace));
    window.open(url, "_blank", "noopener");
  }
  async function compartirNativo(codigo, fuente) {
    const enlace = enlaceDe(codigo, fuente);
    if (navigator.share) {
      try { await navigator.share({ title: "Cuerno Navideño Para Moto Kit", text: textoInvitacion(enlace), url: enlace }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    copiar(enlace, "Enlace copiado. Pégalo en tu historia, tu bio o un mensaje directo de Instagram.");
  }

  // Barra de progreso: una pista con 6 estaciones; la moto avanza hasta el regalo.
  function barraProgreso(p) {
    const caja = el("div", "ref-progreso");
    const arriba = el("div", "ref-prog-arriba");
    const num = Math.min(p.recompensas_ganadas + 1, p.max_recompensas);
    arriba.appendChild(el("strong", null, p.completo ? "¡Todas las recompensas listas!" : "Recompensa " + num + " de " + p.max_recompensas));
    arriba.appendChild(el("span", "ref-prog-cuenta", p.avance + " / " + p.meta + " · " + p.porcentaje + "%"));
    caja.appendChild(arriba);

    const pista = el("div", "ref-pista");
    pista.setAttribute("role", "progressbar");
    pista.setAttribute("aria-valuemin", "0"); pista.setAttribute("aria-valuemax", String(p.meta)); pista.setAttribute("aria-valuenow", String(p.avance));
    pista.setAttribute("aria-label", "Recomendaciones válidas para la siguiente recompensa");
    for (let i = 1; i < p.meta; i++) {
      const m = el("span", "ref-estacion" + (i <= p.avance ? " ya" : ""));
      m.style.left = (i * 100 / p.meta) + "%";
      pista.appendChild(m);
    }
    const relleno = el("div", "ref-relleno");
    relleno.style.width = "0%";
    pista.appendChild(relleno);
    const moto = el("span", "ref-moto"); moto.innerHTML = ICONO_MOTO_GRANDE;
    moto.style.left = "0%";
    pista.appendChild(moto);
    const regalo = el("span", "ref-regalo"); regalo.innerHTML = ICONO_REGALO_GRANDE; pista.appendChild(regalo);
    caja.appendChild(pista);
    // La animación empieza un instante después, para que se vea avanzar.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      relleno.style.width = p.porcentaje + "%";
      moto.style.left = Math.min(p.porcentaje, 94) + "%";
      // La tapa del regalo se va levantando a medida que la barra se llena.
      regalo.style.setProperty("--abre", String(p.completo ? 1 : Math.min(p.porcentaje, 100) / 100));
    }));

    let msg;
    if (p.completo) msg = "¡Felicitaciones! Ganaste los " + p.max_recompensas + " descuentos. Canjéalos por WhatsApp.";
    else if (p.avance >= p.meta) msg = "¡Lo lograste! Tu descuento está listo.";
    else if (p.avance === 0) msg = "Comparte tu enlace: con " + p.meta + " personas nuevas ganas tu descuento.";
    else if (p.meta - p.avance === 1) msg = "¡Solo falta 1 persona para tu descuento!";
    else msg = "Vas bien: faltan " + (p.meta - p.avance) + " personas para tu descuento.";
    caja.appendChild(el("div", "ref-prog-msg", msg));
    return caja;
  }

  function tarjetaCupon(r, precioLista) {
    const c = el("div", "ref-cupon" + (r.estado === "entregada" ? " usado" : ""));
    const izq = el("div", "ref-cupon-info");
    izq.appendChild(el("div", "ref-cupon-titulo", "Descuento #" + r.numero + " · 1 kit"));
    izq.appendChild(el("div", "ref-cupon-codigo", r.codigo));
    const precio = r.precio_con_descuento;
    izq.appendChild(el("div", "ref-cupon-precio", precio ? "Tu kit: " + peso(precio) + " (antes " + peso(precioLista) + ")" : "El precio con descuento te lo confirmamos por WhatsApp."));
    c.appendChild(izq);
    const der = el("div", "ref-cupon-acciones");
    if (r.estado === "entregada") {
      der.appendChild(el("span", "ref-insignia usada", "Canjeado"));
    } else {
      der.appendChild(el("span", "ref-insignia lista", "CÓDIGO PARA CANJEAR"));
      der.appendChild(boton("ref-mini", "", "Copiar código", () => copiar(r.codigo, "Código copiado")));
      const wa = el("a", "ref-mini ref-mini--wa", "Canjear por WhatsApp");
      wa.href = "https://wa.me/" + CFG.WHATSAPP + "?text=" + encodeURIComponent("Hola, quiero canjear mi cupón de descuento " + r.codigo + " para el Cuerno Navideño para Moto Kit.");
      wa.target = "_blank"; wa.rel = "noopener";
      der.appendChild(wa);
    }
    c.appendChild(der);
    return c;
  }

  /* ---------- 6. DIBUJAR EL PANEL ---------- */
  function dibujarMensaje(contenedor) {
    if (!S.mensaje) return;
    const m = el("div", "ref-mensaje ref-mensaje--" + S.mensaje.tipo, S.mensaje.t);
    m.setAttribute("role", "status");
    contenedor.appendChild(m);
  }

  function pintarPremio() {
    const c = $("#refPremio"); if (!c) return;
    c.textContent = "";
    const camp = S.camp; if (!camp) return;
    const ic = el("div", "ref-premio-icono"); ic.innerHTML = ICONO_REGALO_GRANDE; c.appendChild(ic);
    const izq = el("div", "ref-premio-texto");
    izq.appendChild(el("strong", "ref-premio-titulo", "Tu recompensa"));
    izq.appendChild(el("span", "ref-premio-linea", "¡Invita a tus amigos y gana descuentos! Por cada " + camp.meta + " personas nuevas que invites y que cumplan las condiciones de participación, obtendrás 1 descuento para tu kit."));
    izq.appendChild(el("span", "ref-premio-linea", "Puedes ganar hasta " + camp.max_recompensas + " descuentos, uno por cada kit."));
    c.appendChild(izq);
    const der = el("div", "ref-premio-precio");
    der.appendChild(el("s", null, peso(camp.precio_lista)));
    if (camp.precio_con_descuento) der.appendChild(el("b", null, peso(camp.precio_con_descuento)));
    der.appendChild(el("em", "ref-sello", "¡Precio especial!"));
    c.appendChild(der);
    const fin = $("#refSub");
    if (fin) fin.textContent = camp.abierta ? "Campaña navideña · hasta el " + fechaCorta(camp.fin) : "La campaña ya terminó. ¡Gracias por participar!";
  }

  function pintarEstado() {
    const raiz = $("#refEstado"); if (!raiz) return;
    raiz.textContent = "";
    const inv = $("#refInvitado");
    if (inv) {
      inv.hidden = !S.invitador || (S.prog && S.prog.participa);
      inv.textContent = S.invitador ? "🎁 Te invitó " + S.invitador + ". ¡Regístrate y participa tú también!" : "";
    }

    // A) Visitante sin sesión
    if (!S.sesion) {
      const caja = el("div", "ref-caja");
      caja.appendChild(el("div", "ref-caja-titulo", "Empieza en 10 segundos"));
      caja.appendChild(el("div", "ref-caja-texto", "Entra con tu cuenta de Google para recibir tu enlace personal."));
      const b = boton("ref-google", '<span class="ref-g-circulo">' + ICONO_G + "</span>", "Continuar con Google", async () => {
        b.disabled = true;
        try { await api.entrarConGoogle(); await refrescar(); }
        catch (e) { aviso("No pudimos iniciar sesión. Inténtalo de nuevo.", "error"); b.disabled = false; }
      });
      b.appendChild(el("span", "ref-chev", "›"));
      caja.appendChild(b);
      const seg = el("div", "ref-seguro");
      const cand = el("span", "ref-candado"); cand.innerHTML = ICONO_CANDADO;
      seg.appendChild(cand);
      seg.appendChild(el("span", null, "Solo guardamos tu correo y un nombre para tu enlace. Sin pagos, sin contraseñas."));
      caja.appendChild(seg);
      raiz.appendChild(caja);
      dibujarMensaje(raiz);
      return;
    }

    // B) Con sesión pero sin enlace todavía: pedir el nombre
    if (!S.prog || !S.prog.participa) {
      const caja = el("form", "ref-caja");
      caja.appendChild(el("div", "ref-caja-titulo", "Casi listo ✨"));
      const lab = el("label", "ref-etiqueta", "¿Cómo te llamamos? (nombre o apodo)");
      lab.htmlFor = "refNombre";
      const inp = el("input", "ref-input"); inp.id = "refNombre"; inp.type = "text"; inp.maxLength = 30; inp.required = true;
      inp.placeholder = "Ej: Juan"; inp.autocomplete = "given-name";
      caja.appendChild(lab); caja.appendChild(inp);
      caja.appendChild(el("div", "ref-ayuda", "Tus amigos verán este nombre: «Te invitó " + (inp.value || "Juan") + "»."));
      const enviar = boton("ref-principal", "", "Crear mi enlace");
      const regaloBtn = el("span", "ref-principal-regalo"); regaloBtn.innerHTML = ICONO_REGALO_GRANDE; enviar.appendChild(regaloBtn);
      enviar.type = "submit";
      caja.appendChild(enviar);
      caja.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const nombre = inp.value.trim();
        if (!nombre) { inp.focus(); return; }
        enviar.disabled = true;
        try {
          const r = await api.unirse(nombre);
          if (!r.ok) {
            const t = { dominio_no_permitido: "Ese tipo de correo no está permitido.", correo_ya_registrado: "Este correo ya está registrado.", correo_no_verificado: "Tu correo aún no está verificado.", nombre_invalido: "Escribe un nombre de 1 a 30 letras." };
            aviso(t[r.motivo] || "No pudimos crear tu enlace.", "error"); enviar.disabled = false; return;
          }
          const ref = memoria.leer("cn_ref");
          if (r.nuevo && ref && PATRON_CODIGO.test(ref)) {
            if (!S.invitador) { try { S.invitador = await api.invitadoPor(ref); } catch (e) {} }
            S.mensaje = textoResultado(await api.usarReferido(ref), S.invitador);
            memoria.borrar("cn_ref");
          }
          await refrescar();
          confeti(60);
        } catch (e) { aviso("Algo salió mal. Inténtalo de nuevo.", "error"); enviar.disabled = false; }
      });
      raiz.appendChild(caja);
      dibujarMensaje(raiz);
      raiz.appendChild(enlaceSalir());
      return;
    }

    // C) Participante: enlace, compartir, progreso y cupones
    const p = S.prog;
    dibujarMensaje(raiz);
    raiz.appendChild(el("div", "ref-saludo", "¡Hola, " + p.nombre + "! Este es tu enlace personal:"));

    const fila = el("div", "ref-enlace");
    const campo = el("input", "ref-input ref-input--enlace"); campo.readOnly = true; campo.value = enlaceDe(p.codigo);
    campo.setAttribute("aria-label", "Tu enlace de referido");
    campo.addEventListener("focus", () => campo.select());
    fila.appendChild(campo);
    fila.appendChild(boton("ref-copiar", "", "Copiar", () => copiar(enlaceDe(p.codigo, "copiar"), "¡Enlace copiado!")));
    raiz.appendChild(fila);

    const comp = el("div", "ref-compartir");
    comp.appendChild(boton("ref-red ref-red--wa", ICONO_WA, "WhatsApp", () => compartirWhatsApp(p.codigo)));
    comp.appendChild(boton("ref-red ref-red--fb", ICONO_FB, "Facebook", () => compartirFacebook(p.codigo)));
    comp.appendChild(boton("ref-red ref-red--ig", ICONO_IG, "Instagram", () => compartirNativo(p.codigo, "instagram")));
    if (navigator.share) comp.appendChild(boton("ref-red ref-red--mas", ICONO_MAS, "Más", () => compartirNativo(p.codigo, "otro")));
    raiz.appendChild(comp);
    raiz.appendChild(el("div", "ref-ayuda ref-ayuda--ig", "Instagram no permite publicar enlaces directo desde una página: se copia tu enlace para que lo pegues en una historia, tu bio o un mensaje."));

    const det = el("details", "ref-detalle");
    det.appendChild(el("summary", null, "Ver el mensaje que se envía"));
    det.appendChild(el("div", "ref-vista-mensaje", textoInvitacion(enlaceDe(p.codigo))));
    raiz.appendChild(det);

    raiz.appendChild(barraProgreso(p));

    const cifras = el("div", "ref-cifras");
    [[p.validas, "Recomendaciones válidas"], [p.pendientes, "En revisión"], [p.recompensas_ganadas + "/" + p.max_recompensas, "Descuentos ganados"]].forEach(([n, t]) => {
      const c = el("div", "ref-cifra"); c.appendChild(el("b", null, String(n))); c.appendChild(el("span", null, t)); cifras.appendChild(c);
    });
    raiz.appendChild(cifras);
    raiz.appendChild(el("div", "ref-ayuda", "Solo suman las personas nuevas que inicien sesión con su correo. Compartir el enlace o hacer clic no suma por sí solo."));

    if (p.recompensas && p.recompensas.length) {
      raiz.appendChild(el("div", "ref-subtitulo", "Tus cupones"));
      p.recompensas.forEach((r) => raiz.appendChild(tarjetaCupon(r, S.camp.precio_lista)));
    }
    raiz.appendChild(enlaceSalir());
    if (!p.campana_abierta) raiz.appendChild(el("div", "ref-mensaje ref-mensaje--info", "La campaña terminó: ya no se suman nuevas recomendaciones, pero tus cupones siguen vigentes."));
  }

  function mostrarFalloConexion() {
    const raiz = $("#refEstado"); if (!raiz) return;
    raiz.textContent = "";
    raiz.appendChild(el("div", "ref-mensaje ref-mensaje--error", "El sistema de recomendaciones no pudo cargar. Recarga la página o inténtalo en unos minutos."));
  }

  // Pide los datos y vuelve a dibujar. Si el progreso subió, celebra.
  async function refrescar() {
    if (!api) { mostrarFalloConexion(); return; }
    try {
      // Los datos de la campaña casi no cambian: se piden como máximo una vez por minuto.
      if (!S.camp || Date.now() - (S._campT || 0) > 60000) { S.camp = await api.campana(); S._campT = Date.now(); }
      S.sesion = await api.sesion();
      S.prog = S.sesion ? await api.progreso() : null;
    } catch (e) { aviso("No pudimos cargar los datos. Revisa tu conexión.", "error"); return; }
    let premioNuevo = false;
    if (S.prog && S.prog.participa) {
      if (S.ultimasValidas != null) {
        if (S.prog.recompensas_ganadas > (S._ganadas || 0)) premioNuevo = true;
        else if (S.prog.validas > S.ultimasValidas) { confeti(40); aviso("✅ ¡Nueva recomendación validada!", "ok"); }
        else if (S.prog.pendientes > (S.ultimasPend || 0)) aviso("⏳ Una recomendación quedó en revisión.", "info");
      }
      S.ultimasValidas = S.prog.validas; S.ultimasPend = S.prog.pendientes; S._ganadas = S.prog.recompensas_ganadas;
    }
    pintarPremio();
    pintarDemo();
    if (premioNuevo) {
      // Al completar 6: la barra se llena, el regalo explota con serpentinas y luego empieza la siguiente recompensa.
      const real = S.prog;
      S.prog = Object.assign({}, real, { avance: real.meta, porcentaje: 100, completo: false });
      pintarEstado();
      await espera(1500);
      explosionRegalo();
      aviso("🎉 ¡Ganaste un descuento!", "ok");
      await espera(1600);
      S.prog = real;
    }
    pintarEstado();
  }

  // Controles de prueba (solo en modo demo)
  function pintarDemo() {
    const d = $("#refDemo"); if (!d) return;
    d.hidden = MODO !== "demo";
    if (MODO !== "demo" || d.dataset.listo) return;
    d.dataset.listo = "1";
    d.appendChild(el("div", "ref-demo-titulo", "🧪 Modo demo — simula lo que hará la base de datos"));
    const f = el("div", "ref-demo-botones");
    const sim = (tipo) => async () => {
      const r = api.simular(tipo);
      if (tipo === "valida" || tipo === "pendiente") await refrescar();
      else { aviso(textoResultado(r, "ti").t, "info"); }
    };
    f.appendChild(boton("ref-mini", "", "✔ Recomendación válida", sim("valida")));
    f.appendChild(boton("ref-mini", "", "⏳ En revisión", sim("pendiente")));
    f.appendChild(boton("ref-mini", "", "↩ Duplicada", sim("duplicada")));
    f.appendChild(boton("ref-mini", "", "⛔ Auto-recomendación", sim("auto")));
    f.appendChild(boton("ref-mini", "", "👤 Ver como invitado", async () => {
      api.ponerInvitador("Juan"); await api.salir(); api.reiniciar();
      S.invitador = "Juan"; S.mensaje = null; S.ultimasValidas = null; memoria.guardar("cn_ref", "ABCDEFGH");
      mostrarAviso("Juan"); await refrescar();
    }));
    f.appendChild(boton("ref-mini", "", "↺ Reiniciar", async () => { api.reiniciar(); await api.salir(); S.invitador = null; S.mensaje = null; S.ultimasValidas = null; S._ganadas = 0; ocultarAviso(); await refrescar(); }));
    d.appendChild(f);
  }

  /* ---------- 7. AVISO "TE INVITÓ…" Y ENTRADA POR ENLACE ---------- */
  function mostrarAviso(nombre) {
    const b = $("#refAvisoInvitacion"); if (!b) return;
    $("#refAvisoNombre").textContent = nombre;
    b.hidden = false;
    document.body.classList.add("ref-aviso-on");
  }
  function ocultarAviso() {
    const b = $("#refAvisoInvitacion"); if (b) b.hidden = true;
    document.body.classList.remove("ref-aviso-on");
  }
  async function entradaPorEnlace() {
    const params = new URLSearchParams(window.location.search);
    let codigo = (params.get("ref") || "").toUpperCase();
    if (!PATRON_CODIGO.test(codigo)) return;
    if (!api) return;
    memoria.guardar("cn_ref", codigo); // se recuerda mientras inicia sesión; la base de datos decide si cuenta
    try {
      const fuente = (params.get("src") || "directo").toLowerCase();
      await api.visita(codigo, fuente);              // visita ANÓNIMA: no suma al progreso
      S.invitador = await api.invitadoPor(codigo);
    } catch (e) { /* si falla, la página sigue funcionando */ }
    if (S.invitador) {
      mostrarAviso(S.invitador);
      if (!sessionStorage.getItem("cn_ref_abierto")) {
        try { sessionStorage.setItem("cn_ref_abierto", "1"); } catch (e) {}
        setTimeout(() => { if (typeof openOverlay === "function") openOverlay("referidos"); }, 1400);
      }
    }
  }

  /* ---------- 8. ARRANQUE ---------- */
  // Lucecitas de colores que adornan los arbolitos del pie del panel (arriba de la moto).
  function armarLucesNavidad() {
    const caja = $("#referidosOverlay .ref-luces--pie"); if (!caja || caja.children.length) return;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const l = el("i");
      l.style.left = (3 + (i / (n - 1)) * 94) + "%";
      l.style.top = (22 + 16 * Math.abs(Math.sin(i * Math.PI / 6.5))) + "px"; // forma de guirnalda colgada
      l.style.animationDelay = (i % 7) * 0.22 + "s";
      caja.appendChild(l);
    }
  }
  function iniciar() {
    const panel = $("#referidosOverlay");
    if (!panel) return;
    armarLucesNavidad();
    const cerrarAviso = $("#refAvisoCerrar"); if (cerrarAviso) cerrarAviso.addEventListener("click", ocultarAviso);
    const abrirAviso = $("#refAvisoAbrir"); if (abrirAviso) abrirAviso.addEventListener("click", () => openOverlay("referidos"));
    // Cada vez que se abre el panel, se piden los datos al día.
    new MutationObserver(() => { if (panel.classList.contains("active")) refrescar(); })
      .observe(panel, { attributes: true, attributeFilter: ["class"] });
    refrescar();
    entradaPorEnlace().then(() => refrescar());
    // Si la persona acaba de volver de iniciar sesión con Google, se abre el panel sola.
    if (api && memoria.leer("cn_abrir_panel") === "1") {
      api.sesion().then((ses) => {
        if (ses) { memoria.borrar("cn_abrir_panel"); if (typeof openOverlay === "function") openOverlay("referidos"); }
      }).catch(() => {});
      setTimeout(() => memoria.borrar("cn_abrir_panel"), 20000);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
