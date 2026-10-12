   const base = 'http://localhost:3000/api/auth'
   const datos = { nombre: 'Prueba Uno', correo: 'prueba@test.com', contrasena: 'Clave12345' }

   const llamar = async (ruta, cuerpo) => {
     const respuesta = await fetch(`${base}/${ruta}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(cuerpo),
     })
     const resultado = await respuesta.json()
     if (resultado.token) resultado.token = resultado.token.slice(0, 20) + '...'
     console.log(ruta, respuesta.status, resultado)
   }

   await llamar('register', datos)
   await llamar('login', { correo: datos.correo, contrasena: datos.contrasena })
   await llamar('login', { correo: datos.correo, contrasena: 'incorrecta' })