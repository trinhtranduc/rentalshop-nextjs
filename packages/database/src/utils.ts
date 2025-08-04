import { prisma } from './client';
import type { User, PasswordResetToken, EmailVerificationToken, Session, Merchant, Outlet, OutletStaff } from '@prisma/client';

// User Management
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      merchant: true,
      admin: true,
      outletStaff: {
        include: {
          outlet: {
            include: {
              merchant: true
            }
          }
        }
      },
    },
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      merchant: true,
      admin: true,
      outletStaff: {
        include: {
          outlet: {
            include: {
              merchant: true
            }
          }
        }
      },
    },
  });
};

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'CLIENT' | 'MERCHANT' | 'OUTLET_STAFF' | 'ADMIN';
}) => {
  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      role: data.role || 'CLIENT',
    },
    include: {
      merchant: true,
      admin: true,
      outletStaff: {
        include: {
          outlet: {
            include: {
              merchant: true
            }
          }
        }
      },
    },
  });
};

export const updateUser = async (id: string, data: Partial<User>) => {
  return prisma.user.update({
    where: { id },
    data,
    include: {
      merchant: true,
      admin: true,
      outletStaff: {
        include: {
          outlet: {
            include: {
              merchant: true
            }
          }
        }
      },
    },
  });
};

// Merchant Management
export const createMerchant = async (data: {
  userId: string;
  companyName: string;
  businessLicense?: string;
  address: string;
  description?: string;
}) => {
  return prisma.merchant.create({
    data,
    include: { 
      user: true,
      outlets: true
    },
  });
};

export const findMerchantByUserId = async (userId: string) => {
  return prisma.merchant.findUnique({
    where: { userId },
    include: { 
      user: true,
      outlets: {
        include: {
          outletStaff: {
            include: {
              user: true
            }
          },
          products: true
        }
      }
    },
  });
};

export const findMerchantById = async (id: string) => {
  return prisma.merchant.findUnique({
    where: { id },
    include: { 
      user: true,
      outlets: {
        include: {
          outletStaff: {
            include: {
              user: true
            }
          },
          products: true
        }
      }
    },
  });
};

// Outlet Management
export const createOutlet = async (data: {
  merchantId: string;
  name: string;
  address: string;
  description?: string;
  phone: string;
  email?: string;
}) => {
  return prisma.outlet.create({
    data,
    include: {
      merchant: {
        include: {
          user: true
        }
      },
      outletStaff: {
        include: {
          user: true
        }
      }
    },
  });
};

export const findOutletById = async (id: string) => {
  return prisma.outlet.findUnique({
    where: { id },
    include: {
      merchant: {
        include: {
          user: true
        }
      },
      outletStaff: {
        include: {
          user: true
        }
      },
      products: {
        include: {
          category: true
        }
      }
    },
  });
};

export const findOutletsByMerchantId = async (merchantId: string) => {
  return prisma.outlet.findMany({
    where: { merchantId },
    include: {
      outletStaff: {
        include: {
          user: true
        }
      },
      products: {
        include: {
          category: true
        }
      }
    },
  });
};

// Outlet Staff Management
export const createOutletStaff = async (data: {
  userId: string;
  outletId: string;
  role?: 'STAFF' | 'MANAGER';
}) => {
  return prisma.outletStaff.create({
    data,
    include: {
      user: true,
      outlet: {
        include: {
          merchant: {
            include: {
              user: true
            }
          }
        }
      }
    },
  });
};

export const findOutletStaffByUserId = async (userId: string) => {
  return prisma.outletStaff.findUnique({
    where: { userId },
    include: {
      user: true,
      outlet: {
        include: {
          merchant: {
            include: {
              user: true
            }
          }
        }
      }
    },
  });
};

export const findOutletStaffByOutletId = async (outletId: string) => {
  return prisma.outletStaff.findMany({
    where: { outletId },
    include: {
      user: true
    },
  });
};

// Password Reset Token Management
export const createPasswordResetToken = async (userId: string, token: string, expiresAt: Date) => {
  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  return prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
};

export const findPasswordResetToken = async (token: string) => {
  return prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
};

export const invalidatePasswordResetToken = async (token: string) => {
  return prisma.passwordResetToken.delete({
    where: { token },
  });
};

export const cleanupExpiredPasswordResetTokens = async () => {
  return prisma.passwordResetToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
};

// Email Verification Token Management
export const createEmailVerificationToken = async (userId: string, token: string, expiresAt: Date) => {
  // Delete any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  return prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
};

export const findEmailVerificationToken = async (token: string) => {
  return prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });
};

export const invalidateEmailVerificationToken = async (token: string) => {
  return prisma.emailVerificationToken.delete({
    where: { token },
  });
};

export const cleanupExpiredEmailVerificationTokens = async () => {
  return prisma.emailVerificationToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
};

// Session Management
export const createSession = async (data: {
  userId: string;
  token: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}) => {
  return prisma.session.create({
    data,
  });
};

export const findSession = async (token: string) => {
  return prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
};

export const invalidateSession = async (token: string) => {
  return prisma.session.delete({
    where: { token },
  });
};

export const invalidateAllUserSessions = async (userId: string) => {
  return prisma.session.deleteMany({
    where: { userId },
  });
};

export const cleanupExpiredSessions = async () => {
  return prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
};

// Admin Management
export const createAdmin = async (data: {
  userId: string;
  level?: 'STAFF' | 'MANAGER' | 'SUPER_ADMIN';
}) => {
  return prisma.admin.create({
    data,
    include: { user: true },
  });
};

export const findAdminByUserId = async (userId: string) => {
  return prisma.admin.findUnique({
    where: { userId },
    include: { user: true },
  });
};

// Database Health Check
export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 