export interface GscRow {
  date: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscQueryDelta {
  query: string
  firstDate: string
  lastDate: string
  clicksDelta: number
  impressionsDelta: number
  positionDelta: number
}

export interface GscSummary {
  rowCount: number
  queryCount: number
  totalClicks: number
  totalImpressions: number
  averageCtr: number
  averagePosition: number
  topQueries: { query: string; clicks: number; impressions: number; averagePosition: number }[]
  topMovers: GscQueryDelta[]
  lostQueries: GscQueryDelta[]
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index++
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function numberValue(value: string | undefined) {
  const normalized = String(value ?? '').trim().replace(/,/g, '').replace(/%$/, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function ctrValue(value: string | undefined) {
  const raw = String(value ?? '').trim()
  const parsed = numberValue(raw)
  return raw.endsWith('%') ? parsed / 100 : parsed
}

export function parseGscCsv(text: string): GscRow[] {
  const lines = String(text ?? '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) return []
  const headers = splitCsvLine(lines[0]).map(headerKey)
  const indexOf = (name: string) => headers.indexOf(name)
  const required = ['date', 'query', 'clicks', 'impressions', 'ctr', 'position']
  const missing = required.filter((name) => indexOf(name) === -1)
  if (missing.length) throw new Error(`GSC CSV missing columns: ${missing.join(', ')}`)

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    return {
      date: cells[indexOf('date')] ?? '',
      query: cells[indexOf('query')] ?? '',
      clicks: numberValue(cells[indexOf('clicks')]),
      impressions: numberValue(cells[indexOf('impressions')]),
      ctr: ctrValue(cells[indexOf('ctr')]),
      position: numberValue(cells[indexOf('position')]),
    }
  }).filter((row) => row.date && row.query)
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function summarizeGscRows(rows: GscRow[]): GscSummary {
  const byQuery = new Map<string, GscRow[]>()
  for (const row of rows) {
    const list = byQuery.get(row.query) ?? []
    list.push(row)
    byQuery.set(row.query, list)
  }

  const topQueries = [...byQuery.entries()].map(([query, queryRows]) => ({
    query,
    clicks: queryRows.reduce((sum, row) => sum + row.clicks, 0),
    impressions: queryRows.reduce((sum, row) => sum + row.impressions, 0),
    averagePosition: average(queryRows.map((row) => row.position)),
  })).sort((a, b) => b.clicks - a.clicks).slice(0, 10)

  const deltas = [...byQuery.entries()].map(([query, queryRows]) => {
    const sorted = [...queryRows].sort((a, b) => a.date.localeCompare(b.date))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    return {
      query,
      firstDate: first.date,
      lastDate: last.date,
      clicksDelta: last.clicks - first.clicks,
      impressionsDelta: last.impressions - first.impressions,
      positionDelta: first.position - last.position,
    }
  })

  return {
    rowCount: rows.length,
    queryCount: byQuery.size,
    totalClicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    totalImpressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    averageCtr: average(rows.map((row) => row.ctr)),
    averagePosition: average(rows.map((row) => row.position)),
    topQueries,
    topMovers: deltas.filter((delta) => delta.positionDelta > 0).sort((a, b) => b.positionDelta - a.positionDelta).slice(0, 10),
    lostQueries: deltas.filter((delta) => delta.positionDelta < 0).sort((a, b) => a.positionDelta - b.positionDelta).slice(0, 10),
  }
}

export function summarizeGscCsv(text: string) {
  const rows = parseGscCsv(text)
  return summarizeGscRows(rows)
}
