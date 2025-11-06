// Subdomain utilities for multi-tenant routing

export function extractSubdomain(hostname: string, url?: string): string | null {
  // Local development environment
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Try to extract subdomain from the full URL
    if (url) {
      const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
      if (fullUrlMatch && fullUrlMatch[1]) {
        return fullUrlMatch[1];
      }
    }
    
    // Fallback to hostname approach
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }
    
    return null;
  }
  
  // Production environment - extract root domain from env or default
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'anyrent.shop';
  const rootDomainFormatted = rootDomain.split(':')[0];
  
  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }
  
  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);
  
  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, '') : null;
}

export function isReservedSubdomain(subdomain: string): boolean {
  const reserved = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp',
    'pop', 'imap', 'static', 'assets', 'cdn',
    'staging', 'dev', 'test', 'prod', 'production'
  ];
  return reserved.includes(subdomain.toLowerCase());
}

export function validateSubdomain(subdomain: string): boolean {
  if (!subdomain) return false;
  if (subdomain.length < 2 || subdomain.length > 63) return false;
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) return false;
  if (isReservedSubdomain(subdomain)) return false;
  return true;
}

export function sanitizeSubdomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 63);
}

export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
}

export function getProtocol(): string {
  return process.env.NODE_ENV === 'production' ? 'https' : 'http';
}
