const express = require('express');
const controller = require('../controllers/projectController');
const { getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { loadProject, requireMember, requireOwner } = require('../middleware/project');

const router = express.Router();

// Unica route senza login: serve alla pagina "Esplora progetti"
router.get('/public', controller.getPublicProjects);

router.use(protect);

router.post('/', controller.createProject);
router.get('/:id', loadProject, controller.getProject);
router.put('/:id', loadProject, requireOwner, controller.updateProject);
router.delete('/:id', loadProject, requireOwner, controller.deleteProject);
router.patch('/:id/archive', loadProject, requireOwner, controller.toggleArchive);

router.post('/:id/members', loadProject, requireOwner, controller.addMember);
router.delete('/:id/members/:userId', loadProject, requireOwner, controller.removeMember);

router.use('/:id/tasks', loadProject, requireMember, require('./taskRoutes'));
router.get('/:id/messages', loadProject, requireMember, getMessages);

router.post('/:id/join', loadProject, controller.joinProject);
router.post('/:id/leave', loadProject, controller.leaveProject);

module.exports = router;
