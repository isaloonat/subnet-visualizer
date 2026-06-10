\# Subnet Visualizer



A client-side web app for VLSM subnet planning.



\## Input

\- Base network in CIDR (e.g. 192.168.1.0/24)

\- A list of subnets, each with a name and required host count



\## Output

\- VLSM allocation table: subnet name, network address, prefix/mask,

&#x20; usable host range, broadcast address, wasted addresses

\- A horizontal bar visual showing the address space split

&#x20; proportionally into colored blocks per subnet

\- Errors shown clearly if requirements don't fit the base network



\## Stack

\- React + Vite + TypeScript, no backend

\- Unit tests with Vitest for the subnetting math

