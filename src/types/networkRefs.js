export const NETWORK_REF_PRESETS = [
  // HTTP endpoints
  { label: 'Google',     target: 'https://www.google.com',    checkType: 'http' },
  { label: 'Cloudflare', target: 'https://www.cloudflare.com', checkType: 'http' },
  { label: 'Microsoft',  target: 'https://www.microsoft.com', checkType: 'http' },
  { label: 'Apple',      target: 'https://www.apple.com',     checkType: 'http' },
  { label: 'Amazon',     target: 'https://www.amazon.com',    checkType: 'http' },
  { label: 'GitHub',     target: 'https://github.com',        checkType: 'http' },
  { label: 'Discord',    target: 'https://discord.com',       checkType: 'http' },
  { label: 'Slack',      target: 'https://slack.com',         checkType: 'http' },
  // DNS / ICMP
  { label: 'Cloudflare DNS', target: '1.1.1.1',         checkType: 'icmp' },
  { label: 'Google DNS',     target: '8.8.8.8',         checkType: 'icmp' },
  { label: 'Quad9',          target: '9.9.9.9',         checkType: 'icmp' },
  { label: 'OpenDNS',        target: '208.67.222.222',  checkType: 'icmp' },
  { label: 'Level3 DNS',     target: '4.2.2.1',         checkType: 'icmp' },
  { label: 'Alibaba DNS',    target: '223.5.5.5',       checkType: 'icmp' },
];

// Matches the four monitors seeded in v5.0 — used as the default when the
// network_refs_enabled setting has never been written (existing installs).
export const DEFAULT_NETWORK_REFS_ENABLED = [
  'https://www.google.com',
  'https://www.cloudflare.com',
  '1.1.1.1',
  '8.8.8.8',
];
