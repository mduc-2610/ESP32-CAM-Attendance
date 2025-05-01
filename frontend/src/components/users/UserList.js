import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Chip,
  Stack
} from '@mui/material';
import { 
  Search as SearchIcon, 
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraAltIcon
} from '@mui/icons-material';
import { userService } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const navigate = useNavigate();
  
  // Load users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await userService.getAllUsers();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        toast.error('Failed to load users');
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Filter users when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery) ||
        user.tags.some(tag => tag.name.toLowerCase().includes(lowerQuery))
      );
      setFilteredUsers(filtered);
    }
    
    setPage(0); // Reset to first page on search
  }, [searchQuery, users]);
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        
        // Update users list
        setUsers(users.filter(user => user.id !== userId));
        toast.success('User deleted successfully');
      } catch (error) {
        toast.error('Failed to delete user');
        console.error('Error deleting user:', error);
      }
    }
  };
  
  const handleAddFaceImages = (userId) => {
    navigate(`/users/${userId}/register-face`);
  };
  
  const handleTagClick = (tagId) => {
    // Navigate to filtered list of users with this tag
    navigate(`/users?tagId=${tagId}`);
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Users</Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PersonAddIcon />}
          component={Link}
          to="/users/create"
        >
          Add User
        </Button>
      </Box>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name, email, or tag..."
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>UUID</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No users found</TableCell>
              </TableRow>
            ) : (
              filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.tags && user.tags.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {user.tags.map(tag => (
                            <Chip 
                              key={tag.id} 
                              label={tag.name} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                              onClick={() => handleTagClick(tag.id)}
                              style={{ margin: '2px' }}
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No tags
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{user.uuid}</TableCell>
                    <TableCell>
                      <IconButton 
                        color="primary" 
                        component={Link}
                        to={`/users/${user.id}/edit`}
                        title="Edit User"
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete User"
                      >
                        <DeleteIcon />
                      </IconButton>
                      
                      <IconButton 
                        color="secondary" 
                        onClick={() => handleAddFaceImages(user.id)}
                        title="Register Face"
                      >
                        <CameraAltIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={filteredUsers.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );
};

export default UserList;