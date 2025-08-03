import { prisma } from '@rentalshop/database';
import { comparePassword, hashPassword } from './password';
import { generateToken } from './jwt';
import type { LoginCredentials, RegisterData, AuthResponse } from './types';

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      shopOwner: true,
      admin: true,
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

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
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
      name: data.name,
      phone: data.phone,
      role: data.role || 'CLIENT',
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
    },
    token,
  };
}; 