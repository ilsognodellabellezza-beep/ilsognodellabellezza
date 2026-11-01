import { supabase } from './supabase';
import { UserRole } from '../types';

export interface StaffAccount {
  id: string;
  fullName: string;
  role: UserRole;
  email: string | null;
  username: string | null;
  operatorId: string | null;
  createdAt: string;
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, username, operator_id, created_at')
    .order('role', { ascending: false })
    .order('full_name');
  check(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    role: r.role,
    email: r.email,
    username: r.username,
    operatorId: r.operator_id,
    createdAt: r.created_at,
  }));
}

export async function createStaffAccount(input: {
  fullName: string;
  email: string;
  password: string;
  operatorId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('owner_create_staff', {
    p_email: input.email,
    p_password: input.password,
    p_full_name: input.fullName,
    p_operator_id: input.operatorId || null,
  });
  check(error);
}

export async function setStaffPassword(userId: string, password: string): Promise<void> {
  const { error } = await supabase.rpc('owner_set_staff_password', { p_user_id: userId, p_password: password });
  check(error);
}

export async function deleteStaffAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('owner_delete_staff', { p_user_id: userId });
  check(error);
}
