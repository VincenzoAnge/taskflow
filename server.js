// Punto di avvio dell'applicazione: configura Express, Socket.IO e le route, poi si collega a MongoDB
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const { setupSocket } = require('./src/socket/socketServer');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');

const app = express();
const server = http.createServer(app);

// i controller prendono io con req.app.get('io') per inviare gli eventi realtime
app.set('io', setupSocket(server));

// Middleware globali: CORS, lettura del JSON e file statici del frontend (cartella public)
app.use(cors());
app.use(express.json());
// in Express 5 req.body è undefined se la richiesta non ha un body JSON
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});
app.use(express.static('public'));

// Route delle API REST
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/projects', require('./src/routes/projectRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Gestione degli errori: va sempre dopo tutte le route
app.use('/api', notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('Mancano MONGODB_URI o JWT_SECRET: controlla il file .env');
    process.exit(1);
  }
  await connectDB();
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`);
  });
}

start();
