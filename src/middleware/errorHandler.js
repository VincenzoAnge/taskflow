const AppError = require('../utils/AppError');

// Risposta per le route /api che non esistono
function notFound(req, res, next) {
  next(new AppError('Risorsa non trovata', 404));
}

// Unico punto in cui gli errori diventano una risposta JSON
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'ID non valido';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON non valido';
  } else if (err.code === 11000) {
    status = 400;
    message = 'Esiste già un elemento con questi dati';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token non valido o scaduto';
  }

  if (status === 500) {
    console.error(err);
    message = 'Errore interno del server';
  }

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
