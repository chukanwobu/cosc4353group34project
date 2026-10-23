import { app } from './app'

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`⚡ QueueSmart Backend REST API listening on http://localhost:${PORT}`)
})
