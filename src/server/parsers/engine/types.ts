/** A single line from the preprocessed input, optionally split into key/value. */
export interface Segment {
  raw: string
  key?: string
  value?: string
}
