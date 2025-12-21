'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Eye, EyeOff, Mail, Lock, User, Store, Phone, CheckCircle, MapPin } from "lucide-react";
import { authApi, isValidEmail } from "@rentalshop/utils";
import { 
  BUSINESS_TYPE_OPTIONS,
  PRICING_TYPE_OPTIONS
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
  name: string; // Combined name field (will be split into firstName/lastName on submit)
  phone: string;
  businessName: string;
  // Business configuration (locked after registration)
  businessType: 'CLOTHING' | 'VEHICLE' | 'EQUIPMENT' | 'GENERAL';
  pricingType: 'FIXED' | 'HOURLY' | 'DAILY';
  address: string;
  acceptTermsAndPrivacy: boolean;
  // Role is always MERCHANT for public registration
  role: 'MERCHANT';
}

interface RegisterFormProps {
  onRegister?: (data: RegisterFormData) => Promise<void>;
  onNavigate?: (path: string) => void;
  user?: any;
  registrationError?: string | null;
  initialStep?: 1 | 2;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onNavigate,
  user,
  registrationError,
  initialStep
}) => {
  const router = useRouter();
  const [viewPass, setViewPass] = useState(false);
  const [viewConfirmPass, setViewConfirmPass] = useState(false);
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [accountData, setAccountData] = useState<Partial<RegisterFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toastSuccess, toastError, removeToast } = useToast();
  const t = useAuthTranslations();

  // Step 1 validation schema (Account Information)
  const step1ValidationSchema = Yup.object({
    login: Yup.string()
      .required(t('register.emailRequired') || 'Email is required')
      .test('email-format', t('login.invalidEmail') || 'Invalid email format', (value) => {
        if (!value) return false;
        return isValidEmail(value);
      }),
    password: Yup.string()
      .min(6, t('register.passwordMinLength'))
      .max(25, t('register.passwordMaxLength'))
      .required(t('register.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], t('register.passwordMismatch'))
      .required(t('register.confirmPasswordRequired')),
    name: Yup.string()
      .min(1, t('register.firstNameRequired') || 'Name is required')
      .required(t('register.firstNameRequired') || 'Name is required'),
  });

  // Step 2 validation schema (Business Information)
  const step2ValidationSchema = Yup.object({
    businessName: Yup.string()
      .min(2, t('register.businessNameMinLength'))
      .required(t('register.businessNameRequired')),
    phone: Yup.string()
      .required(t('register.phoneRequired'))
      .matches(/^[0-9+\-\s()]+$/, t('register.phoneInvalid'))
      .test('phone-length', t('register.phoneMinLength'), function(value) {
        // Validate minimum 10 digits (after removing non-digit characters)
        if (!value) return false;
        return value.replace(/\D/g, '').length >= 10;
      }),
    // businessType and pricingType are hidden and defaulted, no validation required
    address: Yup.string()
      .min(5, t('register.addressMinLength'))
      .notRequired(),
    acceptTermsAndPrivacy: Yup.boolean()
      .oneOf([true], t('register.agreeToTerms'))
      .required(t('register.agreeToTerms')),
  });

  const formik = useFormik<RegisterFormData>({
    initialValues: {
      login: "",
      password: "",
      confirmPassword: "",
      name: "",
      phone: "",
      businessName: "",
      businessType: "GENERAL",
      pricingType: "FIXED",
      address: "",
      acceptTermsAndPrivacy: false,
      role: 'MERCHANT',
    },
    validationSchema: currentStep === 1 ? step1ValidationSchema : step2ValidationSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values: RegisterFormData) => {
      // Step 1 only advances UI; do not toggle submitting state
      if (currentStep === 1) {
        // Step 1: Save account data and move to step 2
        setAccountData({
          login: values.login,
          password: values.password,
          confirmPassword: values.confirmPassword,
          name: values.name,
          role: values.role,
        });
        setCurrentStep(2);
        onNavigate?.('/register/step-2');
        return;
      }

      // Step 2: Complete registration with all data
      const completeData = { ...accountData, ...values };
      
      try {
        // Prevent double submission
        if (isSubmitting) {
          return;
        }
        setIsSubmitting(true);
        // Add timeout to prevent stuck button
        const timeoutId = setTimeout(() => {
          setIsSubmitting(false);
        }, 10000); // 10 second timeout
        
        // Split name into firstName and lastName (same logic as UserForm and CustomerForm)
        const nameParts = (completeData.name || values.name || '').trim().split(' ').filter(part => part.length > 0);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Use centralized API directly
        const registrationData = {
          name: completeData.name || values.name || '',
          email: completeData.login!,
          password: completeData.password!,
          firstName: firstName,
          lastName: lastName,
          phone: completeData.phone?.trim() || undefined,
          role: completeData.role!,
          businessName: values.businessName,
          businessType: values.businessType || 'GENERAL',
          pricingType: values.pricingType || 'FIXED',
          address: values.address || '',
        };
        
        const result = await authApi.register(registrationData);
        
        if (!result.success) {
          throw new Error(result.message || result.error || 'Registration failed');
        }

        // Registration successful - ALWAYS redirect to email verification page
        // Get email from response or use the email from registration data
        const resultData = result.data as any;
        const userEmail = resultData?.user?.email || completeData.login || registrationData.email;
        
        // Reset form after successful registration
        formik.resetForm();
        setCurrentStep(1);
        setAccountData({});

        // Show success message
        toastSuccess(
          t('register.registrationComplete'), 
          t('register.checkEmailToActivate')
        );
        
        // Always redirect to email verification page after successful registration
        const redirectUrl = `/email-verification?email=${encodeURIComponent(userEmail || registrationData.email)}`;
        console.log('✅ RegisterForm: Registration successful, redirecting to email verification:', redirectUrl);
        
        if (onNavigate) {
          onNavigate(redirectUrl);
        } else {
          router.replace(redirectUrl);
        }
      } catch (error: any) {
        toastError(
          t('register.registrationFailed'),
          error.message || t('register.somethingWentWrong')
        );
      } finally {
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
            {/* Step 1: Account Information - Sắp xếp theo UX best practices */}
            {currentStep === 1 && (
              <>
                {/* Personal Information Section */}
                <div className="space-y-4">
                  {/* Name Field - Single field instead of firstName/lastName */}
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700">
                      {t('register.firstName')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder={t('register.enterFirstName') || 'Nhập tên của bạn'}
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
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4">
                  {/* Email Field - Quan trọng cho account */}
                  <div className="space-y-2">
                    <label htmlFor="login" className="text-sm font-medium text-gray-700">
                      {t('register.email')} <span className="text-red-500">*</span>
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
                </div>

                {/* Account Security Section */}
                <div className="space-y-4">
                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      {t('register.password')} <span className="text-red-500">*</span>
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
                      {t('register.confirmPassword')} <span className="text-red-500">*</span>
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

            {/* Step 2: Business Information - Sắp xếp theo UX best practices */}
            {currentStep === 2 && (
              <>
                {/* Business Information Section */}
                <div className="space-y-4">
                  {/* Business Name Field - Quan trọng nhất */}
                  <div className="space-y-2">
                    <label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                      {t('register.businessName')} <span className="text-red-500">*</span>
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

                  {/* Phone Field */}
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      {t('register.phone')} <span className="text-red-500">*</span>
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
                </div>

                {/* Address Information Section */}
                <div className="space-y-4">
                  {/* Address Field - Full address (optional) */}
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
                  <h3 className="text-sm font-medium text-blue-900 mb-1">{t('register.freeTrialIncludes')}</h3>
                  <div className="text-xs text-blue-700 mb-2">Dùng thử 14 ngày</div>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-blue-700 mr-2" />
                      {t('register.fullAccessToAllFeatures')}
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
                    onClick={() => { setCurrentStep(1); onNavigate?.('/register/step-1'); }}
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