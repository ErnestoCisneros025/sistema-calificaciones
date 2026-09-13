import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

function RutaProtegida({ children, roles }) {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) return <Navigate to="/login" />;
    if (roles && !roles.includes(rol)) return <Navigate to="/dashboard" />;
    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                    <RutaProtegida roles={["admin", "docente"]}>
                        <Dashboard />
                    </RutaProtegida>
                } />
                <Route path="/admin" element={
                    <RutaProtegida roles={["admin", "docente"]}>
                        <Admin />
                    </RutaProtegida>
                } />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;