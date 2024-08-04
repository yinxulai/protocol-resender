import http from 'http'
import https from 'https'

import { HttpSpec, Sender, SenderResult } from '@/type'

function isHttpsProtocol(spec: HttpSpec): boolean {
  return spec.url.toLowerCase().startsWith('https')
}

function mergeDefault<T>(v: T | undefined, d: T): T {
  return v != null ? v : d
}

export function createHttpSender(): Sender<HttpSpec> {
  async function send(spec: HttpSpec) {
    const requestOptions: http.RequestOptions = {}

    requestOptions.path = spec.url
    requestOptions.method = spec.method
    if (spec.host) requestOptions.host = spec.host
    if (spec.headers) requestOptions.headers = spec.headers
    if (spec.headers) requestOptions.headers = spec.headers
    requestOptions.timeout = mergeDefault(spec.timeout, 10000)

    const isHttps = isHttpsProtocol(spec)
    const requestClient = isHttps ? https : http

    const maxRedirects = mergeDefault(spec.maxRedirects, 3)
    const followRedirects = mergeDefault(spec.followRedirects, true)
    const receiveResponse = mergeDefault(spec.receiveResponse, false)

    return new Promise<SenderResult>(resolve => {
      const request = requestClient.request(requestOptions, response => {
        if (response.statusCode != null) {
          const iswRedirect = [301, 302, 307, 308].includes(response.statusCode)
          if (followRedirects && iswRedirect && maxRedirects > 0) {
            const location = response.headers.location
            if (location && typeof location === 'string') {
              send({ ...spec, url: location, maxRedirects: maxRedirects - 1 })
                .then(resolve)
            }
          }
        }

        response.on('data', () => {
          resolve({ success: true, message: '' })
          if (!receiveResponse) request.destroy()
        })

        response.on('end', () => {
          resolve({ success: true, message: '' })
        })

        response.on('close', () => {
          resolve({ success: true, message: '' })
        })

        response.on('error', err => {
          resolve({ success: false, message: err.message })
        })

      })
    })
  }

  return { send }
}
