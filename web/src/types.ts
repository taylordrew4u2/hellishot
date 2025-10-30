export type PerformanceType = 'Comedy' | 'Karaoke' | 'Other'

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
    song_info?: string | null
    wants_video: boolean
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    slot_number: number
    approximate_time?: string
    device_id: string
    created_at: string
}

export interface ScheduleSummary {
    event: Event
    blocks: Array<Block & { filled: number }>
}

export type TarotPackageType = 'quick' | 'celtic'

export interface TarotReader {
    id: string
    name: string
    starts_at: string
    ends_at: string
    block_number: number
    event_id: string
    created_at: string
}

export interface TarotBooking {
    id: string
    reader_id: string
    user_name: string
    package_type: TarotPackageType
    starts_at: string
    ends_at: string
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    amount: number
    device_id: string
    created_at: string
    readers?: TarotReader
}

export interface TarotSlot {
    slot_start: string
    slot_end: string
}
