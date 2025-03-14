const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const authRouter = require('./routes/auth');
const userRouter = require('./routes/users');
const productRouter = require('./routes/products');
const User = require('./models/User');

const app = express();

app.use(cors());
app.use(express.json());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mrfitblu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Criar usuário admin inicial
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 8);
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isFirstAccess: true,
      });
      await admin.save();
      console.log('Usuário admin criado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  }
};

createInitialAdmin();

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
}); 