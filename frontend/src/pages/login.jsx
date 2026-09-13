import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
    const [nombre_usuario, setUsuario] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const respuesta = await api.post("/login", { nombre_usuario, contrasena });
            localStorage.setItem("token", respuesta.data.token);
            localStorage.setItem("rol", respuesta.data.rol);
            navigate("/dashboard");
        } catch (err) {
            setError("Usuario o contraseña incorrectos");
        }
    };

    return (
        <div style={estilos.contenedor}>
            <div style={estilos.caja}>
                <h2 style={estilos.titulo}>Sistema de Calificaciones</h2>

                {error && <p style={estilos.error}>{error}</p>}

                <input
                    style={estilos.input}
                    type="text"
                    placeholder="Usuario"
                    value={nombre_usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                />
                <input
                    style={estilos.input}
                    type="password"
                    placeholder="Contraseña"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                />
                <button style={estilos.boton} onClick={handleLogin}>
                    Entrar
                </button>
            </div>
        </div>
    );
}

const estilos = {
    contenedor: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f0f2f5",
    },
    caja: {
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        width: "300px",
    },
    titulo: {
        textAlign: "center",
        marginBottom: "10px",
        color: "#333",
    },
    input: {
        padding: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        fontSize: "14px",
    },
    boton: {
        padding: "10px",
        backgroundColor: "#4f46e5",
        color: "white",
        border: "none",
        borderRadius: "5px",
        fontSize: "14px",
        cursor: "pointer",
    },
    error: {
        color: "red",
        textAlign: "center",
        fontSize: "13px",
    },
};

export default Login;