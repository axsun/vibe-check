import express from 'express'
import cors from 'cors'
import { env, flags, logStartup } from './lib/env'
import { vibeRouter } from './routes/vibe'
import { feedRouter } from './routes/feed'
import { narrateRouter } from './routes/narrate'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, flags }))
app.use('/api/vibe', vibeRouter)
app.use('/api/feed', feedRouter)
app.use('/api/narrate', narrateRouter)

app.listen(env.PORT, () => {
  logStartup()
  console.log(`   • listening:  http://localhost:${env.PORT}`)
})
