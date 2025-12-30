'use client'

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button, Card, CardContent, Input, Logo, LanguageSwitcher } from "@rentalshop/ui";
import { useAuthTranslations } from "@rentalshop/hooks";

// Types for the reset password form
interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  token: string;
  onResetPassword?: (data: ResetPasswordFormData & { token: string }) => Promise<void>;
  onNavigate?: (path: string) => void;
  error?: string | null;
  loading?: boolean;
  success?: boolean;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onResetPassword,
  onNavigate,
  error,
  loading = false,
  success = false,
}) => {
  const [passwordReset, setPasswordReset] = useState(false);
  const [viewPassword, setViewPassword] = useState(false);
  const [viewConfirmPassword, setViewConfirmPassword] = useState(false);
  const t = useAuthTranslations();

  // Validation schema
  const validationSchema = Yup.object({
    password: Yup.string()
      .min(6, t('resetPassword.passwordMinLength'))
      .required(t('resetPassword.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('resetPassword.passwordMismatch'))
      .required(t('resetPassword.confirmPasswordRequired')),
  });

  const validation = useFormik<ResetPasswordFormData>({
    enableReinitialize: true,
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values: ResetPasswordFormData) => {
      try {
        if (onResetPassword) {
          await onResetPassword({ ...values, token });
          setPasswordReset(true);
        } else {
          // Fallback: log the data
          console.log("Reset password data:", values);
          setPasswordReset(true);
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

  if (passwordReset || success) {
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
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
        <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
        <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
        
        {/* Decorative Shapes */}
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

        <div className="w-full max-w-lg relative z-10">
          {/* Logo */}
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
              {t('resetPassword.success')}
            </h1>
            <p className="mt-3 text-base text-gray-600 max-w-sm mx-auto">
              {t('resetPassword.success')}
            </p>
          </div>

          {/* Success Card */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('resetPassword.success')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {t('resetPassword.successMessage')}
              </p>
              
              <div className="space-y-3">
                <Button
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
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
      <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
      <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
      <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
      
      {/* Decorative Shapes */}
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

      <div className="w-full max-w-lg relative z-10">
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
            {t('resetPassword.title')}
          </h1>
          <p className="mt-3 text-base text-gray-600 max-w-sm mx-auto">
            {t('resetPassword.subtitle')}
          </p>
        </div>

        {/* Reset Password Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <div className="w-4 h-4 mr-2">⚠️</div>
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('resetPassword.password')}
                  </label>
                  <div className="relative w-full">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type={viewPassword ? "text" : "password"}
                      placeholder={t('resetPassword.password')}
                      className="pl-10 pr-10 w-full"
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      value={validation.values.password || ""}
                      name="password"
                    />
                    <button
                      type="button"
                      onClick={() => setViewPassword(!viewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {viewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {validation.touched.password && validation.errors.password && (
                    <p className="mt-2 text-sm text-red-600">
                      {validation.errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('resetPassword.confirmPassword')}
                  </label>
                  <div className="relative w-full">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type={viewConfirmPassword ? "text" : "password"}
                      placeholder={t('resetPassword.confirmPassword')}
                      className="pl-10 pr-10 w-full"
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      value={validation.values.confirmPassword || ""}
                      name="confirmPassword"
                    />
                    <button
                      type="button"
                      onClick={() => setViewConfirmPassword(!viewConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {viewConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {validation.touched.confirmPassword && validation.errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">
                      {validation.errors.confirmPassword}
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
                      {t('resetPassword.resetButton')}...
                    </div>
                  ) : (
                    t('resetPassword.resetButton')
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

export default ResetPasswordForm;

