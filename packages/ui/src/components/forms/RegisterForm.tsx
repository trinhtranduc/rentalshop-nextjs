'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock, User, Store, Phone, CheckCircle, MapPin } from "lucide-react";
import { authApi } from "@rentalshop/utils";
import { 
  BUSINESS_TYPE_OPTIONS,
  PRICING_TYPE_OPTIONS,
  COUNTRIES,
  getDefaultCountry,
  formatCountryDisplay
} from "@rentalshop/constants";
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast
} from "@rentalshop/ui";
import { useAuthTranslations } from "@rentalshop/hooks";

// Types for the registration form
interface RegisterFormData {
  login: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  // Business configuration (locked after registration)
  businessType: 'CLOTHING' | 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';
  pricingType: 'FIXED' | 'HOURLY' | 'DAILY';
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
  const router = useRouter();
  const [viewPass, setViewPass] = useState(false);
  const [viewConfirmPass, setViewConfirmPass] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [accountData, setAccountData] = useState<Partial<RegisterFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, toastError, removeToast } = useToast();
  const t = useAuthTranslations();

  // Step 1 validation schema (Account Information)
  const step1ValidationSchema = Yup.object({
    login: Yup.string()
      .email(t('login.invalidEmail'))
      .required(t('register.emailRequired')),
    password: Yup.string()
      .min(6, t('register.passwordMinLength'))
      .max(25, t('register.passwordMaxLength'))
      .required(t('register.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], t('register.passwordMismatch'))
      .required(t('register.confirmPasswordRequired')),
    firstName: Yup.string()
      .min(1, t('register.firstNameRequired'))
      .required(t('register.firstNameRequired')),
    lastName: Yup.string()
      .min(1, t('register.lastNameRequired'))
      .required(t('register.lastNameRequired')),
    phone: Yup.string()
      .matches(/^[0-9+\-\s()]+$/, t('register.phoneInvalid'))
      .min(10, t('register.phoneMinLength'))
      .required(t('register.phoneRequired')),
  });

  // Step 2 validation schema (Business Information)
  const step2ValidationSchema = Yup.object({
    businessName: Yup.string()
      .min(2, t('register.businessNameMinLength'))
      .required(t('register.businessNameRequired')),
    businessType: Yup.string()
      .oneOf(['CLOTHING', 'VEHICLE', 'EQUIPMENT', 'GENERAL'], t('register.businessTypeRequired'))
      .required(t('register.businessTypeRequired')),
    pricingType: Yup.string()
      .oneOf(['FIXED', 'HOURLY', 'DAILY'], t('register.pricingTypeRequired'))
      .required(t('register.pricingTypeRequired')),
    address: Yup.string()
      .min(5, t('register.addressMinLength'))
      .required(t('register.addressRequired')),
    city: Yup.string()
      .min(2, t('register.cityMinLength'))
      .required(t('register.cityRequired')),
    state: Yup.string()
      .min(2, t('register.stateMinLength'))
      .required(t('register.stateRequired')),
    zipCode: Yup.string()
      .matches(/^[0-9]{5}(-[0-9]{4})?$/, t('register.zipCodeInvalid'))
      .required(t('register.zipCodeRequired')),
    country: Yup.string()
      .min(2, t('register.countryMinLength'))
      .required(t('register.countryRequired')),
    acceptTermsAndPrivacy: Yup.boolean()
      .oneOf([true], t('register.agreeToTerms'))
      .required(t('register.agreeToTerms')),
  });

  const formik = useFormik<RegisterFormData>({
    initialValues: {
      login: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
      businessName: "",
      businessType: "GENERAL",
      pricingType: "FIXED",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: getDefaultCountry().name,
      acceptTermsAndPrivacy: false,
      role: 'MERCHANT',
    },
    validationSchema: currentStep === 1 ? step1ValidationSchema : step2ValidationSchema,
    onSubmit: async (values: RegisterFormData) => {
      // Prevent double submission
      if (isSubmitting) {
        return;
      }
      
      setIsSubmitting(true);
      
      // Add timeout to prevent stuck button
      const timeoutId = setTimeout(() => {
        setIsSubmitting(false);
      }, 10000); // 10 second timeout
      
      if (currentStep === 1) {
        // Step 1: Save account data and move to step 2
        setAccountData({
          login: values.login,
          password: values.password,
          confirmPassword: values.confirmPassword,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          role: values.role,
        });
        setCurrentStep(2);
        return;
      }

      // Step 2: Complete registration with all data
      const completeData = { ...accountData, ...values };
      
      try {
        // Use centralized API directly
        
        const registrationData = {
          name: `${completeData.firstName} ${completeData.lastName}`,
          email: completeData.login!,
          password: completeData.password!,
          firstName: completeData.firstName!,
          lastName: completeData.lastName!,
          phone: completeData.phone!,
          role: completeData.role!,
          businessName: values.businessName,
          businessType: values.businessType,
          pricingType: values.pricingType,
          address: values.address,
          city: values.city,
          state: values.state,
          zipCode: values.zipCode,
          country: values.country,
        };
        
        const result = await authApi.register(registrationData);
        
        if (!result.success) {
          // Prioritize message over error field
          throw new Error(result.message || result.error || 'Registration failed');
        }
        
        // Store token in localStorage using consolidated function
        if (result.data?.token) {
          const { storeAuthData } = await import('@rentalshop/utils');
          storeAuthData(result.data.token, result.data.user);
        }
        
        toastSuccess(t('register.registrationComplete'), t('register.accountCreatedSuccessfully'));
        
        // Reset form
        formik.resetForm();
        setCurrentStep(1);
        setAccountData({});
        
        // Navigate to login after a short delay
        setTimeout(() => {
          // Use router.push instead of window.location for proper SPA navigation
          if (onNavigate) {
            onNavigate('/login');
          } else {
            router.push('/login');
          }
        }, 2000);
      } catch (error: any) {
        toastError(
          t('register.registrationFailed'),
          error.message || t('register.somethingWentWrong')
        );
      } finally {
        clearTimeout(timeoutId);
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="w-full max-w-md mx-auto relative z-10">
      <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t('register.createMerchantAccount')}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {currentStep === 1 
              ? t('register.step1')
              : t('register.step2')
            }
          </CardDescription>
          
          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-700' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">{t('register.account')}</span>
            </div>
            <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-700' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-700' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">{t('register.business')}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            formik.handleSubmit(e);
          }} className="space-y-6">
            {/* Step 1: Account Information */}
            {currentStep === 1 && (
              <>
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="login" className="text-sm font-medium text-gray-700">
                    {t('register.email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="login"
                      name="login"
                      type="email"
                      placeholder={t('register.enterYourEmail')}
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
                    {t('register.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="password"
                      name="password"
                      type={viewPass ? "text" : "password"}
                      placeholder={t('register.createPassword')}
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 pr-10 ${formik.errors.password && formik.touched.password ? 'border-red-500' : ''}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setViewPass(!viewPass)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 h-auto w-auto p-0"
                    >
                      {viewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  {formik.errors.password && formik.touched.password && (
                    <p className="text-red-500 text-sm">{formik.errors.password}</p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    {t('register.confirmPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={viewConfirmPass ? "text" : "password"}
                      placeholder={t('register.confirmYourPassword')}
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`pl-10 pr-10 ${formik.errors.confirmPassword && formik.touched.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setViewConfirmPass(!viewConfirmPass)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 h-auto w-auto p-0"
                    >
                      {viewConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  {formik.errors.confirmPassword && formik.touched.confirmPassword && (
                    <p className="text-red-500 text-sm">{formik.errors.confirmPassword}</p>
                  )}
                </div>

                {/* First Name and Last Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name Field */}
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      {t('register.firstName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder={t('register.enterFirstName')}
                        value={formik.values.firstName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={`pl-10 ${formik.errors.firstName && formik.touched.firstName ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {formik.errors.firstName && formik.touched.firstName && (
                      <p className="text-red-500 text-sm">{formik.errors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name Field */}
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      {t('register.lastName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder={t('register.enterLastName')}
                        value={formik.values.lastName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={`pl-10 ${formik.errors.lastName && formik.touched.lastName ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {formik.errors.lastName && formik.touched.lastName && (
                      <p className="text-red-500 text-sm">{formik.errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    {t('register.phone')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder={t('register.enterPhoneNumber')}
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
                  className="w-full bg-blue-700 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('register.validating') : t('register.continueToBusinessInfo')}
                </Button>
              </>
            )}

            {/* Step 2: Business Information */}
            {currentStep === 2 && (
              <>
                {/* Business Name Field */}
                <div className="space-y-2">
                  <label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                    {t('register.businessName')}
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="businessName"
                      name="businessName"
                      type="text"
                      placeholder={t('register.enterBusinessName')}
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


                {/* Business Type and Pricing Type */}
                <div className="space-y-4">
                  {/* Warning Note */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-amber-800">
                          {t('register.importantNotice')}
                        </h3>
                        <div className="mt-1 text-sm text-amber-700">
                          <p>{t('register.cannotBeChanged')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Business Type Field */}
                    <div className="space-y-2">
                      <label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                        {t('register.businessType')} *
                      </label>
                      <Select
                        value={formik.values.businessType}
                        onValueChange={(value) => formik.setFieldValue('businessType', value)}
                      >
                        <SelectTrigger className={`w-full ${formik.errors.businessType && formik.touched.businessType ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder={t('register.selectBusinessType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">
                                  {t(`register.businessTypes.${option.value.toLowerCase()}.label`)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {t(`register.businessTypes.${option.value.toLowerCase()}.description`)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formik.errors.businessType && formik.touched.businessType && (
                        <p className="text-red-500 text-sm">{formik.errors.businessType}</p>
                      )}
                    </div>

                    {/* Pricing Type Field */}
                    <div className="space-y-2">
                      <label htmlFor="pricingType" className="text-sm font-medium text-gray-700">
                        {t('register.pricingType')} *
                      </label>
                      <Select
                        value={formik.values.pricingType}
                        onValueChange={(value) => formik.setFieldValue('pricingType', value)}
                      >
                        <SelectTrigger className={`w-full ${formik.errors.pricingType && formik.touched.pricingType ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder={t('register.selectPricingType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICING_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">
                                  {t(`register.pricingTypes.${option.value.toLowerCase()}.label`)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {t(`register.pricingTypes.${option.value.toLowerCase()}.description`)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formik.errors.pricingType && formik.touched.pricingType && (
                        <p className="text-red-500 text-sm">{formik.errors.pricingType}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Field */}
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700">
                    {t('register.address')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder={t('register.enterBusinessAddress')}
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
                      {t('register.city')}
                    </label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder={t('register.city')}
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
                      {t('register.state')}
                    </label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      placeholder={t('register.state')}
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
                      {t('register.zipCode')}
                    </label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      placeholder={t('register.zipCode')}
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
                      {t('register.country')} *
                    </label>
                    <Select
                      value={formik.values.country}
                      onValueChange={(value) => formik.setFieldValue('country', value)}
                    >
                      <SelectTrigger className={`w-full ${formik.errors.country && formik.touched.country ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder={t('register.selectCountry')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country: any) => (
                          <SelectItem key={country.code} value={country.name}>
                            <div className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      className="mt-1 h-4 w-4 text-blue-700 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {t('register.iAgreeToThe')}{' '}
                      <a href="/terms" className="text-blue-700 hover:text-blue-500 underline">
                        {t('register.termsOfService')}
                      </a>{' '}
                      {t('register.and')}{' '}
                      <a href="/privacy" className="text-blue-700 hover:text-blue-500 underline">
                        {t('register.privacyPolicy')}
                      </a>
                    </span>
                  </label>
                  {formik.errors.acceptTermsAndPrivacy && formik.touched.acceptTermsAndPrivacy && (
                    <p className="text-red-500 text-sm">{formik.errors.acceptTermsAndPrivacy}</p>
                  )}
                </div>

                {/* Trial Benefits */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">{t('register.freeTrialIncludes')}</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-700 mr-2" />
                      {t('register.fullAccessToAllFeatures')}
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-700 mr-2" />
                      {t('register.defaultOutlet')}: "{formik.values.businessName || 'Your Business'}"
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-700 mr-2" />
                      {t('register.mobileAppAccess')}
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-700 mr-2" />
                      {t('register.noCreditCardRequired')}
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
                    {t('register.back')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-700 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('register.creatingAccount') : t('register.registerButton')}
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
                {t('register.hasAccount')}{' '}
                <Button
                  variant="link"
                  type="button"
                  onClick={() => onNavigate?.('/login')}
                  className="text-blue-700 hover:text-blue-500 font-medium p-0 h-auto"
                >
                  {t('register.signIn')}
                </Button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>    </div>
  );
};

export default RegisterForm;