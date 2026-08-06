import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const getStoredUsers = () => {
  const users = localStorage.getItem('petly_users');
  return users ? JSON.parse(users) : [];
};

const saveStoredUsers = (users) => {
  localStorage.setItem('petly_users', JSON.stringify(users));
};

const findUserByIdentifier = (identifier, users) => {
  return users.find(
    (user) => user.email === identifier || user.phone === identifier
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('petly_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signup = (userData) => {
    const users = getStoredUsers();

    if (users.some((existingUser) => existingUser.email === userData.email)) {
      throw new Error('Email already registered.');
    }

    if (users.some((existingUser) => existingUser.phone === userData.phone)) {
      throw new Error('Phone number already in use.');
    }

    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const newUser = {
      ...userData,
      id: Date.now(),
      profilePic: userData.profilePic || '',
      bio: 'Proud PETLY parent ✨',
      createdAt: new Date().toISOString(),
      wishlistPets: [],
      wishlistProducts: [],
      savedPostIds: [],
      adoptedPets: [],
      bookings: [],
      healthRecords: [],
      quizHistory: [],
      aiConversations: []
    };

    const nextUsers = [...users, newUser];
    saveStoredUsers(nextUsers);
    login(userData.email, userData.password);
    return newUser;
  };

  const login = (identifier, password) => {
    const users = getStoredUsers();
    const foundUser = users.find(
      (storedUser) =>
        (storedUser.email === identifier || storedUser.phone === identifier) &&
        storedUser.password === password
    );

    if (!foundUser) {
      throw new Error('Invalid credentials.');
    }

    setUser(foundUser);
    localStorage.setItem('petly_current_user', JSON.stringify(foundUser));
    return foundUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('petly_current_user');
  };

  const resetPassword = (identifier, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex(
      (storedUser) =>
        storedUser.email === identifier || storedUser.phone === identifier
    );

    if (userIndex === -1) {
      throw new Error('No account found for that email or phone number.');
    }

    users[userIndex] = {
      ...users[userIndex],
      password: newPassword
    };
    saveStoredUsers(users);

    if (user && (user.email === identifier || user.phone === identifier)) {
      setUser(users[userIndex]);
      localStorage.setItem('petly_current_user', JSON.stringify(users[userIndex]));
    }

    return users[userIndex];
  };

  const updateUser = (updatedData) => {
    const users = getStoredUsers();
    if (!user) return;

    const updatedUser = { ...user, ...updatedData };
    const nextUsers = users.map((storedUser) =>
      storedUser.id === user.id ? updatedUser : storedUser
    );

    saveStoredUsers(nextUsers);
    setUser(updatedUser);
    localStorage.setItem('petly_current_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        logout,
        resetPassword,
        updateUser
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
