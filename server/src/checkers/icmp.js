/**
 * ICMP checker — shells out to the OS `ping` binary rather than using
 * raw sockets directly. This avoids the native compilation issues with
 * `net-ping` on newer Node.js versions, while still measuring true
 * round-trip latency.
 *
 * Works on:
 *   Linux (Docker / Alpine)  ping -c 1 -W 5 <target>
 *   Windows (local dev)      ping -n 1 -w 5000 <target>
 *
 * In Docker, iputils is installed in the Dockerfile to provide a consistent
 * ping binary. CAP_NET_RAW is in Docker's default capability set so the
 * binary can send raw ICMP packets without --privileged.
 *
 * execFile is used (not exec) so the target is never interpolated into a
 * shell command string — no command-injection risk.
 */

import { execFile }   from 'node:child_process';
import { promisify }  from 'node:util';
import { assertNotSsrfTarget } from './ssrf-guard.js';

const execFileAsync = promisify(execFile);
const IS_WIN        = process.platform === 'win32';

export async function icmpCheck(target) {
  try {
    await assertNotSsrfTarget(target);
  } catch (err) {
    return { status: 'down', error: err.message };
  }

  const [bin, args] = IS_WIN
    ? ['ping', ['-n', '1', '-w', '5000', target]]
    : ['ping', ['-c', '1', '-W', '5',    target]];

  try {
    const { stdout } = await execFileAsync(bin, args, { timeout: 10_000 });

    // Both iputils and busybox ping emit:  time=12.4 ms  or  time<1ms
    const match = stdout.match(/time[<=](\d+(?:\.\d+)?)\s*ms/i);
    const totalMs = match ? Math.round(parseFloat(match[1])) : null;

    return { status: 'up', totalMs };
  } catch {
    // Non-zero exit = host unreachable, timeout, or unknown host
    return { status: 'down', error: 'Host unreachable or timed out' };
  }
}
