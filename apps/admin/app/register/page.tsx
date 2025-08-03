'use client'

import React from "react";
import { useDispatch } from "react-redux";
import { RegisterForm } from "@rentalshop/ui";
import { registerUser } from "../../store/actions";

import logo from "../../assets/images/logo.jpg";

const AdminRegisterPage = () => {
  const dispatch = useDispatch();

  const handleRegister = (data: any) => {
    return dispatch(registerUser(data));
  };

  return (
    <RegisterForm
      logo={logo}
      title="Admin Registration"
      subtitle="Create new admin account"
      cardTitle="Create Admin Account"
      cardDescription="Enter admin account details"
      showLoginLink={true}
      onRegister={handleRegister}
      redirectPath="/admin/login"
      isAdmin={true}
    />
  );
};

export default AdminRegisterPage; 