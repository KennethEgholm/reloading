import path from 'path'
import { describe, it, expect } from 'vitest'
import { resolveUploadFile, uploadsRoot } from './uploadPath'
import { uploadUrl } from './uploadUrl'

describe('resolveUploadFile', () => {
  it('resolves a normal filename inside the kind directory', () => {
    const resolved = resolveUploadFile('range-logs', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg')
    expect(resolved).toBe(
      path.join(uploadsRoot(), 'range-logs', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg'),
    )
  })

  it('accepts factory-ammo', () => {
    const resolved = resolveUploadFile('factory-ammo', 'photo.png')
    expect(resolved).toBe(path.join(uploadsRoot(), 'factory-ammo', 'photo.png'))
  })

  it('rejects unknown kinds', () => {
    expect(resolveUploadFile('other', 'a.jpg')).toBeNull()
    expect(resolveUploadFile('', 'a.jpg')).toBeNull()
  })

  it('rejects traversal and nested paths', () => {
    expect(resolveUploadFile('range-logs', '..')).toBeNull()
    expect(resolveUploadFile('range-logs', '.')).toBeNull()
    expect(resolveUploadFile('range-logs', '../secret.jpg')).toBeNull()
    expect(resolveUploadFile('range-logs', 'foo/bar.jpg')).toBeNull()
    expect(resolveUploadFile('range-logs', 'foo\\bar.jpg')).toBeNull()
    expect(resolveUploadFile('range-logs', 'a.jpg\0.png')).toBeNull()
  })

  it('rejects empty filenames', () => {
    expect(resolveUploadFile('range-logs', '')).toBeNull()
  })
})

describe('uploadUrl', () => {
  it('points at the uploads API route', () => {
    expect(uploadUrl('range-logs', 'abc.jpg')).toBe('/api/uploads/range-logs/abc.jpg')
  })

  it('encodes the filename', () => {
    expect(uploadUrl('factory-ammo', 'a b.jpg')).toBe('/api/uploads/factory-ammo/a%20b.jpg')
  })
})
