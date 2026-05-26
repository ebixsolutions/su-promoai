import React, { createContext, useContext, useState } from 'react';

const ROLES = ['Admin', 'Manager', 'Analyst'];
const STORAGE_KEY = 'promo_ai_role';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'Admin';
  });

  const setRole = (r) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRoleState(r);
  };

  const can = (action) => {
    if (role === 'Admin') return true;
    if (role === 'Manager') return ['create', 'submit', 'view', 'simulate'].includes(action);
    if (role === 'Analyst') return ['view', 'simulate'].includes(action);
    return false;
  };

  return <RoleContext.Provider value={{ role, setRole, roles: ROLES, can }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}