const express = require('express');
const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(__dirname));

let usuariosRegistrados = [];
let registroLikes = {};

app.post('/api/register', (req, res) => {
    const { 
        name, age, minAgeSearch, maxAgeSearch, maxDistSearch,
        country, bio, photos, gender, interestedIn, interests, 
        relationshipGoal, familyPlans, verificationSelfie, lat, lon 
    } = req.body;
    
    if (!photos || photos.length < 3) {
        return res.status(400).json({ success: false, message: "Debes subir al menos 3 fotos de tu galería." });
    }
    if (!verificationSelfie) {
        return res.status(400).json({ success: false, message: "Falta la selfie de verificación facial." });
    }

    const newId = "user_" + Date.now();
    const newUser = {
        _id: newId, name, age: parseInt(age),
        minAgeSearch: parseInt(minAgeSearch) || 18,
        maxAgeSearch: parseInt(maxAgeSearch) || 99,
        maxDistSearch: parseInt(maxDistSearch) || 500,
        country, bio, photos, gender, interestedIn,
        interests: interests || [], relationshipGoal, familyPlans,
        isVerified: true, lat: parseFloat(lat) || -12.0464, lon: parseFloat(lon) || -77.0428
    };

    usuariosRegistrados.push(newUser);
    res.json({ success: true, userId: newId });
});

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

app.post('/api/discover', (req, res) => {
    const { userId, groupFilter } = req.body;
    const currentUser = usuariosRegistrados.find(u => u._id === userId);
    if (!currentUser) return res.json([]);

    let result = usuariosRegistrados.filter(user => {
        if (user._id === userId) return false;

        const meInteresa = currentUser.interestedIn === 'todos' || currentUser.interestedIn === user.gender;
        const leIntereso = user.interestedIn === 'todos' || user.interestedIn === currentUser.gender;
        if (!meInteresa || !leIntereso) return false;

        const edadMíaEncaja = currentUser.age >= user.minAgeSearch && currentUser.age <= user.maxAgeSearch;
        const edadSuyaEncaja = user.age >= currentUser.minAgeSearch && user.age <= currentUser.maxAgeSearch;
        if (!edadMíaEncaja || !edadSuyaEncaja) return false;

        const distance = getDistanceKm(currentUser.lat, currentUser.lon, user.lat, user.lon);
        if (distance > currentUser.maxDistSearch) return false;

        if (groupFilter && groupFilter !== 'todos' && user.relationshipGoal !== groupFilter) return false;

        return true;
    })
    .map(user => {
        const distance = Math.round(getDistanceKm(currentUser.lat, currentUser.lon, user.lat, user.lon));
        const comunes = user.interests.filter(i => currentUser.interests.includes(i));
        return { ...user, distance, comunes };
    })
    .sort((a, b) => b.comunes.length - a.comunes.length);

    res.json(result);
});

app.post('/api/like', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!registroLikes[fromUserId]) registroLikes[fromUserId] = [];
    registroLikes[fromUserId].push(toUserId);
    const isMatch = registroLikes[toUserId] && registroLikes[toUserId].includes(fromUserId);
    res.json({ success: true, match: isMatch });
});

app.listen(3000, () => console.log('Servidor corriendo perfecto'));
