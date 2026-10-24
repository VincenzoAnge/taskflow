require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', require('./src/routes/authRoutes'));

app.use('/api', notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('Mancano MONGODB_URI o JWT_SECRET: controlla il file .env');
    process.exit(1);
  }
  await connectDB();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server avviato su http://localhost:${port}`);
  });
}

start();
