import { proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const target = process.env.NUXT_API_INTERNAL || 'http://api:3000'
  const path = event.path.replace(/^\/api\/v1/, '')
  return proxyRequest(event, `${target}${path}`)
})
