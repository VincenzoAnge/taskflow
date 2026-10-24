const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// Dato un token JWT restituisce l'utente corrispondente (usata anche da Socket.IO)
async function getUserFromToken(token) {
  if (!token) {
    throw new AppError('Token mancante', 401);
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('Utente non trovato', 401);
  }
  if (user.blocked) {
    throw new AppError('Account bloccato', 403);
  }
  return user;
}

// Richiede il login: legge "Authorization: Bearer <token>"
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  req.user = await getUserFromToken(token);
  next();
}

// Da usare dopo protect: solo gli amministratori passano
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    throw new AppError('Accesso riservato agli amministratori', 403);
  }
  next();
}

module.exports = { getUserFromToken, protect, adminOnly };
