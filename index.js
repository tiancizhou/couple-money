import { buildServer } from './server.js'

const app = await buildServer()

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
  console.log('心动账本运行在 http://localhost:3000')
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
