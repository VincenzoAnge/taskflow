// Middleware dei progetti: carica il progetto dalla URL e controlla i permessi dell'utente

const Project = require('../models/Project');
const AppError = require('../utils/AppError');

// Carica il progetto indicato in :id e capisce che ruolo ha l'utente al suo interno
async function loadProject(req, res, next) {
  const project = await Project.findById(req.params.id);
  if (!project) {
    throw new AppError('Progetto non trovato', 404);
  }
  req.project = project;
  req.isOwner = project.owner.equals(req.user._id);
  req.isMember = project.members.some((id) => id.equals(req.user._id));
  next();
}

// Lascia passare solo i membri del progetto
function requireMember(req, res, next) {
  if (!req.isMember) {
    throw new AppError('Devi essere membro del progetto', 403);
  }
  next();
}

// Lascia passare solo il proprietario del progetto
function requireOwner(req, res, next) {
  if (!req.isOwner) {
    throw new AppError('Solo il proprietario può eseguire questa azione', 403);
  }
  next();
}

module.exports = { loadProject, requireMember, requireOwner };
