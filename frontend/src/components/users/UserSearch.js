import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Autocomplete, 
  CircularProgress,
  Typography
} from '@mui/material';
import { userService } from '../../services/api';
import { toast } from 'react-toastify';

const UserSearch = ({ onUserSelect, selectedUsers = [], label = "Search Users", placeholder = "Search by name, email, or tag" }) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Load all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await userService.getAllUsers();
        setOptions(data);
      } catch (error) {
        toast.error('Failed to load users');
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Search users when input changes
  const handleInputChange = async (event, newInputValue) => {
    setInputValue(newInputValue);
    
    if (newInputValue.length < 2) return;
    
    try {
      setLoading(true);
      const data = await userService.searchUsers(newInputValue);
      setOptions(data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Autocomplete
      id="user-search"
      options={options}
      getOptionLabel={(option) => `${option.name} (${option.tag || 'No Tag'})`}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={(event, newValue) => {
        if (newValue && onUserSelect) {
          onUserSelect(newValue);
        }
        setInputValue('');
      }}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionDisabled={(option) => selectedUsers.some(user => user.id === option.id)}
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
      renderOption={(props, option) => (
        <li {...props}>
          <Box>
            <Typography variant="body1">{option.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {option.email} {option.tag && `| Tag: ${option.tag}`}
            </Typography>
          </Box>
        </li>
      )}
    />
  );
};

export default UserSearch;