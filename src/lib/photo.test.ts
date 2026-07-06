import { PhotoError, stripJpegAppSegments } from '@/lib/photo'

// Builds one JPEG segment: FF <marker> <length incl. its own 2 bytes> payload.
function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2
  return [0xff, marker, length >> 8, length & 0xff, ...payload]
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

// Minimal real EXIF body carrying a GPS IFD pointer (tag 0x8825) — the same
// structure the LCHP-5 spike rig detects as "GPS present". Little-endian TIFF:
// header at 0, IFD0 at 8 with a single GPS-pointer entry, GPS IFD at 26.
const EXIF_GPS_PAYLOAD = [
  ...ascii('Exif'),
  0x00,
  0x00,
  // TIFF header: 'II', 42, IFD0 offset = 8
  0x49,
  0x49,
  0x2a,
  0x00,
  0x08,
  0x00,
  0x00,
  0x00,
  // IFD0: 1 entry
  0x01,
  0x00,
  // tag 0x8825 (GPS IFD pointer), type LONG, count 1, value = offset 26
  0x25,
  0x88,
  0x04,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x1a,
  0x00,
  0x00,
  0x00,
  // next IFD offset: none
  0x00,
  0x00,
  0x00,
  0x00,
  // GPS IFD at 26: 0 entries, no next IFD
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
]

const SOI = [0xff, 0xd8]
const EOI = [0xff, 0xd9]
const APP0_JFIF = segment(0xe0, [
  ...ascii('JFIF'),
  0x00,
  0x01,
  0x02,
  0x00,
  0x00,
  0x01,
  0x00,
  0x01,
  0x00,
  0x00,
])
const APP1_EXIF_GPS = segment(0xe1, EXIF_GPS_PAYLOAD)
const APP2_ICC = segment(0xe2, [...ascii('ICC_PROFILE'), 0x00, 0x01, 0x01])
const COM = segment(0xfe, ascii('a comment'))
const DQT = segment(0xdb, [0x00, ...Array.from({ length: 64 }, (_, i) => i + 1)])
// SOS header + fake entropy-coded data (kept verbatim by the stripper).
const SCAN = [
  ...segment(0xda, [0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]),
  0x12,
  0x34,
  0x56,
  0x78,
  ...EOI,
]

const jpeg = (...parts: number[][]) => new Uint8Array(parts.flat())

describe('stripJpegAppSegments (golden rule: no metadata leaves the device)', () => {
  it('removes a GPS-bearing EXIF APP1 segment and keeps the image intact', () => {
    const input = jpeg(SOI, APP0_JFIF, APP1_EXIF_GPS, DQT, SCAN)
    const output = stripJpegAppSegments(input)
    expect([...output]).toEqual([...jpeg(SOI, APP0_JFIF, DQT, SCAN)])
  })

  it('removes every APPn (1–15) and COM segment, not just EXIF', () => {
    const app13 = segment(0xed, ascii('Photoshop 3.0'))
    const input = jpeg(SOI, APP0_JFIF, APP1_EXIF_GPS, APP2_ICC, app13, COM, DQT, SCAN)
    const output = stripJpegAppSegments(input)
    expect([...output]).toEqual([...jpeg(SOI, APP0_JFIF, DQT, SCAN)])
  })

  it('leaves no trace of the EXIF marker or its ASCII signature', () => {
    const input = jpeg(SOI, APP1_EXIF_GPS, DQT, SCAN)
    const output = stripJpegAppSegments(input)
    const asText = String.fromCharCode(...output)
    expect(asText).not.toContain('Exif')
    for (let i = 0; i < output.length - 1; i++) {
      expect([output[i], output[i + 1]]).not.toEqual([0xff, 0xe1])
    }
  })

  it('copies everything from SOS onward verbatim (entropy data untouched)', () => {
    const input = jpeg(SOI, DQT, SCAN)
    const output = stripJpegAppSegments(input)
    expect([...output.subarray(output.length - SCAN.length)]).toEqual(SCAN)
  })

  it('tolerates fill bytes (extra 0xFF) before a marker', () => {
    const input = jpeg(SOI, [0xff], APP1_EXIF_GPS, DQT, SCAN)
    const output = stripJpegAppSegments(input)
    expect([...output]).toEqual([...jpeg(SOI, DQT, SCAN)])
  })

  it('rejects non-JPEG input', () => {
    expect(() => stripJpegAppSegments(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toThrow(PhotoError)
  })

  it('rejects a JPEG with a truncated segment', () => {
    const truncated = jpeg(SOI, APP1_EXIF_GPS).slice(0, 10)
    expect(() => stripJpegAppSegments(truncated)).toThrow(PhotoError)
  })

  it('rejects a JPEG with no scan data (nothing after the headers)', () => {
    const headersOnly = jpeg(SOI, APP0_JFIF, DQT)
    expect(() => stripJpegAppSegments(headersOnly)).toThrow(PhotoError)
  })
})
