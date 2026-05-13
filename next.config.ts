import type { NextConfig } from 'next'
import fs from 'fs'

// --- MONKEY PATCH Node.js fs.readlink to fix Windows EISDIR bug ---
const originalReadlink = fs.readlink
const originalReadlinkSync = fs.readlinkSync

// @ts-ignore
fs.readlink = function (path, options, callback) {
  const cb = typeof options === 'function' ? options : callback
  const opts = typeof options === 'function' ? null : options
  // @ts-ignore
  originalReadlink(path, opts as any, (err, linkString) => {
    if (err && err.code === 'EISDIR') {
      err.code = 'EINVAL' // Webpack expects EINVAL for non-symlinks
    }
    // @ts-ignore
    if (cb) cb(err, linkString as any)
  })
}

// @ts-ignore
fs.readlinkSync = function (path, options) {
  try {
    // @ts-ignore
    return originalReadlinkSync(path, options as any)
  } catch (err: any) {
    if (err.code === 'EISDIR') {
      err.code = 'EINVAL'
    }
    throw err
  }
}
// ------------------------------------------------------------------

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack(config) {
    return config
  },
}

export default nextConfig
