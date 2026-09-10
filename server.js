const express = require('express');
const app = express();
const port = 3000;

// 1. Conexión directa y obligatoria al puerto 5984 de CouchDB
const conectorCouch = require('nano')('http://127.0.0.1:5984');
const db = conectorCouch.use('torneo_futbol');
db.auth('sebastian.quinteroet32@gmail.com', 'Sebasql14'); // ¡Tus credenciales reales con la Q!

app.use(express.json());
  
// 2. RUTA WEB PARA GENERAR LAS JORNADAS AUTOMÁTICAMENTE
app.get('/generar-fixture', async (req, res) => {
    try {
        // A. Traemos de CouchDB todos tus 16 equipos cargados en Fauxton
        const respuesta = await db.find({
            selector: { tipo: "equipo" },
            limit: 50
        });

        const listaEquipos = respuesta.docs;

        // Validación de seguridad por si acaso
        if (listaEquipos.length < 16) {
            return res.status(400).send(`Tenés ${listaEquipos.length} equipos en la BD. Necesitás cargar los 16 equipos en Fauxton antes de generar el fixture.`);
        }

        // B. Algoritmo Round-Robin (Todos contra todos)
        const totalEquipos = listaEquipos.length;
        const totalJornadas = totalEquipos - 1; // 15 jornadas
        const partidosPorJornada = totalEquipos / 2; // 8 partidos por fin de semana
        
        let jornadasJson = [];
        const sucursales = ["Belgrano", "Caballito"];
        const horarios = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
        
        // Clonamos la lista de equipos para rotarla matemáticamente
        let equipos = [...listaEquipos];

        for (let j = 0; j < totalJornadas; j++) {
            // Calculamos la fecha del calendario para cada fin de semana del año 2026
            let fechaDisputa = new Date(2026, 8, 12); // Arranca el sábado 12 de septiembre de 2026
            fechaDisputa.setDate(fechaDisputa.getDate() + (j * 7)); // Suma una semana por jornada
            let fechaFormateada = fechaDisputa.toISOString().split('T')[0];

            let jornada = {
                _id: `jornada_${String(j + 1).padStart(2, '0')}`,
                tipo: "calendario_jornada",
                numero_jornada: j + 1,
                fecha_disputa: fechaFormateada,
                partidos: []
            };

            for (let p = 0; p < partidosPorJornada; p++) {
                let local = equipos[p];
                let visitante = equipos[totalEquipos - 1 - p];

                jornada.partidos.push({
                    partido_id: `j${j+1}_p${p+1}`,
                    horario: horarios[p],                 // 14:00, 15:00, etc.
                    sucursal: sucursales[p % 2],          // Va alternando Belgrano, Caballito, Belgrano...
                    estado: "pendiente",
                    local: { id_equipo: local._id, nombre: local.nombre, goles: 0 },
                    visitante: { id_equipo: visitante._id, nombre: visitante.nombre, goles: 0 },
                    eventos: []
                });
            }
            
            jornadasJson.push(jornada);
            // La clave matemática: el primer equipo queda fijo, los demás rotan en círculo
            equipos.splice(1, 0, equipos.pop()); 
        }

        // C. GUARDADO MASIVO EN COUCHDB
        // Enviamos las 15 jornadas juntas de un solo golpe automático
        await db.bulk({ docs: jornadasJson });

        res.send(`¡Éxito absoluto! Se leyeron tus 16 equipos y se generaron automáticamente las 15 jornadas del torneo con horarios y sucursales distribuidas.`);

    } catch (error) {
        console.error(error);
        // Ahora nos va a decir la causa real en el navegador
        res.status(500).send("El error real es: " + error.message);
    }
});

// 3. Encendemos el servidor en el puerto 3000
app.listen(port, () => {
    console.log(`Servidor corriendo con éxito en http://localhost:${port}`);
});
