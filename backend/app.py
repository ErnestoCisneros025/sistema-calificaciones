from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import check_password_hash
from db import get_connection
from config import SECRET_KEY
import jwt
import datetime
from functools import wraps
import csv
import io

def token_requerido(roles_permitidos):
    def decorador(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            token = request.headers.get("Authorization")
            if not token:
                return jsonify({"error": "Token requerido"}), 401
            try:
                datos = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                if datos["rol"] not in roles_permitidos:
                    return jsonify({"error": "Sin permiso"}), 403
                request.usuario = datos
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expirado"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Token inválido"}), 401
            return f(*args, **kwargs)
        return wrapper      # ← dentro de decorador
    return decorador        # ← dentro de token_requerido, fuera de decorador

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return {"mensaje": "Servidor funcionando"}

@app.route("/login", methods=["POST"])
def login():
    datos = request.get_json()
    nombre_usuario = datos.get("nombre_usuario")
    contrasena = datos.get("contrasena")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Usuarios WHERE Nombre_usuario = %s", (nombre_usuario,))
    usuario = cursor.fetchone()
    cursor.close()
    conn.close()

    if not usuario or not check_password_hash(usuario["Contrasena"], contrasena):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = jwt.encode({
        "id": usuario["Id"],
        "rol": usuario["Rol"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({"token": token, "rol": usuario["Rol"]})


# ─── ALUMNOS ───────────────────────────────────────────

@app.route("/alumnos", methods=["GET"])
@token_requerido(["admin", "docente"])
def get_alumnos():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Alumnos")
    alumnos = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(alumnos)

@app.route("/alumnos", methods=["POST"])
@token_requerido(["admin"])
def crear_alumno():
    datos = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Alumnos (Nombre, Apellido, Matricula, Anio_Ingreso)
        VALUES (%s, %s, %s, %s)
    """, (datos["nombre"], datos["apellido"], datos["matricula"], datos["anio_ingreso"]))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Alumno creado"}), 201

# ─── DOCENTES ──────────────────────────────────────────

@app.route("/docentes", methods=["GET"])
@token_requerido(["admin", "docente"])
def get_docentes():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT d.Id, d.Nombre, d.Apellido, u.Nombre_usuario
        FROM Docente d
        JOIN Usuarios u ON d.Usuario_id = u.Id
    """)
    docentes = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(docentes)

@app.route("/docentes", methods=["POST"])
@token_requerido(["admin"])
def crear_docente():
    datos = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    # Crea el usuario primero
    from werkzeug.security import generate_password_hash
    cursor.execute("""
        INSERT INTO Usuarios (Nombre_usuario, Contrasena, Rol)
        VALUES (%s, %s, 'docente')
    """, (datos["nombre_usuario"], generate_password_hash(datos["contrasena"])))
    usuario_id = cursor.lastrowid
    # Luego el docente
    cursor.execute("""
        INSERT INTO Docente (Nombre, Apellido, Usuario_id)
        VALUES (%s, %s, %s)
    """, (datos["nombre"], datos["apellido"], usuario_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Docente creado"}), 201

# ─── MATERIAS ──────────────────────────────────────────

@app.route("/materias", methods=["GET"])
@token_requerido(["admin", "docente"])
def get_materias():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.Id, m.Nombre, m.Periodo, d.Nombre AS docente_nombre, d.Apellido AS docente_apellido
        FROM Materias m
        JOIN Docente d ON m.Id_docente = d.Id
    """)
    materias = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(materias)

@app.route("/materias", methods=["POST"])
@token_requerido(["admin"])
def crear_materia():
    datos = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Materias (Nombre, Periodo, Id_docente)
        VALUES (%s, %s, %s)
    """, (datos["nombre"], datos["periodo"], datos["id_docente"]))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Materia creada"}), 201


@app.route("/subir-calificaciones", methods=["POST"])
@token_requerido(["docente"])
def subir_calificaciones():
    if "archivo" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    archivo = request.files["archivo"]
    raw = archivo.read()
    try:
        contenido = raw.decode("utf-8")
    except UnicodeDecodeError:
        contenido = raw.decode("latin-1")
    lector = csv.DictReader(io.StringIO(contenido))

    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    errores = []
    insertados = 0

    for fila in lector:
        nombre     = fila.get("Nombre", "").strip()
        apellido   = fila.get("Apellido", "").strip()
        materia    = fila.get("Materia", "").strip()
        periodo    = fila.get("Periodo", "").strip()
        docente_nombre   = fila.get("Docente_nombre", "").strip()
        docente_apellido = fila.get("Docente_apellido", "").strip()
        calificacion = fila.get("Calificacion", "").strip()

        # Buscar alumno por nombre y apellido
        cursor.execute("""
            SELECT Id FROM Alumnos
            WHERE Nombre = %s AND Apellido = %s
        """, (nombre, apellido))
        alumno = cursor.fetchone()
        if not alumno:
            errores.append(f"Alumno no encontrado: {nombre} {apellido}")
            continue

        # Buscar docente por nombre y apellido
        cursor.execute("""
            SELECT Id FROM Docente WHERE Nombre = %s AND Apellido = %s
        """, (docente_nombre, docente_apellido))
        doc = cursor.fetchone()
        if not doc:
            errores.append(f"Docente no encontrado: {docente_nombre, docente_apellido}")
            continue

        # Buscar materia por nombre, periodo y docente
        cursor.execute("""
            SELECT Id FROM Materias
            WHERE Nombre = %s AND Periodo = %s AND Id_docente = %s
        """, (materia, periodo, doc["Id"]))
        mat = cursor.fetchone()
        if not mat:
            errores.append(f"Materia no encontrada: {materia} ({periodo})")
            continue

        # Validar calificación
        try:
            calificacion = float(calificacion)
            if not (0 <= calificacion <= 10):
                raise ValueError()
        except ValueError:
            errores.append(f"Calificación inválida para {nombre} {apellido}: {calificacion}")
            continue

        # Insertar o actualizar
        cursor.execute("""
            INSERT INTO Calificaciones (Id_Alumno, Id_Materia, Calificacion)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE Calificacion = VALUES(Calificacion)
        """, (alumno["Id"], mat["Id"], calificacion))
        insertados += 1

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "insertados": insertados,
        "errores": errores
    })
    


# ─── DASHBOARD ─────────────────────────────────────────

@app.route("/dashboard/resumen", methods=["GET"])
@token_requerido(["admin", "docente"])
def resumen():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total FROM Alumnos")
    total_alumnos = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) AS total FROM Materias")
    total_materias = cursor.fetchone()["total"]

    cursor.execute("SELECT ROUND(AVG(Calificacion), 2) AS promedio FROM Calificaciones")
    promedio = cursor.fetchone()["promedio"]

    cursor.execute("SELECT COUNT(*) AS total FROM Calificaciones WHERE Calificacion <= 6")
    reprobados = cursor.fetchone()["total"]

    cursor.close()
    conn.close()

    return jsonify({
        "total_alumnos": total_alumnos,
        "total_materias": total_materias,
        "promedio_general": promedio,
        "reprobados": reprobados
    })

@app.route("/dashboard/promedio-por-materia", methods=["GET"])
@token_requerido(["admin", "docente"])
def promedio_por_materia():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.Nombre AS materia, ROUND(AVG(c.Calificacion), 2) AS promedio
        FROM Calificaciones c
        JOIN Materias m ON c.Id_Materia = m.Id
        GROUP BY m.Id, m.Nombre
    """)
    datos = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(datos)

@app.route("/dashboard/distribucion", methods=["GET"])
@token_requerido(["admin", "docente"])
def distribucion():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            SUM(CASE WHEN Calificacion <=6 THEN 1 ELSE 0 END) AS reprobados,
            SUM(CASE WHEN Calificacion = 7 AND Calificacion < 7 THEN 1 ELSE 0 END) AS seis_siete,
            SUM(CASE WHEN Calificacion >= 7 AND Calificacion < 9 THEN 1 ELSE 0 END) AS siete_nueve,
            SUM(CASE WHEN Calificacion >= 9 THEN 1 ELSE 0 END) AS nueve_diez
        FROM Calificaciones
    """)
    datos = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(datos)


#----Borrar registros-------------------------------------------------------------------
@app.route("/alumnos/<int:id>", methods=["DELETE"])
@token_requerido(["admin"])
def eliminar_alumno(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) AS total FROM Calificaciones WHERE Id_Alumno = %s", (id,))
    if cursor.fetchone()["total"] > 0:
        cursor.close()
        conn.close()
        return jsonify({"error": "No se puede eliminar, el alumno tiene calificaciones registradas"}), 400
    cursor.execute("DELETE FROM Alumnos WHERE Id = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Alumno eliminado"})

@app.route("/materias/<int:id>", methods=["DELETE"])
@token_requerido(["admin"])
def eliminar_materia(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) AS total FROM Calificaciones WHERE Id_Materia = %s", (id,))
    if cursor.fetchone()["total"] > 0:
        cursor.close()
        conn.close()
        return jsonify({"error": "No se puede eliminar, la materia tiene calificaciones registradas"}), 400
    cursor.execute("DELETE FROM Materias WHERE Id = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Materia eliminada"})

@app.route("/docentes/<int:id>", methods=["DELETE"])
@token_requerido(["admin"])
def eliminar_docente(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) AS total FROM Materias WHERE Id_docente = %s", (id,))
    if cursor.fetchone()["total"] > 0:
        cursor.close()
        conn.close()
        return jsonify({"error": "No se puede eliminar, el docente tiene materias registradas"}), 400
    cursor.execute("SELECT Usuario_id FROM Docente WHERE Id = %s", (id,))
    doc = cursor.fetchone()
    cursor.execute("DELETE FROM Docente WHERE Id = %s", (id,))
    if doc:
        cursor.execute("DELETE FROM Usuarios WHERE Id = %s", (doc["Usuario_id"],))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Docente eliminado"})

if __name__ == "__main__":
    app.run(debug=True)

