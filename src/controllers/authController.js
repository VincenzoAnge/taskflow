const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

function userData(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Nome, email e password sono obbligatori', 400);
  }
  if (password.length < 6) {
    throw new AppError('La password deve avere almeno 6 caratteri', 400);
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    throw new AppError('Email già registrata', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword });

  res.status(201).json({
    success: true,
    data: { token: createToken(user), user: userData(user) }
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email e password sono obbligatorie', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Email o password non corrette', 401);
  }
  if (user.blocked) {
    throw new AppError('Account bloccato', 403);
  }

  res.json({
    success: true,
    data: { token: createToken(user), user: userData(user) }
  });
}

async function me(req, res) {
  res.json({ success: true, data: userData(req.user) });
}

module.exports = { register, login, me };
