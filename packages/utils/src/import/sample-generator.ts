// ============================================================================
// SAMPLE FILE GENERATOR - Generate sample Excel files for import
// ============================================================================

import * as XLSX from 'xlsx';
import { createExcelWorkbook } from '../core/excel';

/**
 * Generate sample Customer Excel file
 */
export function generateCustomerSampleFile(): Buffer {
  const columns = [
    { header: 'First Name', key: 'firstName', width: 20 },
    { header: 'Last Name', key: 'lastName', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'City', key: 'city', width: 20 },
    { header: 'State', key: 'state', width: 20 },
    { header: 'Zip Code', key: 'zipCode', width: 10 },
    { header: 'Country', key: 'country', width: 20 },
    { header: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 20 },
    { header: 'ID Number', key: 'idNumber', width: 20 },
    { header: 'ID Type (passport/drivers_license/national_id/other)', key: 'idType', width: 40 },
    { header: 'Notes', key: 'notes', width: 50 }
  ];

  const sampleData = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      dateOfBirth: '1990-01-15',
      idNumber: '123456789',
      idType: 'national_id',
      notes: 'VIP customer'
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567891',
      address: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
      dateOfBirth: '1985-05-20',
      idNumber: '987654321',
      idType: 'passport',
      notes: ''
    },
    {
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com',
      phone: '+1234567892',
      address: '789 Pine Road',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
      dateOfBirth: '1992-08-10',
      idNumber: '',
      idType: '',
      notes: 'Regular customer'
    }
  ];

  return createExcelWorkbook(sampleData, columns, 'Customers');
}

/**
 * Generate sample Product Excel file
 */
export function generateProductSampleFile(): Buffer {
  const columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Barcode', key: 'barcode', width: 20 },
    { header: 'Category Name', key: 'categoryName', width: 25 },
    { header: 'Rent Price', key: 'rentPrice', width: 15 },
    { header: 'Sale Price', key: 'salePrice', width: 15 },
    { header: 'Cost Price', key: 'costPrice', width: 15 },
    { header: 'Deposit', key: 'deposit', width: 15 },
    { header: 'Stock', key: 'stock', width: 15 }
  ];
  // #1338: Pricing Type and Duration Config are not in the sample file. The importer still reads them
  // from older files (validators.ts, bulk-import/route.ts); without them the product gets null.

  const sampleData = [
    {
      name: 'Camera DSLR',
      description: 'Professional DSLR camera with lens',
      barcode: 'CAM001',
      categoryName: 'Electronics',
      rentPrice: 50,
      salePrice: 500,
      costPrice: 300,
      deposit: 100,
      stock: 10
    },
    {
      name: 'Bicycle',
      description: 'Mountain bike for rent',
      barcode: 'BIKE001',
      categoryName: 'Vehicles',
      rentPrice: 25,
      salePrice: 300,
      costPrice: 200,
      deposit: 50,
      stock: 5
    },
    {
      name: 'Laptop',
      description: 'High-performance laptop',
      barcode: 'LAP001',
      categoryName: 'Electronics',
      rentPrice: 40,
      salePrice: 800,
      costPrice: 600,
      deposit: 150,
      stock: 8
    }
  ];

  return createExcelWorkbook(sampleData, columns, 'Products');
}

/**
 * Convert buffer to base64 for API responses
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

