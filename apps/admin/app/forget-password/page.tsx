'use client'

import React from "react";
import { useDispatch } from "react-redux";
import { ForgetPasswordForm } from "@rentalshop/ui";
import { forgetPassword } from "../../store/actions";

import logo from "../../assets/images/logo.jpg";

const AdminForgetPasswordPage = () => {
  const dispatch = useDispatch();

  const handleForgetPassword = (values: any) => {
    dispatch(forgetPassword(values));
  };

  return (
    <ForgetPasswordForm
      logo={logo}
      title="Admin Forgot Password"
      subtitle="Reset admin password"
      cardTitle="Reset Admin Password"
      cardDescription="Enter your email and instructions will be sent to you!"
      onForgetPassword={handleForgetPassword}
      isAdmin={true}
    />
  );
};

export default AdminForgetPasswordPage; 