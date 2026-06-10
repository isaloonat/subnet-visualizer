import { useState } from 'react'
import type { SubnetAllocation } from '../lib/vlsm'

interface Props {
  allocations: SubnetAllocation[]
  colorMap: Record<string, string>
}

export function AllocationTable({ allocations, colorMap }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const header = [
      'Subnet', 'Network', 'Prefix', 'Mask',
      'First Host', 'Last Host', 'Broadcast', 'Usable Hosts', 'Wasted',
    ]
    const dataRows = allocations.map((a) => [
      a.name,
      a.networkAddress,
      `/${a.prefix}`,
      a.subnetMask,
      a.firstHost,
      a.lastHost,
      a.broadcastAddress,
      String(a.usableHosts),
      String(a.wastedAddresses),
    ])
    const tsv = [header, ...dataRows].map((r) => r.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (non-secure context)
    }
  }

  return (
    <div>
      <div className="table-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Allocation Table
        </h2>
        <button
          className={`btn-copy${copied ? ' copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : 'Copy TSV'}
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Subnet</th>
              <th>Network Address</th>
              <th>Prefix</th>
              <th>Subnet Mask</th>
              <th>Usable Range</th>
              <th>Broadcast</th>
              <th>Usable Hosts</th>
              <th>Wasted</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={`${a.name}-${a.networkAddress}`}>
                <td>
                  <div className="td-name">
                    <span
                      className="name-dot"
                      style={{ background: colorMap[a.name] }}
                    />
                    {a.name}
                  </div>
                </td>
                <td className="td-mono">{a.networkAddress}</td>
                <td className="td-mono">/{a.prefix}</td>
                <td className="td-mono">{a.subnetMask}</td>
                <td className="td-range">
                  {a.firstHost} – {a.lastHost}
                </td>
                <td className="td-mono">{a.broadcastAddress}</td>
                <td>{a.usableHosts}</td>
                <td
                  className={
                    a.wastedAddresses === 0 ? 'wasted-zero' : 'wasted-positive'
                  }
                >
                  {a.wastedAddresses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
