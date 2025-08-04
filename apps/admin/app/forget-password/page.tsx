'use client'

import React from "react";
import { ForgetPasswordForm } from "@rentalshop/ui";

const AdminForgetPasswordPage = () => {
  const handleForgetPassword = async (values: any) => {
    console.log('Forget password:', values);
    // TODO: Implement forget password logic
  };

  return (
    <ForgetPasswordForm
      onResetPassword={handleForgetPassword}
    />
  );
};

export default AdminForgetPasswordPage; 