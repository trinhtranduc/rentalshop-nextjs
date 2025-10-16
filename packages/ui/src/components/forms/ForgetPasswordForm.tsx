'use client'

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from "@rentalshop/ui";
import { useAuthTranslations } from "@rentalshop/hooks";

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
  const t = useAuthTranslations();

  // Validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('login.invalidEmail'))
      .required(t('login.invalidEmail')),
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
              {t('forgotPassword.checkEmail')}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {t('forgotPassword.checkEmail')}
            </p>
          </div>

          {/* Success Card */}
          <Card className="shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('forgotPassword.success')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {t('forgotPassword.checkEmail')}{" "}
                <span className="font-medium">{validation.values.email}</span>
              </p>
              <p className="text-xs text-gray-500 mb-6">
                {t('forgotPassword.checkEmail')}
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    validation.resetForm();
                  }}
                  className="w-full"
                >
                  {t('forgotPassword.sendButton')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.("/login")}
                  className="w-full"
                >
                  {t('forgotPassword.backToLogin')}
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
            {t('forgotPassword.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        {/* Reset Password Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {t('forgotPassword.title')}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {t('forgotPassword.subtitle')}
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
                    {t('forgotPassword.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder={t('forgotPassword.email')}
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
                      {t('forgotPassword.sendButton')}...
                    </div>
                  ) : (
                    t('forgotPassword.sendButton')
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => onNavigate?.("/login")}
            className="inline-flex items-center text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('forgotPassword.backToLogin')}
          </Button>
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