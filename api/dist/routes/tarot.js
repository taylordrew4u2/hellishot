import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import bcrypt from 'bcryptjs';
export const tarot = Router();
const createTarotSchema = z.object({
    reader_id: z.string(),
    user_name: z.string().min(1).max(80),
    package_type: z.enum(['quick', 'celtic']),
    slot_start: z.string(),
    payment_method: z.enum(['venmo', 'cashapp', 'applepay', 'cash']),
    device_id: z.string().min(8),
    amount: z.number().min(1)
});
tarot.post('/create', async (req, res) => {
    const body = createTarotSchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).send('Invalid input');
    }
    const { reader_id, user_name, package_type, slot_start, payment_method, device_id, amount } = body.data;
    // Get reader
    const { data: reader } = await supabaseAdmin.from('tarot_readers').select('*').eq('id', reader_id).single();
    if (!reader) {
        return res.status(400).send('Invalid reader');
    }
    // Calculate end time
    const duration = package_type === 'quick' ? 5 : 15;
    const starts_at = new Date(slot_start);
    const ends_at = new Date(starts_at.getTime() + duration * 60000);
    // Check if slot is available
    const { data: existingBookings } = await supabaseAdmin
        .from('tarot_bookings')
        .select('*')
        .eq('reader_id', reader_id)
        .or(`and(starts_at.lt.${ends_at.toISOString()},ends_at.gt.${starts_at.toISOString()})`);
    if (existingBookings && existingBookings.length > 0) {
        return res.status(409).send('Time slot not available');
    }
    const payment_status = payment_method === 'cash' ? 'cash-pending' : 'initiated';
    // Create booking
    const { data: booking, error } = await supabaseAdmin
        .from('tarot_bookings')
        .insert({
        reader_id,
        user_name,
        package_type,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        payment_method,
        payment_status,
        amount,
        device_id
    })
        .select()
        .single();
    if (error) {
        console.error('Tarot booking error:', error);
        return res.status(500).send('Failed to create booking');
    }
    return res.json({ booking });
});
const cashTarotSchema = z.object({
    reader_id: z.string(),
    user_name: z.string().min(1).max(80),
    package_type: z.enum(['quick', 'celtic']),
    slot_start: z.string(),
    staff_password: z.string(),
    device_id: z.string().min(8)
});
tarot.post('/cash', async (req, res) => {
    const body = cashTarotSchema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).send('Invalid input');
    }
    const { reader_id, user_name, package_type, slot_start, staff_password, device_id } = body.data;
    // Verify staff password
    const { data: event } = await supabaseAdmin.from('events').select('*').eq('active', true).single();
    if (!event || !event.staff_password_hash) {
        return res.status(400).send('Staff password not set');
    }
    const valid = await bcrypt.compare(staff_password, event.staff_password_hash);
    if (!valid) {
        return res.status(403).send('Invalid staff password');
    }
    // Get reader
    const { data: reader } = await supabaseAdmin.from('tarot_readers').select('*').eq('id', reader_id).single();
    if (!reader) {
        return res.status(400).send('Invalid reader');
    }
    // Calculate end time and amount
    const duration = package_type === 'quick' ? 5 : 15;
    const amount = package_type === 'quick' ? 5 : 15;
    const starts_at = new Date(slot_start);
    const ends_at = new Date(starts_at.getTime() + duration * 60000);
    // Check if slot is available
    const { data: existingBookings } = await supabaseAdmin
        .from('tarot_bookings')
        .select('*')
        .eq('reader_id', reader_id)
        .or(`and(starts_at.lt.${ends_at.toISOString()},ends_at.gt.${starts_at.toISOString()})`);
    if (existingBookings && existingBookings.length > 0) {
        return res.status(409).send('Time slot not available');
    }
    // Create booking
    const { data: booking, error } = await supabaseAdmin
        .from('tarot_bookings')
        .insert({
        reader_id,
        user_name,
        package_type,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        payment_method: 'cash',
        payment_status: 'cash-confirmed',
        amount,
        device_id
    })
        .select()
        .single();
    if (error) {
        console.error('Tarot cash booking error:', error);
        return res.status(500).send('Failed to create booking');
    }
    return res.json({ booking });
});
tarot.get('/readers', async (_req, res) => {
    const { data: readers } = await supabaseAdmin
        .from('tarot_readers')
        .select('*')
        .order('starts_at');
    return res.json({ readers: readers || [] });
});
tarot.get('/slots/:reader_id/:package_type', async (req, res) => {
    const { reader_id, package_type } = req.params;
    if (!['quick', 'celtic'].includes(package_type)) {
        return res.status(400).send('Invalid package type');
    }
    const { data: slots, error } = await supabaseAdmin
        .rpc('get_available_tarot_slots', {
        p_reader_id: reader_id,
        p_package_type: package_type
    });
    if (error) {
        console.error('Error getting slots:', error);
        return res.status(500).send('Failed to get slots');
    }
    return res.json({ slots: slots || [] });
});
