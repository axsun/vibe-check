import express from 'express'
import cors from 'cors'
import { env, flags, logStartup } from './lib/env'
import { CLIPS_DIR } from './lib/localStore'
import { seedIfEmpty } from './lib/store'
import { vibeRouter } from './routes/vibe'
import { feedRouter } from './routes/feed'
import { narrateRouter } from './routes/narrate'
import { discoverRouter } from './routes/discover'
import { geocodeRouter } from './routes/geocode'
import { forecastRouter } from './routes/forecast'
import { soundscapeRouter } from './routes/soundscape'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true, flags }))
app.use('/api/vibe', vibeRouter)
app.use('/api/feed', feedRouter)
app.use('/api/narrate', narrateRouter)
app.use('/api/discover', discoverRouter)
app.use('/api/geocode', geocodeRouter)
app.use('/api/forecast', forecastRouter)
app.use('/api/soundscape', soundscapeRouter)

// Serve locally-stored clips (local storage mode). Proxied via Vite at /clips.
app.use('/clips', express.static(CLIPS_DIR))

app.listen(env.PORT, async () => {
  logStartup()
  await seedIfEmpty()
  console.log(`   • listening:  http://localhost:${env.PORT}`)
})
