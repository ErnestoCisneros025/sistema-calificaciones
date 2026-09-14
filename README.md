# Sistema de Calificaciones

Sistema web para gestión y análisis de calificaciones escolares.

## Requisitos previos

- Python 3.x
- Node.js
- MySQL

## Instalación

### 1. Base de datos
- Abrir MySQL Workbench
- Ejecutar el archivo `base_de_datos.sql` para crear la base de datos y las tablas

### 2. Backend (Flask)
Abrir una terminal en la carpeta `backend/` y ejecutar:
```bash
pip install flask flask-cors mysql-connector-python PyJWT werkzeug
```
Editar el archivo `config.py` y cambiar la contraseña de MySQL:
```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "TU_CONTRASEÑA_AQUI",
    "database": "sistema_calificaciones"
}
```
Crear el usuario administrador:
```bash
python crear_admin.py
```
Iniciar el servidor:
```bash
python app.py
```

### 3. Frontend (React)
Abrir otra terminal en la carpeta `frontend/` y ejecutar:
```bash
npm install
npm run dev
```

### 4. Acceder al sistema
Abrir el navegador en `http://localhost:5173`

Usuario por defecto:
- **Usuario:** admin
- **Contraseña:** 1234

## Formato del CSV para subir calificaciones
```
Nombre,Apellido,Materia,Periodo,Docente_Nombre,Docente_Apellido,Calificacion
Juan,García,Matemáticas,Ene2026 - Jun2026,Carlos,López,8.5
```