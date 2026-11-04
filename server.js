const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// Servir la interfaz visual (index.html) automáticamente al entrar a la web
app.use(express.static(__dirname));

// Conexión a Base de Datos (MongoDB)
mongoose.connect('mongodb://localhost:27017/globalmatch', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Conectado a la base de datos global"));

// Modelo de Usuario con soporte de Geolocalización GeoJSON
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    language: String, // Idioma nativo (ej: 'es', 'en', 'fr')
    country: String,
    bio: String,
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number] // [Longitud, Latitud]
    },
    likesGiven: [mongoose.Schema.Types.ObjectId],
    likesReceived: [mongoose.Schema.Types.ObjectId]
});

// Índice geoespacial para calcular distancias en la Tierra en milisegundos
UserSchema.index({ location: '2dsphere' });
const User = mongoose.model('User', UserSchema);

/**
 * RUTA PRINCIPAL: Descubrir personas por rango de distancia
 */
app.post('/api/discover', async (req, res) => {
    const { userId, maxDistanceKm } = req.body;

    try {
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(404).json({ error: "Usuario no encontrado" });

        // Convertir kilómetros a radianes (Radio de la Tierra ≈ 6378.1 km)
        const radians = maxDistanceKm / 6378.1;

        const potentialMatches = await User.find({
            _id: { $ne: currentUser._id, $nin: currentUser.likesGiven }, // Excluirse a sí mismo y a quienes ya dio like
            location: {
                $geoWithin: {
                    $centerSphere: [currentUser.location.coordinates, radians]
                }
            }
        });

        res.json(potentialMatches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * RUTA DE MATCH: Likes Ilimitados y Gratuitos
 */
app.post('/api/like', async (req, res) => {
    const { fromUserId, toUserId } = req.body;

    try {
        await User.findByIdAndUpdate(fromUserId, { $addToSet: { likesGiven: toUserId } });
        const targetUser = await User.findByIdAndUpdate(toUserId, { $addToSet: { likesReceived: fromUserId } });

        // Comprobar de inmediato si es un Match mutuo (Completamente Gratis)
        const isMatch = targetUser.likesGiven.includes(fromUserId);

        res.json({
            success: true,
            match: isMatch,
            message: isMatch ? "¡Es un Match mutuo!" : "Like registrado con éxito"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Servidor corriendo en el puerto 3000'));
