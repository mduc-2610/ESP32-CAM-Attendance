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
  Checkbox,
  Button,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material';
import { userService, tagService } from '../../services/api';
import { toast } from 'react-toastify';

const UsersByTagList = ({ 
  tagId, 
  selectedUsers = [], 
  onUserSelect, 
  onUserDeselect,
  selectable = true,
  showActions = true
}) => {
  const [users, setUsers] = useState([]);
  const [tag, setTag] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Load users for the specified tag
  useEffect(() => {
    const fetchData = async () => {
      if (!tagId) return;
      
      try {
        setLoading(true);
        
        // Load tag details
        const tagData = await tagService.getTagById(tagId);
        setTag(tagData);
        
        // Load users with this tag
        const usersData = await tagService.getUsersByTag(tagId);
        setUsers(usersData);
      } catch (error) {
        toast.error('Failed to load users by tag');
        console.error('Error loading users by tag:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tagId]);
  
  // Check if a user is selected
  const isUserSelected = (userId) => {
    return selectedUsers.some(user => user.id === userId);
  };
  
  // Handle checkbox click
  const handleCheckboxClick = (user) => {
    if (isUserSelected(user.id)) {
      onUserDeselect(user);
    } else {
      onUserSelect(user);
    }
  };
  
  // Select all users
  const handleSelectAll = () => {
    users.forEach(user => {
      if (!isUserSelected(user.id)) {
        onUserSelect(user);
      }
    });
  };
  
  // Deselect all users
  const handleDeselectAll = () => {
    users.forEach(user => {
      if (isUserSelected(user.id)) {
        onUserDeselect(user);
      }
    });
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!tag) {
    return (
      <Alert severity="info">No tag selected</Alert>
    );
  }
  
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mr: 1 }}>
            Users with tag:
          </Typography>
          <Chip label={tag.name} color="primary" />
        </Box>
        
        {selectable && showActions && (
          <Box>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleSelectAll} 
              sx={{ mr: 1 }}
            >
              Select All
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </Box>
        )}
      </Box>
      
      {users.length === 0 ? (
        <Alert severity="info">No users found with this tag</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {selectable && <TableCell padding="checkbox" />}
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Tags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id}
                  hover={selectable}
                  selected={isUserSelected(user.id)}
                  onClick={() => selectable && handleCheckboxClick(user)}
                  sx={{ cursor: selectable ? 'pointer' : 'default' }}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isUserSelected(user.id)}
                        onChange={() => handleCheckboxClick(user)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {user.tags.map(tag => (
                        <Chip 
                          key={tag.id} 
                          label={tag.name} 
                          size="small" 
                          variant={tag.id === parseInt(tagId) ? "filled" : "outlined"}
                          color="primary"
                        />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default UsersByTagList;