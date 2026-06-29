import type { ListingParser } from '../ListingParser'
import type { EnrichedListing } from '../EnrichedListing'
import type { ListingEvidence, FieldEvidence, FieldSource } from '../FieldEvidence'
import { calculateEvidenceCoverage } from '../FieldEvidence'

const DOMAIN = '4zida.rs'
const ROOM_MAP: Record<string, number> = {
  'garsonjera': 0, 'studio': 0, 'jednosoban': 1, 'jednoiposoban': 1,
  'dvosoban': 2, 'dvoiposoban': 2, 'trosoban': 3, 'troiposoban': 3,
  'cetvorosoban': 4, 'petosoban': 5,
}
const KNOWN_DISTRICTS: string[] = [
  'liman 1', 'liman 2', 'liman 3', 'liman 4', 'grbavica', 'podbara', 'detelinara',
  'stari grad', 'telep', 'adice', 'novi naselje', 'sajmište', 'petrovaradin',
  'balzakova', 'narodnog fronta', 'bulevar oslobođenja', 'bulevar despota stefana',
  'novi beograd', 'vračar', 'savski venac', 'zemun', 'dorćol', 'palilula', 'voždovac', 'rakovica', 'čukarica',
]

export class FourZidaListingParser implements ListingParser {
  portalId = '4zida'
  canHandle(url: string): boolean { try { return new URL(url).hostname.includes(DOMAIN) } catch { return false } }

  parse(html: string, url: string): EnrichedListing | null {
    const evidence: ListingEvidence = {}; const missing: string[] = []
    const nextData = this.extractFromNextData(html)
    const jsonLd = this.extractFromJsonLd(html)
    const htmlData = this.extractFromHtml(html)
    const regexData = this.extractFromRegex(html)
    const titleFallback = this.extractFromTitle(html, url)
    const merged = this.merge(nextData, jsonLd, htmlData, regexData, titleFallback, evidence, missing)
    const photos = this.extractPhotos(html)
    return {
      portal: '4zida', portalListingId: this.extractId(url), listingUrl: url,
      title: merged.title ?? null, description: merged.description ?? null,
      price: merged.price ?? null, currency: 'EUR', sizeM2: merged.sizeM2 ?? null,
      rooms: merged.rooms ?? null, bathrooms: merged.bathrooms ?? null, floor: merged.floor ?? null,
      buildingFloors: null, balcony: merged.balcony ?? null, terrace: null,
      parking: merged.parking ?? null, garage: null, heating: merged.heating ?? null,
      furnished: merged.furnished ?? null, pets: null, elevator: merged.elevator ?? null,
      airConditioning: null, orientation: null, condition: null,
      agency: merged.agency ?? null, owner: null, photos, coordinates: null,
      district: merged.district ?? null, city: merged.city ?? null, country: 'Serbia',
      constructionYear: null, publishedDate: merged.publishedDate ?? null, updatedDate: null,
      evidence, evidenceCoverage: calculateEvidenceCoverage(evidence), missingFields: missing,
    }
  }
  private extractFromNextData(html: string): Record<string, unknown> {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) return {}
    try {
      const d = JSON.parse(m[1])
      const l = d?.props?.pageProps?.listing ?? d?.props?.pageProps?.data ?? d?.props?.pageProps?.property ?? {}
      if (typeof l === 'object' && l) {
        const r: Record<string, unknown> = {}
        if (typeof l.title === 'string') r.title = l.title
        if (typeof l.name === 'string' && !r.title) r.title = l.name
        if (typeof l.price === 'number') r.price = l.price
        if (typeof l.monthly_rent === 'number' && !r.price) r.price = l.monthly_rent
        if (typeof l.surface === 'number') r.sizeM2 = l.surface
        if (typeof l.size === 'number' && !r.sizeM2) r.sizeM2 = l.size
        if (typeof l.rooms === 'number') r.rooms = l.rooms
        if (typeof l.bedrooms === 'number' && !r.rooms) r.rooms = l.bedrooms
        if (typeof l.floor === 'number') r.floor = l.floor
        if (typeof l.floor_number === 'number' && r.floor === undefined) r.floor = l.floor_number
        if (typeof l.floorLevel === 'number' && r.floor === undefined) r.floor = l.floorLevel
        if (typeof l.description === 'string') r.description = l.description
        if (typeof l.city === 'string') r.city = l.city
        if (typeof l.neighborhood === 'string') r.district = l.neighborhood
        if (typeof l.district === 'string' && !r.district) r.district = l.district
        if (typeof l.agency === 'string') r.agency = l.agency
        if (typeof l.published_at === 'string') r.publishedDate = l.published_at
        if (typeof l.datePublished === 'string' && !r.publishedDate) r.publishedDate = l.datePublished
        if (typeof l.balcony === 'boolean') r.balcony = l.balcony
        if (typeof l.parking === 'boolean') r.parking = l.parking
        if (typeof l.furnished === 'boolean') r.furnished = l.furnished
        if (typeof l.elevator === 'boolean') r.elevator = l.elevator
        if (typeof l.heating === 'string') r.heating = l.heating
        return r
      }
      return {}
    } catch { return {} }
  }

  private extractFromJsonLd(html: string): Record<string, unknown> {
    const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi; let m
    while ((m = re.exec(html)) !== null) { try { const d = JSON.parse(m[1]); const items = Array.isArray(d) ? d : [d]; for (const i of items) { if (i['@type'] === 'Apartment' || i['@type'] === 'Residence' || i['@type'] === 'RealEstateListing') return i } } catch {} }
    return {}
  }

  private extractFromHtml(html: string): Record<string, unknown> {
    const r: Record<string, unknown> = {}
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); if (h1) r.title = h1[1].replace(/<[^>]+>/g, '').trim()
    const p = html.match(/(?:price|cena)[^>]*>[\s\S]*?([\d.,]+)\s*(?:€|EUR)/i); if (p) r.price = parseInt(p[1].replace(/[.,]/g, ''), 10)
    return r
  }

  private extractFromRegex(html: string): Record<string, unknown> {
    const r: Record<string, unknown> = {}; const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const pm = text.match(/([\d.,]+)\s*(?:€|EUR)/i); if (pm) r.price = parseInt(pm[1].replace(/[.,]/g, ''), 10)
    const sm = text.match(/(\d{2,4})\s*(?:m2|m²|kv)/i); if (sm) r.sizeM2 = parseInt(sm[1], 10)
    // rooms: match ROOM_MAP words
    for (const [k, v] of Object.entries(ROOM_MAP)) { if (text.toLowerCase().includes(k)) { r.rooms = v; break } }
    // rooms: also match "3 sobe", "3-soban", "sobnost: 3"
    if (r.rooms === undefined) {
      const sobM = text.match(/(\d)\s*(?:sob[ea]?|sobni|soban)/i); if (sobM) r.rooms = parseInt(sobM[1], 10)
    }
    // floor: multiple patterns
    const fm1 = text.match(/(\d+)\.\s*sprat/i); if (fm1) r.floor = parseInt(fm1[1], 10)
    if (r.floor === undefined) { const fm2 = text.match(/(?:sprat|spratu|etaža)[:\s]*(\d+)/i); if (fm2) r.floor = parseInt(fm2[1], 10) }
    if (r.floor === undefined) { const fm3 = text.match(/na\s+(\d+)\.\s*spratu/i); if (fm3) r.floor = parseInt(fm3[1], 10) }
    if (r.floor === undefined) { const fm4 = text.match(/(?:floor)[:\s]*(\d+)/i); if (fm4) r.floor = parseInt(fm4[1], 10) }
    if (r.floor === undefined) { const fm5 = text.match(/spratnost[:\s]*\d+.*?na\s+(\d+)/i); if (fm5) r.floor = parseInt(fm5[1], 10) }
    return r
  }

  /** Extract price/size/rooms/district from the page title (e.g. "Dvosoban stan za izdavanje, Liman 3, 550€, 65m²") */
  private extractFromTitle(html: string, url: string): Record<string, unknown> {
    const r: Record<string, unknown> = {}
    const h1m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const title = h1m ? h1m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
    if (!title) return r
    r.title = title
    // price: 550€ or 550 EUR
    const pm = title.match(/(\d{3,5})\s*(?:€|EUR)/i)
    if (pm) r.price = parseInt(pm[1], 10)
    // size: 65m² or 65 m2
    const sm = title.match(/(\d{2,4})\s*(?:m2|m²)/i)
    if (sm) r.sizeM2 = parseInt(sm[1], 10)
    // rooms from title words
    const lower = title.toLowerCase()
    for (const [k, v] of Object.entries(ROOM_MAP)) {
      if (lower.includes(k)) { r.rooms = v; break }
    }
    // district from title after comma
    const parts = title.split(',').map(p => p.trim().toLowerCase())
    for (const part of parts) {
      for (const d of KNOWN_DISTRICTS) {
        if (part.includes(d)) { r.district = d.charAt(0).toUpperCase() + d.slice(1); break }
      }
      if (r.district) break
    }
    // city from URL
    try {
      const path = new URL(url).pathname
      if (path.includes('novi-sad')) r.city = 'Novi Sad'
      else if (path.includes('beograd')) r.city = 'Beograd'
    } catch {}
    return r
  }

  private merge(
    nextData: Record<string, unknown>, jsonLd: Record<string, unknown>, htmlData: Record<string, unknown>,
    regexData: Record<string, unknown>, titleFallback: Record<string, unknown>,
    evidence: ListingEvidence, missing: string[],
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {}
    const srcs = [
      { d: nextData, s: 'structured_json' as FieldSource }, { d: jsonLd, s: 'structured_json' as FieldSource },
      { d: htmlData, s: 'html_element' as FieldSource }, { d: regexData, s: 'description_text' as FieldSource },
      { d: titleFallback, s: 'description_text' as FieldSource },
    ]
    const pick = (field: string) => {
      for (const { d, s } of srcs) { if (d[field] !== undefined && d[field] !== null) {
        merged[field] = d[field]; (evidence as Record<string, FieldEvidence>)[field] = { value: d[field], source: s, confidence: s === 'structured_json' ? 100 : s === 'html_element' ? 80 : 60 }; return
      } }
      missing.push(field)
    }
    pick('title'); pick('price'); pick('sizeM2'); pick('rooms'); pick('floor'); pick('balcony'); pick('parking')
    pick('furnished'); pick('elevator'); pick('heating'); pick('description'); pick('district'); pick('city'); pick('agency'); pick('publishedDate')
    merged.currency = 'EUR'; return merged
  }

  private extractPhotos(html: string): string[] {
    const photos: string[] = []; const re = /<img[^>]*src="(https?:\/\/[^"]+)"/gi; let m
    while ((m = re.exec(html)) !== null) { if (!m[1].includes('logo') && !m[1].includes('icon') && !m[1].includes('svg')) photos.push(m[1]) }
    return [...new Set(photos)].slice(0, 20)
  }

  private extractId(url: string): string | null { try { const s = new URL(url).pathname.split('/').filter(Boolean); const l = s[s.length - 1]; return /^\d+$/.test(l) ? l : s.join('/') } catch { return null } }
}