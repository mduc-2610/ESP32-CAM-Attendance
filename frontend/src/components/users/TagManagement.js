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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  InputAdornment,
  CircularProgress,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { tagService, userService } from '../../services/api';
import { toast } from 'react-toastify';

const TagManagement = () => {
  const [tags, setTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [dialogLoading, setDialogLoading] = useState(false);
  const [currentTag, setCurrentTag] = useState({ name: '', description: '' });
  const [viewUsersDialogOpen, setViewUsersDialogOpen] = useState(false);
  const [selectedTagUsers, setSelectedTagUsers] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  
  // Load tags on component mount
  useEffect(() => {
    fetchTags();
  }, []);
  
  // Filter tags when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTags(tags);
    } else {
      const filtered = tags.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredTags(filtered);
    }
    
    setPage(0); // Reset to first page on search
  }, [searchQuery, tags]);
  
  const fetchTags = async () => {
    try {
      setLoading(true);
      const data = await tagService.getAllTags();
      setTags(data);
      setFilteredTags(data);
    } catch (error) {
      toast.error('Failed to load tags');
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  const handleDialogOpen = (mode, tag = null) => {
    setDialogMode(mode);
    setCurrentTag(tag || { name: '', description: '' });
    setDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  
  const handleTagChange = (e) => {
    const { name, value } = e.target;
    setCurrentTag(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveTag = async () => {
    // Validate
    if (!currentTag.name.trim()) {
      toast.error('Tag name is required');
      return;
    }
    
    try {
      setDialogLoading(true);
      
      if (dialogMode === 'create') {
        await tagService.createTag(currentTag);
        toast.success('Tag created successfully');
      } else {
        await tagService.updateTag(currentTag.id, currentTag);
        toast.success('Tag updated successfully');
      }
      
      // Refresh tags
      fetchTags();
      handleDialogClose();
    } catch (error) {
      toast.error(`Failed to ${dialogMode} tag`);
      console.error(`Error ${dialogMode}ing tag:`, error);
    } finally {
      setDialogLoading(false);
    }
  };
  
  const handleDeleteTag = async (tagId) => {
    if (window.confirm('Are you sure you want to delete this tag? This will remove the tag from all users.')) {
      try {
        await tagService.deleteTag(tagId);
        toast.success('Tag deleted successfully');
        fetchTags();
      } catch (error) {
        toast.error('Failed to delete tag');
        console.error('Error deleting tag:', error);
      }
    }
  };
  
  const handleViewUsers = async (tag) => {
    try {
      setSelectedTag(tag);
      setLoading(true);
      const users = await tagService.getUsersByTag(tag.id);
      setSelectedTagUsers(users);
      setViewUsersDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load users for this tag');
      console.error('Error loading tag users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Tag Management</Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => handleDialogOpen('create')}
          >
            Add Tag
          </Button>
        </Box>
        
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search tags..."
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
                <TableCell>Description</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} sx={{ m: 1 }} />
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No tags found</TableCell>
                </TableRow>
              ) : (
                filteredTags
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>{tag.name}</TableCell>
                      <TableCell>{tag.description || '—'}</TableCell>
                      <TableCell>
                        <Button
                          startIcon={<GroupIcon />}
                          size="small"
                          onClick={() => handleViewUsers(tag)}
                        >
                          View Users
                        </Button>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary" 
                          onClick={() => handleDialogOpen('edit', tag)}
                          title="Edit Tag"
                        >
                          <EditIcon />
                        </IconButton>
                        
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteTag(tag.id)}
                          title="Delete Tag"
                        >
                          <DeleteIcon />
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
          count={filteredTags.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>
      
      {/* Create/Edit Tag Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Tag' : 'Edit Tag'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, minWidth: 400 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Tag Name"
                  value={currentTag.name}
                  onChange={handleTagChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Description"
                  value={currentTag.description || ''}
                  onChange={handleTagChange}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSaveTag} 
            variant="contained" 
            color="primary"
            disabled={dialogLoading}
          >
            {dialogLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Users Dialog */}
      <Dialog 
        open={viewUsersDialogOpen} 
        onClose={() => setViewUsersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Users with Tag: {selectedTag?.name}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : selectedTagUsers.length === 0 ? (
            <Typography variant="body1">
              No users found with this tag.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Other Tags</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedTagUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.tags
                            .filter(tag => tag.id !== selectedTag?.id)
                            .map(tag => (
                              <Chip 
                                key={tag.id} 
                                label={tag.name} 
                                size="small" 
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          {user.tags.length <= 1 && (
                            <Typography variant="body2" color="text.secondary">
                              No other tags
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewUsersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TagManagement;