import type { SubnetAllocation } from '../lib/vlsm'

interface Props {
  baseCidr: string
  allocations: SubnetAllocation[]
  colorMap: Record<string, string>
}

function ipToInt(ip: string): number {
  const [a, b, c, d] = ip.split('.').map(Number)
  return a * 16777216 + b * 65536 + c * 256 + d
}

type Segment =
  | { kind: 'subnet'; alloc: SubnetAllocation; widthPct: number }
  | { kind: 'gap'; widthPct: number; addresses: number }

function buildSegments(baseCidr: string, allocations: SubnetAllocation[]): Segment[] {
  const [ipStr, prefixStr] = baseCidr.split('/')
  const basePrefix = parseInt(prefixStr, 10)
  const baseBlockSize = Math.pow(2, 32 - basePrefix)
  const baseNetworkInt = Math.floor(ipToInt(ipStr) / baseBlockSize) * baseBlockSize
  const baseEndInt = baseNetworkInt + baseBlockSize

  const sorted = [...allocations].sort(
    (a, b) => ipToInt(a.networkAddress) - ipToInt(b.networkAddress),
  )

  const segs: Segment[] = []
  let cursor = baseNetworkInt

  for (const alloc of sorted) {
    const start = ipToInt(alloc.networkAddress)
    const size = Math.pow(2, 32 - alloc.prefix)
    if (start > cursor) {
      segs.push({
        kind: 'gap',
        widthPct: ((start - cursor) / baseBlockSize) * 100,
        addresses: start - cursor,
      })
    }
    segs.push({
      kind: 'subnet',
      alloc,
      widthPct: (size / baseBlockSize) * 100,
    })
    cursor = start + size
  }

  if (cursor < baseEndInt) {
    segs.push({
      kind: 'gap',
      widthPct: ((baseEndInt - cursor) / baseBlockSize) * 100,
      addresses: baseEndInt - cursor,
    })
  }

  return segs
}

export function AddressBar({ baseCidr, allocations, colorMap }: Props) {
  if (!baseCidr.includes('/')) return null

  const segments = buildSegments(baseCidr, allocations)
  const hasGap = segments.some((s) => s.kind === 'gap')

  return (
    <div>
      <div className="bar-track">
        {segments.map((seg, i) => {
          if (seg.kind === 'subnet') {
            const showLabel = seg.widthPct >= 5
            return (
              <div
                key={i}
                className="bar-seg"
                style={{
                  width: `${seg.widthPct}%`,
                  background: colorMap[seg.alloc.name] ?? '#555',
                }}
                title={`${seg.alloc.name}: ${seg.alloc.networkAddress}/${seg.alloc.prefix} · ${Math.pow(2, 32 - seg.alloc.prefix)} addresses`}
              >
                {showLabel && (
                  <span className="bar-seg-label">
                    {seg.alloc.name}/{seg.alloc.prefix}
                  </span>
                )}
              </div>
            )
          }
          return (
            <div
              key={i}
              className="bar-seg"
              style={{ width: `${seg.widthPct}%`, background: 'var(--surface-2)' }}
              title={`Unallocated: ${seg.addresses} addresses`}
            />
          )
        })}
      </div>

      <div className="bar-legend">
        {allocations.map((a) => (
          <div key={`${a.name}-${a.networkAddress}`} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: colorMap[a.name] }}
            />
            <span>
              {a.name} /{a.prefix}
            </span>
            <span style={{ color: 'var(--border)', margin: '0 2px' }}>·</span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              {a.networkAddress}
            </span>
          </div>
        ))}
        {hasGap && (
          <div className="legend-item">
            <span
              className="legend-swatch"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            />
            <span>Unallocated</span>
          </div>
        )}
      </div>
    </div>
  )
}
