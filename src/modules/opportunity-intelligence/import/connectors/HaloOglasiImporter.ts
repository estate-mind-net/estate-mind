import type { PortalImporter, ExtractedListing, PageFetchResult } from '../PortalImporter'
import { fetchUrlProxy } from '@/lib/fetchUrlProxy'

const HALO_OGLASI_DOMAIN = 'halooglasi.com'
const BASE_URL = 'https://www.halooglasi.com'
const HALO_OGLASI_PATHS = ['/nekretnine/izdavanje-stanova', '/nekretnine/izdavanje-kuca', '/nekretnine/izdavanje-poslovnih-prostora']

/** Determine if an href points to a real listing detail page, not a category/search/landing page. */
function isHaloListingUrl(href: string): boolean {
  try {
    const url = new URL(href, BASE_URL)
    const path = url.pathname
    // Must start with /nekretnine/
    if (!path.startsWith('/nekretnine/')) return false
    // Reject root category pages
    if (path === '/nekretnine' || path === '/nekretnine/') return false
    // Reject pure search/category paths (no further segments or only category slug)
    const segments = path.split('/').filter(Boolean)
    // A listing URL has at least 4 segments: nekretnine / type / city-or-slug / listing-slug
    // e.g. /nekretnine/izdavanje-stanova/novi-sad/3-soban-stan-liman-123456
    if (segments.length < 3) return false
    // Reject if last segment looks like a pagination or filter page
    const last = segments[segments.length - 1]
    if (/^(page|strana|stranica|filter)$/i.test(last)) return false
    // Reject if path ends with a category without a listing slug
    // Category patterns: /nekretnine/izdavanje-stanova, /nekretnine/prodaja-stanova
    const categoryEndings = ['izdavanje-stanova', 'izdavanje-kuca', 'izdavanje-poslovnih-prostora',
      'prodaja-stanova', 'prodaja-kuca', 'prodaja-poslovnih-prostora', 'izdavanje', 'prodaja']
    if (segments.length === 2 && categoryEndings.includes(segments[1])) return false
    if (segments.length === 3 && categoryEndings.includes(segments[1]) && !/\d/.test(segments[2])) return false
    return true
  } catch { return false }
}
const ROOM_MAP: Record<string, number> = { 'garsonjera': 0, 'studio': 0, 'jednosoban': 1, 'jednoiposoban': 1, 'dvosoban': 2, 'dvoiposoban': 2, 'trosoban': 3, 'troiposoban': 3, 'četvorosoban': 4, 'cetvorosoban': 4, 'petosoban': 5 }
const CITY_MAP: Record<string, string> = { 'beograd': 'Beograd', 'novi-sad': 'Novi Sad', 'nis': 'Niš', 'niš': 'Niš', 'subotica': 'Subotica', 'kragujevac': 'Kragujevac', 'zrenjanin': 'Zrenjanin', 'novi-pazar': 'Novi Pazar', 'kraljevo': 'Kraljevo', 'smederevo': 'Smederevo', 'leskovac': 'Leskovac', 'uzice': 'Užice', 'vranje': 'Vranje', 'pančevo': 'Pančevo', 'čačak': 'Čačak' }

function extractPrice(text: string): { value: number | null; currency: string } {
  const m = text.match(/([\d.,]+)\s*(?:€|EUR)/i)
  if (m) { const n = parseInt(m[1].replace(/[.,]/g, ''), 10); if (n >= 50 && n <= 50000) return { value: n, currency: 'EUR' } }
  const m2 = text.match(/([\d.,]+)\s*(?:RSD|din)/i)
  if (m2) { const n = parseInt(m2[1].replace(/[.,]/g, ''), 10); if (n >= 5000) return { value: Math.round(n / 117), currency: 'RSD' } }
  return { value: null, currency: 'EUR' }
}

function extractSize(text: string): number | null { const m = text.match(/(\d{2,4})\s*(?:m2|m²)/i); return m ? parseInt(m[1], 10) : null }

function extractBedrooms(text: string): number | null {
  const lower = text.toLowerCase()
  for (const [k, v] of Object.entries(ROOM_MAP)) { if (lower.includes(k)) return v }
  const m = lower.match(/(\d)\s*(?:sob|stan|room)/i)
  return m ? parseInt(m[1], 10) : null
}

function extractFloor(text: string): number | null {
  const m = text.match(/(\d+)\.\s*sprat/i); if (m) return parseInt(m[1], 10)
  const m2 = text.match(/(?:sprat|spratu)[:\s]*(\d+)/i); return m2 ? parseInt(m2[1], 10) : null
}

function extractCityFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname.toLowerCase()
    for (const [slug, city] of Object.entries(CITY_MAP)) { if (path.includes(slug)) return city }
  } catch {}
  return null
}

function extractListingId(url: string): string | null {
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean)
    const last = segs[segs.length - 1]
    return /^\d+$/.test(last) ? last : segs.join('/')
  } catch { return null }
}

function findNextPage(html: string, currentUrl: string): string | null {
  const pageMatch = currentUrl.match(/[?&]page=(\d+)/)
  const current = pageMatch ? parseInt(pageMatch[1], 10) : 1
  const next = current + 1
  const m = html.match(new RegExp('href="([^"]*[?&]page=' + next + '[^"]*)"', 'i'))
  if (m) { try { return new URL(m[1], currentUrl).toString() } catch {} }
  // Also check for /strana-N pattern
  const stranaMatch = html.match(new RegExp('href="([^"]*/strana-' + next + '[^"]*)"', 'i'))
  if (stranaMatch) { try { return new URL(stranaMatch[1], currentUrl).toString() } catch {} }
  return null
}

export class HaloOglasiImporter implements PortalImporter {
  portalId = 'halo-oglasi'
  portalName = 'Halo Oglasi'
  moduleType = 'rent' as const

  canHandle(url: string): boolean {
    try {
      const p = new URL(url)
      const hostnameMatch = p.hostname.includes(HALO_OGLASI_DOMAIN)
      const pathMatch = HALO_OGLASI_PATHS.some((path) => p.pathname.startsWith(path))
      const result = hostnameMatch && pathMatch
      console.log('[HaloOglasiImporter] canHandle:', url, '| hostname:', p.hostname, '| result:', result)
      return result
    } catch { return false }
  }

  async fetchSearchPage(url: string): Promise<PageFetchResult> {
    console.log('[HaloOglasi] Fetching:', url)
    const result = await fetchUrlProxy(url)
    if (!result.success || !result.html) {
      console.error('[HaloOglasi] Fetch failed:', result.error, 'status:', result.status)
      return { listings: [], nextPageUrl: null, pageCount: 0, error: result.error ?? 'Fetch failed' }
    }
    console.log('[HaloOglasi] HTML length:', result.html.length)
    const listings = this.extractListings(result.html, url)
    const nextPageUrl = findNextPage(result.html, url)
    console.log('[HaloOglasi] Extracted', listings.length, 'listings')
    return { listings, nextPageUrl, pageCount: 1, error: listings.length === 0 ? 'No listings extracted from this search URL.' : null }
  }

  async fetchAllPages(url: string, maxPages = 10, maxListings = 500): Promise<PageFetchResult> {
    const all: ExtractedListing[] = []; let current: string | null = url; let pages = 0; const errors: string[] = []
    while (current && pages < maxPages && all.length < maxListings) {
      const result = await this.fetchSearchPage(current); pages++
      if (result.error && result.listings.length === 0) { errors.push('Page ' + pages + ': ' + result.error); break }
      for (const l of result.listings) { if (all.length < maxListings) all.push(l) }
      current = result.nextPageUrl
      if (current) await new Promise(r => setTimeout(r, 1000))
    }
    return { listings: all, nextPageUrl: current, pageCount: pages, error: errors.length > 0 ? errors.join('; ') : null }
  }

  private extractListings(html: string, searchUrl: string): ExtractedListing[] {
    const city = extractCityFromUrl(searchUrl)
    console.log('[HaloOglasi] Detected city:', city ?? 'unknown')

    // ── EXTRACTION: JSON-LD first ──
    const jsonLd = this.extractFromJsonLd(html)
    if (jsonLd.length > 0) { console.log('[HaloOglasi] Strategy: JSON-LD (' + jsonLd.length + ' listings)'); return jsonLd }

    // ── EXTRACTION: link-based with isHaloListingUrl ──
    const listings = this.extractFromListingLinks(html, city)
    console.log('[HaloOglasi] Strategy: Listing link extraction (' + listings.length + ' listings)')
    if (listings.length > 0) return listings

    console.warn('[HaloOglasi] No listings extracted by any strategy')
    return []
  }

  private extractFromListingLinks(html: string, city: string | null): ExtractedListing[] {
    const listings: ExtractedListing[] = []
    const seen = new Set<string>()
    const accepted: string[] = []
    const rejected: Array<{ href: string; reason: string }> = []
    let totalNekretnine = 0

    // Extract all anchor hrefs containing /nekretnine/
    const hrefRe = /href="([^"]*\/nekretnine\/[^"]*)"/gi
    let m
    while ((m = hrefRe.exec(html)) !== null) {
      const rawHref = m[1]
      totalNekretnine++

      if (!isHaloListingUrl(rawHref)) {
        if (rejected.length < 10) rejected.push({ href: rawHref.slice(0, 100), reason: 'category/search/landing page' })
        continue
      }

      let fullUrl: string
      try { fullUrl = new URL(rawHref, BASE_URL).toString() } catch { continue }
      const normalized = fullUrl.toLowerCase()
      if (seen.has(normalized)) continue
      seen.add(normalized)

      if (accepted.length < 10) accepted.push(fullUrl)

      // Extract title from the anchor text or surrounding context
      const anchorContext = html.slice(Math.max(0, m.index - 500), Math.min(html.length, m.index + rawHref.length + 1000))
      const anchorTextMatch = anchorContext.match(new RegExp('<a[^>]*href="' + rawHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>([\\s\\S]*?)<\\/a>', 'i'))
      let title = anchorTextMatch ? anchorTextMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''
      if (title.length < 3) {
        // Try nearby heading
        const hMatch = anchorContext.match(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/i)
        title = hMatch ? hMatch[1].replace(/<[^>]+>/g, '').trim() : ''
      }

      const missing: string[] = []
      const listingId = extractListingId(fullUrl)
      listings.push({
        title: title.length >= 3 ? title.slice(0, 150) : 'Listing ' + (listingId ?? ''),
        sourceUrl: fullUrl, portal: 'halo-oglasi', portalListingId: listingId,
        city, district: null, price: null, currency: 'EUR', sizeM2: null, bedrooms: null, floor: null,
        furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null,
        description: null, imageUrl: null, agencyName: null, publishedDate: null,
        latitude: null, longitude: null,
        extractionConfidence: 40, missingFields: ['price', 'sizeM2', 'bedrooms', 'description'],
      })
    }

    console.log(`[HaloOglasi] Total /nekretnine/ hrefs: ${totalNekretnine}`)
    console.log(`[HaloOglasi] Accepted listing URLs: ${listings.length}`)
    console.log(`[HaloOglasi] Rejected category/other: ${totalNekretnine - listings.length}`)
    if (accepted.length > 0) console.log(`[HaloOglasi] First accepted URLs:`, accepted)
    if (rejected.length > 0) console.log(`[HaloOglasi] First rejected URLs:`, rejected.slice(0, 5))

    return listings
  }

  private extractFromJsonLd(html: string): ExtractedListing[] {
    const listings: ExtractedListing[] = []
    const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      try {
        const data = JSON.parse(m[1])
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Apartment' || item['@type'] === 'Residence' || item['@type'] === 'RealEstateListing') {
            const name = typeof item.name === 'string' ? item.name : null
            const url = typeof item.url === 'string' ? item.url : null
            if (!name || !url) continue
            const offers = item.offers as Record<string, unknown> | undefined
            const missing: string[] = []
            if (!offers?.price) missing.push('price')
            listings.push({
              title: name, sourceUrl: url, portal: 'halo-oglasi', portalListingId: extractListingId(url),
              city: typeof item.address?.addressLocality === 'string' ? item.address.addressLocality : null,
              district: typeof item.address?.addressRegion === 'string' ? item.address.addressRegion : null,
              price: offers?.price ? Number(offers.price) : null,
              currency: typeof offers?.priceCurrency === 'string' ? offers.priceCurrency : 'EUR',
              sizeM2: null, bedrooms: null, floor: null, furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null,
              description: typeof item.description === 'string' ? item.description : null,
              imageUrl: typeof item.image === 'string' ? item.image : null,
              agencyName: null, publishedDate: typeof item.datePublished === 'string' ? item.datePublished : null,
              latitude: null, longitude: null,
              extractionConfidence: 60, missingFields: missing,
            })
          }
        }
      } catch {}
    }
    return listings
  }

  private extractFromCards(html: string, city: string | null): ExtractedListing[] {
    const listings: ExtractedListing[] = []
    const seen = new Set<string>()
    // Halo Oglasi uses product-list-item or similar card patterns
    const cardRe = /<(?:article|div)[^>]*class="[^"]*(?:product-item|listing-item|oglas-item|search-result)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|div)>/gi
    let m
    while ((m = cardRe.exec(html)) !== null) {
      const card = m[1]
      const linkMatch = card.match(/href="([^"]*(?:\/nekretnine\/|\/izdavanje\/)[^"]*?\d+[^"]*)"/i) ?? card.match(/href="(\/[^"]+?\/\d+[^"]*)"/i)
      if (!linkMatch) continue
      let url: string
      try { url = new URL(linkMatch[1], 'https://www.halooglasi.com').toString() } catch { continue }
      if (seen.has(url.toLowerCase())) continue; seen.add(url.toLowerCase())

      const text = card.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (text.length < 15) continue

      const { value: price, currency } = extractPrice(text)
      const sizeM2 = extractSize(text)
      const bedrooms = extractBedrooms(text)
      const floor = extractFloor(text)
      const missing: string[] = []
      if (!price) missing.push('price')
      if (!sizeM2) missing.push('sizeM2')

      const titleMatch = card.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : text.slice(0, 120)

      listings.push({
        title, sourceUrl: url, portal: 'halo-oglasi', portalListingId: extractListingId(url),
        city, district: null, price, currency, sizeM2, bedrooms, floor,
        furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null,
        description: text, imageUrl: null, agencyName: null, publishedDate: null,
        latitude: null, longitude: null,
        extractionConfidence: Math.max(30, 80 - missing.length * 15), missingFields: missing,
      })
    }
    return listings
  }

  private extractFromAnchors(html: string, city: string | null): ExtractedListing[] {
    const listings: ExtractedListing[] = []
    const seen = new Set<string>()
    const re = /href="(https?:\/\/[^"]*halooglasi\.com[^"]*\/nekretnine[^"]*?\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      const url = m[1]
      if (seen.has(url.toLowerCase())) continue; seen.add(url.toLowerCase())
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (text.length < 10) continue

      const { value: price, currency } = extractPrice(text)
      const sizeM2 = extractSize(text)
      const bedrooms = extractBedrooms(text)
      const floor = extractFloor(text)
      const missing: string[] = []
      if (!price) missing.push('price')
      if (!sizeM2) missing.push('sizeM2')

      listings.push({
        title: text.slice(0, 120), sourceUrl: url, portal: 'halo-oglasi', portalListingId: extractListingId(url),
        city, district: null, price, currency, sizeM2, bedrooms, floor,
        furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null,
        description: text, imageUrl: null, agencyName: null, publishedDate: null,
        latitude: null, longitude: null,
        extractionConfidence: Math.max(30, 80 - missing.length * 15), missingFields: missing,
      })
    }
    return listings
  }
}