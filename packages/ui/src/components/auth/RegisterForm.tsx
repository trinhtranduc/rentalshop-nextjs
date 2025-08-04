import React, { useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock, User, Store, MapPin, Phone, CheckCircle } from "lucide-react";
import { Button } from "../button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../card";
import { Input } from "../input";

// Types for the registration form
interface RegisterFormData {
  login: string;
  password: string;
  confirmPassword: string;
  name: string;
  store_name: string;
  address: string;
  phone: string;
  acceptTermsAndPrivacy: boolean;
}

interface Step1Values {
  login: string;
  password: string;
  confirmPassword: string;
}

interface Step2Values {
  name: string;
  store_name: string;
  address: string;
  phone: string;
  acceptTermsAndPrivacy: boolean;
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
    store_name: "",
    address: "",
    phone: "",
    acceptTermsAndPrivacy: false,
  });

  // Step 1 validation schema
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
  });

  const step1Validation = useFormik<Step1Values>({
    enableReinitialize: true,
    initialValues: {
      login: formData.login,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    },
    validationSchema: step1ValidationSchema,
    onSubmit: (values: Step1Values) => {
      setFormData({ ...formData, ...values });
      setCurrentStep(2);
    },
  });

  // Step 2 validation schema
  const step2ValidationSchema = Yup.object({
    name: Yup.string().required("Please Enter Your Name"),
    store_name: Yup.string().required("Please Enter Store Name"),
    address: Yup.string().required("Please Enter Address"),
    phone: Yup.string()
      .matches(/^[0-9+\-\s()]+$/, "Please enter a valid phone number")
      .min(10, "Phone number must be at least 10 digits")
      .required("Please Enter Phone Number"),
    acceptTermsAndPrivacy: Yup.boolean()
      .oneOf([true], "You must accept the Terms of Service and Privacy Policy")
      .required("You must accept the Terms of Service and Privacy Policy"),
  });

  const step2Validation = useFormik<Step2Values>({
    enableReinitialize: true,
    initialValues: {
      name: formData.name,
      store_name: formData.store_name,
      address: formData.address,
      phone: formData.phone,
      acceptTermsAndPrivacy: formData.acceptTermsAndPrivacy,
    },
    validationSchema: step2ValidationSchema,
    onSubmit: async (values: Step2Values) => {
      const finalData = { ...formData, ...values };
      
      try {
        if (onRegister) {
          await onRegister(finalData);
        } else {
          // Fallback: log the data
          console.log("Registering with data:", finalData);
        }
        
        // Reset form
        step2Validation.resetForm();
        setFormData({
          login: "",
          password: "",
          confirmPassword: "",
          name: "",
          store_name: "",
          address: "",
          phone: "",
          acceptTermsAndPrivacy: false,
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
    },
  });

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
            Create New Account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Get your free rental shop account now
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
              <span className="text-sm font-medium">Account</span>
            </div>
            <div className="text-gray-400">→</div>
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Store Info</span>
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
              {currentStep === 1 ? "Create Account" : "Store Information"}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1">
              {currentStep === 1 ? "Enter your account details" : "Enter your store information"}
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

                  {/* Next Button */}
                  <Button type="submit" className="w-full">
                    Next
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleStep2Submit}>
                <div className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        className="pl-10"
                        onChange={step2Validation.handleChange}
                        onBlur={step2Validation.handleBlur}
                        value={step2Validation.values.name || ""}
                      />
                    </div>
                    {step2Validation.touched.name && step2Validation.errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {step2Validation.errors.name}
                      </p>
                    )}
                  </div>

                  {/* Store Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Name
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="store_name"
                        name="store_name"
                        type="text"
                        placeholder="Enter your store name"
                        className="pl-10"
                        onChange={step2Validation.handleChange}
                        onBlur={step2Validation.handleBlur}
                        value={step2Validation.values.store_name || ""}
                      />
                    </div>
                    {step2Validation.touched.store_name && step2Validation.errors.store_name && (
                      <p className="mt-1 text-sm text-red-600">
                        {step2Validation.errors.store_name}
                      </p>
                    )}
                  </div>

                  {/* Address Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="Enter your address"
                        className="pl-10"
                        onChange={step2Validation.handleChange}
                        onBlur={step2Validation.handleBlur}
                        value={step2Validation.values.address || ""}
                      />
                    </div>
                    {step2Validation.touched.address && step2Validation.errors.address && (
                      <p className="mt-1 text-sm text-red-600">
                        {step2Validation.errors.address}
                      </p>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        className="pl-10"
                        onChange={step2Validation.handleChange}
                        onBlur={step2Validation.handleBlur}
                        value={step2Validation.values.phone || ""}
                      />
                    </div>
                    {step2Validation.touched.phone && step2Validation.errors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {step2Validation.errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Terms and Privacy */}
                  <div>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="acceptTermsAndPrivacy"
                        name="acceptTermsAndPrivacy"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                        onChange={step2Validation.handleChange}
                        checked={step2Validation.values.acceptTermsAndPrivacy || false}
                      />
                      <label htmlFor="acceptTermsAndPrivacy" className="text-sm text-gray-600 leading-relaxed">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={openTermsOfService}
                          className="text-blue-600 hover:text-blue-800 underline bg-transparent border-0 p-0 font-inherit cursor-pointer"
                        >
                          Terms of Service
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={openPrivacyPolicy}
                          className="text-blue-600 hover:text-blue-800 underline bg-transparent border-0 p-0 font-inherit cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                      </label>
                    </div>
                    {step2Validation.touched.acceptTermsAndPrivacy && step2Validation.errors.acceptTermsAndPrivacy && (
                      <p className="mt-1 text-sm text-red-600">
                        {step2Validation.errors.acceptTermsAndPrivacy}
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={goBackToStep1}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Create Account
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
