import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Admin() {
    const rol = localStorage.getItem("rol");
    const [seccion, setSeccion] = useState(rol === "admin" ? "alumnos" : "csv");
    const tabsDisponibles = rol === "admin" ? ["alumnos", "materias", "docentes"] : ["csv"];
    const navigate = useNavigate();

    const cerrarSesion = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div style={estilos.pagina}>
            <div style={estilos.header}>
                <h2 style={{ margin: 0 }}>Panel Administrador</h2>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button style={estilos.botonNav} onClick={() => navigate("/dashboard")}>Dashboard</button>
                    <button style={estilos.botonSalir} onClick={cerrarSesion}>Cerrar sesión</button>
                </div>
            </div>

            {/* Tabs */}
            <div style={estilos.tabs}>
                {tabsDisponibles.map(tab => (
                    <button
                        key={tab}
                        style={{ ...estilos.tab, ...(seccion === tab ? estilos.tabActivo : {}) }}
                        onClick={() => setSeccion(tab)}
                    >
                        {tab === "csv" ? "Subir CSV" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            <div style={estilos.contenido}>
                {seccion === "csv" && <SubirCSV />}
                {seccion === "alumnos" && <Alumnos />}
                {seccion === "materias" && <Materias />}
                {seccion === "docentes" && <Docentes />}
            </div>
        </div>
    );
}

// ─── SUBIR CSV ────────────────────────────────────────

function SubirCSV() {
    const [archivo, setArchivo] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);

    const handleSubir = async () => {
        if (!archivo) return;
        setCargando(true);
        const formData = new FormData();
        formData.append("archivo", archivo);
        try {
            const r = await api.post("/subir-calificaciones", formData);
            setResultado(r.data);
        } catch {
            setResultado({ error: "Error al subir el archivo" });
        }
        setCargando(false);
    }; 

    return (
        <div style={estilos.seccion}>
            <h3>Subir calificaciones desde CSV</h3>
            <p style={{ color: "#666" }}>El archivo debe tener las columnas: <strong>Nombre,  Apellido, Materia, Periodo, Docente_nombre, Docente_apellido, Calificacion</strong></p>
            <input type="file" accept=".csv" onChange={e => setArchivo(e.target.files[0])} />
            <button style={estilos.botonPrimario} onClick={handleSubir} disabled={cargando}>
                {cargando ? "Subiendo..." : "Subir CSV"}
            </button>
            {resultado && (
                <div style={{ marginTop: "15px" }}>
                    {resultado.error
                        ? <p style={{ color: "red" }}>{resultado.error}</p>
                        : <>
                            <p style={{ color: "green" }}>✓ {resultado.insertados} calificaciones registradas</p>
                            {resultado.errores.length > 0 && (
                                <ul style={{ color: "orange" }}>
                                    {resultado.errores.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            )}
                        </>
                    }
                </div>
            )}
        </div>
    );
}

// ─── ALUMNOS ──────────────────────────────────────────

function Alumnos() {
    const [alumnos, setAlumnos] = useState([]);
    const [form, setForm] = useState({ nombre: "", apellido: "", matricula: "", anio_ingreso: "" });
    const [editando, setEditando] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const cargar = () => api.get("/alumnos").then(r => setAlumnos(r.data));
    useEffect(() => { cargar(); }, []);

    const handleGuardar = async () => {
        try {
            if (editando) {
                await api.put(`/alumnos/${editando}`, form);
                setMensaje("Alumno actualizado correctamente");
                setEditando(null);
            } else {
                await api.post("/alumnos", form);
                setMensaje("Alumno agregado correctamente");
            }
            setForm({ nombre: "", apellido: "", matricula: "", anio_ingreso: "" });
            setError("");
            cargar();
        } catch {
            setError("Error al guardar el alumno");
        }
    };

    const handleEditar = (a) => {
        setEditando(a.Id);
        setForm({ nombre: a.Nombre, apellido: a.Apellido, matricula: a.Matricula, anio_ingreso: a.Anio_Ingreso });
        setMensaje("");
        setError("");
    };

    const handleEliminar = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este alumno?")) return;
        try {
            await api.delete(`/alumnos/${id}`);
            setMensaje("Alumno eliminado correctamente");
            setError("");
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || "Error al eliminar el alumno");
        }
    };

    const handleCancelar = () => {
        setEditando(null);
        setForm({ nombre: "", apellido: "", matricula: "", anio_ingreso: "" });
        setMensaje("");
        setError("");
    };

    return (
        <div style={estilos.seccion}>
            <h3>{editando ? "Editar Alumno" : "Agregar Alumno"}</h3>
            <div style={estilos.formulario}>
                {[["nombre", "Nombre"], ["apellido", "Apellido"], ["matricula", "Matrícula"], ["anio_ingreso", "Año de Ingreso"]].map(([key, label]) => (
                    <input
                        key={key}
                        style={estilos.input}
                        placeholder={label}
                        value={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                ))}
                <button style={estilos.botonPrimario} onClick={handleGuardar}>
                    {editando ? "Actualizar" : "Guardar"}
                </button>
                {editando && (
                    <button style={estilos.botonCancelar} onClick={handleCancelar}>
                        Cancelar
                    </button>
                )}
            </div>
            {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            <h3 style={{ marginTop: "25px" }}>Lista de Alumnos</h3>
            <table style={estilos.tabla}>
                <thead>
                    <tr>{["Matrícula", "Nombre", "Apellido", "Año Ingreso", "Acciones"].map(h => <th key={h} style={estilos.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {alumnos.map(a => (
                        <tr key={a.Id}>
                            <td style={estilos.td}>{a.Matricula}</td>
                            <td style={estilos.td}>{a.Nombre}</td>
                            <td style={estilos.td}>{a.Apellido}</td>
                            <td style={estilos.td}>{a.Anio_Ingreso}</td>
                            <td style={estilos.td}>
                                <button style={estilos.botonEliminar} onClick={() => handleEliminar(a.Id)}>Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
   

// ─── MATERIAS ─────────────────────────────────────────

function Materias() {
    const [materias, setMaterias] = useState([]);
    const [docentes, setDocentes] = useState([]);
    const [form, setForm] = useState({ nombre: "", periodo: "", id_docente: "" });
    const [editando, setEditando] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const cargar = () => {
        api.get("/materias").then(r => setMaterias(r.data));
        api.get("/docentes").then(r => setDocentes(r.data));
    };
    useEffect(() => { cargar(); }, []);

    const handleGuardar = async () => {
        try {
            if (editando) {
                await api.put(`/materias/${editando}`, form);
                setMensaje("Materia actualizada correctamente");
                setEditando(null);
            } else {
                await api.post("/materias", form);
                setMensaje("Materia agregada correctamente");
            }
            setForm({ nombre: "", periodo: "", id_docente: "" });
            setError("");
            cargar();
        } catch {
            setError("Error al guardar la materia");
        }
    };

    const handleEditar = (m) => {
        setEditando(m.Id);
        setForm({ nombre: m.Nombre, periodo: m.Periodo, id_docente: m.Id_docente });
        setMensaje("");
        setError("");
    };

    const handleEliminar = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta materia?")) return;
        try {
            await api.delete(`/materias/${id}`);
            setMensaje("Materia eliminada correctamente");
            setError("");
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || "Error al eliminar la materia");
        }
    };

    const handleCancelar = () => {
        setEditando(null);
        setForm({ nombre: "", periodo: "", id_docente: "" });
        setMensaje("");
        setError("");
    };

    return (
        <div style={estilos.seccion}>
            <h3>{editando ? "Editar Materia" : "Agregar Materia"}</h3>
            <div style={estilos.formulario}>
                <input style={estilos.input} placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                <input style={estilos.input} placeholder="Periodo (ej. Ene2026 - Jun2026)" value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} />
                <select style={estilos.input} value={form.id_docente} onChange={e => setForm({ ...form, id_docente: e.target.value })}>
                    <option value="">Selecciona docente</option>
                    {docentes.map(d => <option key={d.Id} value={d.Id}>{d.Nombre} {d.Apellido}</option>)}
                </select>
                <button style={estilos.botonPrimario} onClick={handleGuardar}>
                    {editando ? "Actualizar" : "Guardar"}
                </button>
                {editando && (
                    <button style={estilos.botonCancelar} onClick={handleCancelar}>
                        Cancelar
                    </button>
                )}
            </div>
            {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            <h3 style={{ marginTop: "25px" }}>Lista de Materias</h3>
            <table style={estilos.tabla}>
                <thead>
                    <tr>{["Nombre", "Periodo", "Docente", "Acciones"].map(h => <th key={h} style={estilos.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {materias.map(m => (
                        <tr key={m.Id}>
                            <td style={estilos.td}>{m.Nombre}</td>
                            <td style={estilos.td}>{m.Periodo}</td>
                            <td style={estilos.td}>{m.docente_nombre} {m.docente_apellido}</td>
                            <td style={estilos.td}>
                                <button style={estilos.botonEliminar} onClick={() => handleEliminar(m.Id)}>Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── DOCENTES ─────────────────────────────────────────

function Docentes() {
    const [docentes, setDocentes] = useState([]);
    const [form, setForm] = useState({ nombre: "", apellido: "", nombre_usuario: "", contrasena: "" });
    const [editando, setEditando] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const cargar = () => api.get("/docentes").then(r => setDocentes(r.data));
    useEffect(() => { cargar(); }, []);

    const handleGuardar = async () => {
        try {
            if (editando) {
                await api.put(`/docentes/${editando}`, form);
                setMensaje("Docente actualizado correctamente");
                setEditando(null);
            } else {
                await api.post("/docentes", form);
                setMensaje("Docente agregado correctamente");
            }
            setForm({ nombre: "", apellido: "", nombre_usuario: "", contrasena: "" });
            setError("");
            cargar();
        } catch {
            setError("Error al guardar el docente");
        }
    };

    const handleEditar = (d) => {
        setEditando(d.Id);
        setForm({ nombre: d.Nombre, apellido: d.Apellido, nombre_usuario: d.Nombre_usuario, contrasena: "" });
        setMensaje("");
        setError("");
    };

    const handleEliminar = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este docente?")) return;
        try {
            await api.delete(`/docentes/${id}`);
            setMensaje("Docente eliminado correctamente");
            setError("");
            cargar();
        } catch (err) {
            setError(err.response?.data?.error || "Error al eliminar el docente");
        }
    };

    const handleCancelar = () => {
        setEditando(null);
        setForm({ nombre: "", apellido: "", nombre_usuario: "", contrasena: "" });
        setMensaje("");
        setError("");
    };

    return (
        <div style={estilos.seccion}>
            <h3>{editando ? "Editar Docente" : "Agregar Docente"}</h3>
            <div style={estilos.formulario}>
                {[["nombre", "Nombre"], ["apellido", "Apellido"], ["nombre_usuario", "Usuario"], ["contrasena", "Contraseña"]].map(([key, label]) => (
                    <input
                        key={key}
                        style={estilos.input}
                        placeholder={label}
                        type={key === "contrasena" ? "password" : "text"}
                        value={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                ))}
                <button style={estilos.botonPrimario} onClick={handleGuardar}>
                    {editando ? "Actualizar" : "Guardar"}
                </button>
                {editando && (
                    <button style={estilos.botonCancelar} onClick={handleCancelar}>
                        Cancelar
                    </button>
                )}
            </div>
            {mensaje && <p style={{ color: "green" }}>{mensaje}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            <h3 style={{ marginTop: "25px" }}>Lista de Docentes</h3>
            <table style={estilos.tabla}>
                <thead>
                    <tr>{["Nombre", "Apellido", "Usuario", "Acciones"].map(h => <th key={h} style={estilos.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {docentes.map(d => (
                        <tr key={d.Id}>
                            <td style={estilos.td}>{d.Nombre}</td>
                            <td style={estilos.td}>{d.Apellido}</td>
                            <td style={estilos.td}>{d.Nombre_usuario}</td>
                            <td style={estilos.td}>
                                <button style={estilos.botonEliminar} onClick={() => handleEliminar(d.Id)}>Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── ESTILOS ──────────────────────────────────────────

const estilos = {
    pagina: { padding: "30px", backgroundColor: "#f0f2f5", minHeight: "100vh" },
    header: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "white", padding: "15px 25px", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "25px"
    },
    botonNav: {
        padding: "8px 16px", backgroundColor: "#4f46e5", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
    botonSalir: {
        padding: "8px 16px", backgroundColor: "#dc2626", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
    tabs: { display: "flex", gap: "10px", marginBottom: "20px" },
    tab: {
        padding: "10px 20px", border: "none", borderRadius: "5px",
        cursor: "pointer", backgroundColor: "white", color: "#666",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    },
    tabActivo: { backgroundColor: "#4f46e5", color: "white" },
    contenido: {
        backgroundColor: "white", borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "25px"
    },
    seccion: { display: "flex", flexDirection: "column", gap: "10px" },
    formulario: { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" },
    input: {
        padding: "8px 12px", borderRadius: "5px",
        border: "1px solid #ccc", fontSize: "14px"
    },
    botonPrimario: {
        padding: "8px 20px", backgroundColor: "#4f46e5", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
    tabla: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
    th: { backgroundColor: "#f8f9fa", padding: "10px", textAlign: "left", borderBottom: "2px solid #dee2e6" },
    td: { padding: "10px", borderBottom: "1px solid #dee2e6" },

    botonEliminar: {
        padding: "5px 12px", backgroundColor: "#dc2626", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
    botonCancelar: {
        padding: "8px 20px", backgroundColor: "#6b7280", color: "white",
        border: "none", borderRadius: "5px", cursor: "pointer"
    },
};

export default Admin;