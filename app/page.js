"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [fechasDisponibles, setFechasDisponibles] = useState([]);

  // Datos de los responsables y sus números de teléfono
  const responsables = {
    "HARO CUADRADO ALEX FERNANDO": "+593995112077",
    "OJEDA GUAMBO DARIO JAVIER": "+593961058610",
    "PEREZ BAYAS JEFFERSON ISRAEL": "+593999975232",
    "URQUIZO EGAS JOSE ANDRES": "+593998205266",
    "VARGAS PAUCAR KEVIN RONALDO": "+593987888767",
    "CARRION ESPINOSA JUAN PABLO": "+593999431363",
    "CISNEROS BARRIOS CARLOS ANDRÉS": "+593969752709",
    "CORDOVA VACA ROBERTO ALEJANDRO": "+593960155937",
    "LOZADA VILLACIS MIGUEL ANGEL": "+593995851481",
    "LARA TAQUEZ CRISTIAN DIEGO": "+593982646580",
    "ORMAZA BRAVO EDGAR RAFAEL": "+593994822263",
    "PORRAS PÉREZ ANGELO FERNANDO": "+593995016191",
    "SANCHEZ BERMELLO CESAR ALEXANDER": "+593985207705"
  };

  // Convierte cualquier formato de fecha a "2026-03-26"
  function convertirFecha(fecha) {
    if (!fecha) return fecha;
    const f = fecha.trim();

    // Ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;

    // Separado por / o - o .
    const partes = f.split(/[\/\-\.]/);
    if (partes.length !== 3) return f;

    let dia, mes, año;

    if (partes[0].length === 4) {
      // YYYY/MM/DD o YYYY-MM-DD
      [año, mes, dia] = partes;
    } else {
      // DD/MM/YYYY o DD/MM/YY
      [dia, mes, año] = partes;
    }

    // Año con 2 dígitos → 2000+
    if (año.length === 2) año = `20${año}`;

    return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  function obtenerFechaTurnoActivo() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaActual = `${año}-${mes}-${dia}`;
    const horaActual = ahora.getHours();

    if (horaActual >= 8) {
      return fechaActual;
    } else {
      const ayer = new Date(ahora);
      ayer.setDate(ayer.getDate() - 1);
      const añoAyer = ayer.getFullYear();
      const mesAyer = String(ayer.getMonth() + 1).padStart(2, '0');
      const diaAyer = String(ayer.getDate()).padStart(2, '0');
      return `${añoAyer}-${mesAyer}-${diaAyer}`;
    }
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

  // PWA: Registrar Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registrado:', registration);
        })
        .catch((error) => {
          console.log('SW falló:', error);
        });
    }
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA instalada');
    }
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  useEffect(() => {
    async function cargarDatos() {
      // 👇 REEMPLAZA ESTO con tu URL de Google Sheets publicado como CSV
      // En Sheets: Archivo → Compartir → Publicar en la web → Hoja1 → CSV → Copiar URL
      const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1eVgJm5wHPyxFZMjhej3qi_nERtzjzSO-E7oIgC37nR0/pub?output=csv";

      const res = await fetch(SHEET_CSV_URL);
      const csvText = await res.text();

console.log("✅ CSV recibido:", csvText.substring(0, 300)); // 👈 agrega esto




      // Parsear CSV (saltar la fila de encabezado)
      const filas = csvText.split('\n').slice(1);

      // Agrupar por nombre+planta
      const mapaAsignaciones = {};

      filas.forEach(fila => {
        const cols = fila.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const [nombre, planta, fecha] = cols;
        if (!nombre || !planta || !fecha) return;

        const clave = `${nombre}__${planta}`;
        if (!mapaAsignaciones[clave]) {
          mapaAsignaciones[clave] = { nombre, planta, fechas: [] };
        }
        // Convertir "26/03/2026" → "2026-03-26"
        mapaAsignaciones[clave].fechas.push(convertirFecha(fecha));
      });

      const asignaciones = Object.values(mapaAsignaciones);
      const data = { asignaciones };

      const fechaTurno = obtenerFechaTurnoActivo();
      const asignadosHoy = data.asignaciones.filter(t =>
        t.fechas.includes(fechaTurno)
      );
      setTurnosHoy(asignadosHoy);

      const listaTecnicos = Array.from(
        new Set(data.asignaciones.map(t => t.nombre))
      ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      setTecnicos(listaTecnicos);

      setAsignaciones(data.asignaciones);

      const todasLasFechas = Array.from(
        new Set(data.asignaciones.flatMap(t => t.fechas))
      );
      const hoy = new Date().toISOString().split("T")[0];
      const fechasFuturas = todasLasFechas
        .filter(fecha => fecha >= hoy)
        .sort();
      setFechasDisponibles(fechasFuturas);
    }

    cargarDatos();
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
    const palabras = nombreCompleto.split(' ');
    if (palabras.length >= 3) {
      return `${palabras[0]} ${palabras[2]}`;
    } else if (palabras.length === 2) {
      return `${palabras[0]} ${palabras[1]}`;
    } else {
      return palabras[0];
    }
  }

  function formatearFecha(fecha) {
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-EC', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }

  function formatearFechaCompleta(fecha) {
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function verTurnos(nombre) {
    const hoy = new Date().toISOString().split("T")[0];
    const tecnico = asignaciones.filter(t =>
      t.nombre === nombre &&
      t.fechas.some(fecha => fecha >= hoy)
    );
    if (tecnico.length === 0) return null;

    return (
      <div style={styles.turnosContainer}>
        {tecnico.map((t, i) => {
          const fechasFuturas = t.fechas.filter(fecha => fecha >= hoy);
          if (fechasFuturas.length === 0) return null;
          return (
            <div key={i} style={styles.turnoCard}>
              <div style={styles.plantaBadge}>{t.planta}</div>
              <div style={styles.fechas}>
                {fechasFuturas.map((fecha, idx) => (
                  <span key={idx} style={styles.fechaTag}>
                    {formatearFecha(fecha)}
                  </span>
                ))}
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>
    );
  }

  function verTurnosPorFecha(fecha) {
    const asignadosFecha = asignaciones.filter(t =>
      t.fechas.includes(fecha)
    );

    if (asignadosFecha.length === 0) {
      return (
        <div style={styles.sinAsignacionFecha}>
          No hay técnicos asignados para esta fecha
        </div>
      );
    }

    const asignacionesPorPlanta = asignadosFecha.reduce((acc, t) => {
      if (!acc[t.planta]) acc[t.planta] = [];
      acc[t.planta].push(t.nombre);
      return acc;
    }, {});

    return (
      <div style={styles.fechaResultContainer}>
        <div style={styles.plantasGridFecha}>
          {Object.entries(asignacionesPorPlanta).map(([planta, tecnicos]) => {
            const tecnicosOrdenados = [...tecnicos].sort((a, b) => {
              const tieneNumeroA = responsables[a] ? 1 : 0;
              const tieneNumeroB = responsables[b] ? 1 : 0;
              return tieneNumeroB - tieneNumeroA;
            });

            return (
              <div key={planta} style={styles.plantaCardFecha}>
                <div style={styles.plantaHeader}>
                  <span style={styles.plantaName}>{planta}</span>
                  <span style={styles.contadorTecnicos}>
                    {tecnicos.length} técnico{tecnicos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={styles.tecnicosList}>
                  {tecnicosOrdenados.map((nombre, idx) => {
                    const telefonoResponsable = responsables[nombre] || null;
                    const enlaceWhatsApp = telefonoResponsable ? `https://wa.me/${telefonoResponsable}` : null;
                    return (
                      <div key={idx} style={styles.tecnicoChip}>
                        {formatearNombre(nombre)}
                        {enlaceWhatsApp && (
                          <a href={enlaceWhatsApp} target="_blank" rel="noopener noreferrer" style={styles.telefonoEnlace}>
                            📞 llamar
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const { fechaInicio, fechaFin } = obtenerRangoTurnoActivo();

  const fechaInicioFormateada = fechaInicio.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const fechaFinFormateada = fechaFin.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div style={styles.container}>
      {/* Header */}
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
              {fechaInicioFormateada} 5PM - {fechaFinFormateada} 8AM
            </span>
          </div>
        </div>
      </div>

      {/* Turnos de hoy */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📅 Técnicos Asignados Hoy</h2>
        <div style={styles.plantasGrid}>
          {["CMA", "CMS"].map(planta => {
            const tecnicosHoy = turnosHoy
              .filter(t => t.planta === planta)
              .map(t => t.nombre);

            const tecnicosOrdenados = [...tecnicosHoy].sort((a, b) => {
              const tieneNumeroA = responsables[a] ? 1 : 0;
              const tieneNumeroB = responsables[b] ? 1 : 0;
              return tieneNumeroB - tieneNumeroA;
            });

            return (
              <div key={planta} style={styles.plantaCard}>
                <div style={styles.plantaHeader}>
                  <span style={styles.plantaName}>{planta}</span>
                  <span style={styles.contadorTecnicos}>
                    {tecnicosHoy.length} técnico{tecnicosHoy.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={styles.tecnicosList}>
                  {tecnicosOrdenados.length > 0 ? (
                    tecnicosOrdenados.map((nombre, idx) => {
                      const telefonoResponsable = responsables[nombre] || null;
                      const enlaceWhatsApp = telefonoResponsable ? `https://wa.me/${telefonoResponsable}` : null;
                      return (
                        <div key={idx} style={styles.tecnicoChip}>
                          {formatearNombre(nombre)}
                          {enlaceWhatsApp && (
                            <a href={enlaceWhatsApp} target="_blank" rel="noopener noreferrer" style={styles.telefonoEnlace}>
                              📞 llamar
                            </a>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={styles.sinAsignacion}>Sin asignación</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #ccc' }} />
      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #ccc' }} />

      {/* Consulta por técnico */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔍 Consultar Turnos por Técnico</h2>
        <select onChange={e => setTecnicoSeleccionado(e.target.value)} value={tecnicoSeleccionado} style={styles.select}>
          <option value="">Selecciona un técnico...</option>
          {tecnicos.map((nombre, idx) => (
            <option key={idx} value={nombre}>{nombre}</option>
          ))}
        </select>

        {tecnicoSeleccionado && (
          <div style={styles.detalleContainer}>
            <h3 style={styles.tecnicoNombre}>👤 {tecnicoSeleccionado}</h3>
            <div style={styles.proximosTurnos}>
              <span style={styles.proximosLabel}>Próximos turnos que tienes:</span>
            </div>
            {verTurnos(tecnicoSeleccionado)}
          </div>
        )}
      </div>

      <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #ccc' }} />

      {/* Consulta por fecha */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔍 Consultar Turnos por Fecha</h2>
        <select onChange={e => setFechaSeleccionada(e.target.value)} value={fechaSeleccionada} style={styles.select}>
          <option value="">Selecciona una fecha...</option>
          {fechasDisponibles.map((fecha, idx) => (
            <option key={idx} value={fecha}>{formatearFechaCompleta(fecha)}</option>
          ))}
        </select>

        {fechaSeleccionada && (
          <div style={styles.detalleContainer}>
            <h3 style={styles.fechaNombre}>📅 {formatearFechaCompleta(fechaSeleccionada)}</h3>
            <div style={styles.proximosTurnos}>
              <span style={styles.proximosLabel}>Técnicos asignados para esta fecha:</span>
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    margin: '0.5rem 0 1rem 0',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.2s ease',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.8rem',
    margin: '0 0 1rem 0',
  },
  turnoActivoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '0.75rem',
    boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
    border: '2px solid #10b981',
    maxWidth: '400px',
    margin: '0 auto',
  },
  turnoLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
  },
  fechasContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  fechaTexto: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem',
  },
  plantasGrid: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  plantasGridFecha: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  plantaCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  plantaCardFecha: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  plantaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  plantaName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  contadorTecnicos: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  tecnicosList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  tecnicoChip: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sinAsignacion: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontSize: '0.9rem',
  },
  sinAsignacionFecha: {
    color: '#94a3b8',
    fontStyle: 'italic',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  detalleContainer: {
    marginTop: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  tecnicoNombre: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  fechaNombre: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  proximosTurnos: {
    marginBottom: '1rem',
  },
  proximosLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500',
  },
  turnosContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  fechaResultContainer: {
    marginTop: '1rem',
  },
  turnoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '1rem',
    border: '1px solid #e2e8f0',
  },
  plantaBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'inline-block',
    marginBottom: '0.75rem',
  },
  fechas: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  fechaTag: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  telefonoEnlace: {
    color: '#3490dc',
    fontSize: '0.8rem',
    fontWeight: '500',
    textDecoration: 'none',
    marginLeft: '0.5rem',
  },
};