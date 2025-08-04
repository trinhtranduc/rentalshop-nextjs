'use client'

import React from "react";
import { LoginForm } from "@rentalshop/ui";

const AdminLoginPage = () => {
  const handleLogin = async (values: any) => {
    console.log('Login:', values);
    // TODO: Implement login logic
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      isAdmin={true}
    />
  );
};

export default AdminLoginPage; 