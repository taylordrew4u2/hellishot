import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'
import { assignSlotAndCreateBooking } from '../utils/slotLock.js'
import bcrypt from 'bcryptjs'

export const bookings = Router()

const createSchema = z.object({
    block_id: z.string(),
    user_name: z.string().min(1).max(80),
    performance_type: z.enum(['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke']),
    wants_video: z.boolean().optional().default(false),
    payment_method: z.enum(['venmo', 'cashapp', 'applepay', 'cash']),
    device_id: z.string().min(8),
    amount: z.number().min(1)
})

bookings.post('/create', async (req: Request, res: Response) => {
    const body = createSchema.safeParse(req.body)
    if (!body.success) { return res.status(400).send('Invalid input') }
    const { block_id, user_name, performance_type, wants_video, payment_method, device_id } = body.data

    // Fetch active event and block
    const { data: event } = await supabaseAdmin.from('events').select('*').eq('active', true).single()
    if (!event) { return res.status(400).send('No active event') }
    const { data: block } = await supabaseAdmin.from('blocks').select('*').eq('id', block_id).single()
    if (!block || block.event_id !== event.id) { return res.status(400).send('Invalid block') }

    const payment_status = payment_method === 'cash' ? 'cash-pending' : 'initiated'

    const result = await assignSlotAndCreateBooking({
        event_id: event.id,
        block,
        user_name,
        performance_type,
        wants_video: !!wants_video,
        payment_method,
        payment_status: payment_status as any,
        device_id
    })
    if (!('ok' in result) || !result.ok) {
        return res.status(409).send(result.error)
    }

    return res.json({ booking: result.booking })
})

const cashSchema = z.object({
    block_id: z.string(),
    user_name: z.string().min(1).max(80),
    performance_type: z.enum(['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke']),
    wants_video: z.boolean().optional().default(false),
    staff_password: z.string().min(1),
    device_id: z.string().min(8)
})

bookings.post('/cash', async (req: Request, res: Response) => {
    const body = cashSchema.safeParse(req.body)
    if (!body.success) { return res.status(400).send('Invalid input') }
    const { block_id, user_name, performance_type, wants_video, staff_password, device_id } = body.data

    const { data: event } = await supabaseAdmin.from('events').select('*').eq('active', true).single()
    if (!event) { return res.status(400).send('No active event') }
    const { data: block } = await supabaseAdmin.from('blocks').select('*').eq('id', block_id).single()
    if (!block || block.event_id !== event.id) { return res.status(400).send('Invalid block') }

    if (!event.staff_password_hash) { return res.status(400).send('Staff password not set') }
    const ok = await bcrypt.compare(staff_password, event.staff_password_hash)
    if (!ok) { return res.status(403).send('Invalid staff password') }

    const result = await assignSlotAndCreateBooking({
        event_id: event.id,
        block,
        user_name,
        performance_type,
        wants_video: !!wants_video,
        payment_method: 'cash',
        payment_status: 'paid',
        device_id
    })
    if (!('ok' in result) || !result.ok) {
        return res.status(409).send(result.error)
    }

    return res.json({ booking: result.booking })
})
