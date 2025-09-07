'use client';

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock, User, Store, MapPin, Phone, CheckCircle } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from "@rentalshop/ui";

// Types for the registration form
interface RegisterFormData {
  login: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  acceptTermsAndPrivacy: boolean;
  // Role is always MERCHANT for public registration
  role: 'MERCHANT';
  // For merchant registration
  businessName?: string;
  outletName?: string;
  // For outlet staff registration
  merchantCode?: string;
  outletCode?: string;
}

interface Step1Values {
  login: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  businessName: string;
  acceptTermsAndPrivacy: boolean;
}

interface Step2Values {
  outletName: string;
}

interface RegisterFormProps {
  onRegister?: (data: RegisterFormData) => Promise<void>;
  onNavigate?: (path: string) => void;
  user?: any;
  registrationError?: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigate,
  user,
  registrationError
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [viewPass, setViewPass] = useState(false);
  const [viewConfirmPass, setViewConfirmPass] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    login: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    businessName: "",
    acceptTermsAndPrivacy: false,
    role: 'MERCHANT',
  });

  // Step 1 validation schema (Account + Personal + Business)
  const step1ValidationSchema = Yup.object({
    login: Yup.string()
      .email("Please enter a valid email")
      .required("Please Enter Your Email"),
    password: Yup.string()
      .min(6, "Your password must be at least 6 characters")
      .max(25, "Your password must be at most 25 characters")
      .required("Please enter user password"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Password does not match")
      .required("Please confirm your password"),
    name: Yup.string()
      .min(2, "Name must be at least 2 characters")
      .required("Please Enter Your Name"),
    phone: Yup.string()
      .matches(/^[0-9+\-\s()]+$/, "Please enter a valid phone number")
      .min(10, "Phone number must be at least 10 digits")
      .required("Please Enter Phone Number"),
    businessName: Yup.string()
      .min(2, "Business name must be at least 2 characters")
      .required("Please Enter Business Name"),
    acceptTermsAndPrivacy: Yup.boolean()
      .oneOf([true], "You must accept the Terms of Service and Privacy Policy")
      .required("You must accept the Terms of Service and Privacy Policy"),
  });

  const step1Validation = useFormik<Step1Values>({
    enableReinitialize: true,
    initialValues: {
      login: formData.login,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      name: formData.name,
      phone: formData.phone,
      businessName: formData.businessName || "",
      acceptTermsAndPrivacy: formData.acceptTermsAndPrivacy,
    },
    validationSchema: step1ValidationSchema,
    onSubmit: (values: Step1Values) => {
      setFormData({ ...formData, ...values });
      setCurrentStep(2);
    },
  });

  // Step 2 validation schema (Outlet setup)
  const step2ValidationSchema = Yup.object({
    outletName: Yup.string()
      .min(2, "Outlet name must be at least 2 characters")
      .required("Please Enter Outlet Name"),
  });

  const step2Validation = useFormik<Step2Values>({
    enableReinitialize: true,
    initialValues: {
      outletName: formData.outletName || 'Main Store',
    },
    validationSchema: step2ValidationSchema,
    onSubmit: async (values: Step2Values) => {
      handleFinalSubmit({ ...formData, ...values });
    },
  });


  const handleFinalSubmit = async (finalData: RegisterFormData) => {
    try {
      if (onRegister) {
        await onRegister(finalData);
      } else {
        console.log("Registering with data:", finalData);
      }
      
      // Reset form
      setFormData({
        login: "",
        password: "",
        confirmPassword: "",
        name: "",
        phone: "",
        businessName: "",
        acceptTermsAndPrivacy: false,
        role: 'MERCHANT',
      });
      setCurrentStep(1);
      
      // Navigate to login
      if (onNavigate) {
        setTimeout(() => {
          onNavigate("/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    step1Validation.handleSubmit();
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    step2Validation.handleSubmit();
  };


  const goBackToStep1 = () => {
    setCurrentStep(1);
  };

  const openPrivacyPolicy = () => {
    const urlString = "https://rentalshop.org/privacy-policy/";
    if (typeof window !== 'undefined') {
      window.open(urlString, "_blank");
    }
  };

  const openTermsOfService = () => {
    const urlString = "https://rentalshop.org/terms-of-service";
    if (typeof window !== 'undefined') {
      window.open(urlString, "_blank");
    }
  };

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
            Start Your Rental Business
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Join thousands of successful rental businesses with our 14-day free trial
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Account & Business</span>
            </div>
            <div className="text-gray-400">→</div>
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Outlet Setup</span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {user && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Register User Successfully
          </div>
        )}

        {/* Error Message */}
        {registrationError && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg">
            {registrationError}
          </div>
        )}

        {/* Register Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <CardTitle className="text-xl font-semibold text-gray-800">
              {currentStep === 1 ? "Create Your Account" : "Set Up Your First Outlet"}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {currentStep === 1 ? "Enter your details to start your free trial" : "Name your first outlet location"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {currentStep === 1 ? (
              <form onSubmit={handleStep1Submit}>
                <div className="space-y-4">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login"
                        name="login"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        onChange={step1Validation.handleChange}
                        onBlur={step1Validation.handleBlur}
                        value={step1Validation.values.login || ""}
                      />
                    </div>
                    {step1Validation.touched.login && step1Validation.errors.login && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.login}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type={viewPass ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        onChange={step1Validation.handleChange}
                        onBlur={step1Validation.handleBlur}
                        value={step1Validation.values.password || ""}
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => setViewPass(!viewPass)}
                      >
                        {viewPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {step1Validation.touched.password && step1Validation.errors.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={viewConfirmPass ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10"
                        onChange={step1Validation.handleChange}
                        onBlur={step1Validation.handleBlur}
                        value={step1Validation.values.confirmPassword || ""}
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => setViewConfirmPass(!viewConfirmPass)}
                      >
                        {viewConfirmPass ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {step1Validation.touched.confirmPassword && step1Validation.errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        className="pl-10"
                        onChange={step1Validation.handleChange}
                        onBlur={step1Validation.handleBlur}
                        value={step1Validation.values.name || ""}
                      />
                    </div>
                    {step1Validation.touched.name && step1Validation.errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.name}
                      </p>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        className="pl-10"
                        onChange={step1Validation.handleChange}
                        onBlur={step1Validation.handleBlur}
                        value={step1Validation.values.phone || ""}
                      />
                    </div>
                    {step1Validation.touched.phone && step1Validation.errors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Business Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="businessName"
                        name="businessName"
                        type="text"
                        placeholder="Enter your business name"
                        className="pl-10"
                        onChange={step1Validation.handleChange}
                        onBlur={step1Validation.handleBlur}
                        value={step1Validation.values.businessName || ""}
                      />
                    </div>
                    {step1Validation.touched.businessName && step1Validation.errors.businessName && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.businessName}
                      </p>
                    )}
                  </div>

                  {/* Terms and Privacy */}
                  <div>
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="acceptTermsAndPrivacy"
                          name="acceptTermsAndPrivacy"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          onChange={step1Validation.handleChange}
                          onBlur={step1Validation.handleBlur}
                          checked={step1Validation.values.acceptTermsAndPrivacy || false}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="acceptTermsAndPrivacy" className="text-gray-600">
                          I agree to the{" "}
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-0 p-0 font-inherit cursor-pointer"
                          >
                            Terms of Service
                          </button>{" "}
                          and{" "}
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-0 p-0 font-inherit cursor-pointer"
                          >
                            Privacy Policy
                          </button>
                        </label>
                      </div>
                    </div>
                    {step1Validation.touched.acceptTermsAndPrivacy && step1Validation.errors.acceptTermsAndPrivacy && (
                      <p className="mt-1 text-sm text-red-600">
                        {step1Validation.errors.acceptTermsAndPrivacy}
                      </p>
                    )}
                  </div>

                  {/* Next Button */}
                  <Button type="submit" className="w-full">
                    Continue
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleStep2Submit}>
                <div className="space-y-4">
                  {/* Outlet Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Outlet Name
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="outletName"
                        name="outletName"
                        type="text"
                        placeholder="Main Store / Downtown Location"
                        className="pl-10"
                        onChange={step2Validation.handleChange}
                        onBlur={step2Validation.handleBlur}
                        value={step2Validation.values.outletName || ""}
                      />
                    </div>
                    {step2Validation.touched.outletName && step2Validation.errors.outletName && (
                      <p className="mt-1 text-sm text-red-600">
                        {step2Validation.errors.outletName}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      This will be your first outlet. You can add more locations later.
                    </p>
                  </div>

                  {/* Trial Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Your merchant account will be created</li>
                      <li>• A default outlet will be set up</li>
                      <li>• You'll get a 14-day free trial</li>
                      <li>• You can access both web and mobile apps</li>
                    </ul>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCurrentStep(1)}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Start Free Trial
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => onNavigate?.("/login")}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-0 p-0 font-inherit cursor-pointer"
            >
              Sign in
            </button>
          </p>
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

export default RegisterForm;
