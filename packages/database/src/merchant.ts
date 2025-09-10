import { prisma } from './index';

// ============================================================================
// MERCHANT UPDATE FUNCTIONS
// ============================================================================

/**
 * Update merchant - follows dual ID system
 * Input: publicId (number), Output: publicId (number)
 */
export async function updateMerchant(
  publicId: number,
  input: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    businessType?: string;
    taxId?: string;
    website?: string;
    description?: string;
  }
): Promise<any> {
  // Find merchant by publicId
  const existingMerchant = await prisma.merchant.findUnique({
    where: { publicId }
  });

  if (!existingMerchant) {
    throw new Error(`Merchant with publicId ${publicId} not found`);
  }

  // Update merchant - only update fields that are provided
  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.zipCode !== undefined) updateData.zipCode = input.zipCode;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.businessType !== undefined) updateData.businessType = input.businessType;
  if (input.taxId !== undefined) updateData.taxId = input.taxId;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.description !== undefined) updateData.description = input.description;
  
  // Always update lastActiveAt
  updateData.lastActiveAt = new Date();

  // Note: email updates are disabled for security reasons

  const updatedMerchant = await prisma.merchant.update({
    where: { publicId },
    data: updateData,
  });

  return updatedMerchant;
}
