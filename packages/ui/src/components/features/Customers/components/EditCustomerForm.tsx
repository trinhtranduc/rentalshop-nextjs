"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Save, X } from "lucide-react";
import { Button } from "@rentalshop/ui";
import { Input } from "@rentalshop/ui";
import { Label } from "@rentalshop/ui";
import { Card, CardContent } from "@rentalshop/ui";
import type { Customer, CustomerUpdateInput } from "@rentalshop/types";
import {
  useCustomerTranslations,
  useCommonTranslations,
} from "@rentalshop/hooks";

interface EditCustomerFormProps {
  customer: Customer;
  onSave: (customerData: CustomerUpdateInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  showActions?: boolean;
}

export interface EditCustomerFormRef {
  submitForm: () => void;
}

export const EditCustomerForm = forwardRef<
  EditCustomerFormRef,
  EditCustomerFormProps
>(
  (
    {
      customer,
      onSave,
      onCancel,
      isSubmitting: externalIsSubmitting,
      showActions = true,
    },
    ref
  ) => {
    const t = useCustomerTranslations();
    const tc = useCommonTranslations();

    const [formData, setFormData] = useState({
      name: [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim(),
      email: customer.email,
      phone: customer.phone,
      companyName: (customer as any).companyName || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
      country: customer.country || "", // Hidden in UI but sent to API
      status: (customer as any).status,
      membershipLevel: (customer as any).membershipLevel,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Use external isSubmitting if provided, otherwise use internal state
    const isSubmitting =
      externalIsSubmitting !== undefined
        ? externalIsSubmitting
        : internalIsSubmitting;

    // Update form data when customer changes
    useEffect(() => {
      // Combine firstName and lastName into name field
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
      setFormData({
        name: fullName,
        email: customer.email,
        phone: customer.phone,
        companyName: (customer as any).companyName || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
        country: customer.country || "", // Hidden in UI but sent to API
        status: (customer as any).status,
        membershipLevel: (customer as any).membershipLevel,
      });
    }, [customer]);

    console.log(
      "🔍 EditCustomerForm: Component rendered with customer:",
      customer
    );

    const handleInputChange = (field: string, value: string) => {
      console.log("🔍 EditCustomerForm: Input changed:", { field, value });
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field-specific error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }

      // Clear general error message when user starts typing
      if (errorMessage) {
        setErrorMessage(null);
      }
    };

    const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};

      // Name validation - required
      if (!formData.name || !formData.name.trim()) {
        newErrors.name = t("validation.nameRequired") || "Name is required";
      } else {
        // Split name into firstName and lastName for validation
        const nameParts = formData.name.trim().split(' ').filter(part => part.length > 0);
        const firstName = nameParts[0] || '';
        if (firstName.length < 2) {
          newErrors.name = t("validation.nameMinLength") || "Name must be at least 2 characters";
        }
      }

      // Email validation - optional but validate format if provided
      if (
        formData.email &&
        formData.email.trim() &&
        !/\S+@\S+\.\S+/.test(formData.email)
      ) {
        newErrors.email = t("validation.emailInvalid");
      }

      // Phone validation - required and validate format
      if (!formData.phone || !formData.phone.trim()) {
        newErrors.phone = t("validation.phoneRequired");
      } else if (!/^[0-9+\-\s()]+$/.test(formData.phone.trim())) {
        newErrors.phone = t("validation.phoneInvalid");
      } else if (formData.phone.trim().length < 8) {
        newErrors.phone = t("validation.phoneMinLength");
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      console.log("🔍 EditCustomerForm: Form submitted");

      if (!validateForm()) {
        console.log("❌ EditCustomerForm: Validation failed");
        return;
      }

      try {
        setInternalIsSubmitting(true);
        setErrorMessage(null);

        // Split name into firstName and lastName (same logic as CustomerForm)
        const nameParts = formData.name.trim().split(' ').filter(part => part.length > 0);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Check if name has changed (compare firstName and lastName)
        const originalFullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
        const nameChanged = originalFullName !== formData.name.trim();

        // Only send changed fields
        const changedFields: CustomerUpdateInput = { id: customer.id };
        
        // Add firstName and lastName if name changed
        if (nameChanged) {
          (changedFields as any).firstName = firstName;
          (changedFields as any).lastName = lastName;
        }

        // Check other fields for changes
        Object.keys(formData).forEach((key) => {
          if (key === 'name') return; // Skip name as we handle it separately
          const field = key as keyof typeof formData;
          if (formData[field] !== customer[field as keyof Customer]) {
            (changedFields as any)[field] = formData[field];
          }
        });

        // If no changes, just return
        if (Object.keys(changedFields).length === 1) { // Only has id
          console.log("🔍 EditCustomerForm: No changes detected");
          return;
        }

        console.log(
          "🔍 EditCustomerForm: Calling onSave with changed fields:",
          changedFields
        );

        await onSave(changedFields);

        console.log("✅ EditCustomerForm: Customer updated successfully");
      } catch (error) {
        console.error("❌ EditCustomerForm: Error updating customer:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        setErrorMessage(errorMessage);
      } finally {
        setInternalIsSubmitting(false);
      }
    };

    const handleCancel = () => {
      if (onCancel) {
        onCancel();
      }
    };

    useImperativeHandle(ref, () => ({
      submitForm: () => {
        // Create a synthetic form submission
        const syntheticEvent = {
          preventDefault: () => {},
        } as React.FormEvent;
        handleSubmit(syntheticEvent);
      },
    }));

    return (
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <Label htmlFor="name">{t("fields.fullName") || "Full Name"} *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  handleInputChange("name", e.target.value)
                }
                placeholder={t("placeholders.enterFullName") || "Enter full name"}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">{t("fields.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder={t("placeholders.enterEmail")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">{t("fields.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder={t("placeholders.enterPhone")}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div>
              <Label htmlFor="companyName">{t("fields.companyName")}</Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
                placeholder={t("placeholders.enterCompanyName")}
              />
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address">{t("fields.streetAddress")}</Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder={t("placeholders.enterStreetAddress")}
              />
            </div>

            {/* City, State, ZIP Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">{t("fields.city")}</Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder={t("placeholders.enterCity")}
                />
              </div>

              <div>
                <Label htmlFor="state">{t("fields.state")}</Label>
                <Input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder={t("placeholders.enterState")}
                />
              </div>

              <div>
                <Label htmlFor="zipCode">{t("fields.zipCode")}</Label>
                <Input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  placeholder={t("placeholders.enterZipCode")}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" />
                {tc("buttons.cancel")}
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? t("updating") : t("updateCustomer")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }
);

EditCustomerForm.displayName = "EditCustomerForm";
