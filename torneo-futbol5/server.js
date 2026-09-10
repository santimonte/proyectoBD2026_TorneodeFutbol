const express = require('express');
const cors = require('cors'); // <-- ¡Librería agregada para dar permisos al HTML!
const app = express();
const port = 3000;

// 1. Conexión directa y obligatoria al puerto 5984 de CouchDB
const conectorCouch = require('nano')('http://127.0.0.1:5984');
const db = conectorCouch.use('torneo_futbol');
db.auth('sebastian.quinteroet32@gmail.com', 'Sebasql14'); // Credenciales validadas

app.use(cors()); // <-- Habilitamos los permisos CORS para tu index.html
app.use(express.json());

// RUTA WEB PARA GENERAR LAS JORNADAS AUTOMÁTICAMENTE
app.get('/generar-fixture', async (req, res) => {
    try {
        const respuesta = await db.find({
            selector: { tipo: "equipo" },
            limit: 50
        });

        const listaEquipos = respuesta.docs;

        if (listaEquipos.length < 16) {
            return res.status(400).send(`Tenés ${listaEquipos.length} equipos en la BD. Necesitás cargar los 16 equipos antes de generar el fixture.`);
        }

        const totalEquipos = listaEquipos.length;
        const totalJornadas = totalEquipos - 1;
        const partidosPorJornada = totalEquipos / 2;
        
        let jornadasJson = [];
        const sucursales = ["Belgrano", "Caballito"];
        const horarios = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
        
        let equipos = [...listaEquipos];

        for (let j = 0; j < totalJornadas; j++) {
            let fechaDisputa = new Date(2026, 8, 12);
            fechaDisputa.setDate(fechaDisputa.getDate() + (j * 7));
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
                    horario: horarios[p],
                    sucursal: sucursales[p % 2],
                    estado: "pendiente",
                    local: { id_equipo: local._id, nombre: local.nombre, goles: 0 },
                    visitante: { id_equipo: visitante._id, nombre: visitante.nombre, goles: 0 },
                    eventos: []
                });
            }
            
            jornadasJson.push(jornada);
            equipos.splice(1, 0, equipos.pop()); 
        }

        await db.bulk({ docs: jornadasJson });
        res.send(`¡Éxito absoluto! Se leyeron tus 16 equipos y se generaron automáticamente las 15 jornadas del torneo.`);

    } catch (error) {
        console.error(error);
        res.status(500).send("El error real es: " + error.message);
    }
});

// <-- NUEVA RUTA: RECIBE EL NUEVO EQUIPO DESDE EL FORMULARIO HTML Y LO GUARDA EN COUCHDB -->
app.post('/api/equipos', async (req, res) => {
    try {
        const nuevoEquipo = req.body;
        
        // Generamos un _id legible basado en el nombre (Ej: "Los Troncos" -> "equipo_los_troncos")
        nuevoEquipo._id = "equipo_" + nuevoEquipo.nombre.toLowerCase().trim().replace(/ /g, "_");

        // Insertamos el documento JSON completo en Apache CouchDB
        await db.insert(nuevoEquipo);
        res.status(201).send({ mensaje: "¡Equipo guardado con éxito!" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Error al guardar el equipo en CouchDB: " + error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo con éxito en http://localhost:${port}`);
});
