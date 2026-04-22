import { posix as pathPosix } from 'path-browserify'
import axios from 'redaxios'

import { driveApi, cacheControlHeader } from '../../../config/api.config'
import { encodePath, getAccessToken, checkAuthRoute } from '.'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

/**
 * Resolve the direct CDN download URL for a file without triggering a redirect.
 * This is used by the video player to pre-resolve the URL and feed it directly,
 * eliminating the 302 redirect overhead on every range request / chunk fetch.
 *
 * Returns JSON: { url: string } with the direct OneDrive CDN download link.
 */
export default async function handler(req: NextRequest): Promise<Response> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No access token.' }), { status: 403 })
  }

  const { path = '/', odpt = '' } = Object.fromEntries(req.nextUrl.searchParams)

  if (path === '[...path]') {
    return new Response(JSON.stringify({ error: 'No path specified.' }), { status: 400 })
  }
  if (typeof path !== 'string') {
    return new Response(JSON.stringify({ error: 'Path query invalid.' }), { status: 400 })
  }
  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))

  // Handle protected routes authentication
  const odTokenHeader = (req.headers.get('od-protected-token') as string) ?? odpt

  const { code, message } = await checkAuthRoute(cleanPath, accessToken, odTokenHeader)
  if (code !== 200) {
    return new Response(JSON.stringify({ error: message }), { status: code })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Cache the resolved URL for a short time (OneDrive CDN URLs expire after ~1 hour)
    // Use a shorter s-maxage to ensure freshness while still benefiting from edge caching
    'Cache-Control': message !== '' ? 'no-cache' : 'max-age=0, s-maxage=300, stale-while-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  try {
    const requestUrl = `${driveApi}/root${encodePath(cleanPath)}`
    const { data } = await axios.get(requestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        select: 'id,size,@microsoft.graph.downloadUrl',
      },
    })

    if ('@microsoft.graph.downloadUrl' in data) {
      return new Response(
        JSON.stringify({
          url: data['@microsoft.graph.downloadUrl'],
          size: data['size'] ?? null,
        }),
        { status: 200, headers }
      )
    } else {
      return new Response(JSON.stringify({ error: 'No download url found.' }), { status: 404, headers })
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.response?.data ?? 'Internal server error.' }), {
      status: error?.response?.status ?? 500,
      headers,
    })
  }
}
