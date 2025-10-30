export type PerformanceType = 'Comedy' | 'Music' | 'Dance' | 'Poetry' | 'Karaoke'

export type PaymentMethod = 'venmo' | 'cashapp' | 'applepay' | 'cash'
export type PaymentStatus = 'pending' | 'initiated' | 'paid' | 'failed' | 'cash-pending'

export interface Event {
    id: string
    name: string
    starts_at: string
    ends_at: string
    staff_password_set: boolean
}

export interface Block {
    id: string
    event_id: string
    name: string
    starts_at: string
    ends_at: string
    capacity: number
    position: number
}

export interface Booking {
    id: string
    event_id: string
    block_id: string
    user_name: string
    performance_type: PerformanceType
    wants_video: boolean
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    slot_number: number
    device_id: string
    created_at: string
}

export interface ScheduleSummary {
    event: Event
    blocks: Array<Block & { filled: number }>
}
