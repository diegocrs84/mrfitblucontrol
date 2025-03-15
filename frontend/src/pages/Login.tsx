import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  useTheme,
} from '@mui/material';
import { authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const validationSchema = yup.object({
  username: yup.string().required('Username é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
});

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showNotification } = useNotification();
  const theme = useTheme();

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const response = await authService.login(values.username, values.password);
        login(response.token, response.user);
        showNotification('Login realizado com sucesso', 'success');
        
        if (response.user.isFirstAccess) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        showNotification('Credenciais inválidas', 'error');
      }
    },
  });

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default,
        backgroundImage: 'linear-gradient(rgba(13, 71, 161, 0.05) 1px, transparent 1px), linear-gradient(to right, rgba(13, 71, 161, 0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <Container component="main" maxWidth="xs">
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: 'linear-gradient(to right, #0D47A1, #1565C0, #43A047)',
            }
          }}
        >
          <Avatar 
            src="/Logo.jpeg" 
            alt="Logo Mr Fit Blu"
            sx={{ 
              width: 80, 
              height: 80, 
              mb: 2,
              border: '1px solid #e0e0e0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Typography 
            component="h1" 
            variant="h5" 
            sx={{ 
              mb: 1,
              color: theme.palette.primary.main,
              fontWeight: 600
            }}
          >
            Mr Fit Blu Control
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 3 }}
          >
            Sistema de Gerenciamento de Produtos
          </Typography>
          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              fullWidth
              id="username"
              name="username"
              label="Username"
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="password"
              name="password"
              label="Senha"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ 
                mt: 1, 
                mb: 2,
                py: 1.2,
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              Entrar
            </Button>
          </Box>
        </Paper>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center" 
          sx={{ mt: 3 }}
        >
          © {new Date().getFullYear()} Mr Fit Blu Control. Todos os direitos reservados.
        </Typography>
      </Container>
    </Box>
  );
}; 