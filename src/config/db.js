// Connessione a MongoDB tramite Mongoose (l'indirizzo è in MONGODB_URI nel file .env)

const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connesso');
}

module.exports = connectDB;
