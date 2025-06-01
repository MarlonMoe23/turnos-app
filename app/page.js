"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");

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
    "LOZADA VILLACIS MIGUEL ANGEL": "+593995861481",
    "SANCHEZ BERMELLO CESAR ALEXANDER": "+593985207705"
  };

  // NUEVA LÓGICA - REESCRITA DESDE CERO
  function obtenerFechaTurnoActivo() {
    const ahora = new Date();
    console.log("🔍 Hora actual completa:", ahora);
    
    // Obtener fecha actual en formato YYYY-MM-DD
    const fechaActual = ahora.toISOString().split("T")[0];
    console.log("🔍 Fecha actual (string):", fechaActual);
    
    // Obtener hora actual en formato 24h
    const horaActual = ahora.getHours();
    console.log("🔍 Hora actual (número):", horaActual);
    
    // REGLA SIMPLE:
    // Si son las 8:00 AM o después → buscar técnicos de HOY
    // Si es antes de las 8:00 AM → buscar técnicos de AYER
    
    if (horaActual >= 8) {
      console.log("🔍 Es >= 8AM, turno empezó HOY");
      return fechaActual;
    } else {
      console.log("🔍 Es < 8AM, turno empezó AYER");
      const ayer = new Date(ahora);
      ayer.setDate(ayer.getDate() - 1);
      const fechaAyer = ayer.toISOString().split("T")[0];
      console.log("🔍 Fecha de ayer:", fechaAyer);
      return fechaAyer;
    }
  }

  // NUEVA LÓGICA PARA EL HEADER - REESCRITA DESDE CERO
  function obtenerRangoTurnoActivo() {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    
    // Variables para las fechas de inicio y fin
    let fechaInicio, fechaFin;
    
    if (horaActual >= 8) {
      // Turno actual: HOY 8AM → MAÑANA 8AM
      fechaInicio = new Date(ahora);
      fechaInicio.setHours(8, 0, 0, 0);
      
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 1);
    } else {
      // Turno actual: AYER 8AM → HOY 8AM
      fechaFin = new Date(ahora);
      fechaFin.setHours(8, 0, 0, 0);
      
      fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaInicio.getDate() - 1);
    }
    
    return { fechaInicio, fechaFin };
  }

  useEffect(() => {
    async function cargarDatos() {
      const res = await fetch("/data/turnos.json");
      const data = await res.json();

      // USAR LA FUNCIÓN CENTRALIZADA PARA OBTENER LA FECHA DEL TURNO ACTIVO
      const fechaTurno = obtenerFechaTurnoActivo();

      console.log("🔍 DEBUG - Fecha del turno activo:", fechaTurno);
      console.log("🔍 DEBUG - Hora actual:", new Date().toLocaleString('es-EC'));

      const asignadosHoy = data.asignaciones.filter(t =>
        t.fechas.includes(fechaTurno)
      );
      
      console.log("🔍 DEBUG - Técnicos asignados para hoy:", asignadosHoy);
      
      setTurnosHoy(asignadosHoy);

      const listaTecnicos = Array.from(
        new Set(data.asignaciones.map(t => t.nombre))
      ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      setTecnicos(listaTecnicos);

      setAsignaciones(data.asignaciones);
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
      return `${palabras[0]} ${palabras[2]}`; // Primera palabra y tercera
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

  function verTurnos(nombre) {
    const hoy = new Date().toISOString().split("T")[0];

    const tecnico = asignaciones.filter(t =>
      t.nombre === nombre &&
      t.fechas.some(fecha => fecha >= hoy) // Solo fechas de hoy en adelante
    );

    if (tecnico.length === 0) return null;

    return (
      <div style={styles.turnosContainer}>
        {tecnico.map((t, i) => {
          // Filtrar solo las fechas de hoy en adelante
          const fechasFuturas = t.fechas.filter(fecha => fecha >= hoy);

          if (fechasFuturas.length === 0) return null;

          return (
            <div key={i} style={styles.turnoCard}>
              <div style={styles.plantaBadge}>
                {t.planta}
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
        }).filter(Boolean)}
      </div>
    );
  }

  // USAR LA FUNCIÓN PARA EL HEADER
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
        <h1 style={styles.title}>Turnos de Limpieza de Filtros</h1>

        <div style={styles.turnoActivoCard}>
          <div style={styles.turnoLabel}>
            🟢 TURNO ACTIVO
          </div>
          <div style={styles.fechasContainer}>
            <span style={styles.fechaTexto}>
              {fechaInicioFormateada} 8AM - {fechaFinFormateada} 8AM
            </span>
          </div>
        </div>
      </div>

      {/* DEBUG INFO - TEMPORAL PARA VERIFICAR FUNCIONAMIENTO */}
      <div style={styles.debugContainer}>
        <h4 style={styles.debugTitle}>🐛 Info de Debug (temporal)</h4>
        <div style={styles.debugInfo}>
          <div style={styles.debugItem}>
            <strong>Hora actual:</strong> {new Date().toLocaleString('es-EC')}
          </div>
          <div style={styles.debugItem}>
            <strong>Fecha del turno activo:</strong> {obtenerFechaTurnoActivo()}
          </div>
          <div style={styles.debugItem}>
            <strong>Técnicos asignados encontrados:</strong> {turnosHoy.length}
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

            // Ordenar técnicos: primero los que tienen número de teléfono
            const tecnicosOrdenados = [...tecnicosHoy].sort((a, b) => {
              const tieneNumeroA = responsables[a] ? 1 : 0;
              const tieneNumeroB = responsables[b] ? 1 : 0;
              return tieneNumeroB - tieneNumeroA; // Orden descendente (primero los que tienen número)
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
                      // Buscar el número de teléfono del responsable
                      const telefonoResponsable = responsables[nombre] || null;
                      const enlaceWhatsApp = telefonoResponsable ? `https://wa.me/${telefonoResponsable}` : null;

                      return (
                        <div key={idx} style={styles.tecnicoChip}>
                          {formatearNombre(nombre)}
                          {enlaceWhatsApp && (
                            <a
                              href={enlaceWhatsApp}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.telefonoEnlace}
                            >
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
        <select
          onChange={e => setTecnicoSeleccionado(e.target.value)}
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
            <h3 style={styles.tecnicoNombre}>
              👤 {tecnicoSeleccionado}
            </h3>
            <div style={styles.proximosTurnos}>
              <span style={styles.proximosLabel}>Próximos turnos que tienes:</span>
            </div>
            {verTurnos(tecnicoSeleccionado)}
          </div>
        )}
      </div>

    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem', // Reducido
  },
  title: {
    fontSize: '1.5rem', // Reducido
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.8rem', // Reducido
    margin: '0 0 1rem 0',
  },
  turnoActivoCard: {
    backgroundColor: 'white',
    borderRadius: '12px', // Reducido
    padding: '0.75rem', // Reducido
    boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)', // Reducido
    border: '2px solid #10b981',
    maxWidth: '400px', // Reducido
    margin: '0 auto',
  },
  turnoLabel: {
    fontSize: '0.9rem', // Reducido
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: '0.5rem', // Reducido
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem', // Reducido
  },
  fechasContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  fechaTexto: {
    display: 'block',
    fontSize: '0.9rem', // Reducido
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
  plantaCard: {
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
  debugContainer: {
    marginTop: '1rem',
    marginBottom: '2rem',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
    padding: '1rem',
    border: '1px solid #ffeaa7',
  },
  debugTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#856404',
    marginBottom: '0.75rem',
    margin: 0,
  },
  debugInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  debugItem: {
    fontSize: '0.85rem',
    color: '#856404',
    backgroundColor: '#fff',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ffeaa7',
  },
};