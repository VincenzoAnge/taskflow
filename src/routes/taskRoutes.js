// Route dei task di un progetto: /api/projects/:id/tasks

const express = require('express');
const controller = require('../controllers/taskController');

const router = express.Router();

// Montate su /api/projects/:id/tasks (utente già autenticato e membro del progetto)
router.get('/', controller.getTasks);
router.post('/', controller.createTask);
router.put('/:taskId', controller.updateTask);
router.patch('/:taskId/status', controller.changeStatus);
router.delete('/:taskId', controller.deleteTask);

module.exports = router;
