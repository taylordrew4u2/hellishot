import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'
import bcrypt from 'bcryptjs'

export const admin = Router()

admin.get('/bookings', async (_req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('bookings').select('*, blocks(*), events(*)').order('created_at', { ascending: false })
    if (error) return res.status(500).send('Failed to load bookings')
    res.json({ bookings: data })
})

admin.get('/tarot-bookings', async (_req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('tarot_bookings').select('*, readers:tarot_readers(*)').order('starts_at')
    if (error) return res.status(500).send('Failed to load tarot bookings')
    res.json({ bookings: data })
})

const pwdSchema = z.object({ password: z.string().min(4) })
admin.post('/staff-password', async (req: Request, res: Response) => {
    const body = pwdSchema.safeParse(req.body)
    if (!body.success) return res.status(400).send('Invalid input')
    const hash = await bcrypt.hash(body.data.password, 10)
    const { data: event } = await supabaseAdmin.from('events').select('*').eq('active', true).single()
    if (!event) return res.status(400).send('No active event')
    const { error } = await supabaseAdmin.from('events').update({ staff_password_hash: hash }).eq('id', event.id)
    if (error) return res.status(500).send('Failed to set password')
    res.json({ ok: true })
})

admin.post('/bookings/remove', async (req: Request, res: Response) => {
    const id = (req.body?.id as string) || ''
    if (!id) return res.status(400).send('id required')
    const { error } = await supabaseAdmin.from('bookings').delete().eq('id', id)
    if (error) return res.status(500).send('Failed to remove booking')
    res.json({ ok: true })
})

admin.get('/export.csv', async (_req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin.from('bookings').select('*').order('created_at')
    if (error) return res.status(500).send('Failed to export')
    const header = ['name', 'type', 'block', 'slot', 'paid', 'method', 'created_at']
    const rows = [header.join(',')]
    for (const b of data || []) {
        rows.push([b.user_name, b.performance_type, b.block_id, String(b.slot_number), b.payment_status, b.payment_method, b.created_at].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
    }
    res.setHeader('Content-Type', 'text/csv')
    res.send(rows.join('\n'))
})

// Clear all events and blocks
admin.post('/clear-all', async (_req: Request, res: Response) => {
    try {
        // Delete all bookings first (foreign key constraint)
        await supabaseAdmin.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        // Delete all blocks
        await supabaseAdmin.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        // Delete all events
        await supabaseAdmin.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        res.json({ ok: true, message: 'All data cleared' })
    } catch (e: any) {
        res.status(500).json({ error: e.message })
    }
})

// Seed today's event with 4 blocks
admin.post('/seed-event', async (_req: Request, res: Response) => {
    try {
        // Create today's event
        const today = new Date()
        today.setHours(17, 0, 0, 0) // 5 PM
        const endTime = new Date(today)
        endTime.setHours(21, 0, 0, 0) // 9 PM

        const { data: event, error: eventError } = await supabaseAdmin
            .from('events')
            .insert({
                name: 'Hell Is Hot',
                starts_at: today.toISOString(),
                ends_at: endTime.toISOString(),
                active: true
            })
            .select()
            .single()

        if (eventError) return res.status(500).json({ error: 'Failed to create event', details: eventError })

        // Create 4 time blocks
        const blocks = [
            {
                event_id: event.id,
                name: 'Opening Block (5:30-6:15PM)',
                starts_at: new Date(today.getTime() + 30 * 60000).toISOString(),
                ends_at: new Date(today.getTime() + 75 * 60000).toISOString(),
                capacity: 8,
                position: 1
            },
            {
                event_id: event.id,
                name: 'First Main Block (6:15-7:15PM)',
                starts_at: new Date(today.getTime() + 75 * 60000).toISOString(),
                ends_at: new Date(today.getTime() + 135 * 60000).toISOString(),
                capacity: 15,
                position: 2
            },
            {
                event_id: event.id,
                name: 'Second Main Block (7:30-8:30PM)',
                starts_at: new Date(today.getTime() + 150 * 60000).toISOString(),
                ends_at: new Date(today.getTime() + 210 * 60000).toISOString(),
                capacity: 15,
                position: 3
            },
            {
                event_id: event.id,
                name: 'Final Block (8:30-8:55PM)',
                starts_at: new Date(today.getTime() + 210 * 60000).toISOString(),
                ends_at: new Date(today.getTime() + 235 * 60000).toISOString(),
                capacity: 10,
                position: 4
            }
        ]

        const { error: blocksError } = await supabaseAdmin.from('blocks').insert(blocks)
        if (blocksError) return res.status(500).json({ error: 'Failed to create blocks', details: blocksError })

        res.json({ ok: true, event, blocks: blocks.length })
    } catch (e: any) {
        res.status(500).json({ error: e.message })
    }
})
