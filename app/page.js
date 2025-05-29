"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [turnosHoy, setTurnosHoy] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState("");

  useEffect(() => {
    async function cargarDatos() {
      const res = await fetch("/data/turnos.json");
      const data = await res.json();

      const hoy = new Date().toISOString().split("T")[0];

      const asignadosHoy = data.asignaciones.filter(t =>
        t.fechas.includes(hoy)
      );
      setTurnosHoy(asignadosHoy);

      const listaTecnicos = Array.from(
        new Set(data.asignaciones.map(t => t.nombre))
      );
      setTecnicos(listaTecnicos);

      setAsignaciones(data.asignaciones);
    }

    cargarDatos();
  }, []);

  function verTurnos(nombre) {
    const tecnico = asignaciones.filter(t => t.nombre === nombre);
    if (tecnico.length === 0) return null;

    return (
      <div style={styles.turnosContainer}>
        {tecnico.map((t, i) => (
          <div key={i} style={styles.turnoCard}>
            <div style={styles.plantaBadge}>
              {t.planta}
            </div>
            <div style={styles.fechas}>
              {t.fechas.map((fecha, idx) => (
                <span key={idx} style={styles.fechaTag}>
                  {new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short'
                  })}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🔧 Turnos de Limpieza</h1>
        <p style={styles.subtitle}>Complejo Hidroeléctrico Toachi Pilatón</p>
        <div style={styles.dateCard}>
          <span style={styles.dateLabel}>HOY</span>
          <span style={styles.dateText}>{fechaHoy}</span>
        </div>
      </div>

      {/* Turnos de hoy */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📅 Asignaciones de Hoy</h2>
        <div style={styles.plantasGrid}>
          {["CMA", "CMS"].map(planta => {
            const tecnicosHoy = turnosHoy
              .filter(t => t.planta === planta)
              .map(t => t.nombre);
            
            return (
              <div key={planta} style={styles.plantaCard}>
                <div style={styles.plantaHeader}>
                  <span style={styles.plantaName}>{planta}</span>
                  <span style={styles.contadorTecnicos}>
                    {tecnicosHoy.length} técnico{tecnicosHoy.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={styles.tecnicosList}>
                  {tecnicosHoy.length > 0 ? (
                    tecnicosHoy.map((nombre, idx) => (
                      <div key={idx} style={styles.tecnicoChip}>
                        {nombre.split(' ').slice(0, 2).join(' ')}
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
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: '0 0 1rem 0',
  },
  dateCard: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    display: 'inline-block',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  dateLabel: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    opacity: 0.9,
    display: 'block',
  },
  dateText: {
    fontSize: '0.9rem',
    fontWeight: '500',
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
    marginBottom: '1rem',
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
};