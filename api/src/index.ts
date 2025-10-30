import express, { Request, Response } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { bookings } from './routes/bookings.js'
import { admin } from './routes/admin.js'
import { stripe } from './lib/stripe.js'
import { supabaseAdmin } from './lib/supabase.js'
import { z } from 'zod'

const app = express()
app.use(cors())
app.use(express.json({ verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => { (req as any).rawBody = buf } }))

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 60 })
app.use(limiter)

// Health
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }))

// Booking routes
app.use('/api/bookings', bookings)

// Admin (no auth wired yet; wire Supabase Auth/JWT in production)
app.use('/api/admin', admin)

// Stripe payment intent (Apple Pay via Payment Request)
const intentSchema = z.object({ amount: z.number().min(1), currency: z.string().default('usd'), booking_id: z.string() })
app.post('/api/payments/create-intent', async (req: Request, res: Response) => {
    if (!stripe) return res.status(500).send('Stripe not configured')
    const parsed = intentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).send('Invalid input')
    const { amount, currency, booking_id } = parsed.data
    try {
        const intent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            automatic_payment_methods: { enabled: true },
            metadata: { booking_id }
        })
        res.json({ client_secret: intent.client_secret })
    } catch (e: any) { res.status(500).send(e.message) }
})

// Stripe webhook
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request & { rawBody?: Buffer }, res: Response) => {
    const sig = req.headers['stripe-signature'] as string | undefined
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
    let event
    try {
        if (endpointSecret && stripe) {
            event = stripe.webhooks.constructEvent((req as any).rawBody, sig!, endpointSecret)
        } else {
            event = req.body
        }
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }
    if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object
        const booking_id = intent.metadata?.booking_id
        if (booking_id) {
            await supabaseAdmin.from('bookings').update({ payment_status: 'paid' }).eq('id', booking_id)
        }
    }
    res.json({ received: true })
})

// Payment deep links
app.get('/pay/venmo', (req: Request, res: Response) => {
    const amount = String(req.query.amount || '3')
    const note = encodeURIComponent(String(req.query.note || 'Hell Is Hot'))
    const venmoUser = process.env.VENMO_USERNAME || ''
    const appLink = `venmo://paycharge?txn=pay&recipients=${venmoUser}&amount=${encodeURIComponent(amount)}&note=${note}`
    const webLink = `https://venmo.com/${venmoUser}?txn=pay&amount=${encodeURIComponent(amount)}&note=${note}`
    res.redirect(appLink)
    setTimeout(() => { try { res.redirect(webLink) } catch { } }, 100)
})

app.get('/pay/cashapp', (req: Request, res: Response) => {
    const amount = String(req.query.amount || '3')
    const note = encodeURIComponent(String(req.query.note || 'Hell Is Hot'))
    const tag = process.env.CASHAPP_CASHTAG || ''
    const link = `https://cash.app/$${tag}/${encodeURIComponent(amount)}?note=${note}`
    res.redirect(link)
})

// Apple Pay landing (simple instruction page; SPA can also handle)
app.get('/pay/apple/:bookingId', (req: Request, res: Response) => {
    const bookingId = req.params.bookingId
    res.setHeader('Content-Type', 'text/html')
    res.end(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Apple Pay</title></head>
  <body style="background:#0f0f0f;color:#fff;font-family:system-ui, -apple-system, Segoe UI, Roboto;">
  <div style="max-width:640px;margin:40px auto;padding:16px;">
  <h2>Apple Pay Checkout</h2>
  <p>If your device supports Apple Pay, a prompt will appear.</p>
  <button id="pay" style="padding:12px 16px;background:#34c759;border:none;border-radius:10px;color:#000;font-weight:700;">Pay with Apple Pay</button>
  <div id="msg" style="margin-top:12px;color:#bdbdbd;"></div>
  </div>
  <script type="module">
    import { loadStripe } from 'https://js.stripe.com/v3/es/index.mjs'
    const stripe = await loadStripe('${process.env.STRIPE_PUBLISHABLE_KEY || ''}')
    const bookingId = '${bookingId}'
    const amount = Number(new URLSearchParams(location.search).get('amount') || '3')

    const payBtn = document.getElementById('pay')
    payBtn.addEventListener('click', async ()=>{
      const { client_secret } = await (await fetch('/api/payments/create-intent', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount, booking_id: bookingId }) })).json()
      const pr = stripe.paymentRequest({ country:'US', currency:'usd', total:{ label:'Hell Is Hot', amount: Math.round(amount*100) }, requestPayerName:true })
      const elements = stripe.elements()
      const prButton = elements.create('paymentRequestButton', { paymentRequest: pr })
      const result = await pr.canMakePayment()
      if(result){
        const { error } = await stripe.confirmPayment({ clientSecret: client_secret, confirmParams: { return_url: window.location.origin + '/confirm/' + bookingId } })
        if(error){ document.getElementById('msg').innerText = error.message }
      } else {
        document.getElementById('msg').innerText = 'Apple Pay not available on this device.'
      }
    })
  </script>
  </body></html>`)
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`)
})
