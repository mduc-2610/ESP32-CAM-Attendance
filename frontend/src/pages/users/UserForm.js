import React from 'react';
import UserFormComponent from '../../components/users/UserForm';

const UserForm = ({ isEdit }) => {
  return <UserFormComponent isEdit={isEdit} />;
};

export default UserForm;