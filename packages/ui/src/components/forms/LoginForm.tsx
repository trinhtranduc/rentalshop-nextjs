'use client'

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Logo } from "@rentalshop/ui";
import { useAuthTranslations } from "@rentalshop/hooks";
import { isValidEmail } from "@rentalshop/utils";
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
      .required(() => {
        try {
          return t('register.emailRequired') || t('emailRequired') || 'Email is required';
        } catch {
          return 'Email is required';
        }
      })
      .test('email-format', () => {
        try {
          return t('login.invalidEmail') || t('validation.email') || 'Invalid email format';
        } catch {
          return 'Invalid email format';
        }
      }, (value) => {
        if (!value) return false;
        return isValidEmail(value);
      }),
    password: Yup.string()
      .min(6, () => {
        try {
          return t('login.invalidPassword') || t('validation.password.minLength') || 'Password must be at least 6 characters';
        } catch {
          return 'Password must be at least 6 characters';
        }
      })
      .required(() => {
        try {
          return t('login.invalidPassword') || t('validation.password.required') || 'Password is required';
        } catch {
          return 'Password is required';
        }
      }),
  });

  const validation = useFormik<LoginFormData>({
    enableReinitialize: true,
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: validationSchema,
    validateOnBlur: true,
    validateOnChange: true,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-15px) translateX(5px); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-30px) translateX(-20px) scale(1.1); }
        }
        
        @keyframes rotate-move {
          0% { transform: rotate(0deg) translate(-50%, -50%); }
          25% { transform: rotate(90deg) translate(-30%, -70%); }
          50% { transform: rotate(180deg) translate(-50%, -50%); }
          75% { transform: rotate(270deg) translate(-70%, -30%); }
          100% { transform: rotate(360deg) translate(-50%, -50%); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        
        .float-1 { animation: float 8s ease-in-out infinite; }
        .float-2 { animation: float 10s ease-in-out infinite 1s; }
        .float-3 { animation: float 12s ease-in-out infinite 2s; }
        .float-4 { animation: float-slow 15s ease-in-out infinite 0.5s; }
        .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>
      
      {/* Background Pattern - Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #c7d2fe 1.5px, transparent 1.5px)`,
        backgroundSize: '50px 50px',
        opacity: 0.4
      }}></div>
      
      {/* Floating Elements - Giữ như cũ */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
      <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
      <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
      <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
      
      {/* Decorative Shapes - Di chuyển xa hơn */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
        animation: 'rotate-move 30s ease-in-out infinite',
        transformOrigin: 'center'
      }}></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
        animation: 'rotate-move 25s ease-in-out infinite reverse',
        transformOrigin: 'center'
      }}></div>
      
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="compact" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Welcome */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <Logo 
              size="2xl" 
              variant="custom" 
              src="/anyrent-logo-light.svg" 
              showBackground={false}
              blueStroke={true}
            />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            {isAdmin ? "Admin Portal" : t('login.title')}
          </h1>
          <p className="mt-3 text-base text-gray-600 max-w-sm mx-auto">
            {isAdmin ? "Access your admin dashboard" : t('login.subtitle')}
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center">
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
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                    <p className="mt-2 text-sm text-red-600">
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
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 h-auto w-auto p-0"
                    >
                      {viewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  {validation.touched.password && validation.errors.password && (
                    <p className="mt-2 text-sm text-red-600">
                      {validation.errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="h-4 w-4 text-blue-700 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember" className="ml-3 text-sm font-medium text-gray-700">
                      {t('login.rememberMe')}
                    </label>
                  </div>
                  <Button
                    type="button"
                    tabIndex={-1}
                    variant="link"
                    onClick={() => onNavigate?.("/forget-password")}
                    className="text-sm text-blue-700 hover:text-blue-800 p-0 h-auto font-medium"
                  >
                    {t('login.forgotPassword')}
                  </Button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
        <div className="mt-8 space-y-3 text-center">
          {!isAdmin && (
            <p className="text-sm text-gray-600">
              {t('login.noAccount')}{" "}
              <Button
                variant="link"
                onClick={() => onNavigate?.("/register")}
                className="font-semibold text-blue-700 hover:text-blue-800 hover:underline p-0 h-auto text-sm"
              >
                {t('login.signUp')}
              </Button>
            </p>
          )}

          {/* Terms & Privacy Links */}
          <p className="text-xs text-gray-500">
            <Button
              variant="link"
              type="button"
              onClick={() => onNavigate?.("/terms")}
              className="p-0 h-auto text-xs text-gray-500 hover:text-blue-700 hover:underline"
            >
              {t('termsOfService')}
            </Button>
            <span className="mx-1">•</span>
            <Button
              variant="link"
              type="button"
              onClick={() => onNavigate?.("/privacy")}
              className="p-0 h-auto text-xs text-gray-500 hover:text-blue-700 hover:underline"
            >
              {t('privacyPolicy')}
            </Button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {isAdmin ? "AnyRent Admin" : "AnyRent"}. Crafted with{" "}
            <span className="text-red-500">❤</span> by AnyRent
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 