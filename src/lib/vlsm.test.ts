import { describe, it, expect } from 'vitest';
import { allocateVlsm } from './vlsm';

// ─── helpers ────────────────────────────────────────────────────────────────

const BASE_24 = '192.168.1.0/24';

// ─── normal allocation ───────────────────────────────────────────────────────

describe('normal allocation', () => {
  it('allocates 4 subnets within /24, sorted largest-first', () => {
    const { allocations, errors } = allocateVlsm(BASE_24, [
      { name: 'Engineering', hosts: 60 },
      { name: 'Marketing', hosts: 28 },
      { name: 'Management', hosts: 12 },
      { name: 'IT', hosts: 6 },
    ]);

    expect(errors).toHaveLength(0);
    expect(allocations).toHaveLength(4);

    const [eng, mkt, mgmt, itSub] = allocations;

    expect(eng).toMatchObject({
      name: 'Engineering',
      networkAddress: '192.168.1.0',
      prefix: 26,
      subnetMask: '255.255.255.192',
      firstHost: '192.168.1.1',
      lastHost: '192.168.1.62',
      broadcastAddress: '192.168.1.63',
      usableHosts: 62,
      wastedAddresses: 2,
    });

    expect(mkt).toMatchObject({
      name: 'Marketing',
      networkAddress: '192.168.1.64',
      prefix: 27,
      subnetMask: '255.255.255.224',
      firstHost: '192.168.1.65',
      lastHost: '192.168.1.94',
      broadcastAddress: '192.168.1.95',
      usableHosts: 30,
      wastedAddresses: 2,
    });

    expect(mgmt).toMatchObject({
      name: 'Management',
      networkAddress: '192.168.1.96',
      prefix: 28,
      subnetMask: '255.255.255.240',
      firstHost: '192.168.1.97',
      lastHost: '192.168.1.110',
      broadcastAddress: '192.168.1.111',
      usableHosts: 14,
      wastedAddresses: 2,
    });

    expect(itSub).toMatchObject({
      name: 'IT',
      networkAddress: '192.168.1.112',
      prefix: 29,
      subnetMask: '255.255.255.248',
      firstHost: '192.168.1.113',
      lastHost: '192.168.1.118',
      broadcastAddress: '192.168.1.119',
      usableHosts: 6,
      wastedAddresses: 0,
    });
  });

  it('sorts requirements largest-first regardless of input order', () => {
    const { allocations, errors } = allocateVlsm(BASE_24, [
      { name: 'IT', hosts: 6 },
      { name: 'Engineering', hosts: 60 },
      { name: 'Management', hosts: 12 },
      { name: 'Marketing', hosts: 28 },
    ]);

    expect(errors).toHaveLength(0);
    expect(allocations.map(a => a.name)).toEqual([
      'Engineering',
      'Marketing',
      'Management',
      'IT',
    ]);
  });

  it('allocates across octet boundary correctly', () => {
    // /23 spans two /24s; make sure we handle multi-octet arithmetic
    const { allocations, errors } = allocateVlsm('10.0.0.0/23', [
      { name: 'A', hosts: 400 },
    ]);
    expect(errors).toHaveLength(0);
    // 400 hosts → need 402 addresses → next power of 2 = 512 → /23
    expect(allocations[0].prefix).toBe(23);
    expect(allocations[0].networkAddress).toBe('10.0.0.0');
    expect(allocations[0].broadcastAddress).toBe('10.0.1.255');
    expect(allocations[0].usableHosts).toBe(510);
  });
});

// ─── exact-fit cases ─────────────────────────────────────────────────────────

describe('exact-fit cases', () => {
  it('produces zero wasted addresses for power-of-2-minus-2 host counts', () => {
    const { allocations, errors } = allocateVlsm('10.0.0.0/24', [
      { name: 'A', hosts: 126 }, // /25
      { name: 'B', hosts: 62 },  // /26
      { name: 'C', hosts: 30 },  // /27
    ]);

    expect(errors).toHaveLength(0);
    expect(allocations).toHaveLength(3);

    allocations.forEach(a => expect(a.wastedAddresses).toBe(0));

    expect(allocations[0]).toMatchObject({
      name: 'A',
      networkAddress: '10.0.0.0',
      prefix: 25,
      broadcastAddress: '10.0.0.127',
    });
    expect(allocations[1]).toMatchObject({
      name: 'B',
      networkAddress: '10.0.0.128',
      prefix: 26,
      broadcastAddress: '10.0.0.191',
    });
    expect(allocations[2]).toMatchObject({
      name: 'C',
      networkAddress: '10.0.0.192',
      prefix: 27,
      broadcastAddress: '10.0.0.223',
    });
  });

  it('handles a single subnet that exactly fills the base network', () => {
    const { allocations, errors } = allocateVlsm('10.0.0.0/24', [
      { name: 'Full', hosts: 254 },
    ]);

    expect(errors).toHaveLength(0);
    expect(allocations[0]).toMatchObject({
      name: 'Full',
      networkAddress: '10.0.0.0',
      prefix: 24,
      broadcastAddress: '10.0.0.255',
      usableHosts: 254,
      wastedAddresses: 0,
    });
  });

  it('small /30 exact fit: 2 hosts, zero waste', () => {
    const { allocations, errors } = allocateVlsm('10.1.0.0/30', [
      { name: 'Link', hosts: 2 },
    ]);

    expect(errors).toHaveLength(0);
    expect(allocations[0]).toMatchObject({
      prefix: 30,
      usableHosts: 2,
      wastedAddresses: 0,
    });
  });
});

// ─── requirements that do not fit ───────────────────────────────────────────

describe('requirements that do not fit', () => {
  it('errors when a single subnet needs a larger block than the base', () => {
    const { allocations, errors } = allocateVlsm('192.168.0.0/26', [
      { name: 'TooBig', hosts: 100 },
    ]);

    // 100 hosts → /25, but base is /26
    expect(allocations).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/TooBig/);
    expect(errors[0]).toMatch(/\/25/);
  });

  it('errors when subnets collectively exhaust address space', () => {
    // /28 = 16 addresses; First takes the whole block, Second has no room
    const { allocations, errors } = allocateVlsm('192.168.0.0/28', [
      { name: 'First', hosts: 8 },
      { name: 'Second', hosts: 2 },
    ]);

    expect(allocations).toHaveLength(1);
    expect(allocations[0].name).toBe('First');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Second/);
  });

  it('errors for zero host count', () => {
    const { allocations, errors } = allocateVlsm(BASE_24, [
      { name: 'Zero', hosts: 0 },
    ]);
    expect(allocations).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Zero/);
  });

  it('errors for negative host count', () => {
    const { allocations, errors } = allocateVlsm(BASE_24, [
      { name: 'Neg', hosts: -5 },
    ]);
    expect(allocations).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('skips invalid entries but still allocates valid ones', () => {
    const { allocations, errors } = allocateVlsm(BASE_24, [
      { name: 'Good', hosts: 50 },
      { name: 'Bad', hosts: 0 },
    ]);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].name).toBe('Good');
    expect(errors).toHaveLength(1);
  });
});

// ─── edge / boundary cases ───────────────────────────────────────────────────

describe('edge cases', () => {
  it('returns empty allocations for empty requirements', () => {
    const { allocations, errors } = allocateVlsm('10.0.0.0/8', []);
    expect(allocations).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('errors on CIDR missing slash', () => {
    const { allocations, errors } = allocateVlsm('192.168.1.0', [
      { name: 'A', hosts: 10 },
    ]);
    expect(allocations).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('normalises the base network address (host bits masked off)', () => {
    // 192.168.1.50/24 should behave identically to 192.168.1.0/24
    const { allocations: a1 } = allocateVlsm('192.168.1.0/24', [
      { name: 'X', hosts: 10 },
    ]);
    const { allocations: a2 } = allocateVlsm('192.168.1.50/24', [
      { name: 'X', hosts: 10 },
    ]);
    expect(a1[0].networkAddress).toBe(a2[0].networkAddress);
  });
});
