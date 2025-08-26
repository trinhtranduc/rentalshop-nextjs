// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

import { User, UserCreateInput, UserUpdateInput } from './user';

export interface UserManagement {
  createUser(input: UserCreateInput): Promise<User>;
  updateUser(id: string, input: UserUpdateInput): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getUserById(id: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  listUsers(filters?: any): Promise<User[]>;
  searchUsers(query: string, filters?: any): Promise<User[]>;
}

export interface UserValidation {
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;
  validatePassword(password: string): boolean;
  validateRole(role: string): boolean;
}
