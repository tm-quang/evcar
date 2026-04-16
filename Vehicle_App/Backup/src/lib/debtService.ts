/**
 * Debt Service - Quản lý Sổ nợ / Cho vay
 * CRUD operations cho các khoản nợ và cho vay
 */

import { getSupabaseClient } from './supabaseClient'

// Types
export type DebtType = 'borrow' | 'lend'
export type DebtStatus = 'pending' | 'partial' | 'paid'

export interface DebtRecord {
    id: string
    user_id: string
    type: DebtType // 'borrow' = nợ cần trả, 'lend' = cho vay
    person_name: string // Tên người cho vay/mượn
    amount: number // Số tiền gốc
    paid_amount: number // Số tiền đã trả
    remaining_amount: number // Số tiền còn lại
    description?: string // Ghi chú
    due_date?: string // Ngày hẹn trả (ISO string)
    status: DebtStatus
    created_at: string
    updated_at: string
}

export interface DebtPayment {
    id: string
    debt_id: string
    amount: number
    note?: string
    paid_at: string
    created_at: string
}

export interface CreateDebtInput {
    type: DebtType
    person_name: string
    amount: number
    description?: string
    due_date?: string
}

export interface UpdateDebtInput {
    person_name?: string
    amount?: number
    description?: string
    due_date?: string
    status?: DebtStatus
}

export interface DebtSummary {
    total_borrow: number // Tổng nợ cần trả
    total_lend: number // Tổng cho vay
    net_balance: number // Số dư ròng (lend - borrow)
    borrow_count: number
    lend_count: number
    overdue_count: number
}

// Helper function to get current user
const getCurrentUserId = async (): Promise<string> => {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    return user.id
}

/**
 * Lấy tất cả khoản nợ/cho vay
 */
export const fetchDebts = async (filters?: {
    type?: DebtType
    status?: DebtStatus
}): Promise<DebtRecord[]> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()

    let query = supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (filters?.type) {
        query = query.eq('type', filters.type)
    }

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
}

/**
 * Lấy một khoản nợ theo ID
 */
export const getDebt = async (id: string): Promise<DebtRecord | null> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()

    const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw error
    }

    return data
}

/**
 * Tạo khoản nợ mới
 */
export const createDebt = async (input: CreateDebtInput): Promise<DebtRecord> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()

    const newDebt = {
        user_id: userId,
        type: input.type,
        person_name: input.person_name.trim(),
        amount: input.amount,
        paid_amount: 0,
        remaining_amount: input.amount,
        description: input.description?.trim() || null,
        due_date: input.due_date || null,
        status: 'pending' as DebtStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
        .from('debts')
        .insert(newDebt)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Cập nhật khoản nợ
 */
export const updateDebt = async (id: string, input: UpdateDebtInput): Promise<DebtRecord> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()

    // Get current debt to calculate remaining
    const currentDebt = await getDebt(id)
    if (!currentDebt) throw new Error('Debt not found')

    const updates: Partial<DebtRecord> = {
        ...input,
        updated_at: new Date().toISOString(),
    }

    // If amount is updated, recalculate remaining
    if (input.amount !== undefined) {
        updates.remaining_amount = input.amount - currentDebt.paid_amount
        if (updates.remaining_amount <= 0) {
            updates.status = 'paid'
            updates.remaining_amount = 0
        } else if (currentDebt.paid_amount > 0) {
            updates.status = 'partial'
        }
    }

    const { data, error } = await supabase
        .from('debts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Xóa khoản nợ
 */
export const deleteDebt = async (id: string): Promise<void> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()

    const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (error) throw error
}

/**
 * Ghi nhận thanh toán
 */
export const addPayment = async (debtId: string, amount: number, note?: string): Promise<DebtRecord> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()

    // Get current debt
    const debt = await getDebt(debtId)
    if (!debt) throw new Error('Debt not found')

    const newPaidAmount = debt.paid_amount + amount
    const newRemainingAmount = Math.max(0, debt.amount - newPaidAmount)

    // Determine new status
    let newStatus: DebtStatus = 'partial'
    if (newRemainingAmount <= 0) {
        newStatus = 'paid'
    } else if (newPaidAmount === 0) {
        newStatus = 'pending'
    }

    // Insert payment record
    const { error: paymentError } = await supabase
        .from('debt_payments')
        .insert({
            debt_id: debtId,
            amount,
            note: note?.trim() || null,
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
        })

    if (paymentError) throw paymentError

    // Update debt
    const { data, error } = await supabase
        .from('debts')
        .update({
            paid_amount: newPaidAmount,
            remaining_amount: newRemainingAmount,
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', debtId)
        .eq('user_id', userId)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Lấy lịch sử thanh toán của một khoản nợ
 */
export const getPaymentHistory = async (debtId: string): Promise<DebtPayment[]> => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('paid_at', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Lấy tổng hợp nợ/cho vay
 */
export const getDebtSummary = async (): Promise<DebtSummary> => {
    const debts = await fetchDebts()
    const now = new Date()

    let totalBorrow = 0
    let totalLend = 0
    let borrowCount = 0
    let lendCount = 0
    let overdueCount = 0

    debts.forEach((debt) => {
        if (debt.status === 'paid') return // Skip paid debts

        if (debt.type === 'borrow') {
            totalBorrow += debt.remaining_amount
            borrowCount++
        } else {
            totalLend += debt.remaining_amount
            lendCount++
        }

        // Check overdue
        if (debt.due_date && new Date(debt.due_date) < now) {
            overdueCount++
        }
    })

    return {
        total_borrow: totalBorrow,
        total_lend: totalLend,
        net_balance: totalLend - totalBorrow,
        borrow_count: borrowCount,
        lend_count: lendCount,
        overdue_count: overdueCount,
    }
}

/**
 * Đánh dấu đã trả hết
 */
export const markAsPaid = async (id: string): Promise<DebtRecord> => {
    const supabase = getSupabaseClient()
    const userId = await getCurrentUserId()
    const debt = await getDebt(id)
    if (!debt) throw new Error('Debt not found')

    // Add final payment
    if (debt.remaining_amount > 0) {
        await addPayment(id, debt.remaining_amount, 'Thanh toán hết')
    }

    // Get updated debt
    const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (error) throw error
    return data
}

