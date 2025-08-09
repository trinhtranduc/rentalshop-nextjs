import { prisma } from '@rentalshop/database';
import { comparePassword, hashPassword } from './password';
import { generateToken } from './jwt';
import type { LoginCredentials, RegisterData, AuthResponse } from './types';

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const user = await (prisma as any).user.findUnique({
    where: { email: credentials.email },
    include: {
      merchant: true,
      outlet: true,
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await comparePassword(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const u = user as any;

  return {
    user: {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      phone: u.phone || undefined,
      merchant: u.merchant || undefined,
      outlet: u.outlet || undefined,
      
    },
    token,
  };
};

export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || data.name?.split(' ')[0] || '',
      lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
      phone: data.phone,
      role: data.role || 'USER',
    } as any,
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const nu = user as any;
  return {
    user: {
      id: nu.id,
      email: nu.email,
      firstName: nu.firstName,
      lastName: nu.lastName,
      name: `${nu.firstName} ${nu.lastName}`,
      role: nu.role,
      phone: nu.phone || undefined,
    },
    token,
  };
}; 