import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { resolveUploadFile } from '@/lib/uploadPath'
import { getImageMimeType } from '@/lib/imageType'

export const dynamic = 'force-dynamic'

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.avif': 'image/avif',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path
  if (segments.length !== 2) {
    return new NextResponse(null, { status: 404 })
  }

  const [kind, filename] = segments
  const filepath = resolveUploadFile(kind, filename)
  if (!filepath) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const buffer = await readFile(filepath)
    const mime =
      getImageMimeType(buffer) ||
      EXT_MIME[path.extname(filename).toLowerCase()] ||
      'application/octet-stream'
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}
