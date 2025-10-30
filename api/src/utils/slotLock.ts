import { supabaseAdmin } from '../lib/supabase.js'

// Break periods in EST: 7:20-7:30PM, 9:20-9:30PM, 11:20-11:30PM
// In UTC: 00:20-00:30, 02:20-02:30, 04:20-04:30
const BREAK_PERIODS = [
    { start: '2025-10-31T00:20:00+00:00', end: '2025-10-31T00:30:00+00:00' },
    { start: '2025-10-31T02:20:00+00:00', end: '2025-10-31T02:30:00+00:00' },
    { start: '2025-10-31T04:20:00+00:00', end: '2025-10-31T04:30:00+00:00' }
]

// Calculate approximate performance time based on queue position
// Assumes ~3-5 minutes per performance, skips break periods
function calculateApproximateTime(slotNumber: number, eventStartTime: string): string {
    const avgPerformanceMinutes = 4 // Average 4 minutes per performance
    const startTime = new Date(eventStartTime)
    
    let currentTime = new Date(startTime)
    let performancesScheduled = 0
    
    while (performancesScheduled < slotNumber - 1) {
        currentTime = new Date(currentTime.getTime() + avgPerformanceMinutes * 60000)
        
        // Check if we hit a break period, skip it
        const currentTimeStr = currentTime.toISOString()
        let inBreak = false
        for (const breakPeriod of BREAK_PERIODS) {
            if (currentTimeStr >= breakPeriod.start && currentTimeStr < breakPeriod.end) {
                currentTime = new Date(breakPeriod.end)
                inBreak = true
                break
            }
        }
        
        if (!inBreak) {
            performancesScheduled++
        }
    }
    
    return currentTime.toISOString()
}

export async function assignSlotAndCreateBooking({
    event_id,
    block,
    user_name,
    performance_type,
    song_info,
    wants_video,
    payment_method,
    payment_status,
    device_id
}: {
    event_id: string
    block: { id: string, capacity: number, starts_at: string }
    user_name: string
    performance_type: string
    song_info?: string | null
    wants_video: boolean
    payment_method: 'venmo' | 'cashapp' | 'applepay' | 'cash'
    payment_status: 'pending' | 'initiated' | 'paid' | 'cash-pending'
    device_id: string
}): Promise<{ ok: true, booking: any } | { ok: false, error: string }> {
    // Fetch ALL existing bookings for this event to get next sequential slot
    const { data: existing, error } = await supabaseAdmin.from('bookings')
        .select('slot_number')
        .eq('event_id', event_id)
        .order('slot_number', { ascending: false })
        .limit(1)
    
    if (error) { return { ok: false, error: 'Failed to check capacity' } }

    // Next slot is max + 1, or 1 if no bookings yet
    const nextSlot = existing && existing.length > 0 ? existing[0].slot_number + 1 : 1
    
    if (nextSlot > block.capacity) {
        return { ok: false, error: 'Event is full' }
    }

    // Calculate approximate performance time
    const approximateTime = calculateApproximateTime(nextSlot, block.starts_at)

    // Try insert; on unique conflict, retry
    for (let attempt = 0; attempt < 5; attempt++) {
        const { data: booking, error: insErr } = await supabaseAdmin.from('bookings').insert({
            event_id,
            block_id: block.id,
            user_name,
            performance_type,
            song_info: song_info || null,
            wants_video,
            payment_method,
            payment_status,
            slot_number: nextSlot,
            approximate_time: approximateTime,
            device_id
        }).select('*').single()

        if (!insErr && booking) {
            return { ok: true, booking }
        }

        // On conflict, recalculate next slot
        const { data: latest } = await supabaseAdmin.from('bookings')
            .select('slot_number')
            .eq('event_id', event_id)
            .order('slot_number', { ascending: false })
            .limit(1)
        
        const newNextSlot = latest && latest.length > 0 ? latest[0].slot_number + 1 : 1
        if (newNextSlot > block.capacity) { 
            return { ok: false, error: 'Event just filled up' } 
        }
    }

    return { ok: false, error: 'Failed to assign slot, please retry' }
}
