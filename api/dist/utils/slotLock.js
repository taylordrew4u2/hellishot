import { supabaseAdmin } from '../lib/supabase';
export async function assignSlotAndCreateBooking({ event_id, block, user_name, performance_type, wants_video, payment_method, payment_status, device_id }) {
    // Fetch existing slot_numbers for this block and try to reserve next available
    const { data: existing, error } = await supabaseAdmin.from('bookings')
        .select('slot_number')
        .eq('block_id', block.id)
        .order('slot_number');
    if (error) {
        return { ok: false, error: 'Failed to check capacity' };
    }
    const taken = new Set((existing || []).map((r) => r.slot_number));
    let selected = -1;
    for (let i = 1; i <= block.capacity; i++) {
        if (!taken.has(i)) {
            selected = i;
            break;
        }
    }
    if (selected === -1) {
        return { ok: false, error: 'Block is full' };
    }
    // Try insert; on unique conflict, refetch and retry up to N times
    for (let attempt = 0; attempt < 5; attempt++) {
        const { data: booking, error: insErr } = await supabaseAdmin.from('bookings').insert({
            event_id,
            block_id: block.id,
            user_name,
            performance_type,
            wants_video,
            payment_method,
            payment_status,
            slot_number: selected,
            device_id
        }).select('*').single();
        if (!insErr && booking) {
            return { ok: true, booking };
        }
        // On conflict or race, recompute selected and try again
        const { data: latest } = await supabaseAdmin.from('bookings')
            .select('slot_number')
            .eq('block_id', block.id)
            .order('slot_number');
        const taken2 = new Set((latest || []).map((r) => r.slot_number));
        selected = -1;
        for (let i = 1; i <= block.capacity; i++) {
            if (!taken2.has(i)) {
                selected = i;
                break;
            }
        }
        if (selected === -1) {
            return { ok: false, error: 'Block just filled up' };
        }
    }
    return { ok: false, error: 'Failed to assign slot, please retry' };
}
