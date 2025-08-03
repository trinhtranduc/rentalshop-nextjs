'use client'

import React from "react";
import { useDispatch } from "react-redux";
import { LoginForm } from "@rentalshop/ui";
import { loginUser } from "../../store/actions";

import logo from "../../assets/images/logo.jpg";

const AdminLoginPage = () => {
  const dispatch = useDispatch();

  const handleLogin = (values: any, router: any) => {
    dispatch(loginUser(values, router));
  };

  return (
    <LoginForm
      logo={logo}
      title="Admin Panel"
      subtitle="Sign in to access admin dashboard"
      cardTitle="Admin Sign In"
      cardDescription="Enter your admin credentials"
      showRegisterLink={false}
      showForgetPasswordLink={true}
      onLogin={handleLogin}
      redirectPath="/admin/dashboard"
      isAdmin={true}
    />
  );
};

export default AdminLoginPage; 