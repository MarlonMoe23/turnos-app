"use client";
import { useEffect, useState } from "react";

// ===== Google Sheets =====
// Pestaña de turnos (gid=0) y pestañas TECNICOS y LINKS.
const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJEPaeJDsKUKhhBE81nShr4tapffCnwzMI2NSYmwprUFlM6LL-hUSnjBACUzSp3Rf1JU38Rnn4l3b2/pub";
const GID_TURNOS = "0";
// La app reconoce la pestaña TECNICOS por su encabezado
// (NOMBRE | TELEFONO | SALVOCONDUCTO), sin importar el orden.
const GIDS_EXTRA = ["602855405", "242957281"];

function urlHoja(gid) {
  return `${SHEET_BASE}?gid=${gid}&single=true&output=csv&t=${Date.now()}`;
}

// ===== Respaldo =====
// Solo se usa si Google Sheets no carga.

const TELEFONOS_RESPALDO = {
  "HARO CUADRADO ALEX FERNANDO": "593995112077",
  "OJEDA GUAMBO DARIO JAVIER": "593961058610",
  "PEREZ BAYAS JEFFERSON ISRAEL": "593999975232",
  "URQUIZO EGAS JOSE ANDRES": "593993996368",
  "VARGAS PAUCAR KEVIN RONALDO": "593987888767",
  "CARRION ESPINOSA JUAN PABLO": "593999431363",
  "CISNEROS BARRIOS CARLOS ANDRÉS": "593967395224",
  "CORDOVA VACA ROBERTO ALEJANDRO": "593960155937",
  "LOZADA VILLACIS MIGUEL ANGEL": "593995851481",
  "ORTIZ ESCOBAR MARLON ANTONIO": "593996527179",
  "ORMAZA BRAVO EDGAR RAFAEL": "593994822263",
  "PORRAS PÉREZ ANGELO FERNANDO": "593995016191",
  "SANCHEZ BERMELLO CESAR ALEXANDER": "593963737123",
};

// Lee un CSV respetando comillas (por si un valor tiene comas).
function parsearCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        enComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ",") {
      fila.push(campo.trim());
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo.trim());
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }

  if (campo !== "" || fila.length > 0) {
    fila.push(campo.trim());
    filas.push(fila);
  }

  return filas.filter((f) => f.some((v) => v !== ""));
}

// "José Andrés  Urquizo" -> "JOSE ANDRES URQUIZO" (para comparar nombres)
function claveNombre(nombre) {
  return (nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Deja el teléfono listo para WhatsApp: 593XXXXXXXXX
// Acepta: +593 99..., 593 99..., 099..., 99...
function normalizarTelefono(valor) {
  let d = String(valor || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("593")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return `593${d}`;
}

function mapaTelefonos(objeto) {
  const mapa = {};
  Object.entries(objeto).forEach(([nombre, tel]) => {
    const t = normalizarTelefono(tel);
    if (t) mapa[claveNombre(nombre)] = t;
  });
  return mapa;
}

// Definición de los turnos (antes eran plantas CMS / CMA)
const TURNOS = [
  {
    id: "T1",
    nombre: "Turno 1",
    descripcion: "Atiende CMS y CMA",
  },
  {
    id: "T2",
    nombre: "Turno 2",
    descripcion: "Se activa si hay 2 llamados urgentes al mismo tiempo",
  },
];

// ===== Supervisores =====
// Grupo 1 y Grupo 2 trabajan 10 días (lunes a miércoles de la semana
// siguiente) en ciclos de 14 días. El supervisor cubre las noches desde
// el lunes de entrada hasta el martes antes de salir (el miércoles sale).
// "entrada" es un lunes de referencia en que entró ese grupo.
// Teléfono y link de salvoconductos se toman de la pestaña TECNICOS
// (agregar una fila con el nombre del supervisor).
const SUPERVISORES = [
  { grupo: "Grupo 1", nombre: "BEJARANO EDISSON", entrada: "2026-11-16" },
  { grupo: "Grupo 2", nombre: "BALLESTEROS LEONARDO", entrada: "2026-11-23" },
];

// Devuelve los supervisores a cargo para la fecha de turno "AAAA-MM-DD".
// En los días en que se cruzan los dos grupos aparecen ambos.
function diaNumero(fecha) {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
}

function supervisoresDeFecha(fecha) {
  return SUPERVISORES.filter((s) => {
    const dias = diaNumero(fecha) - diaNumero(s.entrada);
    const posicion = ((dias % 14) + 14) % 14;
    return posicion <= 8;
  });
}

function infoTurno(id) {
  return (
    TURNOS.find((t) => t.id === id) || {
      id,
      nombre: id,
      descripcion: "",
    }
  );
}

// Orden: T1 primero, luego T2, luego cualquier otro
function ordenTurno(id) {
  const idx = TURNOS.findIndex((t) => t.id === id);
  return idx === -1 ? 99 : idx;
}

export default function Home() {
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [fechasDisponibles, setFechasDisponibles] = useState([]);

  // Teléfonos y carpetas de salvoconductos (desde Google Sheets)
  const [telefonos, setTelefonos] = useState(() =>
    mapaTelefonos(TELEFONOS_RESPALDO)
  );
  const [salvos, setSalvos] = useState({});

  // Busca por nombre exacto; si no lo encuentra, por todas sus palabras
  // (así "BEJARANO EDISSON" encuentra "BEJARANO ... EDISSON ...").
  function buscarEnMapa(mapa, nombre) {
    const clave = claveNombre(nombre);
    if (!clave) return null;
    if (mapa[clave]) return mapa[clave];

    const palabras = clave.split(" ");
    const encontrada = Object.keys(mapa).find((k) => {
      const partes = k.split(" ");
      return palabras.every((p) => partes.includes(p));
    });

    return encontrada ? mapa[encontrada] : null;
  }

  function buscarTelefono(nombre) {
    return buscarEnMapa(telefonos, nombre);
  }

  function buscarSalvo(nombre) {
    return buscarEnMapa(salvos, nombre);
  }

  // Convierte cualquier formato de fecha a "2026-03-26"
  // Ejemplo: "02/11/26" -> "2026-11-02"
  function convertirFecha(fecha) {
    if (!fecha) return fecha;
    const f = fecha.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;

    const partes = f.split(/[\/\-\.]/);
    if (partes.length !== 3) return f;

    let dia, mes, año;

    if (partes[0].length === 4) {
      [año, mes, dia] = partes;
    } else {
      [dia, mes, año] = partes;
    }

    if (año.length === 2) año = `20${año}`;

    return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  // Normaliza el turno: "t1", " T 1 " -> "T1"
  function normalizarTurno(valor) {
    return (valor || "").toUpperCase().replace(/\s+/g, "");
  }

  function obtenerFechaTurnoActivo() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const fechaActual = `${año}-${mes}-${dia}`;
    const horaActual = ahora.getHours();

    if (horaActual >= 8) return fechaActual;

    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);

    const añoAyer = ayer.getFullYear();
    const mesAyer = String(ayer.getMonth() + 1).padStart(2, "0");
    const diaAyer = String(ayer.getDate()).padStart(2, "0");

    return `${añoAyer}-${mesAyer}-${diaAyer}`;
  }

  function obtenerRangoTurnoActivo() {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    let fechaInicio, fechaFin;

    if (horaActual >= 8) {
      fechaInicio = new Date(ahora);
      fechaInicio.setHours(8, 0, 0, 0);
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 1);
    } else {
      fechaFin = new Date(ahora);
      fechaFin.setHours(8, 0, 0, 0);
      fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaInicio.getDate() - 1);
    }

    return { fechaInicio, fechaFin };
  }

  // Registrar el Service Worker y comprobar actualizaciones.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let recargando = false;

    const alCambiarControlador = () => {
      if (recargando) return;
      recargando = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      alCambiarControlador
    );

    async function registrarYActualizar() {
      try {
        const registration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            updateViaCache: "none",
          }
        );

        await registration.update();
        console.log("Service Worker registrado y actualización comprobada");
      } catch (error) {
        console.error(
          "Error al registrar/actualizar el Service Worker:",
          error
        );
      }
    }

    registrarYActualizar();

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        alCambiarControlador
      );
    };
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA instalada");
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // Cargar asignaciones desde Google Sheets.
  // Formato esperado: NOMBRE | TURNO (T1/T2) | FECHA (dd/mm/aa)
  useEffect(() => {
    async function cargarDatos() {
      const res = await fetch(urlHoja(GID_TURNOS), {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Error al cargar Google Sheets: ${res.status}`);
      }

      const csvText = await res.text();
      const filas = parsearCSV(csvText).slice(1);
      const mapaAsignaciones = {};

      filas.forEach((cols) => {
        const nombre = cols[0];
        const turno = normalizarTurno(cols[1]);
        const fecha = cols[2];
        if (!nombre || !turno || !fecha) return;

        const clave = `${nombre}__${turno}`;

        if (!mapaAsignaciones[clave]) {
          mapaAsignaciones[clave] = {
            nombre,
            turno,
            fechas: [],
          };
        }

        mapaAsignaciones[clave].fechas.push(convertirFecha(fecha));
      });

      const asignacionesCargadas = Object.values(mapaAsignaciones);
      const fechaTurno = obtenerFechaTurnoActivo();

      const asignadosHoy = asignacionesCargadas.filter((t) =>
        t.fechas.includes(fechaTurno)
      );

      setTurnosHoy(asignadosHoy);

      const listaTecnicos = Array.from(
        new Set(asignacionesCargadas.map((t) => t.nombre))
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

      setTecnicos(listaTecnicos);
      setAsignaciones(asignacionesCargadas);

      // Fecha local para evitar diferencias de zona horaria.
      const ahora = new Date();
      const hoyLocal = [
        ahora.getFullYear(),
        String(ahora.getMonth() + 1).padStart(2, "0"),
        String(ahora.getDate()).padStart(2, "0"),
      ].join("-");

      const todasLasFechas = Array.from(
        new Set(asignacionesCargadas.flatMap((t) => t.fechas))
      );

      const fechasFuturas = todasLasFechas
        .filter((fecha) => fecha >= hoyLocal)
        .sort();

      setFechasDisponibles(fechasFuturas);
    }

    cargarDatos().catch((error) => {
      console.error("No se pudieron cargar los turnos:", error);
    });
  }, []);

  // Cargar teléfonos y carpetas de salvoconductos (pestaña TECNICOS).
  useEffect(() => {
    async function cargarHoja(gid) {
      const res = await fetch(urlHoja(gid), { cache: "no-store" });
      if (!res.ok) throw new Error(`Hoja ${gid}: ${res.status}`);
      return parsearCSV(await res.text());
    }

    GIDS_EXTRA.forEach((gid) => {
      cargarHoja(gid)
        .then((filas) => {
          if (filas.length < 2) return;

          const encabezado = filas[0].map((c) => claveNombre(c));
          const iTel = encabezado.findIndex((c) => c.includes("TELEFONO"));

          // Solo se procesa la pestaña que tiene la columna TELEFONO
          if (iTel === -1) return;

          const iNom = encabezado.findIndex((c) => c.includes("NOMBRE"));
          const iSalvo = encabezado.findIndex((c) => c.includes("SALVO"));
          const colNombre = iNom === -1 ? 0 : iNom;

          const nuevosTel = {};
          const nuevosSalvos = {};

          filas.slice(1).forEach((f) => {
            const clave = claveNombre(f[colNombre]);
            if (!clave) return;

            const t = normalizarTelefono(f[iTel]);
            if (t) nuevosTel[clave] = t;

            const url = iSalvo === -1 ? "" : (f[iSalvo] || "").trim();
            if (url.startsWith("http")) nuevosSalvos[clave] = url;
          });

          if (Object.keys(nuevosTel).length > 0) setTelefonos(nuevosTel);
          setSalvos(nuevosSalvos);
        })
        .catch((error) => {
          console.error("No se pudo cargar una hoja extra:", error);
        });
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("tecnicoSeleccionado");
    if (saved) setTecnicoSeleccionado(saved);
  }, []);

  useEffect(() => {
    if (tecnicoSeleccionado) {
      localStorage.setItem("tecnicoSeleccionado", tecnicoSeleccionado);
    }
  }, [tecnicoSeleccionado]);

  function formatearNombre(nombreCompleto) {
    const palabras = nombreCompleto.trim().split(/\s+/);

    if (palabras.length >= 3) {
      return `${palabras[0]} ${palabras[2]}`;
    }

    if (palabras.length === 2) {
      return `${palabras[0]} ${palabras[1]}`;
    }

    return palabras[0] || nombreCompleto;
  }

  function formatearFecha(fecha) {
    const fechaObj = new Date(`${fecha}T00:00:00`);

    return fechaObj.toLocaleDateString("es-EC", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }

  function formatearFechaCompleta(fecha) {
    const fechaObj = new Date(`${fecha}T00:00:00`);

    return fechaObj.toLocaleDateString("es-EC", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function ordenarPorTelefono(lista) {
    return [...lista].sort((a, b) => {
      const tieneNumeroA = buscarTelefono(a) ? 1 : 0;
      const tieneNumeroB = buscarTelefono(b) ? 1 : 0;
      return tieneNumeroB - tieneNumeroA;
    });
  }

  // Botones "📞 llamar" y "🚗" (salvoconductos) de una persona
  function botonesContacto(nombre) {
    const telefono = buscarTelefono(nombre);
    const linkSalvo = buscarSalvo(nombre);

    return (
      <>
        {telefono && (
          <a
            href={`https://wa.me/${telefono.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.telefonoEnlace}
          >
            📞 llamar
          </a>
        )}

        {linkSalvo && (
          <a
            href={linkSalvo}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.salvoEnlace}
            title="Salvoconductos"
            aria-label="Salvoconductos"
          >
            🚗
          </a>
        )}
      </>
    );
  }

  function renderTecnicos(lista) {
    return ordenarPorTelefono(lista).map((nombre, idx) => (
      <div key={idx} style={styles.tecnicoChip}>
        {formatearNombre(nombre)}
        {botonesContacto(nombre)}
      </div>
    ));
  }

  // Tarjeta de un turno (T1 o T2) con sus técnicos
  function TarjetaTurno({ turnoId, lista }) {
    const info = infoTurno(turnoId);
    const esT1 = turnoId === "T1";

    return (
      <div
        style={{
          ...styles.turnoCardGrande,
          borderTop: `4px solid ${esT1 ? "#10b981" : "#f59e0b"}`,
        }}
      >
        <div style={styles.plantaHeader}>
          <div>
            <span
              style={{
                ...styles.turnoBadgeGrande,
                backgroundColor: esT1 ? "#10b981" : "#f59e0b",
              }}
            >
              {info.id}
            </span>
            <span style={styles.plantaName}>{info.nombre}</span>
          </div>

          <span style={styles.contadorTecnicos}>
            {lista.length} técnico{lista.length !== 1 ? "s" : ""}
          </span>
        </div>

        {info.descripcion && (
          <div style={styles.turnoDescripcion}>{info.descripcion}</div>
        )}

        <div style={styles.tecnicosList}>
          {lista.length > 0 ? (
            renderTecnicos(lista)
          ) : (
            <div style={styles.sinAsignacion}>Sin asignación</div>
          )}
        </div>
      </div>
    );
  }

  function verTurnos(nombre) {
    const ahora = new Date();
    const hoy = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, "0"),
      String(ahora.getDate()).padStart(2, "0"),
    ].join("-");

    const tecnico = asignaciones
      .filter(
        (t) => t.nombre === nombre && t.fechas.some((fecha) => fecha >= hoy)
      )
      .sort((a, b) => ordenTurno(a.turno) - ordenTurno(b.turno));

    if (tecnico.length === 0) {
      return (
        <div style={styles.sinAsignacion}>No tienes turnos próximos</div>
      );
    }

    return (
      <div style={styles.turnosContainer}>
        {tecnico.map((t, i) => {
          const fechasFuturas = t.fechas
            .filter((fecha) => fecha >= hoy)
            .sort();

          if (fechasFuturas.length === 0) return null;

          const esT1 = t.turno === "T1";

          return (
            <div key={i} style={styles.turnoCard}>
              <div
                style={{
                  ...styles.plantaBadge,
                  backgroundColor: esT1 ? "#10b981" : "#f59e0b",
                }}
              >
                {infoTurno(t.turno).nombre} ({t.turno})
              </div>

              <div style={styles.fechas}>
                {fechasFuturas.map((fecha, idx) => (
                  <span key={idx} style={styles.fechaTag}>
                    {formatearFecha(fecha)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function verTurnosPorFecha(fecha) {
    const asignadosFecha = asignaciones.filter((t) =>
      t.fechas.includes(fecha)
    );

    if (asignadosFecha.length === 0) {
      return (
        <div style={styles.sinAsignacionFecha}>
          No hay técnicos asignados para esta fecha
        </div>
      );
    }

    return (
      <div style={styles.fechaResultContainer}>
        <div style={styles.plantasGridFecha}>
          {TURNOS.map(({ id }) => (
            <TarjetaTurno
              key={id}
              turnoId={id}
              lista={asignadosFecha
                .filter((t) => t.turno === id)
                .map((t) => t.nombre)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Calcular el rango del turno después del montaje para
  // evitar diferencias de fecha entre servidor y navegador.
  const [rangoTurnoFormateado, setRangoTurnoFormateado] = useState(null);
  const [supervisoresHoy, setSupervisoresHoy] = useState([]);

  useEffect(() => {
    setSupervisoresHoy(supervisoresDeFecha(obtenerFechaTurnoActivo()));
  }, []);

  useEffect(() => {
    const { fechaInicio, fechaFin } = obtenerRangoTurnoActivo();

    const fechaInicioFormateada = fechaInicio.toLocaleDateString("es-EC", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const fechaFinFormateada = fechaFin.toLocaleDateString("es-EC", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    setRangoTurnoFormateado({
      fechaInicioFormateada,
      fechaFinFormateada,
    });
  }, []);

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <h1 style={styles.title}>Atención Emergentes</h1>

        {showInstallButton && (
          <button onClick={handleInstallClick} style={styles.installButton}>
            Instalar esta App en tu 📱
          </button>
        )}

        <div style={styles.turnoActivoCard}>
          <div style={styles.turnoLabel}>🟢 TURNO ACTIVO</div>

          <div style={styles.fechasContainer}>
            <span style={styles.fechaTexto}>
              {rangoTurnoFormateado
                ? `${rangoTurnoFormateado.fechaInicioFormateada} 5PM - ${rangoTurnoFormateado.fechaFinFormateada} 8AM`
                : "Calculando turno..."}
            </span>
          </div>

          {supervisoresHoy.length > 0 && (
            <div style={styles.supervisorBloque}>
              <div style={styles.supervisorLabel}>
                👷 Supervisor a cargo
              </div>

              <div style={styles.supervisorLista}>
                {supervisoresHoy.map((s) => (
                  <div key={s.nombre} style={styles.tecnicoChip}>
                    {s.nombre}
                    <span style={styles.supervisorGrupo}>{s.grupo}</span>
                    {botonesContacto(s.nombre)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Técnicos asignados hoy */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📅 Técnicos Asignados Hoy</h2>

        <div style={styles.plantasGrid}>
          {TURNOS.map(({ id }) => (
            <TarjetaTurno
              key={id}
              turnoId={id}
              lista={turnosHoy
                .filter((t) => t.turno === id)
                .map((t) => t.nombre)}
            />
          ))}
        </div>
      </div>

      <hr style={styles.separador} />

      {/* Consulta por técnico */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔍 Consultar Turnos por Técnico</h2>

        <select
          onChange={(e) => setTecnicoSeleccionado(e.target.value)}
          value={tecnicoSeleccionado}
          style={styles.select}
        >
          <option value="">Selecciona un técnico...</option>

          {tecnicos.map((nombre, idx) => (
            <option key={idx} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        {tecnicoSeleccionado && (
          <div style={styles.detalleContainer}>
            <div style={styles.tecnicoEncabezado}>
              <h3 style={styles.tecnicoNombreFila}>
                👤 {tecnicoSeleccionado}
              </h3>

              {buscarSalvo(tecnicoSeleccionado) && (
                <a
                  href={buscarSalvo(tecnicoSeleccionado)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.salvoBotonGrande}
                >
                  🚗 salvoconductos
                </a>
              )}
            </div>

            <div style={styles.proximosTurnos}>
              <span style={styles.proximosLabel}>
                Próximos turnos que tienes:
              </span>
            </div>

            {verTurnos(tecnicoSeleccionado)}
          </div>
        )}
      </div>

      <hr style={styles.separador} />

      {/* Consulta por fecha */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔍 Consultar Turnos por Fecha</h2>

        <select
          onChange={(e) => setFechaSeleccionada(e.target.value)}
          value={fechaSeleccionada}
          style={styles.select}
        >
          <option value="">Selecciona una fecha...</option>

          {fechasDisponibles.map((fecha, idx) => (
            <option key={idx} value={fecha}>
              {formatearFechaCompleta(fecha)}
            </option>
          ))}
        </select>

        {fechaSeleccionada && (
          <div style={styles.detalleContainer}>
            <h3 style={styles.fechaNombre}>
              📅 {formatearFechaCompleta(fechaSeleccionada)}
            </h3>

            <div style={styles.proximosTurnos}>
              <span style={styles.proximosLabel}>
                Técnicos asignados para esta fecha:
              </span>
            </div>

            {verTurnosPorFecha(fechaSeleccionada)}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  installButton: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "500",
    cursor: "pointer",
    margin: "0.5rem 0 1rem 0",
    boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
    transition: "all 0.2s ease",
  },

  container: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "1rem",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  header: {
    textAlign: "center",
    marginBottom: "1.5rem",
  },

  title: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0 0 0.5rem 0",
  },

  turnoActivoCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "0.75rem",
    boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.1)",
    border: "2px solid #10b981",
    maxWidth: "400px",
    margin: "0 auto",
  },

  turnoLabel: {
    fontSize: "0.9rem",
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem",
  },

  fechasContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  fechaTexto: {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#1e293b",
  },

  section: {
    marginBottom: "2rem",
  },

  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "1rem",
  },

  separador: {
    margin: "2rem 0",
    border: "none",
    borderTop: "1px solid #ccc",
  },

  plantasGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },

  plantasGridFecha: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },

  turnoCardGrande: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "1.25rem",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
  },

  turnoBadgeGrande: {
    color: "white",
    padding: "0.2rem 0.6rem",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "bold",
    marginRight: "0.5rem",
  },

  turnoDescripcion: {
    fontSize: "0.8rem",
    color: "#64748b",
    marginBottom: "0.75rem",
    marginTop: "-0.5rem",
  },

  plantaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },

  plantaName: {
    fontSize: "1.15rem",
    fontWeight: "bold",
    color: "#1e293b",
  },

  contadorTecnicos: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "500",
  },

  tecnicosList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },

  tecnicoChip: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    padding: "0.5rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sinAsignacion: {
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: "0.9rem",
  },

  sinAsignacionFecha: {
    color: "#94a3b8",
    fontStyle: "italic",
    fontSize: "0.9rem",
    textAlign: "center",
    padding: "2rem",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },

  select: {
    width: "100%",
    padding: "0.75rem",
    fontSize: "1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "white",
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.2s",
  },

  detalleContainer: {
    marginTop: "1.5rem",
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0",
  },

  tecnicoNombre: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "0.5rem",
  },

  fechaNombre: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "0.5rem",
  },

  proximosTurnos: {
    marginBottom: "1rem",
  },

  proximosLabel: {
    fontSize: "0.9rem",
    color: "#64748b",
    fontWeight: "500",
  },

  turnosContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },

  fechaResultContainer: {
    marginTop: "1rem",
  },

  turnoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "1rem",
    border: "1px solid #e2e8f0",
  },

  plantaBadge: {
    backgroundColor: "#10b981",
    color: "white",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: "bold",
    display: "inline-block",
    marginBottom: "0.75rem",
  },

  fechas: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },

  fechaTag: {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "500",
  },

  salvoEnlace: {
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "0.75rem",
    fontWeight: "600",
    textDecoration: "none",
    marginLeft: "0.5rem",
    padding: "0.2rem 0.5rem",
    borderRadius: "6px",
  },

  salvoBotonGrande: {
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "0.85rem",
    fontWeight: "600",
    textDecoration: "none",
    padding: "0.35rem 0.75rem",
    borderRadius: "8px",
    whiteSpace: "nowrap",
  },

  tecnicoEncabezado: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "0.5rem",
  },

  tecnicoNombreFila: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },

  supervisorBloque: {
    marginTop: "0.75rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid #e2e8f0",
  },

  supervisorLabel: {
    fontSize: "0.8rem",
    fontWeight: "bold",
    color: "#475569",
    marginBottom: "0.5rem",
  },

  supervisorLista: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.5rem",
  },

  supervisorGrupo: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    fontSize: "0.7rem",
    padding: "0.1rem 0.4rem",
    borderRadius: "10px",
    marginLeft: "0.4rem",
  },

  telefonoEnlace: {
    color: "#3490dc",
    fontSize: "0.8rem",
    fontWeight: "500",
    textDecoration: "none",
    marginLeft: "0.5rem",
  },
};