// Controller dell'utente: dati della dashboard personale

const Project = require('../models/Project');
const Task = require('../models/Task');

// Task con scadenza prima di quelli senza scadenza, dal più vicino al più lontano
function byDueDate(a, b) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate - b.dueDate;
}

// GET /api/users/me/dashboard
async function getDashboard(req, res) {
  const userId = req.user._id;

  const createdProjects = await Project.find({ owner: userId }).sort({ createdAt: -1 });
  const memberProjects = await Project.find({ members: userId, owner: { $ne: userId } })
    .populate('owner', 'name')
    .sort({ createdAt: -1 });
  const tasks = await Task.find({ assignee: userId }).populate('project', 'title');
  tasks.sort(byDueDate);

  const stats = {
    projects: createdProjects.length + memberProjects.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    doing: tasks.filter((t) => t.status === 'doing').length,
    done: tasks.filter((t) => t.status === 'done').length
  };

  res.json({ success: true, data: { stats, createdProjects, memberProjects, tasks } });
}

module.exports = { getDashboard };
