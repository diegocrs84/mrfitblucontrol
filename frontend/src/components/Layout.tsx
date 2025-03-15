import React, { useState } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  ExitToApp as ExitToAppIcon,
  ChevronLeft as ChevronLeftIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Largura reduzida do drawer para usar menos espaço
const drawerWidth = 240;

export const Layout: React.FC = () => {
  // Inicializa com o drawer fechado em todos os tamanhos de tela
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const drawer = (
    <div>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2, 
          background: 'linear-gradient(to right, #0D47A1, #1565C0)', 
          color: 'white' 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src="/Logo.jpeg"
            alt="Logo Mr Fit Blu"
            sx={{
              width: 40,
              height: 40,
              marginRight: 2,
              border: '1px solid white',
            }}
          />
          <Typography variant="h6" noWrap>
            Mr Fit Blu
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      <List sx={{ mt: 2 }}>
        <ListItem
          button
          component={RouterLink}
          to="/products"
          onClick={() => setDrawerOpen(false)}
          sx={{ 
            mb: 1, 
            '&:hover': { 
              backgroundColor: theme.palette.primary.light + '20'
            }
          }}
        >
          <ListItemIcon>
            <InventoryIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary="Produtos" primaryTypographyProps={{ color: 'primary' }} />
        </ListItem>
        
        <ListItem
          button
          component={RouterLink}
          to="/estoque"
          onClick={() => setDrawerOpen(false)}
          sx={{ 
            mb: 1, 
            '&:hover': { 
              backgroundColor: theme.palette.primary.light + '20'
            }
          }}
        >
          <ListItemIcon>
            <StorageIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary="Estoque" primaryTypographyProps={{ color: 'primary' }} />
        </ListItem>
        
        {user?.role === 'admin' && (
          <ListItem
            button
            component={RouterLink}
            to="/users"
            onClick={() => setDrawerOpen(false)}
            sx={{ 
              '&:hover': { 
                backgroundColor: theme.palette.primary.light + '20'
              }
            }}
          >
            <ListItemIcon>
              <PeopleIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Usuários" primaryTypographyProps={{ color: 'primary' }} />
          </ListItem>
        )}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: '100%',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Tooltip title="Abrir Menu">
            <IconButton
              color="inherit"
              aria-label="abrir menu"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar 
              src="/Logo.jpeg" 
              alt="Logo Mr Fit Blu"
              sx={{ 
                width: 40, 
                height: 40, 
                marginRight: 2,
                border: '1px solid white'
              }}
            />
            <Typography variant="h6" noWrap component="div">
              Mr Fit Blu Control
            </Typography>
          </Box>
          <Button 
            color="inherit" 
            onClick={logout} 
            startIcon={<ExitToAppIcon />}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              },
              px: 2,
              borderRadius: 2
            }}
          >
            Sair
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Drawer de navegação */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}; 