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
  currentPassword: yup.string().required('Senha atual é obrigatória'),
  newPassword: yup
    .string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .required('Nova senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'As senhas devem ser iguais')
    .required('Confirmação de senha é obrigatória'),
});

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showNotification } = useNotification();
  const theme = useTheme();

  const formik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await authService.changePassword(values.currentPassword, values.newPassword);
        showNotification('Senha alterada com sucesso', 'success');
        logout();
        navigate('/login');
      } catch (error) {
        console.error('Erro ao alterar senha:', error);
        showNotification('Erro ao alterar senha. Verifique a senha atual.', 'error');
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
            Alterar Senha
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 3, textAlign: 'center' }}
          >
            Por favor, altere sua senha no primeiro acesso para garantir a segurança da sua conta
          </Typography>
          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              fullWidth
              id="currentPassword"
              name="currentPassword"
              label="Senha Atual"
              type="password"
              value={formik.values.currentPassword}
              onChange={formik.handleChange}
              error={
                formik.touched.currentPassword &&
                Boolean(formik.errors.currentPassword)
              }
              helperText={
                formik.touched.currentPassword && formik.errors.currentPassword
              }
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="newPassword"
              name="newPassword"
              label="Nova Senha"
              type="password"
              value={formik.values.newPassword}
              onChange={formik.handleChange}
              error={
                formik.touched.newPassword && Boolean(formik.errors.newPassword)
              }
              helperText={formik.touched.newPassword && formik.errors.newPassword}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="Confirmar Nova Senha"
              type="password"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={
                formik.touched.confirmPassword &&
                Boolean(formik.errors.confirmPassword)
              }
              helperText={
                formik.touched.confirmPassword && formik.errors.confirmPassword
              }
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
              Alterar Senha
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