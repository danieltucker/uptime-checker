/**
 * Checker dispatcher — picks the right strategy based on monitor.checkType.
 *
 * All checkers return the same shape:
 *   { status: 'up'|'down', totalMs?, dnsMs?, tcpMs?, tlsMs?,
 *     ttfbMs?, httpStatus?, certDays?, error? }
 *
 * Fields not relevant to a check type are omitted (stored as NULL in DB).
 */

import { httpCheck } from './http.js';
import { tcpCheck }  from './tcp.js';
import { icmpCheck } from './icmp.js';

export function runCheck(monitor) {
  switch (monitor.checkType) {
    case 'tcp':
      return tcpCheck(monitor.target, monitor.port ?? 80);
    case 'icmp':
      return icmpCheck(monitor.target);
    case 'http':
    default:
      return httpCheck(monitor.target);
  }
}
