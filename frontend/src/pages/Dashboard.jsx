import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS, CategoryScale, LinearScale,
    BarElement, ArcElement, Title, Tooltip, Legend
} from "chart.js";
import api from "../api/axios";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Dashboard() {
    const [resumen, setResumen] = useState(null);
    const [promedios, setPromedios] = useState([]);
    const [distribucion, setDistribucion] = useState(null);
    const navigate = useNavigate();
    const rol = localStorage.getItem("rol");

    useEffect(() => {
        api.get("/dashboard/resumen").then(r => setResumen(r.data));
        api.get("/dashboard/promedio-por-materia").then(r => setPromedios(r.data));
        api.get("/dashboard/distribucion").then(r => setDistribucion(r.data));
    }, []);

    const cerrarSesion = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div style={estilos.pagina}>

            {/* Encabezado */}
            <div style={estilos.header}>
                <h2 style={{ margin: 0 }}>Dashboard de Calificaciones</h2>
                <div style={{ display: "flex", gap: "10px" }}>
                    {(rol === "admin" || rol === "docente") && (
                        <button style={estilos.botonAdmin} onClick={() => navigate("/admin")}>
                            Panel 
                        </button>
                    )}
                    <button style={estilos.botonSalir} onClick={cerrarSesion}>
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {/* Tarjetas de resumen */}
            {resumen && (
                <div style={estilos.tarjetas}>
                    <Tarjeta titulo="Total Alumnos" valor={resumen.total_alumnos} color="#4f46e5" />
                    <Tarjeta titulo="Total Materias" valor={resumen.total_materias} color="#0891b2" />
                    <Tarjeta titulo="Promedio General" valor={resumen.promedio_general ?? "Sin datos"} color="#059669" />
                    <Tarjeta titulo="Reprobados" valor={resumen.reprobados} color="#dc2626" />
                </div>
            )}

            {/* Gráficas */}
            <div style={estilos.graficas}>

                {/* Promedio por materia */}
                <div style={estilos.grafica}>
                    <h3>Promedio por Materia</h3>
                    {promedios.length > 0 ? (
                        <Bar
                            data={{
                                labels: promedios.map(p => p.materia),
                                datasets: [{
                                    label: "Promedio",
                                    data: promedios.map(p => p.promedio),
                                    backgroundColor: "#4f46e5",
                                    borderRadius: 5,
                                }]
                            }}
                            options={{
                                scales: { y: { min: 0, max: 10 } },
                                plugins: { legend: { display: false } }
                            }}
                        />
                    ) : <p style={estilos.sinDatos}>Sin calificaciones registradas</p>}
                </div>

                {/* Distribución */}
                <div style={estilos.grafica}>
                    <h3>Distribución de Calificaciones</h3>
                    {distribucion && Object.values(distribucion).some(v => v > 0) ? (
                        <Doughnut
                            data={{
                                labels: ["Reprobados (<=6)", "7", "8-9", "10"],
                                datasets: [{
                                    data: [
                                        distribucion.reprobados,
                                        distribucion.seis_siete,
                                        distribucion.siete_nueve,
                                        distribucion.nueve_diez,
                                    ],
                                    backgroundColor: ["#dc2626", "#f59e0b", "#4f46e5", "#059669"],
                                }]
                            }}
                        />
                    ) : <p style={estilos.sinDatos}>Sin calificaciones registradas</p>}
                </div>

            </div>
        </div>
    );
}

function Tarjeta({ titulo, valor, color }) {
    return (
        <div style={{ ...estilos.tarjeta, borderTop: `4px solid ${color}` }}>
            <p style={estilos.tarjetaTitulo}>{titulo}</p>
            <p style={{ ...estilos.tarjetaValor, color }}>{valor}</p>
        </div>
    );
}

const estilos = {
    pagina: { padding: "30px", backgroundColor: "#f0f2f5", minHeight: "100vh" },
    header: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "white", padding: "15px 25px", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "25px"
    },
    botonAdmin: {
        padding: "8px 16px", backgroundColor: "#4f46e5", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
    botonSalir: {
        padding: "8px 16px", backgroundColor: "#dc2626", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
    tarjetas: { display: "flex", gap: "20px", marginBottom: "25px", flexWrap: "wrap" },
    tarjeta: {
        backgroundColor: "white", padding: "20px", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flex: "1", minWidth: "150px"
    },
    tarjetaTitulo: { margin: 0, color: "#666", fontSize: "13px" },
    tarjetaValor: { margin: "8px 0 0", fontSize: "28px", fontWeight: "bold" },
    graficas: { display: "flex", gap: "20px", flexWrap: "wrap" },
    grafica: {
        backgroundColor: "white", padding: "20px", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flex: "1", minWidth: "300px"
    },
    sinDatos: { color: "#999", textAlign: "center", marginTop: "40px" }
};

export default Dashboard;