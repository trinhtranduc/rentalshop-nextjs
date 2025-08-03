'use client'

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "../button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../card";
import { Input } from "../input";

// Types for the forget password form
interface ForgetPasswordFormData {
  email: string;
}

interface ForgetPasswordFormProps {
  onResetPassword?: (data: ForgetPasswordFormData) => Promise<void>;
  onNavigate?: (path: string) => void;
  error?: string | null;
  loading?: boolean;
  success?: boolean;
}

const ForgetPasswordForm: React.FC<ForgetPasswordFormProps> = ({
  onResetPassword,
  onNavigate,
  error,
  loading = false,
  success = false,
}) => {
  const [emailSent, setEmailSent] = useState(false);

  // Validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email("Please enter a valid email")
      .required("Please enter your email"),
  });

  const validation = useFormik<ForgetPasswordFormData>({
    enableReinitialize: true,
    initialValues: {
      email: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values: ForgetPasswordFormData) => {
      try {
        if (onResetPassword) {
          await onResetPassword(values);
          setEmailSent(true);
        } else {
          // Fallback: log the data
          console.log("Reset password data:", values);
          setEmailSent(true);
        }
      } catch (error) {
        console.error("Password reset failed:", error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validation.handleSubmit();
  };

  if (emailSent || success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-block">
              <div className="h-12 w-12 mx-auto bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-800">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              We've sent you a password reset link
            </p>
          </div>

          {/* Success Card */}
          <Card className="shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Email sent successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                We've sent a password reset link to{" "}
                <span className="font-medium">{validation.values.email}</span>
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    validation.resetForm();
                  }}
                  className="w-full"
                >
                  Send another email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.("/login")}
                  className="w-full"
                >
                  Back to login
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} RentalShop. Crafted with{" "}
              <span className="text-red-500">❤</span> by RentalShop
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-block">
            <div className="h-12 w-12 mx-auto bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Reset Password Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <CardTitle className="text-xl font-semibold text-gray-800">
              Reset your password
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              We'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg flex items-center">
                  <div className="w-4 h-4 mr-2">⚠️</div>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      value={validation.values.email || ""}
                      name="email"
                    />
                  </div>
                  {validation.touched.email && validation.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {validation.errors.email}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending reset link...
                    </div>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate?.("/login")}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 bg-transparent border-0 p-0 font-inherit cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} RentalShop. Crafted with{" "}
            <span className="text-red-500">❤</span> by RentalShop
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgetPasswordForm; 