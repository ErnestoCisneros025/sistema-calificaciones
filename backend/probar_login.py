import requests

respuesta = requests.post("http://localhost:5000/login", json={
    "nombre_usuario": "admin",
    "contrasena": "1234"
})

print(respuesta.json())