// Controller dei task: CRUD, cambio stato e notifiche realtime

const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const { roomName } = require('../socket/socketServer');

// Campi modificabili con PUT (stato e assegnatario hanno una gestione a parte)
const editableFields = ['title', 'description', 'priority'];

// Avvisa in tempo reale tutti gli utenti collegati alla stanza del progetto
function notify(req, event, task) {
  const io = req.app.get('io');
  io.to(roomName(req.project._id)).emit(event, {
    task,
    by: { id: req.user._id, name: req.user.name }
  });
}

// L'assegnatario deve far parte del progetto (oppure essere vuoto)
function checkAssignee(project, assignee) {
  if (assignee && !project.members.some((id) => id.equals(assignee))) {
    throw new AppError("L'assegnatario deve essere membro del progetto", 400);
  }
}

// Cerca il task solo dentro il progetto corrente
async function findTask(req) {
  const task = await Task.findOne({ _id: req.params.taskId, project: req.project._id });
  if (!task) {
    throw new AppError('Task non trovato', 404);
  }
  return task;
}

// GET /api/projects/:id/tasks
async function getTasks(req, res) {
  const tasks = await Task.find({ project: req.project._id })
    .populate('assignee', 'name')
    .sort({ createdAt: 1 });

  res.json({ success: true, data: tasks });
}

// POST /api/projects/:id/tasks
async function createTask(req, res) {
  const { title, description, assignee, dueDate, priority, status } = req.body;

  if (!title) {
    throw new AppError('Il titolo è obbligatorio', 400);
  }
  checkAssignee(req.project, assignee);

  const task = await Task.create({
    title,
    description,
    assignee: assignee || null,
    dueDate: dueDate || null,
    priority,
    status,
    project: req.project._id
  });
  await task.populate('assignee', 'name');
  notify(req, 'taskCreated', task);

  res.status(201).json({ success: true, data: task });
}

// PUT /api/projects/:id/tasks/:taskId
async function updateTask(req, res) {
  const task = await findTask(req);
  const oldAssignee = String(task.assignee);

  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  if (req.body.dueDate !== undefined) {
    task.dueDate = req.body.dueDate || null;
  }

  if (req.body.assignee !== undefined) {
    checkAssignee(req.project, req.body.assignee);
    task.assignee = req.body.assignee || null;
  }

  await task.save();
  await task.populate('assignee', 'name');

  const assigneeChanged = String(task.assignee ? task.assignee._id : task.assignee) !== oldAssignee;
  notify(req, assigneeChanged ? 'taskAssigned' : 'taskUpdated', task);

  res.json({ success: true, data: task });
}

// PATCH /api/projects/:id/tasks/:taskId/status
async function changeStatus(req, res) {
  if (!req.body.status) {
    throw new AppError('Lo stato è obbligatorio', 400);
  }
  const task = await findTask(req);

  task.status = req.body.status;
  await task.save();
  await task.populate('assignee', 'name');
  notify(req, 'taskMoved', task);

  res.json({ success: true, data: task });
}

// DELETE /api/projects/:id/tasks/:taskId
async function deleteTask(req, res) {
  const task = await findTask(req);
  await task.deleteOne();
  notify(req, 'taskDeleted', task);

  res.json({ success: true, data: { message: 'Task eliminato' } });
}

module.exports = { getTasks, createTask, updateTask, changeStatus, deleteTask };
