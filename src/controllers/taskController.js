const Task = require('../models/Task');
const AppError = require('../utils/AppError');

const editableFields = ['title', 'description', 'priority'];

// L'assegnatario deve far parte del progetto (oppure essere vuoto)
function checkAssignee(project, assignee) {
  if (assignee && !project.members.some((id) => id.equals(assignee))) {
    throw new AppError("L'assegnatario deve essere membro del progetto", 400);
  }
}

async function findTask(req) {
  const task = await Task.findOne({ _id: req.params.taskId, project: req.project._id });
  if (!task) {
    throw new AppError('Task non trovato', 404);
  }
  return task;
}

async function getTasks(req, res) {
  const tasks = await Task.find({ project: req.project._id })
    .populate('assignee', 'name')
    .sort({ createdAt: 1 });

  res.json({ success: true, data: tasks });
}

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

  res.status(201).json({ success: true, data: task });
}

async function updateTask(req, res) {
  const task = await findTask(req);

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

  res.json({ success: true, data: task });
}

async function changeStatus(req, res) {
  const task = await findTask(req);

  task.status = req.body.status;
  await task.save();
  await task.populate('assignee', 'name');

  res.json({ success: true, data: task });
}

async function deleteTask(req, res) {
  const task = await findTask(req);
  await task.deleteOne();

  res.json({ success: true, data: { message: 'Task eliminato' } });
}

module.exports = { getTasks, createTask, updateTask, changeStatus, deleteTask };
