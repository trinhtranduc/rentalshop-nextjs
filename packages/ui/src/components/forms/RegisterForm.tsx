'use client';

import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock, User, Store, Phone, CheckCircle, MapPin } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, ToastContainer, useToasts } from "@rentalshop/ui";
import { authApi } from "@rentalshop/utils";

// Types for the registration form
interface RegisterFormData {
  login: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  businessName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  acceptTermsAndPrivacy: boolean;
  // Role is always MERCHANT for public registration
  role: 'MERCHANT';
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
  const [viewPass, setViewPass] = useState(false);
  const [viewConfirmPass, setViewConfirmPass] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [accountData, setAccountData] = useState<Partial<RegisterFormData>>({});
  const { toasts, showSuccess, showError, removeToast } = useToasts();

  // Step 1 validation schema (Account Information)
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
  });

  // Step 2 validation schema (Business Information)
  const step2ValidationSchema = Yup.object({
    businessName: Yup.string()
      .min(2, "Business name must be at least 2 characters")
      .required("Please Enter Business Name"),
    address: Yup.string()
      .min(5, "Address must be at least 5 characters")
      .required("Please Enter Business Address"),
    city: Yup.string()
      .min(2, "City must be at least 2 characters")
      .required("Please Enter City"),
    state: Yup.string()
      .min(2, "State must be at least 2 characters")
      .required("Please Enter State"),
    zipCode: Yup.string()
      .matches(/^[0-9]{5}(-[0-9]{4})?$/, "Please enter a valid ZIP code")
      .required("Please Enter ZIP Code"),
    country: Yup.string()
      .min(2, "Country must be at least 2 characters")
      .required("Please Enter Country"),
    acceptTermsAndPrivacy: Yup.boolean()
      .oneOf([true], "You must accept the Terms of Service and Privacy Policy")
      .required("You must accept the Terms of Service and Privacy Policy"),
  });

  const formik = useFormik<RegisterFormData>({
    initialValues: {
      login: "",
      password: "",
      confirmPassword: "",
      name: "",
      phone: "",
      businessName: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      acceptTermsAndPrivacy: false,
      role: 'MERCHANT',
    },
    validationSchema: currentStep === 1 ? step1ValidationSchema : step2ValidationSchema,
    onSubmit: async (values: RegisterFormData) => {
      try {
        if (currentStep === 1) {
          // Step 1: Save account data and move to step 2
          setAccountData({
            login: values.login,
            password: values.password,
            confirmPassword: values.confirmPassword,
            name: values.name,
            phone: values.phone,
            role: values.role,
          });
          setCurrentStep(2);
          return;
        }

        // Step 2: Complete registration with all data
        const completeData = { ...accountData, ...values };
        
        if (onRegister) {
          // Use the provided onRegister function (from parent component)
          await onRegister(completeData as RegisterFormData);
          
          // Show success toast
          showSuccess(
            "Registration Successful! 🎉",
            "Your merchant account has been created. You can now access both web and mobile apps."
          );
          
          // Reset form
          formik.resetForm();
          setCurrentStep(1);
          setAccountData({});
          
          // Navigate to login after showing success message
          if (onNavigate) {
            setTimeout(() => {
              onNavigate("/login");
            }, 3000); // Give time to see the success message
          }
        } else {
          // Fallback: Use centralized API directly
          const registrationData = {
            email: completeData.login!,
            password: completeData.password!,
            name: completeData.name!,
            phone: completeData.phone!,
            role: completeData.role!,
            businessName: values.businessName,
            address: values.address,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
            country: values.country,
            // Default outlet name to business name
            outletName: values.businessName,
          };
          
          const result = await authApi.register(registrationData);
          
          if (!result.success) {
            throw new Error(result.message || 'Registration failed');
          }
          
          // Store token in localStorage
          if (result.data?.token) {
            localStorage.setItem('authToken', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.user));
          }
          
          showSuccess("Registration Complete!", "Account created successfully.");
          
          // Reset form
          formik.resetForm();
          setCurrentStep(1);
          setAccountData({});
          
          // Navigate to login
          if (onNavigate) {
            setTimeout(() => {
              onNavigate("/login");
            }, 2000);
          }
        }
      } catch (error: any) {
        console.error("Registration failed:", error);
        
        // Show error toast
        showError(
          "Registration Failed",
          error.message || "Something went wrong. Please try again."
        );
      }
    },
  });

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Create Merchant Account
          </CardTitle>
          <CardDescription className="text-gray-600">
            {currentStep === 1 
              ? "Step 1: Create your account" 
              : "Step 2: Business information"
            }
          </CardDescription>
          
          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Account</span>
            </div>
            <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Business</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Step 1: Account Information */}
            {currentStep === 1 && (
              <>
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="login" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="login"
                      name="login"
                      type="email"
                      placeholder="Enter your email"
                      value={formik.values.login}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 ${formik.errors.login && formik.touched.login ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formik.errors.login && formik.touched.login && (
                    <p className="text-red-500 text-sm">{formik.errors.login}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="password"
                      name="password"
                      type={viewPass ? "text" : "password"}
                      placeholder="Create a password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 pr-10 ${formik.errors.password && formik.touched.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setViewPass(!viewPass)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {viewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formik.errors.password && formik.touched.password && (
                    <p className="text-red-500 text-sm">{formik.errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={viewConfirmPass ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 pr-10 ${formik.errors.confirmPassword && formik.touched.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setViewConfirmPass(!viewConfirmPass)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {viewConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formik.errors.confirmPassword && formik.touched.confirmPassword && (
                    <p className="text-red-500 text-sm">{formik.errors.confirmPassword}</p>
                  )}
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 ${formik.errors.name && formik.touched.name ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formik.errors.name && formik.touched.name && (
                    <p className="text-red-500 text-sm">{formik.errors.name}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 ${formik.errors.phone && formik.touched.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formik.errors.phone && formik.touched.phone && (
                    <p className="text-red-500 text-sm">{formik.errors.phone}</p>
                  )}
                </div>

                {/* Submit Button for Step 1 */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                  disabled={formik.isSubmitting}
                >
                  {formik.isSubmitting ? 'Validating...' : 'Continue to Business Info'}
                </Button>
              </>
            )}

            {/* Step 2: Business Information */}
            {currentStep === 2 && (
              <>
                {/* Business Name Field */}
                <div className="space-y-2">
                  <label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="businessName"
                      name="businessName"
                      type="text"
                      placeholder="Enter your business name"
                      value={formik.values.businessName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 ${formik.errors.businessName && formik.touched.businessName ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formik.errors.businessName && formik.touched.businessName && (
                    <p className="text-red-500 text-sm">{formik.errors.businessName}</p>
                  )}
                </div>

                {/* Address Field */}
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Enter your business address"
                      value={formik.values.address}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 ${formik.errors.address && formik.touched.address ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {formik.errors.address && formik.touched.address && (
                    <p className="text-red-500 text-sm">{formik.errors.address}</p>
                  )}
                </div>

                {/* City and State Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">
                      City
                    </label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="City"
                      value={formik.values.city}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.errors.city && formik.touched.city ? 'border-red-500' : ''}
                    />
                    {formik.errors.city && formik.touched.city && (
                      <p className="text-red-500 text-sm">{formik.errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="state" className="text-sm font-medium text-gray-700">
                      State
                    </label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="State"
                      value={formik.values.state}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.errors.state && formik.touched.state ? 'border-red-500' : ''}
                    />
                    {formik.errors.state && formik.touched.state && (
                      <p className="text-red-500 text-sm">{formik.errors.state}</p>
                    )}
                  </div>
                </div>

                {/* ZIP Code and Country Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
                      ZIP Code
                    </label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      placeholder="12345"
                      value={formik.values.zipCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.errors.zipCode && formik.touched.zipCode ? 'border-red-500' : ''}
                    />
                    {formik.errors.zipCode && formik.touched.zipCode && (
                      <p className="text-red-500 text-sm">{formik.errors.zipCode}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <Input
                      id="country"
                      name="country"
                      type="text"
                      placeholder="Country"
                      value={formik.values.country}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.errors.country && formik.touched.country ? 'border-red-500' : ''}
                    />
                    {formik.errors.country && formik.touched.country && (
                      <p className="text-red-500 text-sm">{formik.errors.country}</p>
                    )}
                  </div>
                </div>

                {/* Terms and Privacy Checkbox */}
                <div className="space-y-2">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      name="acceptTermsAndPrivacy"
                      checked={formik.values.acceptTermsAndPrivacy}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  {formik.errors.acceptTermsAndPrivacy && formik.touched.acceptTermsAndPrivacy && (
                    <p className="text-red-500 text-sm">{formik.errors.acceptTermsAndPrivacy}</p>
                  )}
                </div>

                {/* Trial Benefits */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Free Trial Includes:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                      Full access to all features
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                      Default outlet: "{formik.values.businessName || 'Your Business'}"
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                      Mobile app access
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                      No credit card required
                    </li>
                  </ul>
                </div>

                {/* Navigation Buttons for Step 2 */}
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    disabled={formik.isSubmitting}
                  >
                    {formik.isSubmitting ? 'Creating Account...' : 'Create Merchant Account'}
                  </Button>
                </div>
              </>
            )}

            {/* Error Display */}
            {registrationError && (
              <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                {registrationError}
              </div>
            )}

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate?.('/login')}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default RegisterForm;