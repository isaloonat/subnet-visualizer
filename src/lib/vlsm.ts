export interface SubnetRequirement {
  name: string;
  hosts: number;
}

export interface SubnetAllocation {
  name: string;
  networkAddress: string;
  prefix: number;
  subnetMask: string;
  firstHost: string;
  lastHost: string;
  broadcastAddress: string;
  usableHosts: number;
  wastedAddresses: number;
}

export interface VlsmResult {
  allocations: SubnetAllocation[];
  errors: string[];
}

function ipToInt(ip: string): number {
  const [a, b, c, d] = ip.split('.').map(Number);
  return a * 16777216 + b * 65536 + c * 256 + d;
}

function intToIp(n: number): string {
  return [
    Math.floor(n / 16777216) % 256,
    Math.floor(n / 65536) % 256,
    Math.floor(n / 256) % 256,
    n % 256,
  ].join('.');
}

function prefixToMask(prefix: number): string {
  // 2^32 - blockSize gives the bitmask (all ones except the host bits)
  const blockSize = Math.pow(2, 32 - prefix);
  return intToIp(4294967296 - blockSize);
}

// Returns the smallest prefix that can accommodate `hosts` usable addresses.
// Usable = blockSize - 2 (network + broadcast), so blockSize >= hosts + 2.
function hostsToPrefix(hosts: number): number {
  let size = 1;
  let bits = 0;
  while (size < hosts + 2) {
    size *= 2;
    bits++;
  }
  return 32 - bits;
}

export function allocateVlsm(
  baseCidr: string,
  requirements: SubnetRequirement[],
): VlsmResult {
  const parts = baseCidr.split('/');
  if (parts.length !== 2) {
    return { allocations: [], errors: [`Invalid CIDR notation: ${baseCidr}`] };
  }

  const basePrefix = parseInt(parts[1], 10);
  if (isNaN(basePrefix) || basePrefix < 0 || basePrefix > 32) {
    return { allocations: [], errors: [`Invalid prefix length in: ${baseCidr}`] };
  }

  const baseBlockSize = Math.pow(2, 32 - basePrefix);
  const baseNetworkInt =
    Math.floor(ipToInt(parts[0]) / baseBlockSize) * baseBlockSize;
  const baseEndInt = baseNetworkInt + baseBlockSize;

  // Largest requirement first so blocks are allocated in descending size order,
  // which minimises alignment waste.
  const sorted = [...requirements].sort((a, b) => b.hosts - a.hosts);

  const errors: string[] = [];
  const allocations: SubnetAllocation[] = [];
  let currentInt = baseNetworkInt;

  for (const req of sorted) {
    if (!Number.isInteger(req.hosts) || req.hosts <= 0) {
      errors.push(`"${req.name}": host count must be a positive integer`);
      continue;
    }

    const prefix = hostsToPrefix(req.hosts);

    if (prefix < basePrefix) {
      errors.push(
        `"${req.name}" requires /${prefix} but base network is /${basePrefix}`,
      );
      continue;
    }

    const blockSize = Math.pow(2, 32 - prefix);

    // Advance currentInt to the next boundary aligned to this block size.
    const rem = currentInt % blockSize;
    const alignedStart =
      rem === 0 ? currentInt : currentInt + (blockSize - rem);
    const alignedEnd = alignedStart + blockSize;

    if (alignedEnd > baseEndInt) {
      errors.push(`"${req.name}": insufficient address space in ${baseCidr}`);
      continue;
    }

    const broadcastInt = alignedEnd - 1;
    const usableHosts = blockSize - 2;

    allocations.push({
      name: req.name,
      networkAddress: intToIp(alignedStart),
      prefix,
      subnetMask: prefixToMask(prefix),
      firstHost: intToIp(alignedStart + 1),
      lastHost: intToIp(broadcastInt - 1),
      broadcastAddress: intToIp(broadcastInt),
      usableHosts,
      wastedAddresses: usableHosts - req.hosts,
    });

    currentInt = alignedEnd;
  }

  return { allocations, errors };
}
