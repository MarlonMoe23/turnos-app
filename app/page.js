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

      // Técnicos asignados para hoy
      const asignadosHoy = data.asignaciones.filter(t =>
        t.fechas.includes(hoy)
      );
      setTurnosHoy(asignadosHoy);

      // Lista única de técnicos
      const listaTecnicos = Array.from(
        new Set(data.asignaciones.map(t => t.nombre))
      );
      setTecnicos(listaTecnicos);

      // Guardar todas las asignaciones
      setAsignaciones(data.asignaciones);
    }

    cargarDatos();
  }, []);

  function verTurnos(nombre) {
    const tecnico = asignaciones.filter(t => t.nombre === nombre);
    if (tecnico.length === 0) return null;

    return (
      <ul>
        {tecnico.map((t, i) => (
          <li key={i}>
            {t.planta}: {t.fechas.join(", ")}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🔧 Turno de limpieza de filtros - Hoy</h1>
      <ul>
        {["CMA", "CMS"].map(planta => (
          <li key={planta}>
            <strong>{planta}:</strong>{" "}
            {
              turnosHoy
                .filter(t => t.planta === planta)
                .map(t => t.nombre)
                .join(", ") || "Sin asignación"
            }
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: "2rem" }}>🔍 Ver asignación por técnico</h2>
      <select
        onChange={e => setTecnicoSeleccionado(e.target.value)}
        style={{ padding: "8px", fontSize: "16px", width: "100%" }}
      >
        <option value="">Selecciona un técnico</option>
        {tecnicos.map((nombre, idx) => (
          <option key={idx} value={nombre}>
            {nombre}
          </option>
        ))}
      </select>

      <div id="detalle-tecnico" style={{ marginTop: "1rem" }}>
        {tecnicoSeleccionado && (
          <>
            <h3>Turnos de {tecnicoSeleccionado}:</h3>
            {verTurnos(tecnicoSeleccionado)}
          </>
        )}
      </div>
    </main>
  );
}
