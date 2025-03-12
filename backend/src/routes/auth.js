const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.isActive) {
      return res.status(401).send({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.send({ 
      token, 
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        isFirstAccess: user.isFirstAccess
      }
    });
  } catch (error) {
    res.status(400).send(error);
  }
});

// Alterar senha
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({ error: 'Senha atual incorreta' });
    }

    user.password = await bcrypt.hash(newPassword, 8);
    user.isFirstAccess = false;
    await user.save();

    res.send({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router; 