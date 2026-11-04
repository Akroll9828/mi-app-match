const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// BASE DE DATOS REAL EN MEMORIA (Inicia totalmente vacía, sin bots)
let usuariosRegistrados = [];
let registroLikes = {};

// 1. RUTA PARA REGISTRAR PERSONAS REALES
app.post('/api/register', (req, res) => {
    const { name, country, bio, photoUrl, lat, lon } = req.body;
    
    // Crear un ID único para la persona real
    const newId = "user_" + Date.now();
    const newUser = {
        _id: newId,
        name,
        country,
        bio,
        photoUrl: photoUrl || "https://unsplash.com", // Foto por defecto si no pone
        lat: parseFloat(lat) || -12.0464,
        lon: parseFloat(lon) || -77.0428
    };

    usuariosRegistrados.push(newUser);
    res.json({ success: true, userId: newId, message: "¡Registrado con éxito real!" });
});

// Fórmula matemática para calcular distancia real entre dos personas
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

// 2. RUTA PARA FILTRAR Y DESCUBRIR PERSONAS REALES POR DISTANCIA
app.post('/api/discover', (req, res) => {
    const { userId, maxDistanceKm } = req.body;
    
    // Buscar los datos del usuario actual para saber dónde está parado
    const currentUser = usuariosRegistrados.find(u => u._id === userId);
    if (!currentUser) return res.json([]);

    // Filtrar: Excluirse a sí mismo y medir la distancia con los demás usuarios reales
    let result = usuariosRegistrados
        .filter(user => user._id !== userId)
        .map(user => {
            const dist = calculateDistance(currentUser.lat, currentUser.lon, user.lat, user.lon);
            return { ...user, distance: dist };
        })
        .filter(user => user.distance <= maxDistanceKm);

    res.json(result);
});

// 3. RUTA DE ME GUSTAS REALES TOTALMENTE GRATIS
app.post('/api/like', (req, res) => {
    const { fromUserId, toUserId } = req.body;

    if (!registroLikes[fromUserId]) registroLikes[fromUserId] = [];
    registroLikes[fromUserId].push(toUserId);

    // Es un match real si la otra persona real ya te dio like
    const isMatch = registroLikes[toUserId] && registroLikes[toUserId].includes(fromUserId);

    res.json({ success: true, match: isMatch });
});

app.listen(3000, () => console.log('Servidor 100% Real sin bots encendido'));
