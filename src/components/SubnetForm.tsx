import type { Dispatch, SetStateAction } from 'react'

export interface Row {
  id: string
  name: string
  hosts: string
}

interface Props {
  cidr: string
  onCidrChange: (v: string) => void
  rows: Row[]
  onRowsChange: Dispatch<SetStateAction<Row[]>>
  onCalculate: () => void
}

export function SubnetForm({ cidr, onCidrChange, rows, onRowsChange, onCalculate }: Props) {
  function addRow() {
    onRowsChange(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', hosts: '' },
    ])
  }

  function updateRow(id: string, field: 'name' | 'hosts', value: string) {
    onRowsChange(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r)),
    )
  }

  function removeRow(id: string) {
    onRowsChange(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          onCalculate()
        }
      }}
    >
      <div className="field">
        <label className="field-label" htmlFor="base-cidr">
          Base Network (CIDR)
        </label>
        <input
          id="base-cidr"
          className="input"
          value={cidr}
          onChange={(e) => onCidrChange(e.target.value)}
          placeholder="e.g. 192.168.1.0/24"
          spellCheck={false}
        />
      </div>

      <div className="field">
        <div className="subnets-header">
          <span>Name</span>
          <span>Hosts required</span>
          <span />
        </div>

        {rows.map((row) => (
          <div key={row.id} className="subnet-row">
            <input
              className="input"
              value={row.name}
              onChange={(e) => updateRow(row.id, 'name', e.target.value)}
              placeholder="Subnet name"
            />
            <input
              className="input"
              value={row.hosts}
              onChange={(e) => updateRow(row.id, 'hosts', e.target.value)}
              placeholder="e.g. 60"
              type="number"
              min="1"
            />
            <button
              className="btn-remove"
              onClick={() => removeRow(row.id)}
              aria-label="Remove subnet"
              tabIndex={-1}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button className="btn btn-add" onClick={addRow}>
          + Add Subnet
        </button>
        <button className="btn btn-calculate" onClick={onCalculate}>
          Calculate
        </button>
      </div>
    </div>
  )
}
