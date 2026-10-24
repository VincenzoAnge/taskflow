const express = require('express');
const { getDashboard } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/me/dashboard', protect, getDashboard);

module.exports = router;
