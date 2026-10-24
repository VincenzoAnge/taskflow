const User = require('../models/User');
const Project = require('../models/Project');
const AppError = require('../utils/AppError');

async function getUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });

  res.json({ success: true, data: users });
}

async function toggleBlockUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('Utente non trovato', 404);
  }
  if (user.role === 'admin') {
    throw new AppError('Non puoi bloccare un amministratore', 400);
  }

  user.blocked = !user.blocked;
  await user.save();

  // un utente appena bloccato viene scollegato dalle chat in corso
  if (user.blocked) {
    req.app.get('io').in(`user:${user._id}`).disconnectSockets(true);
  }

  res.json({ success: true, data: user });
}

async function getProjects(req, res) {
  const projects = await Project.find().populate('owner', 'name email').sort({ createdAt: -1 });

  res.json({ success: true, data: projects });
}

async function toggleArchiveProject(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) {
    throw new AppError('Progetto non trovato', 404);
  }

  project.archived = !project.archived;
  await project.save();

  res.json({ success: true, data: project });
}

module.exports = { getUsers, toggleBlockUser, getProjects, toggleArchiveProject };
