import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import bcrypt from 'bcryptjs';
export const admin = Router();
admin.get('/bookings', async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('bookings').select('*, blocks(*), events(*)').order('created_at', { ascending: false });
    if (error)
        return res.status(500).send('Failed to load bookings');
    res.json({ bookings: data });
});
const pwdSchema = z.object({ password: z.string().min(4) });
admin.post('/staff-password', async (req, res) => {
    const body = pwdSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).send('Invalid input');
    const hash = await bcrypt.hash(body.data.password, 10);
    const { data: event } = await supabaseAdmin.from('events').select('*').eq('active', true).single();
    if (!event)
        return res.status(400).send('No active event');
    const { error } = await supabaseAdmin.from('events').update({ staff_password_hash: hash }).eq('id', event.id);
    if (error)
        return res.status(500).send('Failed to set password');
    res.json({ ok: true });
});
admin.post('/bookings/remove', async (req, res) => {
    const id = req.body?.id || '';
    if (!id)
        return res.status(400).send('id required');
    const { error } = await supabaseAdmin.from('bookings').delete().eq('id', id);
    if (error)
        return res.status(500).send('Failed to remove booking');
    res.json({ ok: true });
});
admin.get('/export.csv', async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('bookings').select('*').order('created_at');
    if (error)
        return res.status(500).send('Failed to export');
    const header = ['name', 'type', 'block', 'slot', 'paid', 'method', 'created_at'];
    const rows = [header.join(',')];
    for (const b of data || []) {
        rows.push([b.user_name, b.performance_type, b.block_id, String(b.slot_number), b.payment_status, b.payment_method, b.created_at].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.send(rows.join('\n'));
});
