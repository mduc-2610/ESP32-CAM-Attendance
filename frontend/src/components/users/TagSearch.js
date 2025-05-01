import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Autocomplete, 
  CircularProgress,
  Chip,
  Button,
  Grid,
  Paper
} from '@mui/material';
import { tagService } from '../../services/api';
import { toast } from 'react-toastify';
import { Add as AddIcon } from '@mui/icons-material';

const TagSearch = ({ 
  onTagSelect, 
  selectedTags = [], 
  label = "Search Tags", 
  placeholder = "Search for tags",
  allowCreate = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  
  // Load all tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const data = await tagService.getAllTags();
        setOptions(data);
      } catch (error) {
        toast.error('Failed to load tags');
        console.error('Error loading tags:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTags();
  }, []);
  
  // Search tags when input changes
  const handleInputChange = async (event, newInputValue) => {
    setInputValue(newInputValue);
    
    if (newInputValue.length < 2) return;
    
    try {
      setLoading(true);
      const data = await tagService.searchTags(newInputValue);
      setOptions(data);
    } catch (error) {
      console.error('Error searching tags:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }
    
    // Check if tag already exists
    if (options.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase())) {
      toast.error('Tag already exists');
      return;
    }
    
    try {
      setLoading(true);
      const newTag = await tagService.createTag({ name: newTagName });
      
      setOptions([...options, newTag]);
      setNewTagName('');
      
      if (onTagSelect) {
        onTagSelect(newTag);
      }
      
      toast.success('Tag created successfully');
    } catch (error) {
      toast.error('Failed to create tag');
      console.error('Error creating tag:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Autocomplete
        id="tag-search"
        options={options}
        getOptionLabel={(option) => option.name}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={(event, newValue) => {
          if (newValue && onTagSelect) {
            onTagSelect(newValue);
          }
          setInputValue('');
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionDisabled={(option) => selectedTags.some(tag => tag.id === option.id)}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      
      {allowCreate && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="New Tag Name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Enter a new tag name"
          />
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || loading}
          >
            Add
          </Button>
        </Box>
      )}
      
      {selectedTags.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Tags:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedTags.map(tag => (
              <Chip
                key={tag.id}
                label={tag.name}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TagSearch;