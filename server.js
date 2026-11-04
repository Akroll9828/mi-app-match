const express = require('express');
const app = express();

// Aumentar el límite de tamaño para poder recibir las imágenes directamente en Base64 desde la galería
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

let usuariosRegistrados = [];
let registroLikes = {};

// ALGORITMO DE REGISTRO AVANZADO
app.post('/api/register', (req, res) => {
    const { 
        name, age, minAgeSearch, maxAgeSearch, maxDistSearch,
        country, bio, photos, gender, interestedIn, interests, 
        relationshipGoal, familyPlans, verificationSelfie, lat, lon 
    } = req.body;
    
    // Validación estricta: Mínimo 3 fotos y selfie de verificación de identidad
    if (!photos || photos.length < 3) {
        return res.status(400).json({ success: false, message: "Debes subir al menos 3 fotos obligatorias." });
    }
    if (!verificationSelfie) {
        return res.status(400).json({ success: false, message: "Se requiere la selfie de verificación de rostro." });
    }

    const newId = "user_" + Date.now();
    const newUser = {
        _id: newId,
        name,
        age: parseInt(age),
        minAgeSearch: parseInt(minAgeSearch) || 18,
        maxAgeSearch: parseInt(maxAgeSearch) || 99,
        maxDistSearch: parseInt(maxDistSearch) || 500,
        country,
        bio,
        photos, // Arreglo de strings en Base64 (Imágenes reales de la galería)
        gender,
        interestedIn,
        interests: interests || [],
        relationshipGoal, // 'estable', 'casual', 'pensando', 'amigos'
        familyPlans,      // 'tengo_hijos', 'quiero_hijos', 'no_hijos'
        isVerified: true, // Verificación simulada exitosa e instantánea sin costo
        lat: parseFloat(lat) || -12.0464,
        lon: parseFloat(lon) || -77.0428
    };

    usuariosRegistrados.push(newUser);
    res.json({ success: true, userId: newId, message: "¡Perfil verificado y creado con éxito!" });
});

// Fórmula de Haversine para cálculo de distancias kilométricas reales
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ALGORITMO DE MATCH AVANZADO (Filtros de Edad, Distancia, Género e Intenciones de Grupo)
app.post('/api/discover', (req, res) => {
    const { userId, groupFilter } = req.body;
    
    const currentUser = usuariosRegistrados.find(u => u._id === userId);
    if (!currentUser) return res.json([]);

    let result = usuariosRegistrados.filter(user => {
        if (user._id === userId) return false;

        // 1. FILTRO DE GÉNERO MUTUO
        const meInteresa = currentUser.interestedIn === 'todos' || currentUser.interestedIn === user.gender;
        const leIntereso = user.interestedIn === 'todos' || user.interestedIn === currentUser.gender;
        if (!meInteresa || !leIntereso) return false;

        // 2. FILTRO DE EDAD CRUZADO (Ambos deben encajar en los rangos del otro)
        const edadEncajaEnMiFiltro = user.age >= currentUser.minAgeSearch && user.age <= currentUser.maxAgeSearch;
        const miEdadEncajaEnSuFiltro = currentUser.age >= user.minAgeSearch && currentUser.age <= user.maxAgeSearch;
        if (!edadEncajaEnMiFiltro || !miEdadEncajaEnSuFiltro) return false;

        // 3. FILTRO DE DISTANCIA INDIVIDUAL (Calculado a su antojo)
        const distance = getDistanceKm(currentUser.lat, currentUser.lon, user.lat, user.lon);
        if (distance > currentUser.maxDistSearch) return false;

        // 4. SEPARACIÓN DINÁMICA POR GRUPOS DE INTENCIÓN (Relación estable, casual, amigos, etc.)
        if (groupFilter && groupFilter !== 'todos' && user.relationshipGoal !== groupFilter) return false;

        return true;
    })
    .map(user => {
        const distance = Math.round(getDistanceKm(currentUser.lat, currentUser.lon, user.lat, user.lon));
        const comunes = user.interests.filter(i => currentUser.interests.includes(i));
        return { ...user, distance, comunes };
    })
    .sort((a, b) => b.comunes.length - a.comunes.length); // Priorizar gustos en común

    res.json(result);
});

app.post('/api/like', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!registroLikes[fromUserId]) registroLikes[fromUserId] = [];
    registroLikes[fromUserId].push(toUserId);
    const isMatch = registroLikes[toUserId] && registroLikes[toUserId].includes(fromUserId);
    res.json({ success: true, match: isMatch });
});

app.listen(3000, () => console.log('Servidor Tinder de Próxima Generación Encendido'));
