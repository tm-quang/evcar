import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'
import { getNowUTC7, formatDateUTC7 } from '../utils/dateUtils'

export type JarType = 'budget' | 'savings'

export type JarRecord = {
    id: string
    user_id: string
    name: string
    icon: string
    color: string
    jar_type: JarType
    budget_amount: number | null   // Ngân sách (cho hũ budget)
    target_amount: number | null   // Mục tiêu (cho hũ savings)
    current_amount: number
    reset_monthly: boolean
    notes: string | null
    created_at: string
    updated_at: string
}

export type JarInsert = {
    name: string
    icon: string
    color: string
    jar_type: JarType
    budget_amount?: number | null
    target_amount?: number | null
    current_amount?: number
    reset_monthly?: boolean
    notes?: string | null
}

export type JarUpdate = Partial<Omit<JarInsert, 'jar_type'>> & {
    jar_type?: JarType
}

export type JarTransactionType = 'add' | 'subtract'

export type JarTransactionRecord = {
    id: string
    jar_id: string
    user_id: string
    transaction_type: JarTransactionType
    amount: number
    description: string | null
    transaction_date: string
    created_at: string
}

export type JarTransactionInsert = {
    jar_id: string
    transaction_type: JarTransactionType
    amount: number
    description?: string | null
    transaction_date?: string
}

export type JarWithStats = JarRecord & {
    usage_percentage: number
    remaining_amount: number
    status: 'safe' | 'warning' | 'danger' | 'critical' | 'unlimited'
}

const JARS_TABLE = 'spending_jars'
const JAR_TX_TABLE = 'jar_transactions'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
    if (error) {
        throw new Error(error.message || fallbackMessage)
    }
}

// Format currency helper
export const formatJarCurrency = (amount: number): string =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount)

// Get jar status based on usage
export const getJarStatus = (jar: JarRecord): JarWithStats['status'] => {
    const limit = jar.jar_type === 'budget' ? jar.budget_amount : jar.target_amount
    if (!limit || limit <= 0) return 'unlimited'
    const pct = (jar.current_amount / limit) * 100
    if (jar.jar_type === 'budget') {
        if (pct < 75) return 'safe'
        if (pct < 90) return 'warning'
        if (pct < 100) return 'danger'
        return 'critical'
    }
    // savings: progress towards goal – green while accumulating
    if (pct < 50) return 'safe'
    if (pct < 80) return 'warning'
    if (pct < 100) return 'danger'
    return 'critical'
}

export const enrichJar = (jar: JarRecord): JarWithStats => {
    const limit = jar.jar_type === 'budget' ? jar.budget_amount : jar.target_amount
    const usage_percentage = limit && limit > 0 ? (jar.current_amount / limit) * 100 : 0
    const remaining_amount = limit ? Math.max(0, limit - jar.current_amount) : 0
    const status = getJarStatus(jar)
    return { ...jar, usage_percentage, remaining_amount, status }
}

// ─── Jar CRUD ───────────────────────────────────────────────────────────────

export const fetchJars = async (): Promise<JarRecord[]> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    const { data, error } = await supabase
        .from(JARS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

    throwIfError(error, 'Không thể tải danh sách hũ.')
    return data ?? []
}

export const getJarById = async (id: string): Promise<JarRecord | null> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    const { data, error } = await supabase
        .from(JARS_TABLE)
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    throwIfError(error, 'Không thể tải thông tin hũ.')
    return data
}

export const createJar = async (payload: JarInsert): Promise<JarRecord> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    const { data, error } = await supabase
        .from(JARS_TABLE)
        .insert({
            ...payload,
            user_id: user.id,
            current_amount: payload.current_amount ?? 0,
            reset_monthly: payload.reset_monthly ?? false,
        })
        .select()
        .single()

    throwIfError(error, 'Không thể tạo hũ mới.')
    if (!data) throw new Error('Không nhận được dữ liệu hũ sau khi tạo.')

    await queryClient.invalidateQueries({ queryKey: ['jars'] })
    return data
}

export const updateJar = async (id: string, updates: JarUpdate): Promise<JarRecord> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    const { data, error } = await supabase
        .from(JARS_TABLE)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    throwIfError(error, 'Không thể cập nhật hũ.')
    if (!data) throw new Error('Không nhận được dữ liệu hũ sau khi cập nhật.')

    await queryClient.invalidateQueries({ queryKey: ['jars'] })
    await queryClient.invalidateQueries({ queryKey: ['jar_transactions', id] })
    return data
}

export const deleteJar = async (id: string): Promise<void> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    const { error } = await supabase
        .from(JARS_TABLE)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    throwIfError(error, 'Không thể xóa hũ.')
    await queryClient.invalidateQueries({ queryKey: ['jars'] })
}

// ─── Jar Transactions ────────────────────────────────────────────────────────

export const fetchJarTransactions = async (jarId: string, limit = 50): Promise<JarTransactionRecord[]> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    const { data, error } = await supabase
        .from(JAR_TX_TABLE)
        .select('*')
        .eq('jar_id', jarId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    throwIfError(error, 'Không thể tải lịch sử giao dịch hũ.')
    return data ?? []
}

export const addJarTransaction = async (
    payload: JarTransactionInsert
): Promise<{ jar: JarRecord; transaction: JarTransactionRecord }> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) throw new Error('Bạn cần đăng nhập.')

    // Get current jar
    const jar = await getJarById(payload.jar_id)
    if (!jar) throw new Error('Không tìm thấy hũ.')

    // Calculate new balance
    const delta = payload.transaction_type === 'add' ? payload.amount : -payload.amount
    const newAmount = Math.max(0, jar.current_amount + delta)

    // Insert transaction
    const { data: txData, error: txError } = await supabase
        .from(JAR_TX_TABLE)
        .insert({
            jar_id: payload.jar_id,
            user_id: user.id,
            transaction_type: payload.transaction_type,
            amount: payload.amount,
            description: payload.description ?? null,
            transaction_date: payload.transaction_date ?? formatDateUTC7(getNowUTC7()),
        })
        .select()
        .single()

    throwIfError(txError, 'Không thể ghi nhận giao dịch.')
    if (!txData) throw new Error('Không nhận được dữ liệu giao dịch.')

    // Update jar balance
    const updatedJar = await updateJar(payload.jar_id, { current_amount: newAmount })

    await queryClient.invalidateQueries({ queryKey: ['jars'] })
    await queryClient.invalidateQueries({ queryKey: ['jar_transactions', payload.jar_id] })

    return { jar: updatedJar, transaction: txData }
}

// ─── Reset monthly jars ───────────────────────────────────────────────────────

export const resetMonthlyJar = async (id: string): Promise<JarRecord> => {
    return await updateJar(id, { current_amount: 0 })
}

// ─── SQL Script for Supabase ─────────────────────────────────────────────────
// Run this in Supabase SQL Editor to create the required tables.
//
// CREATE TABLE IF NOT EXISTS spending_jars (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   name TEXT NOT NULL,
//   icon TEXT NOT NULL DEFAULT '🪣',
//   color TEXT NOT NULL DEFAULT '#3b82f6',
//   jar_type TEXT NOT NULL CHECK (jar_type IN ('budget', 'savings')) DEFAULT 'budget',
//   budget_amount NUMERIC,
//   target_amount NUMERIC,
//   current_amount NUMERIC NOT NULL DEFAULT 0,
//   reset_monthly BOOLEAN NOT NULL DEFAULT false,
//   notes TEXT,
//   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
//   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
// );
//
// CREATE TABLE IF NOT EXISTS jar_transactions (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   jar_id UUID NOT NULL REFERENCES spending_jars(id) ON DELETE CASCADE,
//   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'subtract')),
//   amount NUMERIC NOT NULL CHECK (amount > 0),
//   description TEXT,
//   transaction_date TEXT NOT NULL,
//   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
// );
//
// ALTER TABLE spending_jars ENABLE ROW LEVEL SECURITY;
// ALTER TABLE jar_transactions ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Users can manage their own jars"
//   ON spending_jars FOR ALL USING (auth.uid() = user_id);
//
// CREATE POLICY "Users can manage their own jar transactions"
//   ON jar_transactions FOR ALL USING (auth.uid() = user_id);
