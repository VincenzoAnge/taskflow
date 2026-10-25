// Controller dei progetti: creazione, modifica, membri e progetti pubblici

const Project = require('../models/Project');
const Task = require('../models/Task');
const Message = require('../models/Message');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { removeUserFromRoom } = require('../socket/socketServer');

// Campi che il proprietario può modificare
const editableFields = ['title', 'description', 'category', 'technologies', 'visibility', 'coverImage'];

// POST /api/projects (chi crea il progetto ne diventa proprietario e membro)
async function createProject(req, res) {
  const { title, description, category, technologies, visibility, coverImage } = req.body;

  if (!title) {
    throw new AppError('Il titolo è obbligatorio', 400);
  }

  const project = await Project.create({
    title,
    description,
    category,
    technologies,
    visibility,
    coverImage,
    owner: req.user._id,
    members: [req.user._id]
  });

  res.status(201).json({ success: true, data: project });
}

// Pagina "Esplora": progetti pubblici non archiviati, con filtri opzionali
async function getPublicProjects(req, res) {
  const { category, technology, sort } = req.query;
  const filter = { visibility: 'public', archived: false };

  if (category) {
    filter.category = String(category);
  }
  if (technology) {
    filter.technologies = String(technology).trim().toLowerCase();
  }

  const projects = await Project.find(filter)
    .populate('owner', 'name')
    .sort({ createdAt: sort === 'oldest' ? 1 : -1 });

  res.json({ success: true, data: projects });
}

// GET /api/projects/:id
async function getProject(req, res) {
  const project = req.project;

  if (project.visibility === 'private' && !req.isMember && req.user.role !== 'admin') {
    throw new AppError('Progetto privato', 403);
  }

  await project.populate('owner members', 'name email');

  res.json({
    success: true,
    data: { ...project.toObject(), isOwner: req.isOwner, isMember: req.isMember }
  });
}

// PUT /api/projects/:id (solo proprietario)
async function updateProject(req, res) {
  const project = req.project;

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      project[field] = req.body[field];
    }
  });
  await project.save();

  res.json({ success: true, data: project });
}

// DELETE /api/projects/:id (solo proprietario): elimina anche task e messaggi
async function deleteProject(req, res) {
  await Task.deleteMany({ project: req.project._id });
  await Message.deleteMany({ project: req.project._id });
  await req.project.deleteOne();

  res.json({ success: true, data: { message: 'Progetto eliminato' } });
}

// PATCH /api/projects/:id/archive (solo proprietario)
async function toggleArchive(req, res) {
  req.project.archived = !req.project.archived;
  await req.project.save();

  res.json({ success: true, data: req.project });
}

// POST /api/projects/:id/members (solo proprietario)
async function addMember(req, res) {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    throw new AppError('Email obbligatoria', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('Nessun utente con questa email', 404);
  }
  if (req.project.members.some((id) => id.equals(user._id))) {
    throw new AppError('Utente già membro del progetto', 400);
  }

  req.project.members.push(user._id);
  await req.project.save();
  await req.project.populate('members', 'name email');

  res.status(201).json({ success: true, data: req.project.members });
}

// DELETE /api/projects/:id/members/:userId (solo proprietario)
async function removeMember(req, res) {
  const project = req.project;
  const userId = req.params.userId;

  if (project.owner.equals(userId)) {
    throw new AppError('Il proprietario non può essere rimosso', 400);
  }

  project.members.pull(userId);
  await project.save();
  // i task del membro rimosso tornano senza assegnatario
  await Task.updateMany({ project: project._id, assignee: userId }, { assignee: null });
  await removeUserFromRoom(req.app.get('io'), project._id, userId);
  await project.populate('members', 'name email');

  res.json({ success: true, data: project.members });
}

// Un utente entra da solo in un progetto pubblico
async function joinProject(req, res) {
  const project = req.project;

  if (project.visibility !== 'public' || project.archived) {
    throw new AppError('Non puoi partecipare a questo progetto', 403);
  }
  if (req.isMember) {
    throw new AppError('Sei già membro del progetto', 400);
  }

  project.members.push(req.user._id);
  await project.save();

  res.json({ success: true, data: project });
}

// POST /api/projects/:id/leave
async function leaveProject(req, res) {
  if (!req.isMember) {
    throw new AppError('Non sei membro di questo progetto', 400);
  }
  if (req.isOwner) {
    throw new AppError('Il proprietario non può lasciare il progetto', 400);
  }

  req.project.members.pull(req.user._id);
  await req.project.save();
  await Task.updateMany({ project: req.project._id, assignee: req.user._id }, { assignee: null });
  await removeUserFromRoom(req.app.get('io'), req.project._id, req.user._id);

  res.json({ success: true, data: { message: 'Hai lasciato il progetto' } });
}

module.exports = {
  createProject,
  getPublicProjects,
  getProject,
  updateProject,
  deleteProject,
  toggleArchive,
  addMember,
  removeMember,
  joinProject,
  leaveProject
};
