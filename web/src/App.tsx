import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import type { Block, Booking, PerformanceType, ScheduleSummary } from './types'
import { Toaster, toast } from 'sonner'

const PERFORMANCE_TYPES: PerformanceType[] = ['Comedy', 'Karaoke', 'Other']

// Format time in EST (America/New_York timezone)
function formatTimeEST(date: Date | string): string {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York'
    })
}

function formatDateEST(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
        timeZone: 'America/New_York'
    })
}

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
    const eventStart = Date.parse(event.starts_at)
    const eventEnd = Date.parse(event.ends_at)

    if (nowMs >= eventStart && nowMs <= eventEnd) {
        return <div className="banner"><span className="dot red" /> Live Now — Performances in Progress</div>
    }
    if (eventStart - nowMs > 0 && eventStart - nowMs <= 30 * 60 * 1000) {
        return <div className="banner"><span className="dot orange" /> Starting Soon — {formatTimeEST(event.starts_at)}</div>
    }
    return <div className="banner"><span className="dot green" /> Event Tonight — {formatTimeEST(event.starts_at)}</div>
}

function TarotScheduleSection({ eventId }: { eventId: string }) {
    const [readers, setReaders] = useState<any[]>([])
    const [error, setError] = useState<string>('')
    const navigate = useNavigate()

    useEffect(() => {
        fetch('/api/tarot/readers')
            .then(r => {
                if (!r.ok) throw new Error(`API error: ${r.status}`)
                return r.json()
            })
            .then(d => setReaders(d.readers || []))
            .catch(err => {
                console.error('Failed to load tarot readers:', err)
                setError(err.message)
            })
    }, [])

    // Group readers by block number
    const blocks = useMemo(() => {
        const grouped: Record<number, any[]> = {}
        readers.forEach(r => {
            if (!grouped[r.block_number]) grouped[r.block_number] = []
            grouped[r.block_number].push(r)
        })
        return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b))
    }, [readers])

    if (readers.length === 0) return null

    return (
        <div style={{ marginTop: 32 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 16 }}>🔮 Tarot Readings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
                {blocks.filter(([_, blockReaders]) => blockReaders[0]).map(([blockNum, blockReaders]) => {
                    const reader = blockReaders[0]
                    return (
                        <div key={blockNum} className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                                Block {blockNum}
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                {reader.name}
                            </div>
                            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                                {formatTimeEST(reader.starts_at)} – {formatTimeEST(reader.ends_at)}
                            </div>
                            <button
                                className="btn primary full"
                                style={{ marginTop: 12 }}
                                onClick={() => navigate('/tarot')}
                            >
                                Book Reading
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function Schedule() {
    const [summary, setSummary] = useState<ScheduleSummary | null>(null)
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [activeBlock, setActiveBlock] = useState<Block | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const deviceId = useDeviceId()
    const navigate = useNavigate()

    // Load schedule and counts
    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setError('')
                // Fetch single active event, blocks and counts
                const { data: eventData, error: e1 } = await supabase.from('events').select('*').eq('active', true).single()
                if (e1) throw new Error(`Failed to load event: ${e1.message}`)
                const { data: blocksData, error: e2 } = await supabase.from('blocks').select('*').eq('event_id', eventData.id).order('position')
                if (e2) throw new Error(`Failed to load blocks: ${e2.message}`)
                const { data: counts, error: e3 } = await supabase.rpc('get_block_filled_counts', { p_event_id: eventData.id })
                if (e3) throw new Error(`Failed to load counts: ${e3.message}`)
                const blocks = blocksData!.map((b: any) => ({ ...b, filled: counts.find((c: any) => c.block_id === b.id)?.filled ?? 0 }))
                if (!mounted) return
                setSummary({ event: eventData, blocks })
                setLoading(false)
            } catch (err) {
                if (mounted) {
                    const msg = err instanceof Error ? err.message : 'Unknown error'
                    setError(msg)
                    console.error('Schedule load error:', err)
                    setLoading(false)
                }
            }
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

    if (loading) {
        return <div className="container"><div className="muted">Loading schedule…</div></div>
    }

    if (error || !summary) {
        return (
            <div className="container">
                <div style={{ color: 'var(--accent)', marginTop: 12 }}>
                    {error || 'No active event found'}
                </div>
                <div className="space" />
                <div className="muted">Please contact an administrator to set up the event.</div>
            </div>
        )
    }

    // Get the single performance queue block
    const performanceBlock = summary.blocks[0]

    if (!performanceBlock) {
        return (
            <div className="container">
                <div style={{ color: 'var(--accent)', marginTop: 12 }}>No performance blocks available</div>
                <div className="space" />
                <div className="muted">Please contact an administrator to configure the event blocks.</div>
            </div>
        )
    }

    const full = performanceBlock.filled >= performanceBlock.capacity
    const nextSlot = performanceBlock.filled + 1

    return (
        <div>
            <StatusBanner event={summary.event} blocks={summary.blocks} />
            <div className="container">
                <header className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Tonight: {formatTimeEST(summary.event.starts_at)}–{formatTimeEST(summary.event.ends_at)}</h2>
                    <div className="row" style={{ gap: 12 }}>
                        <Link className="link" to="/tarot">🔮 Tarot Readings</Link>
                        <Link className="link" to="/my">My Bookings ({bookings.length})</Link>
                    </div>
                </header>
                <div className="space" />

                {/* Single Performance Queue */}
                <div className="card" style={{ borderColor: full ? '#4c0000' : undefined, maxWidth: 600, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 24 }}>Performance Sign-Up</div>
                        <div className="muted" style={{ marginTop: 8 }}>Continuous show from {formatTimeEST(summary.event.starts_at)} to {formatTimeEST(summary.event.ends_at)}</div>
                        <div className="space" />
                        <div style={{ fontSize: 48, fontWeight: 700, color: full ? 'var(--accent)' : 'var(--ok)' }}>
                            {performanceBlock ? performanceBlock.filled : 0}/{performanceBlock ? performanceBlock.capacity : 0}
                        </div>
                        <div className="muted">performers in queue</div>
                        <div className="space" />
                        {!full && (
                            <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, marginBottom: 12 }}>
                                <div style={{ fontWeight: 600 }}>You'll be performer #{nextSlot}</div>
                                <div className="muted" style={{ fontSize: 14 }}>Approximate time calculated after booking</div>
                            </div>
                        )}
                        <div className="muted" style={{ marginBottom: 12 }}>Performance types: {PERFORMANCE_TYPES.join(', ')}</div>
                        <button
                            className="btn primary full"
                            style={{ fontSize: 18, padding: '12px 24px' }}
                            disabled={full}
                            onClick={() => openSignup(performanceBlock)}
                        >
                            {full ? 'Queue Full' : 'Join Queue'}
                        </button>
                        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                            Breaks: 7:20-7:30PM, 9:20-9:30PM, 11:20-11:30PM
                        </div>
                    </div>
                </div>

                {/* Tarot Readings Section */}
                <TarotScheduleSection eventId={summary.event.id} />
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
    const [songInfo, setSongInfo] = useState('')
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
        if (type === 'Karaoke' && !songInfo.trim()) { toast.error('Please enter song and artist for karaoke'); return }
        if (method === 'none') { toast.error('Select a payment method'); return }
        setLoading(true)
        try {
            const res = await fetch(`/api/bookings/create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ block_id: block.id, user_name: name.trim(), performance_type: type, song_info: type === 'Karaoke' ? songInfo.trim() : null, wants_video: video, payment_method: method, device_id: deviceId, amount: total })
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
                {type === 'Karaoke' && (
                    <>
                        <div className="space" />
                        <div>
                            <label htmlFor="songInfo">Song and Artist</label>
                            <input id="songInfo" value={songInfo} onChange={e => setSongInfo(e.target.value)} placeholder="e.g., Don't Stop Believin' - Journey" />
                        </div>
                    </>
                )}
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
    const [songInfo, setSongInfo] = useState('')
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
            {type === 'Karaoke' && (
                <div style={{ marginTop: 10 }}>
                    <label htmlFor="cash-songInfo">Song and Artist</label>
                    <input id="cash-songInfo" value={songInfo} onChange={e => setSongInfo(e.target.value)} placeholder="e.g., Don't Stop Believin' - Journey" />
                </div>
            )}
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
                if (type === 'Karaoke' && !songInfo.trim()) { toast.error('Please enter song and artist for karaoke'); return }
                setBusy(true)
                const res = await fetch('/api/bookings/cash', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        block_id: blockId,
                        user_name: name.trim(),
                        performance_type: type,
                        song_info: type === 'Karaoke' ? songInfo.trim() : null,
                        wants_video: video,
                        staff_password: staffPassword,
                        device_id: deviceId
                    })
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
                <div className="muted">{booking.performance_type}{booking.song_info ? ` - ${booking.song_info}` : ''}</div>
                <div className="space" />
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ok)' }}>Performer #{booking.slot_number}</div>
                {booking.approximate_time && (
                    <div className="muted" style={{ marginTop: 8 }}>
                        Approximate time: {formatTimeEST(booking.approximate_time)}
                    </div>
                )}
                <div className="space" />
                <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8 }}>
                    <div className="muted" style={{ fontSize: 14 }}>
                        Arrive at least 10 minutes early. Times are approximate and may shift based on performance lengths.
                    </div>
                </div>
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
        <div className="muted">{formatTimeEST(block.starts_at)}–{formatTimeEST(block.ends_at)}</div>
    </div>
}

function MyBookings() {
    const deviceId = useDeviceId()
    const [items, setItems] = useState<Booking[]>([])
    const [tarotItems, setTarotItems] = useState<any[]>([])

    useEffect(() => {
        supabase.from('bookings').select('*').eq('device_id', deviceId).order('created_at', { ascending: false }).then(({ data }) => setItems(data || []))
        supabase.from('tarot_bookings').select('*, readers:tarot_readers(*)').eq('device_id', deviceId).order('created_at', { ascending: false }).then(({ data }) => setTarotItems(data || []))
    }, [deviceId])

    return (
        <div>
            <div className="banner">Your bookings on this device</div>
            <div className="container">
                <div className="row" style={{ gap: 12, marginBottom: 20 }}>
                    <Link to="/" className="btn">Book Performance</Link>
                    <Link to="/tarot" className="btn">Book Tarot Reading</Link>
                </div>

                {items.length === 0 && tarotItems.length === 0 && <div className="muted">No bookings yet.</div>}

                {items.length > 0 && (
                    <>
                        <h3>Performance Bookings</h3>
                        <div className="grid">
                            {items.map(i => (
                                <div key={i.id} className="card">
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{i.user_name} — <span className="muted">{i.performance_type}{i.song_info ? ` - ${i.song_info}` : ''}</span></div>
                                    <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: 'var(--ok)' }}>Performer #{i.slot_number}</div>
                                    {i.approximate_time && (
                                        <div className="muted" style={{ marginTop: 4 }}>
                                            Approx: {formatTimeEST(i.approximate_time)}
                                        </div>
                                    )}
                                    <div className="muted" style={{ marginTop: 8 }}>Status: {i.payment_status}</div>
                                </div>
                            ))}
                        </div>
                        <div className="space" />
                    </>
                )}

                {tarotItems.length > 0 && (
                    <>
                        <h3>🔮 Tarot Reading Bookings</h3>
                        <div className="grid">
                            {tarotItems.map(t => (
                                <div key={t.id} className="card">
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{t.user_name}</div>
                                    <div className="muted">{t.readers?.name}</div>
                                    <div className="muted">{t.package_type === 'quick' ? 'Quick Read (5 min)' : 'Celtic Cross (15 min)'}</div>
                                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                                        {formatTimeEST(t.starts_at)} – {formatTimeEST(t.ends_at)}
                                    </div>
                                    <div className="muted" style={{ marginTop: 8 }}>Status: {t.payment_status}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function TarotReadings() {
    const [readers, setReaders] = useState<any[]>([])
    const [selectedReader, setSelectedReader] = useState<any>(null)
    const [selectedPackage, setSelectedPackage] = useState<'quick' | 'celtic' | null>(null)
    const [slots, setSlots] = useState<any[]>([])
    const [selectedSlot, setSelectedSlot] = useState<any>(null)
    const [showPayment, setShowPayment] = useState(false)
    const deviceId = useDeviceId()
    const navigate = useNavigate()

    useEffect(() => {
        fetch('/api/tarot/readers').then(r => r.json()).then(d => setReaders(d.readers || []))
    }, [])

    useEffect(() => {
        if (selectedReader && selectedPackage) {
            fetch(`/api/tarot/slots/${selectedReader.id}/${selectedPackage}`)
                .then(r => r.json())
                .then(d => setSlots(d.slots || []))
        }
    }, [selectedReader, selectedPackage])

    if (showPayment && selectedReader && selectedPackage && selectedSlot) {
        return (
            <TarotPayment
                reader={selectedReader}
                packageType={selectedPackage}
                slot={selectedSlot}
                onBack={() => setShowPayment(false)}
                onConfirmed={(bookingId: string) => navigate(`/tarot-confirm/${bookingId}`)}
            />
        )
    }

    return (
        <div>
            <div className="banner">Tarot Readings</div>
            <div className="container">
                <Link to="/" className="link">← Back to Performances</Link>
                <div className="space" />

                {!selectedReader && (
                    <>
                        <h2>Choose Your Time Block</h2>
                        <div className="muted" style={{ marginBottom: 16 }}>4 rotating blocks throughout the night</div>
                        <div className="grid">
                            {readers.map(reader => (
                                <div key={reader.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedReader(reader)}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>Block {reader.block_number}</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{reader.name}</div>
                                    <div className="muted" style={{ marginTop: 4 }}>
                                        {formatTimeEST(reader.starts_at)} – {formatTimeEST(reader.ends_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {selectedReader && !selectedPackage && (
                    <>
                        <button className="btn" onClick={() => setSelectedReader(null)}>← Change Reader</button>
                        <div className="space" />
                        <h2>Choose Package — {selectedReader.name}</h2>
                        <div className="grid">
                            <div className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedPackage('quick')}>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>$5</div>
                                <div style={{ fontSize: 18, fontWeight: 600 }}>Quick Read</div>
                                <div className="muted">5 minutes • 3 cards</div>
                            </div>
                            <div className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedPackage('celtic')}>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>$15</div>
                                <div style={{ fontSize: 18, fontWeight: 600 }}>Celtic Cross</div>
                                <div className="muted">15 minutes • Full spread + oracle</div>
                            </div>
                        </div>
                    </>
                )}

                {selectedReader && selectedPackage && !selectedSlot && (
                    <>
                        <button className="btn" onClick={() => setSelectedPackage(null)}>← Change Package</button>
                        <div className="space" />
                        <h2>Choose Time Slot</h2>
                        <div className="muted" style={{ marginBottom: 12 }}>
                            {selectedPackage === 'quick' ? 'Quick Read (5 min)' : 'Celtic Cross (15 min)'} with {selectedReader.name}
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                            {slots.map((slot, i) => (
                                <button
                                    key={i}
                                    className="btn"
                                    onClick={() => { setSelectedSlot(slot); setShowPayment(true) }}
                                >
                                    {formatTimeEST(slot.slot_start)}
                                </button>
                            ))}
                        </div>
                        {slots.length === 0 && <div className="muted">No available slots for this package</div>}
                    </>
                )}
            </div>
        </div>
    )
}

function TarotPayment({ reader, packageType, slot, onBack, onConfirmed }: any) {
    const [name, setName] = useState('')
    const [method, setMethod] = useState<'venmo' | 'cashapp' | 'applepay' | 'cash' | 'none'>('none')
    const [loading, setLoading] = useState(false)
    const deviceId = useDeviceId()
    const amount = packageType === 'quick' ? 5 : 15

    async function submit() {
        if (!name.trim()) { toast.error('Please enter your name'); return }
        if (method === 'none') { toast.error('Select a payment method'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/tarot/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reader_id: reader.id,
                    user_name: name.trim(),
                    package_type: packageType,
                    slot_start: slot.slot_start,
                    payment_method: method,
                    device_id: deviceId,
                    amount
                })
            })
            if (!res.ok) { throw new Error(await res.text()) }
            const data = await res.json()

            if (method === 'venmo') {
                const memo = encodeURIComponent(`Tarot Reading - ${reader.name}`)
                window.location.href = `/pay/venmo?amount=${amount}&note=${memo}`
            } else if (method === 'cashapp') {
                const memo = encodeURIComponent(`Tarot Reading - ${reader.name}`)
                window.location.href = `/pay/cashapp?amount=${amount}&note=${memo}`
            } else if (method === 'applepay') {
                toast.info('Apple Pay integration coming soon')
            } else if (method === 'cash') {
                onConfirmed(data.booking.id)
            }
        } catch (err: any) {
            toast.error(err.message || 'Booking failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container">
            <button className="btn" onClick={onBack}>← Back</button>
            <div className="space" />
            <div className="card">
                <h2>Complete Booking</h2>
                <div className="muted">
                    {reader.name} • {packageType === 'quick' ? 'Quick Read' : 'Celtic Cross'} • {formatTimeEST(slot.slot_start)}
                </div>
                <div className="space" />
                <label htmlFor="tarot-name">Your Name</label>
                <input id="tarot-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                <div className="space" />
                <div style={{ fontSize: 24, fontWeight: 700 }}>Total: ${amount}</div>
                <div className="space" />
                <h3>Payment Method</h3>
                <div className="grid">
                    <button className={`btn ${method === 'venmo' ? 'primary' : ''}`} onClick={() => setMethod('venmo')}>Venmo</button>
                    <button className={`btn ${method === 'cashapp' ? 'primary' : ''}`} onClick={() => setMethod('cashapp')}>Cash App</button>
                    <button className={`btn ${method === 'applepay' ? 'primary' : ''}`} onClick={() => setMethod('applepay')}>Apple Pay</button>
                    <button className={`btn ${method === 'cash' ? 'primary' : ''}`} onClick={() => setMethod('cash')}>Cash (Pay at door)</button>
                </div>
                <div className="space" />
                <button className="btn primary full" disabled={loading} onClick={submit}>
                    {loading ? 'Booking...' : method === 'cash' ? 'Reserve with Cash' : 'Continue to Payment'}
                </button>
            </div>
            {method === 'cash' && <TarotCashPassword readerId={reader.id} userName={name} packageType={packageType} slotStart={slot.slot_start} onConfirmed={onConfirmed} />}
            <Toaster richColors position="top-center" />
        </div>
    )
}

function TarotCashPassword({ readerId, userName, packageType, slotStart, onConfirmed }: any) {
    const [staffPassword, setStaffPassword] = useState('')
    const [busy, setBusy] = useState(false)
    const deviceId = useDeviceId()

    return (
        <div className="card" style={{ marginTop: 12 }}>
            <label htmlFor="tarot-pwd">Staff Password Required</label>
            <input id="tarot-pwd" type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} placeholder="Enter by door staff" />
            <div className="space" />
            <button disabled={busy} className="btn primary full" onClick={async () => {
                if (!userName.trim()) { toast.error('Name is required'); return }
                if (!staffPassword.trim()) { toast.error('Staff password required'); return }
                setBusy(true)
                const res = await fetch('/api/tarot/cash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reader_id: readerId,
                        user_name: userName.trim(),
                        package_type: packageType,
                        slot_start: slotStart,
                        staff_password: staffPassword,
                        device_id: deviceId
                    })
                })
                if (!res.ok) { toast.error(await res.text()); setBusy(false); return }
                const data = await res.json()
                toast.success('Reading booked!')
                onConfirmed(data.booking.id)
            }}>Reserve with Cash</button>
        </div>
    )
}

function TarotConfirmation() {
    const [booking, setBooking] = useState<any>(null)
    const navigate = useNavigate()
    const bookingId = location.pathname.split('/').pop()!

    useEffect(() => {
        supabase.from('tarot_bookings').select('*, readers:tarot_readers(*)').eq('id', bookingId).single()
            .then(({ data }) => setBooking(data))
    }, [bookingId])

    if (!booking) return <div className="container"><div className="muted">Loading…</div></div>

    return (
        <div className="container">
            <h2>Tarot Reading Booked!</h2>
            <div className="card">
                <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.user_name}</div>
                <div className="muted">{booking.readers?.name}</div>
                <div className="muted">{booking.package_type === 'quick' ? 'Quick Read (5 min)' : 'Celtic Cross (15 min)'}</div>
                <div className="space" />
                <div style={{ fontWeight: 700 }}>
                    {formatTimeEST(booking.starts_at)} – {formatTimeEST(booking.ends_at)}
                </div>
                <div className="space" />
                <div style={{ padding: 12, background: 'var(--card)', borderRadius: 8, border: '1px solid var(--accent)' }}>
                    📍 <strong>Readings are at the booth directly outside the secret door</strong>
                </div>
                <div className="space" />
                <button className="btn" onClick={async () => {
                    const text = `Tarot Reading — ${booking.user_name} — ${booking.readers?.name} — ${formatTimeEST(booking.starts_at)}`
                    if ((navigator as any).share) {
                        try { await (navigator as any).share({ title: "Tarot Reading Booked!", text, url: window.location.href }) } catch { }
                    } else {
                        try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied') } catch { }
                    }
                }}>Share</button>
            </div>
            <div className="space" />
            <button className="btn" onClick={() => navigate('/my')}>My Bookings</button>
            <Toaster richColors position="top-center" />
        </div>
    )
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Schedule />} />
            <Route path="/tarot" element={<TarotReadings />} />
            <Route path="/tarot-confirm/:id" element={<TarotConfirmation />} />
            <Route path="/confirm/:id" element={<Confirmation />} />
            <Route path="/my" element={<MyBookings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Schedule />} />
        </Routes>
    )
}

function Admin() {
    const [authenticated, setAuthenticated] = useState(false)
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [view, setView] = useState<'dashboard' | 'bookings' | 'settings'>('dashboard')
    const [bookings, setBookings] = useState<any[]>([])
    const [tarotBookings, setTarotBookings] = useState<any[]>([])
    const [blocks, setBlocks] = useState<any[]>([])
    const [event, setEvent] = useState<any>(null)
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cash-pending'>('all')

    useEffect(() => {
        const saved = localStorage.getItem('admin_auth')
        if (saved === 'true') setAuthenticated(true)
    }, [])

    useEffect(() => {
        if (authenticated) loadData()
    }, [authenticated])

    async function login() {
        setLoading(true)
        // Simple check - in production use proper auth
        if (password === 'hellishot2025') {
            localStorage.setItem('admin_auth', 'true')
            setAuthenticated(true)
            toast.success('Logged in')
        } else {
            toast.error('Invalid password')
        }
        setLoading(false)
    }

    async function loadData() {
        const [bookingsRes, tarotRes, eventRes, blocksRes] = await Promise.all([
            fetch('/api/admin/bookings'),
            fetch('/api/admin/tarot-bookings'),
            supabase.from('events').select('*').eq('active', true).single(),
            supabase.from('blocks').select('*').order('position')
        ])
        if (bookingsRes.ok) {
            const data = await bookingsRes.json()
            setBookings(data.bookings)
        }
        if (tarotRes.ok) {
            const data = await tarotRes.json()
            setTarotBookings(data.bookings)
        }
        if (eventRes.data) setEvent(eventRes.data)
        if (blocksRes.data) setBlocks(blocksRes.data)
    }

    if (!authenticated) {
        return (
            <div className="container" style={{ paddingTop: '20vh' }}>
                <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
                    <h2>Admin Login</h2>
                    <div className="space" />
                    <input
                        type="password"
                        placeholder="Admin password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && login()}
                    />
                    <div className="space" />
                    <button className="btn primary full" disabled={loading} onClick={login}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </div>
                <Toaster richColors position="top-center" />
            </div>
        )
    }

    const performanceRevenue = bookings.reduce((sum, b) => {
        if (b.payment_status === 'confirmed' || b.payment_status === 'cash-confirmed') {
            return sum + 3 + (b.wants_video ? 10 : 0)
        }
        return sum
    }, 0)

    const tarotRevenue = tarotBookings.reduce((sum, b) => {
        if (b.payment_status === 'confirmed' || b.payment_status === 'cash-confirmed') {
            return sum + b.amount
        }
        return sum
    }, 0)

    const revenue = performanceRevenue + tarotRevenue

    const pending = bookings.filter(b => b.payment_status === 'initiated' || b.payment_status === 'pending').length
    const cashPending = bookings.filter(b => b.payment_status === 'cash-pending').length
    const confirmed = bookings.filter(b => b.payment_status === 'confirmed' || b.payment_status === 'cash-confirmed').length

    const filteredBookings = bookings.filter(b => {
        if (filter === 'all') return true
        if (filter === 'pending') return b.payment_status === 'initiated' || b.payment_status === 'pending'
        if (filter === 'confirmed') return b.payment_status === 'confirmed' || b.payment_status === 'cash-confirmed'
        if (filter === 'cash-pending') return b.payment_status === 'cash-pending'
        return true
    })

    return (
        <div>
            <div style={{ background: 'var(--card)', borderBottom: '1px solid #333', padding: '12px 0' }}>
                <div className="container">
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Admin Panel</h2>
                        <div className="row" style={{ gap: 12 }}>
                            <button className={`btn ${view === 'dashboard' ? 'primary' : ''}`} onClick={() => setView('dashboard')}>Dashboard</button>
                            <button className={`btn ${view === 'bookings' ? 'primary' : ''}`} onClick={() => setView('bookings')}>Bookings</button>
                            <button className={`btn ${view === 'settings' ? 'primary' : ''}`} onClick={() => setView('settings')}>Settings</button>
                            <button className="btn" onClick={() => { localStorage.removeItem('admin_auth'); setAuthenticated(false) }}>Logout</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingTop: 20 }}>
                {view === 'dashboard' && (
                    <>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ok)' }}>${revenue}</div>
                                <div className="muted">Total Revenue</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 700 }}>{bookings.length}</div>
                                <div className="muted">Total Bookings</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ok)' }}>{confirmed}</div>
                                <div className="muted">Confirmed</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--warn)' }}>{pending}</div>
                                <div className="muted">Pending Payment</div>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{cashPending}</div>
                                <div className="muted">Cash Pending</div>
                            </div>
                        </div>
                        <div className="space" />
                        <h3>Performance Queue</h3>
                        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--ok)' }}>
                                    {bookings.length} / {blocks[0]?.capacity || 200}
                                </div>
                                <div className="muted">performers in queue</div>
                                <div className="space" />
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ok)' }}>
                                    ${performanceRevenue}
                                </div>
                                <div className="muted">performance revenue</div>
                            </div>
                        </div>
                        <div className="space" />
                        <h3>🔮 Tarot Bookings ({tarotBookings.length})</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                        <th style={{ padding: 8 }}>Time</th>
                                        <th style={{ padding: 8 }}>Name</th>
                                        <th style={{ padding: 8 }}>Reader</th>
                                        <th style={{ padding: 8 }}>Package</th>
                                        <th style={{ padding: 8 }}>Status</th>
                                        <th style={{ padding: 8 }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tarotBookings.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: 8 }}>
                                                {formatTimeEST(t.starts_at)}
                                            </td>
                                            <td style={{ padding: 8 }}>{t.user_name}</td>
                                            <td style={{ padding: 8 }}>{t.readers?.name}</td>
                                            <td style={{ padding: 8 }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    background: t.payment_status === 'confirmed' || t.payment_status === 'cash-confirmed' ? '#1a3a1a' : '#3a1a1a',
                                                    color: t.payment_status === 'confirmed' || t.payment_status === 'cash-confirmed' ? 'var(--ok)' : 'var(--accent)'
                                                }}>
                                                    {t.payment_status}
                                                </span>
                                            </td>
                                            <td style={{ padding: 8, fontWeight: 700 }}>${t.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {tarotBookings.length === 0 && <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No tarot bookings yet</div>}
                        </div>
                    </>
                )}

                {view === 'bookings' && (
                    <>
                        <div className="row" style={{ gap: 12, marginBottom: 20 }}>
                            <button className={`btn ${filter === 'all' ? 'primary' : ''}`} onClick={() => setFilter('all')}>All ({bookings.length})</button>
                            <button className={`btn ${filter === 'confirmed' ? 'primary' : ''}`} onClick={() => setFilter('confirmed')}>Confirmed ({confirmed})</button>
                            <button className={`btn ${filter === 'pending' ? 'primary' : ''}`} onClick={() => setFilter('pending')}>Pending ({pending})</button>
                            <button className={`btn ${filter === 'cash-pending' ? 'primary' : ''}`} onClick={() => setFilter('cash-pending')}>Cash Pending ({cashPending})</button>
                            <a className="btn" href="/api/admin/export.csv" style={{ marginLeft: 'auto' }}>Export CSV</a>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                                        <th style={{ padding: 12 }}>Slot</th>
                                        <th style={{ padding: 12 }}>Name</th>
                                        <th style={{ padding: 12 }}>Performance</th>
                                        <th style={{ padding: 12 }}>Block</th>
                                        <th style={{ padding: 12 }}>Payment</th>
                                        <th style={{ padding: 12 }}>Status</th>
                                        <th style={{ padding: 12 }}>Video</th>
                                        <th style={{ padding: 12 }}>Amount</th>
                                        <th style={{ padding: 12 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map(b => (
                                        <tr key={b.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: 12 }}>#{b.slot_number}</td>
                                            <td style={{ padding: 12 }}>{b.user_name}</td>
                                            <td style={{ padding: 12 }}>
                                                {b.performance_type}
                                                {b.song_info && <div className="muted" style={{ fontSize: 12 }}>{b.song_info}</div>}
                                            </td>
                                            <td style={{ padding: 12 }}>{b.blocks?.name}</td>
                                            <td style={{ padding: 12 }}>{b.payment_method}</td>
                                            <td style={{ padding: 12 }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    background: b.payment_status === 'confirmed' || b.payment_status === 'cash-confirmed' ? '#1a3a1a' : b.payment_status === 'cash-pending' ? '#3a2a1a' : '#3a1a1a',
                                                    color: b.payment_status === 'confirmed' || b.payment_status === 'cash-confirmed' ? 'var(--ok)' : b.payment_status === 'cash-pending' ? 'var(--warn)' : 'var(--accent)'
                                                }}>
                                                    {b.payment_status}
                                                </span>
                                            </td>
                                            <td style={{ padding: 12 }}>{b.wants_video ? '✓' : '–'}</td>
                                            <td style={{ padding: 12 }}>${3 + (b.wants_video ? 10 : 0)}</td>
                                            <td style={{ padding: 12 }}>
                                                <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={async () => {
                                                    if (confirm('Remove this booking?')) {
                                                        const res = await fetch('/api/admin/bookings/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id }) })
                                                        if (res.ok) {
                                                            await loadData()
                                                            toast.success('Booking removed')
                                                        } else {
                                                            const error = await res.text()
                                                            toast.error(`Failed to remove booking: ${error}`)
                                                        }
                                                    }
                                                }}>Remove</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {view === 'settings' && (
                    <>
                        <div className="card">
                            <h3>Staff Password</h3>
                            <div className="row" style={{ gap: 8 }}>
                                <input type="password" placeholder="New staff password" value={password} onChange={e => setPassword(e.target.value)} />
                                <button className="btn primary" disabled={loading || !password} onClick={async () => {
                                    setLoading(true)
                                    const res = await fetch('/api/admin/staff-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
                                    setLoading(false)
                                    if (res.ok) { toast.success('Password updated'); setPassword('') } else { toast.error(await res.text()) }
                                }}>{loading ? 'Saving…' : 'Update Password'}</button>
                            </div>
                        </div>
                        <div className="space" />
                        <div className="card">
                            <h3>Event Information</h3>
                            {event && (
                                <div>
                                    <div><strong>Name:</strong> {event.name}</div>
                                    <div><strong>Date:</strong> {formatDateEST(event.starts_at)}</div>
                                    <div><strong>Time:</strong> {formatTimeEST(event.starts_at)} – {formatTimeEST(event.ends_at)}</div>
                                    <div><strong>Status:</strong> {event.active ? 'Active' : 'Inactive'}</div>
                                </div>
                            )}
                            {!event && (
                                <div className="muted">No active event configured</div>
                            )}
                        </div>
                        <div className="space" />
                        <div className="card">
                            <h3>⚠️ Danger Zone</h3>
                            <div className="muted" style={{ marginBottom: 12 }}>These actions are permanent and cannot be undone</div>
                            <div className="row" style={{ gap: 12 }}>
                                <button className="btn" disabled={loading} onClick={async () => {
                                    if (!confirm('Clear all events, blocks, and bookings? This cannot be undone!')) return
                                    setLoading(true)
                                    const res = await fetch('/api/admin/clear-all', { method: 'POST' })
                                    setLoading(false)
                                    if (res.ok) {
                                        toast.success('All data cleared')
                                        await loadData()
                                    } else {
                                        toast.error(await res.text())
                                    }
                                }}>Clear All Data</button>
                                <button className="btn primary" disabled={loading} onClick={async () => {
                                    if (!confirm('Create today\'s event with 4 blocks?')) return
                                    setLoading(true)
                                    const res = await fetch('/api/admin/seed-event', { method: 'POST' })
                                    setLoading(false)
                                    if (res.ok) {
                                        toast.success('Event created successfully')
                                        await loadData()
                                    } else {
                                        const error = await res.text()
                                        toast.error(`Failed to create event: ${error}`)
                                    }
                                }}>Seed Today's Event</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <Toaster richColors position="top-center" />
        </div>
    )
}
