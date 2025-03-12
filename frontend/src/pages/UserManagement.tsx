import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/api';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { User, UserLog } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const validationSchema = yup.object({
  username: yup.string().required('Username é obrigatório'),
  password: yup.string().required('Senha é obrigatória'),
  role: yup.string().required('Papel é obrigatório'),
});

export const UserManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
    onError: () => {
      showNotification('Erro ao carregar usuários', 'error');
    },
  });

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['userLogs'],
    queryFn: userService.getUserLogs,
    onError: () => {
      showNotification('Erro ao carregar logs', 'error');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDialogOpen(false);
      formik.resetForm();
      showNotification('Usuário criado com sucesso', 'success');
    },
    onError: () => {
      showNotification('Erro ao criar usuário', 'error');
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: userService.toggleUserStatus,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showNotification(
        `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
        'success'
      );
    },
    onError: () => {
      showNotification('Erro ao alterar status do usuário', 'error');
    },
  });

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
      role: 'user',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        await createUserMutation.mutateAsync(values);
      } catch (error) {
        console.error('Erro ao criar usuário:', error);
      }
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoadingUsers || isLoadingLogs) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Cadastro de Usuário" />
            <Tab label="Usuários" />
            <Tab label="Logs" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsDialogOpen(true)}
          >
            Novo Usuário
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Papel</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.isActive ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.role !== 'admin' && (
                        <Button
                          variant="outlined"
                          color={user.isActive ? 'error' : 'success'}
                          onClick={() =>
                            toggleUserStatusMutation.mutate(user._id)
                          }
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ação</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Realizado por</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Detalhes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.userId.username}</TableCell>
                    <TableCell>{log.performedBy.username}</TableCell>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {JSON.stringify(log.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>Novo Usuário</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              id="username"
              name="username"
              label="Username"
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
            />
            <TextField
              fullWidth
              margin="normal"
              id="password"
              name="password"
              label="Senha"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />
            <TextField
              fullWidth
              margin="normal"
              id="role"
              name="role"
              label="Papel"
              select
              value={formik.values.role}
              onChange={formik.handleChange}
              error={formik.touched.role && Boolean(formik.errors.role)}
              helperText={formik.touched.role && formik.errors.role}
            >
              <MenuItem value="user">Usuário</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained">
              Criar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}; 