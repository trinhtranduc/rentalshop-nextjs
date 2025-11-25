'use client'

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button, Card, CardContent, Input, Logo, LanguageSwitcher } from "@rentalshop/ui";
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

        <div className="w-full max-w-md relative z-10">
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
              {t('forgotPassword.checkEmail')}
            </h1>
            <p className="mt-3 text-base text-gray-600 max-w-sm mx-auto">
              {t('forgotPassword.checkEmail')}
            </p>
          </div>

          {/* Success Card */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('forgotPassword.success')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('forgotPassword.checkEmail')}{" "}
                <span className="font-medium text-gray-900">{validation.values.email}</span>
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Vui lòng kiểm tra hộp thư đến và làm theo hướng dẫn trong email để đặt lại mật khẩu của bạn.
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
              © {new Date().getFullYear()} AnyRent. Crafted with{" "}
              <span className="text-red-500">❤</span> by AnyRent
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
            {t('forgotPassword.title')}
          </h1>
          <p className="mt-3 text-base text-gray-600 max-w-sm mx-auto">
            {t('forgotPassword.subtitle')}
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

              <div className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('forgotPassword.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                    <p className="mt-2 text-sm text-red-600">
                      {validation.errors.email}
                    </p>
                  )}
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
        <div className="mt-8 text-center">
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
            © {new Date().getFullYear()} AnyRent. Crafted with{" "}
            <span className="text-red-500">❤</span> by AnyRent
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgetPasswordForm; 