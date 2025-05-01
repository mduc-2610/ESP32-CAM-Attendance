import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Container,
  useMediaQuery,
  useTheme,
  Collapse
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  EventNote as EventIcon,
  Assessment as ReportIcon,
  LocalOffer as TagIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const AppLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(true);
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(true);
  const location = useLocation();
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  const toggleAttendanceMenu = () => {
    setAttendanceMenuOpen(!attendanceMenuOpen);
  };
  
  const isPathActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  
  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap>
          Face Attendance
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem 
          button 
          component={RouterLink} 
          to="/"
          selected={location.pathname === '/'}
          onClick={isMobile ? handleDrawerToggle : undefined}
        >
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        
        {/* Users Menu */}
        <ListItem button onClick={toggleUserMenu}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="Users" />
          {userMenuOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={userMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem
              button
              component={RouterLink}
              to="/users"
              selected={isPathActive('/users') && location.pathname !== '/users/tags'}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{ pl: 4 }}
            >
              <ListItemText primary="Manage Users" />
            </ListItem>
            
            <ListItem
              button
              component={RouterLink}
              to="/users/tags"
              selected={isPathActive('/users/tags')}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{ pl: 4 }}
            >
              <ListItemIcon><TagIcon /></ListItemIcon>
              <ListItemText primary="Manage Tags" />
            </ListItem>
          </List>
        </Collapse>
        
        {/* Attendance Menu */}
        <ListItem button onClick={toggleAttendanceMenu}>
          <ListItemIcon>
            <EventIcon />
          </ListItemIcon>
          <ListItemText primary="Attendance" />
          {attendanceMenuOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={attendanceMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem
              button
              component={RouterLink}
              to="/attendance/sessions"
              selected={isPathActive('/attendance/sessions')}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{ pl: 4 }}
            >
              <ListItemText primary="Sessions" />
            </ListItem>
            
            <ListItem
              button
              component={RouterLink}
              to="/attendance/reports"
              selected={isPathActive('/attendance/reports')}
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{ pl: 4 }}
            >
              <ListItemIcon><ReportIcon /></ListItemIcon>
              <ListItemText primary="Reports" />
            </ListItem>
          </List>
        </Collapse>
      </List>
    </div>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Face Recognition Attendance System
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={isMobile ? handleDrawerToggle : undefined}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth 
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: '64px' // AppBar height
        }}
      >
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;