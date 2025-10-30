import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import type { Block, Booking, PerformanceType, ScheduleSummary } from './types'
import { Toaster, toast } from 'sonner'

const PERFORMANCE_TYPES: PerformanceType[] = ['Comedy', 'Music', 'Dance', 'Poetry', 'Karaoke']

function useDeviceId() {
    const [id, setId] = useState<string>('')
    useEffect(() => {
        let d = localStorage.getItem('hh_device_id')
        if (!d) { d = crypto.randomUUID(); localStorage.setItem('hh_device_id', d) }
        setId(d)
    }, [])
    return id
}

function useNow(tickMs = 1000) {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => { const t = setInterval(() => setNow(new Date()), tickMs); return () => clearInterval(t) }, [tickMs])
    return now
}

function StatusBanner({ event, blocks }: { event: ScheduleSummary['event'], blocks: Block[] }) {
    const now = useNow(10000)
    const nowMs = now.getTime()
    const current = blocks.find(b => nowMs >= Date.parse(b.starts_at) && nowMs <= Date.parse(b.ends_at))
    const nextUp = blocks.find(b => {
        const start = Date.parse(b.starts_at)
        return start - nowMs > 0 && start - nowMs <= 15 * 60 * 1000
    })
    if (current) {
        return <div className="banner"><span className="dot red" /> Current Performer — {current.name}</div>
    }
    if (nextUp) {
        return <div className="banner"><span className="dot orange" /> Next Up Soon — {nextUp.name}</div>
    }
    return <div className="banner"><span className="dot green" /> Event {Date.parse(event.starts_at) > nowMs ? 'starts soon' : 'idle'}</div>
}

function Schedule() {
    const [summary, setSummary] = useState<ScheduleSummary | null>(null)
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [activeBlock, setActiveBlock] = useState<Block | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const deviceId = useDeviceId()
    const navigate = useNavigate()

    // Load schedule and counts
    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            // Fetch single active event, blocks and counts
            const { data: eventData, error: e1 } = await supabase.from('events').select('*').eq('active', true).single()
            if (e1) { setLoading(false); toast.error('Failed to load event'); return }
            const { data: blocksData, error: e2 } = await supabase.from('blocks').select('*').eq('event_id', eventData.id).order('position')
            if (e2) { setLoading(false); toast.error('Failed to load blocks'); return }
            const { data: counts, error: e3 } = await supabase.rpc('get_block_filled_counts', { p_event_id: eventData.id })
            if (e3) { setLoading(false); toast.error('Failed to load counts'); return }
            const blocks = blocksData!.map((b: any) => ({ ...b, filled: counts.find((c: any) => c.block_id === b.id)?.filled ?? 0 }))
            if (!mounted) return
            setSummary({ event: eventData, blocks })
            setLoading(false)
        }
        load()

        const channel = supabase.channel('realtime-bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (_payload) => {
                // re-fetch counts on any booking change
                if (summary) {
                    supabase.rpc('get_block_filled_counts', { p_event_id: summary.event.id }).then(({ data }) => {
                        if (!data || !summary) return
                        setSummary({
                            event: summary.event,
                            blocks: summary.blocks.map((b: any) => ({ ...b, filled: data.find((c: any) => c.block_id === b.id)?.filled ?? 0 }))
                        })
                    })
                }
            })
            .subscribe()

        return () => { mounted = false; supabase.removeChannel(channel) }
    }, [])

    useEffect(() => {
        if (!summary) return
        supabase.from('bookings').select('*').eq('event_id', summary.event.id).eq('device_id', deviceId).then(({ data }) => {
            setBookings(data || [])
        })
    }, [summary?.event.id, deviceId])

    function openSignup(block: Block) {
        setActiveBlock(block)
        setDialogOpen(true)
    }

    if (loading || !summary) {
        return <div className="container"><div className="muted">Loading schedule…</div></div>
    }

    return (
        <div>
            <StatusBanner event={summary.event} blocks={summary.blocks} />
            <div className="container">
                <header className="row" style={{ justifyContent: 'space-between' }}>
                    <h2>Tonight: {new Date(summary.event.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–{new Date(summary.event.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</h2>
                    <Link className="link" to="/my">My Bookings ({bookings.length})</Link>
                </header>
                <div className="space" />
                <div className="grid">
                    {summary.blocks.map((b: any) => {
                        const full = b.filled >= b.capacity
                        const now = Date.now()
                        const starts = Date.parse(b.starts_at)
                        const nextSoon = starts - now <= 15 * 60 * 1000 && starts > now
                        return (
                            <div key={b.id} className="card" style={{ borderColor: full ? '#4c0000' : nextSoon ? '#5a3c00' : undefined }}>
                                <div className="row" style={{ justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 18 }}>{b.name}</div>
                                        <div className="muted">{new Date(b.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–{new Date(b.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                                    </div>
                                    <span className={full ? 'badge full' : 'badge open'}>{b.filled}/{b.capacity} filled</span>
                                </div>
                                <div className="space" />
                                <div className="muted">Performance types: Comedy, Music, Dance, Poetry, Karaoke</div>
                                <div className="space" />
                                <button className="btn primary full" disabled={full} onClick={() => openSignup(b)}>Sign Up</button>
                            </div>
                        )
                    })}
                </div>
            </div>

            <SignupDialog open={dialogOpen} onClose={() => setDialogOpen(false)} block={activeBlock} onConfirmed={(bookingId) => {
                setDialogOpen(false); navigate(`/confirm/${bookingId}`)
            }} />
            <Toaster richColors position="top-center" />
        </div>
    )
}

function SignupDialog({ open, onClose, block, onConfirmed }: { open: boolean, onClose: () => void, block: Block | null, onConfirmed: (id: string) => void }) {
    const ref = useRef<HTMLDialogElement>(null)
    const [name, setName] = useState('')
    const [type, setType] = useState<PerformanceType>('Comedy')
    const [video, setVideo] = useState(false)
    const [method, setMethod] = useState<'venmo' | 'cashapp' | 'applepay' | 'cash' | 'none'>('none')
    const [total, setTotal] = useState(3)
    const [loading, setLoading] = useState(false)
    const deviceId = useDeviceId()

    useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close() }, [open])
    useEffect(() => { setTotal(3 + (video ? 10 : 0)) }, [video])

    async function submit() {
        if (!block) return
        if (!name.trim()) { toast.error('Please enter your name'); return }
        if (method === 'none') { toast.error('Select a payment method'); return }
        setLoading(true)
        try {
            const res = await fetch(`/api/bookings/create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ block_id: block.id, user_name: name.trim(), performance_type: type, wants_video: video, payment_method: method, device_id: deviceId, amount: total })
            })
            if (!res.ok) { throw new Error(await res.text()) }
            const data = await res.json()

            // For digital payments, open the deep link or Apple Pay sheet
            if (method === 'venmo') {
                const memo = encodeURIComponent(`Hell Is Hot - ${name} - ${type}`)
                const amount = total.toFixed(2)
                const url = `${location.protocol}//${location.host}/pay/venmo?amount=${amount}&note=${memo}`
                window.location.href = url
            } else if (method === 'cashapp') {
                const memo = encodeURIComponent(`Hell Is Hot - ${name} - ${type}`)
                const amount = total.toFixed(2)
                const url = `${location.protocol}//${location.host}/pay/cashapp?amount=${amount}&note=${memo}`
                window.location.href = url
            } else if (method === 'applepay') {
                // Redirect to Apple Pay checkout page which triggers Payment Request button
                window.location.href = `/pay/apple/${data.booking.id}`
            }

            onConfirmed(data.booking.id)
        } catch (e: any) {
            toast.error(e.message || 'Failed to create booking')
        } finally { setLoading(false) }
    }

    return (
        <dialog ref={ref} onClose={onClose}>
            <header>Sign Up — {block?.name}</header>
            <div className="content">
                <div>
                    <label htmlFor="name">Name</label>
                    <input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space" />
                <div>
                    <label htmlFor="type">Performance type</label>
                    <select id="type" value={type} onChange={e => setType(e.target.value as PerformanceType)}>
                        {PERFORMANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="space" />
                <div className="row" style={{ justifyContent: 'space-between' }}>
                    <label htmlFor="video" className="row" style={{ gap: 10 }}>
                        <input id="video" type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} />
                        Purchase performance video (+$10)
                    </label>
                    <div>Total: <strong>${total.toFixed(2)}</strong></div>
                </div>

                <div className="divider" />
                <div className="muted">Select payment method</div>
                <div className="space" />
                <div className="grid">
                    <button className="btn full" onClick={() => setMethod('venmo')} aria-pressed={method === 'venmo'}>Venmo</button>
                    <button className="btn full" onClick={() => setMethod('cashapp')} aria-pressed={method === 'cashapp'}>Cash App</button>
                    <button className="btn full" onClick={() => setMethod('applepay')} aria-pressed={method === 'applepay'}>Apple Pay</button>
                    <button className="btn full" onClick={() => setMethod('cash')} aria-pressed={method === 'cash'}>Pay Cash (staff password)</button>
                </div>
                {method === 'cash' && (
                    <CashPassword blockId={block!.id} onConfirmed={onConfirmed} />
                )}
            </div>
            <div className="footer">
                <button className="btn" onClick={onClose}>Cancel</button>
                <button className="btn primary" onClick={submit} disabled={loading || method === 'cash'}>{loading ? 'Processing…' : 'Reserve Slot'}</button>
            </div>
        </dialog>
    )
}

function CashPassword({ blockId, onConfirmed }: { blockId: string, onConfirmed: (id: string) => void }) {
    const [staffPassword, setStaffPassword] = useState('')
    const [name, setName] = useState('')
    const [type, setType] = useState<PerformanceType>('Comedy')
    const [video, setVideo] = useState(false)
    const [busy, setBusy] = useState(false)
    const deviceId = useDeviceId()

    return (
        <div className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                    <label htmlFor="cash-name">Name</label>
                    <input id="cash-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div style={{ width: 180 }}>
                    <label htmlFor="cash-type">Type</label>
                    <select id="cash-type" value={type} onChange={e => setType(e.target.value as PerformanceType)}>
                        {PERFORMANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div className="row" style={{ gap: 12, marginTop: 10 }}>
                <label className="row" style={{ gap: 10 }}>
                    <input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} />
                    Purchase performance video (+$10)
                </label>
            </div>
            <div className="space" />
            <label htmlFor="pwd">Staff Password Required</label>
            <input id="pwd" type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} placeholder="Enter by door staff" />
            <div className="space" />
            <button disabled={busy} className="btn primary full" onClick={async () => {
                if (!name.trim()) { toast.error('Name is required'); return }
                setBusy(true)
                const res = await fetch('/api/bookings/cash', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block_id: blockId, user_name: name.trim(), performance_type: type, wants_video: video, staff_password: staffPassword, device_id: deviceId })
                })
                if (!res.ok) { toast.error(await res.text()); setBusy(false); return }
                const data = await res.json()
                toast.success('Slot reserved!')
                onConfirmed(data.booking.id)
            }}>Reserve with Cash</button>
        </div>
    )
}

function Confirmation() {
    const [booking, setBooking] = useState<Booking | null>(null)
    const navigate = useNavigate()
    const bookingId = location.pathname.split('/').pop()!
    useEffect(() => {
        supabase.from('bookings').select('*').eq('id', bookingId).single().then(({ data }) => setBooking(data as any))
    }, [bookingId])

    if (!booking) { return <div className="container"><div className="muted">Loading…</div></div> }
    return (
        <div className="container">
            <h2>You’re booked!</h2>
            <div className="card">
                <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.user_name}</div>
                <div className="muted">{booking.performance_type}</div>
                <div className="space" />
                <BlockSummary blockId={booking.block_id} slot={booking.slot_number} />
                <div className="space" />
                <div className="muted">Arrive 10 minutes before your block starts.</div>
                <div className="space" />
                <button className="btn" onClick={async () => {
                    const text = `Hell Is Hot — ${booking.user_name} — ${booking.performance_type} — Slot #${booking.slot_number}`
                    if ((navigator as any).share) {
                        try { await (navigator as any).share({ title: "You're booked!", text, url: window.location.href }) } catch { }
                    } else {
                        try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied') } catch { }
                    }
                }}>Share</button>
            </div>
            <div className="space" />
            <button className="btn" onClick={() => navigate('/my')}>My Bookings</button>
        </div>
    )
}

function BlockSummary({ blockId, slot }: { blockId: string, slot: number }) {
    const [block, setBlock] = useState<Block | null>(null)
    useEffect(() => { supabase.from('blocks').select('*').eq('id', blockId).single().then(({ data }) => setBlock(data as any)) }, [blockId])
    if (!block) return null
    return <div>
        Block: {block.name} — Slot #{slot} of {block.capacity}
        <div className="muted">{new Date(block.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–{new Date(block.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
    </div>
}

function MyBookings() {
    const deviceId = useDeviceId()
    const [items, setItems] = useState<Booking[]>([])
    useEffect(() => {
        supabase.from('bookings').select('*').eq('device_id', deviceId).order('created_at', { ascending: false }).then(({ data }) => setItems(data || []))
    }, [deviceId])
    return (
        <div>
            <div className="banner">Your bookings on this device</div>
            <div className="container">
                {items.length === 0 && <div className="muted">No bookings yet.</div>}
                <div className="grid">
                    {items.map(i => (
                        <div key={i.id} className="card">
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{i.user_name} — <span className="muted">{i.performance_type}</span></div>
                            <BlockSummary blockId={i.block_id} slot={i.slot_number} />
                            <div className="muted" style={{ marginTop: 8 }}>Status: {i.payment_status}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Schedule />} />
            <Route path="/confirm/:id" element={<Confirmation />} />
            <Route path="/my" element={<MyBookings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Schedule />} />
        </Routes>
    )
}

function Admin() {
    const [pwd, setPwd] = useState('')
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    async function load() {
        const res = await fetch('/api/admin/bookings')
        if (res.ok) { const data = await res.json(); setItems(data.bookings) }
    }
    useEffect(() => { load() }, [])
    return (
        <div className="container">
            <h2>Admin</h2>
            <div className="card">
                <div className="row" style={{ gap: 8 }}>
                    <input type="password" placeholder="Set staff password" value={pwd} onChange={e => setPwd(e.target.value)} />
                    <button className="btn primary" disabled={loading || !pwd} onClick={async () => {
                        setLoading(true)
                        const res = await fetch('/api/admin/staff-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) })
                        setLoading(false)
                        if (res.ok) { toast.success('Password set') } else { toast.error(await res.text()) }
                    }}>{loading ? 'Saving…' : 'Save'}</button>
                    <a className="btn" href="/api/admin/export.csv">Export CSV</a>
                </div>
            </div>
            <div className="space" />
            <div className="grid">
                {items.map(b => (
                    <div className="card" key={b.id}>
                        <div style={{ fontWeight: 700 }}>{b.user_name} <span className="muted">{b.performance_type}</span></div>
                        <div className="muted">Block: {b.blocks?.name} — Slot #{b.slot_number}</div>
                        <div>Status: {b.payment_status} ({b.payment_method})</div>
                        <div className="space" />
                        <button className="btn" onClick={async () => { await fetch('/api/admin/bookings/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id }) }); load() }}>Remove</button>
                    </div>
                ))}
            </div>
            <Toaster richColors position="top-center" />
        </div>
    )
}
