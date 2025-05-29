"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");

  // Datos de los números de teléfono (¡reemplaza con los reales!)
  const numerosDeTelefono = {
    "CMA": "+593987654321",
    "CMS": "+593991234567"
  };

  useEffect(() => {
    async function cargarDatos() {
      const res = await fetch("/data/turnos.json");
      const data = await res.json();

      // Obtener fecha actual en Ecuador
      const ahora = new Date();
      const horaActual = ahora.getHours();
      
      // Si son menos de las 8am, mostrar turnos del día anterior
      // porque el turno va de 5pm a 8am del día siguiente
      let fechaTurno;
      if (horaActual < 8) {
        // Restar un día
        const ayer = new Date(ahora);
        ayer.setDate(ayer.getDate() - 1);
        fechaTurno = ayer.toISOString().split("T")[0];
      } else {
        fechaTurno = ahora.toISOString().split("T")[0];
      }

      const asignadosHoy = data.asignaciones.filter(t =>
        t.fechas.includes(fechaTurno)
      );
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

  // Calcular fechas del turno activo
  function obtenerFechasTurnoActivo() {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    
    let fechaInicio, fechaFin;
    
    if (horaActual < 8) {
      // Turno empezó ayer a las 5pm, termina hoy a las 8am
      const ayer = new Date(ahora);
      ayer.setDate(ayer.getDate() - 1);
      fechaInicio = ayer;
      fechaFin = new Date(ahora);
    } else {
      // Turno empieza hoy a las 5pm, termina mañana a las 8am
      fechaInicio = new Date(ahora);
      const manana = new Date(ahora);
      manana.setDate(manana.getDate() + 1);
      fechaFin = manana;
    }
    
    return { fechaInicio, fechaFin };
  }

  const { fechaInicio, fechaFin } = obtenerFechasTurnoActivo();
  
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
        <h1 style={styles.title}>🔧 Turnos de Limpieza</h1>
        <p style={styles.subtitle}>Complejo Hidroeléctrico Toachi Pilatón</p>
        
        <div style={styles.turnoActivoCard}>
          <div style={styles.turnoLabel}>
            🟢 TURNO ACTIVO
          </div>
          <div style={styles.fechasContainer}>
            <span style={styles.fechaTexto}>
              {fechaInicioFormateada} 5PM - {fechaFinFormateada} 8AM
            </span>
          </div>
        </div>
      </div>

      {/* Turnos de hoy */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📅 Técnicos Asignados</h2>
        <div style={styles.plantasGrid}>
          {["CMA", "CMS"].map(planta => {
            const tecnicosHoy = turnosHoy
              .filter(t => t.planta === planta)
              .map(t => t.nombre);
            
            // Obtener el número de teléfono del objeto
            const telefono = numerosDeTelefono[planta] || "Número no disponible";
            
            // Crear el enlace de WhatsApp
            const enlaceWhatsApp = `https://wa.me/${telefono}`;
            
            return (
              <div key={planta} style={styles.plantaCard}>
                <div style={styles.plantaHeader}>
                  <span style={styles.plantaName}>{planta}</span>
                  <a
                    href={enlaceWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.telefonoEnlace}
                  >
                    📞 {telefono}
                  </a>
                  <span style={styles.contadorTecnicos}>
                    {tecnicosHoy.length} técnico{tecnicosHoy.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={styles.tecnicosList}>
                  {tecnicosHoy.length > 0 ? (
                    tecnicosHoy.map((nombre, idx) => (
                      <div key={idx} style={styles.tecnicoChip}>
                        {formatearNombre(nombre)}
                      </div>
                    ))
                  ) : (
                    <div style={styles.sinAsignacion}>Sin asignación</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consulta por técnico */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔍 Consultar por Técnico</h2>
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
              <span style={styles.proximosLabel}>Próximos turnos:</span>
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
};