'use client'

import React from "react";
import { RegisterForm } from "@rentalshop/ui";

const AdminRegisterPage = () => {
  const handleRegister = async (data: any) => {
    console.log('Register:', data);
    // TODO: Implement register logic
  };

  return (
    <RegisterForm
      onRegister={handleRegister}
    />
  );
};

export default AdminRegisterPage; 