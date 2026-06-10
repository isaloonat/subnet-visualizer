import { useState, useMemo } from 'react'
import { allocateVlsm, type VlsmResult, type SubnetRequirement } from './lib/vlsm'
import { SubnetForm, type Row } from './components/SubnetForm'
import { AllocationTable } from './components/AllocationTable'
import { AddressBar } from './components/AddressBar'

const PALETTE = [
  '#4f46e5', // indigo
  '#0284c7', // sky
  '#d97706', // amber
  '#059669', // emerald
  '#dc2626', // red
  '#7c3aed', // violet
  '#ea580c', // orange
  '#0891b2', // cyan
]

const INITIAL_CIDR = '192.168.1.0/24'
const INITIAL_ROWS: Row[] = [
  { id: '1', name: 'Students', hosts: '100' },
  { id: '2', name: 'Staff', hosts: '60' },
  { id: '3', name: 'IoT', hosts: '20' },
]

function toRequirements(rows: Row[]): SubnetRequirement[] {
  return rows
    .filter((r) => r.name.trim() !== '' && r.hosts.trim() !== '')
    .map((r) => ({ name: r.name.trim(), hosts: parseInt(r.hosts, 10) }))
}

export default function App() {
  const [cidr, setCidr] = useState(INITIAL_CIDR)
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS)
  const [result, setResult] = useState<VlsmResult>(() =>
    allocateVlsm(INITIAL_CIDR, toRequirements(INITIAL_ROWS)),
  )

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    result.allocations.forEach((a, i) => {
      map[a.name] = PALETTE[i % PALETTE.length]
    })
    return map
  }, [result.allocations])

  function calculate() {
    setResult(allocateVlsm(cidr, toRequirements(rows)))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Subnet Visualizer</h1>
        <p className="app-subtitle">VLSM subnet planning &amp; visualisation</p>
      </header>

      <div className="card">
        <SubnetForm
          cidr={cidr}
          onCidrChange={setCidr}
          rows={rows}
          onRowsChange={setRows}
          onCalculate={calculate}
        />
      </div>

      {result.errors.length > 0 && (
        <div className="error-box">
          <p className="error-box-title">Allocation errors</p>
          {result.errors.map((err, i) => (
            <p key={i} className="error-item">
              {err}
            </p>
          ))}
        </div>
      )}

      {result.allocations.length > 0 && (
        <>
          <div className="card">
            <h2 className="section-title">Address Space</h2>
            <AddressBar
              baseCidr={cidr}
              allocations={result.allocations}
              colorMap={colorMap}
            />
          </div>

          <div className="card">
            <AllocationTable
              allocations={result.allocations}
              colorMap={colorMap}
            />
          </div>
        </>
      )}
    </div>
  )
}
