'use client'

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from "@rentalshop/ui";
import { useAuthTranslations } from "@rentalshop/hooks";
import { LanguageSwitcher } from "../layout/LanguageSwitcher";

// Types for the login form
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onLogin?: (data: LoginFormData) => Promise<void>;
  onNavigate?: (path: string) => void;
  error?: string | null;
  loading?: boolean;
  isAdmin?: boolean;
  onInputChange?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onNavigate,
  error,
  loading = false,
  isAdmin = false,
  onInputChange,
}) => {
  const [viewPass, setViewPass] = useState(false);
  const t = useAuthTranslations();

  // Validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('login.invalidEmail'))
      .required(t('login.invalidEmail')),
    password: Yup.string()
      .min(6, t('login.invalidPassword'))
      .required(t('login.invalidPassword')),
  });

  const validation = useFormik<LoginFormData>({
    enableReinitialize: true,
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values: LoginFormData) => {
      try {
        if (onLogin) {
          await onLogin(values);
        } else {
          // Fallback: log the data
          console.log("Login data:", values);
        }
      } catch (error) {
        console.error("Login failed:", error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validation.handleSubmit();
  };

  const togglePasswordVisibility = () => {
    setViewPass(!viewPass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="compact" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-block">
            <div className="h-12 w-12 mx-auto bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-800">
            {isAdmin ? "Admin Login" : t('login.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isAdmin ? "Sign in to admin panel" : t('login.subtitle')}
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {isAdmin ? "Admin Sign In" : t('login.title')}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {t('login.subtitle')}
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
                    {t('login.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder={t('login.email')}
                      className="pl-10"
                      onChange={(e) => {
                        validation.handleChange(e);
                        onInputChange?.();
                      }}
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

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type={viewPass ? "text" : "password"}
                      placeholder={t('login.password')}
                      className="pl-10 pr-10"
                      onChange={(e) => {
                        validation.handleChange(e);
                        onInputChange?.();
                      }}
                      onBlur={validation.handleBlur}
                      value={validation.values.password || ""}
                      name="password"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-1 top-1 p-1 text-gray-400 hover:text-gray-600 h-auto w-auto"
                      onClick={togglePasswordVisibility}
                    >
                      {viewPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {validation.touched.password && validation.errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {validation.errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                    {t('login.rememberMe')}
                  </label>
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
                      {t('login.loginButton')}...
                    </div>
                  ) : (
                    t('login.loginButton')
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          {!isAdmin && (
            <p className="text-sm text-gray-600">
              {t('login.noAccount')}{" "}
              <Button
                variant="link"
                onClick={() => onNavigate?.("/register")}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline p-0 h-auto"
              >
                {t('login.signUp')}
              </Button>
            </p>
          )}
          
          <p className="text-sm text-gray-600">
            <Button
              variant="link"
              onClick={() => onNavigate?.("/forget-password")}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline p-0 h-auto"
            >
              {t('login.forgotPassword')}
            </Button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {isAdmin ? "RentalShop Admin" : "RentalShop"}. Crafted with{" "}
            <span className="text-red-500">❤</span> by RentalShop
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 