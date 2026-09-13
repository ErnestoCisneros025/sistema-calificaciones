from werkzeug.security import generate_password_hash
from db import get_connection

conn = get_connection()
cursor = conn.cursor()

cursor.execute("""
    INSERT INTO Usuarios (Nombre_usuario, Contrasena, Rol)
    VALUES (%s, %s, %s)
""", ("admin", generate_password_hash("1234"), "admin"))

conn.commit()
cursor.close()
conn.close()

print("Usuario admin creado")