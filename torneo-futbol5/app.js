document.getElementById('form-equipo').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue al presionar el botón

    // 1. Agarramos los datos que escribió el usuario en el HTML
    const nombreEquipo = document.getElementById('nombre').value;
    const colorCamiseta = document.getElementById('camiseta').value;
    const divMensaje = document.getElementById('mensaje');

    // Convertimos el texto de la camiseta en un array (ej: "Rojo y blanco" -> ["Rojo", "blanco"])
    // Así mantenemos la flexibilidad NoSQL de múltiples colores que querías
    const coloresArray = colorCamiseta.split(' y ').map(c => c.trim());

    // 2. Creamos el objeto con la estructura exacta que le gusta a CouchDB
    const nuevoEquipo = {
        tipo: "equipo",
        nombre: nombreEquipo,
        colores_camiseta: coloresArray,
        puntos_totales: 0,
        goles_a_favor_equipo: 0,
        goles_en_contra_equipo: 0,
        jugadores: [] // Arranca vacío, listo para agregarle los 5 jugadores después
    };

    try {
        // 3. Le enviamos los datos a nuestro servidor de Node.js (puerto 3000)
        const respuesta = await fetch('http://localhost:3000/api/equipos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoEquipo)
        });

        if (respuesta.ok) {
            divMensaje.innerHTML = `<p class="exito">¡Equipo "${nombreEquipo}" guardado con éxito en CouchDB!</p>`;
            document.getElementById('form-equipo').reset(); // Limpia el formulario
        } else {
            divMensaje.innerHTML = `<p class="error">Hubo un problema al guardar el equipo.</p>`;
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        divMensaje.innerHTML = `<p class="error">No se pudo conectar con el servidor.</p>`;
    }
});
