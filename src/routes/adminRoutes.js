const express = require('express');
const controller = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// tutte le route admin richiedono login e ruolo admin
router.use(protect, adminOnly);

router.get('/users', controller.getUsers);
router.patch('/users/:id/block', controller.toggleBlockUser);
router.get('/projects', controller.getProjects);
router.patch('/projects/:id/archive', controller.toggleArchiveProject);

module.exports = router;
