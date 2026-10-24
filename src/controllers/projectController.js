const Project = require('../models/Project');
const Task = require('../models/Task');
const Message = require('../models/Message');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const editableFields = ['title', 'description', 'category', 'technologies', 'visibility', 'coverImage'];

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
    filter.category = category;
  }
  if (technology) {
    filter.technologies = technology.trim().toLowerCase();
  }

  const projects = await Project.find(filter)
    .populate('owner', 'name')
    .sort({ createdAt: sort === 'oldest' ? 1 : -1 });

  res.json({ success: true, data: projects });
}

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

async function deleteProject(req, res) {
  await Task.deleteMany({ project: req.project._id });
  await Message.deleteMany({ project: req.project._id });
  await req.project.deleteOne();

  res.json({ success: true, data: { message: 'Progetto eliminato' } });
}

async function toggleArchive(req, res) {
  req.project.archived = !req.project.archived;
  await req.project.save();

  res.json({ success: true, data: req.project });
}

async function addMember(req, res) {
  const { email } = req.body;
  if (!email) {
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

async function leaveProject(req, res) {
  if (req.isOwner) {
    throw new AppError('Il proprietario non può lasciare il progetto', 400);
  }

  req.project.members.pull(req.user._id);
  await req.project.save();
  await Task.updateMany({ project: req.project._id, assignee: req.user._id }, { assignee: null });

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
