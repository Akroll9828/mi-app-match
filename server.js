const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// BASE DE DATOS REAL EN MEMORIA (Totalmente limpia para usuarios reales)
let usuariosRegistrados = [];
let registroLikes = {};

// 1. RUTA PARA REGISTRAR PERSONAS REALES CON PREFERENCIAS
app.post('/api/register', (req, res) => {
    const { name, country, bio, photoUrl, lat, lon, gender, interestedIn, interests } = req.body;
    
    const newId = "user_" + Date.now();
    const newUser = {
        _id: newId,
        name,
        country,
        bio,
        photoUrl: photoUrl || "https://unsplash.com",
        lat: parseFloat(lat) || -12.0464,
        lon: parseFloat(lon) || -77.0428,
        gender,          // 'hombre', 'mujer', 'no_binario'
        interestedIn,    // 'hombres', 'mujeres', 'todos'
        interests: interests || [] // Lista de gustos (ej: ['musica', 'deporte'])
    };

    usuariosRegistrados.push(newUser);
    res.json({ success: true, userId: newId, message: "¡Registrado con éxito real!" });
});

// Fórmula Haversine para distancias reales
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

// 2. RUTA DE DESCUBRIMIENTO CON FILTROS DE PREFERENCIAS E INTERESES
app.post('/api/discover', (req, res) => {
    const { userId, maxDistanceKm } = req.body;
    
    const currentUser = usuariosRegistrados.find(u => u._id === userId);
    if (!currentUser) return res.json([]);

    let result = usuariosRegistrados.filter(user => {
        // Excluirse a sí mismo
        if (user._id === userId) return false;

        // FILTRO DE ORIENTACIÓN MUTUA (Inclusivo y sin discriminación)
        // A) Validar qué le interesa al usuario actual
        const meInteresaEl = currentUser.interestedIn === 'todos' || 
            (currentUser.interestedIn === 'hombres' && user.gender === 'hombre') ||
            (currentUser.interestedIn === 'mujeres' && user.gender === 'mujer');

        // B) Validar si yo le intereso a esa otra persona
        const leInteresoYo = user.interestedIn === 'todos' ||
            (user.interestedIn === 'hombres' && currentUser.gender === 'hombre') ||
            (user.interestedIn === 'mujeres' && currentUser.gender === 'mujer');

        return meInteresaEl && leInteresoYo;
    })
    .map(user => {
        // Calcular distancia
        const dist = calculateDistance(currentUser.lat, currentUser.lon, user.lat, user.lon);
        
        // Calcular cuántos gustos/intereses tienen en común
        const interesesComunes = user.interests.filter(i => currentUser.interests.includes(i));

        return { ...user, distance: dist, comunes: interesesComunes };
    })
    // Filtrar por el rango de distancia elegido
    .filter(user => user.distance <= maxDistanceKm)
    // Ordenar de forma que salgan primero las personas con más gustos en común
    .sort((a, b) => b.comunes.length - a.comunes.length);

    res.json(result);
});

// 3. RUTA DE LIKES GRATIS
app.post('/api/like', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!registroLikes[fromUserId]) registroLikes[fromUserId] = [];
    registroLikes[fromUserId].push(toUserId);
    const isMatch = registroLikes[toUserId] && registroLikes[toUserId].includes(fromUserId);
    res.json({ success: true, match: isMatch });
});

app.listen(3000, () => console.log('Servidor de Citas Inteligente e Inclusivo Encendido'));
