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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            Alterar Senha
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Por favor, altere sua senha no primeiro acesso
          </Typography>
          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{ mt: 1, width: '100%' }}
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
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Alterar Senha
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}; 