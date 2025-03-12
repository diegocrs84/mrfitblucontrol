const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const UserLog = require('../models/UserLog');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Criar usuário (apenas admin)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    
    const user = new User({
      username,
      password: hashedPassword,
      role,
      isFirstAccess: true
    });

    await user.save();

    // Registrar log
    const log = new UserLog({
      action: 'create',
      userId: user._id,
      performedBy: req.user._id,
      details: { username, role }
    });
    await log.save();

    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Listar usuários (apenas admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Ativar/Desativar usuário (apenas admin)
router.patch('/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send();
    }

    if (user.role === 'admin') {
      return res.status(400).send({ error: 'Não é possível desativar um administrador' });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Registrar log
    const log = new UserLog({
      action: 'update',
      userId: user._id,
      performedBy: req.user._id,
      details: { isActive: user.isActive }
    });
    await log.save();

    res.send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Obter logs de usuários (apenas admin)
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const logs = await UserLog.find()
      .populate('userId', 'username')
      .populate('performedBy', 'username')
      .sort({ createdAt: -1 });
    res.send(logs);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router; 