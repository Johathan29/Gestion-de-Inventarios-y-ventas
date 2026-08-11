// ============================================================================
// SSRF Guard — protege el dispatcher de webhooks contra Server-Side
// Request Forgery: solo http/https, bloqueo de IPs privadas/reservadas
// (incluye metadata cloud 169.254.169.254) y protección DNS rebinding
// (todas las IPs resueltas se verifican).
// ============================================================================

import dns from 'dns';
import { promisify } from 'util';

const lookupAll = promisify(dns.lookup);

// Rango IPv4 bloqueados (privados, loopback, link-local, CGNAT, multicast, reservados)
const IPV4_BLOCKED = [
  { name: '0.0.0.0/8',        start: [0, 0, 0, 0],       end: [0, 255, 255, 255] },
  { name: '10.0.0.0/8',       start: [10, 0, 0, 0],      end: [10, 255, 255, 255] },
  { name: '100.64.0.0/10',    start: [100, 64, 0, 0],    end: [100, 127, 255, 255] },
  { name: '127.0.0.0/8',      start: [127, 0, 0, 0],     end: [127, 255, 255, 255] },
  { name: '169.254.0.0/16',   start: [169, 254, 0, 0],   end: [169, 254, 255, 255] },
  { name: '172.16.0.0/12',    start: [172, 16, 0, 0],    end: [172, 31, 255, 255] },
  { name: '192.0.0.0/24',     start: [192, 0, 0, 0],     end: [192, 0, 0, 255] },
  { name: '192.0.2.0/24',     start: [192, 0, 2, 0],     end: [192, 0, 2, 255] },
  { name: '192.168.0.0/16',   start: [192, 168, 0, 0],   end: [192, 168, 255, 255] },
  { name: '198.18.0.0/15',    start: [198, 18, 0, 0],    end: [198, 19, 255, 255] },
  { name: '198.51.100.0/24',  start: [198, 51, 100, 0],  end: [198, 51, 100, 255] },
  { name: '203.0.113.0/24',   start: [203, 0, 113, 0],   end: [203, 0, 113, 255] },
  { name: '224.0.0.0/4',      start: [224, 0, 0, 0],     end: [239, 255, 255, 255] },
  { name: '240.0.0.0/4',      start: [240, 0, 0, 0],     end: [255, 255, 255, 255] },
];

// Hostnames siempre bloqueados (independientes de la resolución DNS)
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata',
  'kubernetes.default.svc',
  'kubernetes',
  'rancher-metadata',
  'consul',
  'nomad',
];

function ipv4ToInt(octets) {
  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

function isIpv4Blocked(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const value = ipv4ToInt(parts);
  return IPV4_BLOCKED.some((r) => value >= ipv4ToInt(r.start) && value <= ipv4ToInt(r.end));
}

function isIpv6Blocked(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;        // fc00::/7 ULA
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10 link-local
  if (lower.startsWith('ff')) return true;                                    // ff00::/8 multicast
  if (lower.startsWith('2001:db8')) return true;                              // documentación
  // IPv4-mapped ::ffff:a.b.c.d → verificar la IPv4 embebida
  const m = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isIpv4Blocked(m[1]);
  return false;
}

export function isPrivateOrReservedIp(ip) {
  if (!ip) return false;
  if (ip.includes(':')) return isIpv6Blocked(ip);
  return isIpv4Blocked(ip);
}

// Hostnames con sufijo sensible (p. ej. "x.local", "y.internal")
function isBlockedHostname(hostname) {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.includes(h)) return true;
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home.arpa')) return true;
  if (h.endsWith('.onion')) return true;
  return false;
}

/**
 * Valida una URL de webhook contra SSRF.
 * @param {string} url - URL destino del webhook
 * @returns {Promise<{ok: boolean, error?: string, ip?: string, hostname?: string}>}
 */
export async function validateWebhookUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'URL inválida' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: `Protocolo no permitido: ${parsed.protocol || '(vacío)'}` };
  }

  if (!parsed.hostname) {
    return { ok: false, error: 'URL sin hostname' };
  }

  if (isBlockedHostname(parsed.hostname)) {
    return { ok: false, error: `Hostname bloqueado por SSRF: ${parsed.hostname}` };
  }

  // Resolver DNS y verificar TODAS las IPs (protección contra DNS rebinding)
  try {
    const addresses = await lookupAll(parsed.hostname, { all: true, verbatim: true });
    const ips = (addresses || []).map((a) => a.address);
    if (ips.length === 0) {
      return { ok: false, error: `No se pudo resolver el hostname: ${parsed.hostname}` };
    }
    for (const ip of ips) {
      if (isPrivateOrReservedIp(ip)) {
        return { ok: false, error: `IP privada/reservada bloqueada por SSRF: ${ip} (${parsed.hostname})`, ip };
      }
    }
    return { ok: true, ip: ips[0], hostname: parsed.hostname };
  } catch (err) {
    return { ok: false, error: `Fallo de resolución DNS: ${err.message}` };
  }
}
