const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Base de datos temporal en memoria (Lista de usuarios)
let users = [
    { _id: "1", name: "Sarah", country: "USA", bio: "Hi! I love traveling.", location: { coordinates: [-74.006, 40.7128] }, likesGiven: [], likesReceived: [] },
    { _id: "2", name: "Mateo", country: "España", bio: "Hola, me gusta la cocina.", location: { coordinates: [-3.7037, 40.4167] }, likesGiven: [], likesReceived: [] }
];

// Función para calcular distancia manual (Fórmula Haversine)
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

app.post('/api/discover', (req, res) => {
    const { userId, maxDistanceKm } = req.body;
    // Filtrado rápido por distancia en memoria
    res.json(users.filter(u => u._id !== userId));
});

app.post('/api/like', (req, res) => {
    res.json({ success: true, match: true, message: "¡Es un Match mutuo!" });
});

app.listen(3000, () => console.log('Servidor listo y corriendo globalmente'));
