import type { PortalImporter, ExtractedListing, PageFetchResult } from '../PortalImporter'
import { fetchUrlProxy } from '@/lib/fetchUrlProxy'

const FOUR_ZIDA_DOMAIN = '4zida.rs'
const FOUR_ZIDA_PATHS = ['/izdavanje-stanova', '/izdavanje-kuca', '/izdavanje-poslovnih-prostora']
const ROOM_MAP: Record<string, number> = { 'garsonjera': 0, 'studio': 0, 'jednosoban': 1, 'jednoiposoban': 1, 'dvosoban': 2, 'dvoiposoban': 2, 'trosoban': 3, 'troiposoban': 3, 'cetvorosoban': 4, 'petosoban': 5 }
const CITY_SLUGS: Record<string, string> = { 'novi-sad': 'Novi Sad', 'beograd': 'Beograd', 'nis': 'Nis', 'subotica': 'Subotica', 'kragujevac': 'Kragujevac', 'zrenjanin': 'Zrenjanin' }
const DISTRICTS: Record<string, string[]> = { 'Novi Sad': ['liman', 'grbavica', 'podbara', 'detelinara', 'stari grad', 'telep', 'adice', 'novi naselje', 'sajmiste', 'petrovaradin'], 'Beograd': ['novi beograd', 'vracar', 'savski venac', 'zemun', 'dorcol', 'palilula', 'vozdovac', 'rakovica', 'cukarica', 'stari grad'] }

function extractPrice(text: string): { value: number | null; currency: string } { const m = text.match(/([\d.,]+)\s*(?:€|EUR)/i); if (m) { const n = parseInt(m[1].replace(/[.,]/g, ''), 10); if (n >= 50 && n <= 50000) return { value: n, currency: 'EUR' } } return { value: null, currency: 'EUR' } }
function extractSize(text: string): number | null { const m = text.match(/(\d{2,4})\s*(?:m2|m²|kv)/i); return m ? parseInt(m[1], 10) : null }
function extractBedrooms(text: string): number | null { const lower = text.toLowerCase(); for (const [k, v] of Object.entries(ROOM_MAP)) { if (lower.includes(k)) return v }; const m = lower.match(/(\d)\s*(?:sob|stan|room)/i); return m ? parseInt(m[1], 10) : null }
function extractCityFromUrl(url: string): string | null { try { const p = new URL(url); for (const [slug, city] of Object.entries(CITY_SLUGS)) { if (p.pathname.includes(slug)) return city } } catch {} return null }
function extractDistrict(text: string, city: string | null): string | null { const lower = text.toLowerCase(); for (const c of city ? [city] : Object.keys(DISTRICTS)) { for (const d of (DISTRICTS[c] ?? [])) { if (lower.includes(d)) return d.charAt(0).toUpperCase() + d.slice(1) } } return null }
function extractListingId(url: string): string | null { try { const segs = new URL(url).pathname.split('/').filter(Boolean); const last = segs[segs.length - 1]; return /^\d+$/.test(last) ? last : segs.join('/') } catch { return null } }
function findNextPage(html: string, currentUrl: string): string | null { const pageMatch = currentUrl.match(/[?&]page=(\d+)/); const next = (pageMatch ? parseInt(pageMatch[1], 10) : 1) + 1; const m = html.match(new RegExp('href="([^"]*[?&]page=' + next + '[^"]*)"', 'i')); if (m) { try { return new URL(m[1], currentUrl).toString() } catch {} } return null }

export class FourZidaImporter implements PortalImporter {
  portalId = '4zida'
  portalName = '4zida'
  moduleType = 'rent' as const

  canHandle(url: string): boolean {
    try {
      const p = new URL(url)
      const hostnameMatch = p.hostname.includes(FOUR_ZIDA_DOMAIN)
      const pathMatch = FOUR_ZIDA_PATHS.some((path) => p.pathname.startsWith(path))
      const result = hostnameMatch && pathMatch
      console.log('[FourZidaImporter] canHandle:', url, '| hostname:', p.hostname, '| pathname:', p.pathname, '| hostnameMatch:', hostnameMatch, '| pathMatch:', pathMatch, '| result:', result)
      return result
    } catch { console.log('[FourZidaImporter] canHandle: URL parse failed for:', url); return false }
  }
  async fetchSearchPage(url: string): Promise<PageFetchResult> {
    console.log('[FourZida] Fetching:', url)
    const result = await fetchUrlProxy(url)
    if (!result.success || !result.html) {
      console.error('[FourZida] Fetch failed:', result.error, 'status:', result.status)
      return { listings: [], nextPageUrl: null, pageCount: 0, error: result.error ?? 'Fetch failed' }
    }
    console.log('[FourZida] HTML length:', result.html.length)
    const listings = this.extractListings(result.html, url)
    const nextPageUrl = findNextPage(result.html, url)
    console.log('[FourZida] Extracted', listings.length, 'listings')
    if (listings.length > 0) console.log('[FourZida] First 3:', listings.slice(0, 3).map(l => l.sourceUrl))
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
    console.log('[FourZida] Detected city:', city ?? 'unknown')
    console.log('[FourZida] HTML contains __NEXT_DATA__:', html.includes('__NEXT_DATA__'))
    console.log('[FourZida] ld+json scripts:', (html.match(/application\/ld\+json/g) ?? []).length)
    const izdavanjeLinks = (html.match(/href="[^"]*\/izdavanje-stanova\//g) ?? []).length
    const stanoviLinks = (html.match(/href="[^"]*\/stanovi\//g) ?? []).length
    console.log('[FourZida] Links with /izdavanje-stanova/:', izdavanjeLinks)
    console.log('[FourZida] Links with /stanovi/:', stanoviLinks)

    const nd = this.extractFromNextData(html)
    if (nd.length > 0) { console.log('[FourZida] Strategy: __NEXT_DATA__ (' + nd.length + ' listings)'); return nd }
    const jl = this.extractFromJsonLd(html)
    if (jl.length > 0) { console.log('[FourZida] Strategy: JSON-LD (' + jl.length + ' listings)'); return jl }
    const anchors = this.extractFromAnchors(html, city)
    console.log('[FourZida] Strategy: Anchor fallback (' + anchors.length + ' listings)')
    if (anchors.length > 0) { console.log('[FourZida] First 5 URLs:', anchors.slice(0, 5).map(a => a.sourceUrl)) }
    return anchors
  }
  private extractFromNextData(html: string): ExtractedListing[] {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return []
    try { const data = JSON.parse(m[1]); const props = data?.props?.pageProps; if (!props) return []
      const items = props.listings ?? props.results ?? props.items ?? props.data?.listings ?? []
      if (!Array.isArray(items)) return []
      return items.map((i: Record<string, unknown>) => this.parseNextDataItem(i)).filter((l): l is ExtractedListing => l !== null)
    } catch { return [] }
  }

  private parseNextDataItem(item: Record<string, unknown>): ExtractedListing | null {
    const title = typeof item.title === 'string' ? item.title : typeof item.name === 'string' ? item.name : null
    const url = typeof item.url === 'string' ? item.url : typeof item.slug === 'string' ? 'https://www.4zida.rs/stanovi/' + item.slug : null
    if (!title || !url) return null
    const price = typeof item.price === 'number' ? item.price : typeof item.monthly_rent === 'number' ? item.monthly_rent : null
    const size = typeof item.surface === 'number' ? item.surface : typeof item.size === 'number' ? item.size : null
    const bedrooms = typeof item.rooms === 'number' ? item.rooms : typeof item.bedrooms === 'number' ? item.bedrooms : null
    const missing: string[] = []; if (!price) missing.push('price'); if (!size) missing.push('sizeM2'); if (bedrooms === null) missing.push('bedrooms')
    return { title, sourceUrl: url, portal: '4zida', portalListingId: extractListingId(url),
      city: typeof item.city === 'string' ? item.city : null,
      district: typeof item.neighborhood === 'string' ? item.neighborhood : typeof item.district === 'string' ? item.district : null,
      price: price && Number.isFinite(price) ? price : null, currency: 'EUR',
      sizeM2: size && Number.isFinite(size) ? size : null, bedrooms: bedrooms !== null && Number.isFinite(bedrooms) ? bedrooms : null,
      floor: null, furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null,
      description: typeof item.description === 'string' ? item.description : null, imageUrl: typeof item.image === 'string' ? item.image : null,
      agencyName: null, publishedDate: null, latitude: null, longitude: null,
      extractionConfidence: Math.max(40, 100 - missing.length * 15), missingFields: missing }
  }
  private extractFromJsonLd(html: string): ExtractedListing[] {
    const listings: ExtractedListing[] = []; const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi; let m
    while ((m = re.exec(html)) !== null) { try { const data = JSON.parse(m[1]); const items = Array.isArray(data) ? data : [data]
      for (const item of items) { if (item['@type'] === 'Apartment' || item['@type'] === 'Residence' || item['@type'] === 'RealEstateListing') {
        const name = typeof item.name === 'string' ? item.name : null; const url = typeof item.url === 'string' ? item.url : null
        if (!name || !url) continue; const offers = item.offers as Record<string, unknown> | undefined
        listings.push({ title: name, sourceUrl: url, portal: '4zida', portalListingId: extractListingId(url), city: null, district: null,
          price: offers?.price ? Number(offers.price) : null, currency: typeof offers?.priceCurrency === 'string' ? offers.priceCurrency : 'EUR',
          sizeM2: null, bedrooms: null, floor: null, furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null,
          description: typeof item.description === 'string' ? item.description : null, imageUrl: typeof item.image === 'string' ? item.image : null,
          agencyName: null, publishedDate: typeof item.datePublished === 'string' ? item.datePublished : null, latitude: null, longitude: null,
          extractionConfidence: 60, missingFields: ['sizeM2', 'bedrooms', 'district'] })
      }} } catch {} }
    return listings
  }

  private extractFromAnchors(html: string, city: string | null): ExtractedListing[] {
    const listings: ExtractedListing[] = []; const seen = new Set<string>()
    const re = /<a[^>]*href="(\/(?:stan(?:ovi)?|izdavanje-stanova)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi; let m
    while ((m = re.exec(html)) !== null) { const path = m[1]; if (path.includes('/page/') || path.includes('/strana/')) continue
      const url = 'https://www.4zida.rs' + path; if (seen.has(url.toLowerCase())) continue; seen.add(url.toLowerCase())
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (text.length < 10) continue
      const { value: price, currency } = extractPrice(text); const sizeM2 = extractSize(text); const bedrooms = extractBedrooms(text)
      const district = extractDistrict(text, city); const missing: string[] = []; if (!price) missing.push('price'); if (!sizeM2) missing.push('sizeM2')
      listings.push({ title: text.slice(0, 120), sourceUrl: url, portal: '4zida', portalListingId: extractListingId(url), city, district, price, currency,
        sizeM2, bedrooms, floor: null, furnished: null, parking: null, balcony: null, elevator: null, petsAllowed: null, description: text,
        imageUrl: null, agencyName: null, publishedDate: null, latitude: null, longitude: null, extractionConfidence: Math.max(30, 80 - missing.length * 15), missingFields: missing })
    }
    return listings
  }
}