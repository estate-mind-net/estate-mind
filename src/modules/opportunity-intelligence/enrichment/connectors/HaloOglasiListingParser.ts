import type { ListingParser } from '../ListingParser'
import type { EnrichedListing } from '../EnrichedListing'
import type { ListingEvidence, FieldEvidence, FieldSource } from '../FieldEvidence'
import { calculateEvidenceCoverage } from '../FieldEvidence'

const DOMAIN = 'halooglasi.com'
const ROOM_MAP: Record<string, number> = {
  'garsonjera': 0, 'studio': 0, 'jednosoban': 1, 'jednoiposoban': 1,
  'dvosoban': 2, 'dvoiposoban': 2, 'trosoban': 3, 'troiposoban': 3,
  'četvorosoban': 4, 'cetvorosoban': 4, 'petosoban': 5,
}

/** Known district/location keywords for Novi Sad and Belgrade */
const KNOWN_DISTRICTS: string[] = [
  'liman 1', 'liman 2', 'liman 3', 'liman 4', 'liman',
  'grbavica', 'detelinara', 'podbara', 'telep', 'novo naselje',
  'adamovićevo naselje', 'stari grad', 'centar', 'bulevar',
  'narodnog fronta', 'balzakova', 'petrovaradin', 'sajmište',
  'adice', 'veternik', 'sremska kamenica',
  'novi beograd', 'vračar', 'vracar', 'savski venac', 'zemun',
  'dorćol', 'dorcol', 'palilula', 'voždovac', 'vozdovac',
  'rakovica', 'čukarica', 'cukarica', 'banovo brdo', 'mirijevo',
  'žarkovo', 'zarkovo', 'ledine', 'bežanijska kosa',
]

/** JS tokens that indicate contaminated script content */
const JS_TOKENS = [
  'QuidditaEnvironment', 'CurrentClassified', 'classified.History',
  'document.getElementById', 'currentScript', 'formatAdAttributeUnit',
  'var classified', 'function(', 'window.', 'document.', 'jQuery',
  'addEventListener', 'prototype.', 'typeof ', 'console.log',
]

function cleanHaloText(value: string): string {
  if (!value) return ''
  // Remove script/style/noscript blocks
  let cleaned = value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
  // Strip HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ')
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  // Reject if contains JS tokens
  for (const token of JS_TOKENS) {
    if (cleaned.includes(token)) return ''
  }
  return cleaned
}

function extractClassifiedObject(html: string): Record<string, unknown> | null {
  // Look for QuidditaEnvironment.CurrentClassified = {...};
  const patterns = [
    /QuidditaEnvironment\.CurrentClassified\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|var\s|\n)/,
    /var\s+classified\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|var\s|\n)/,
    /CurrentClassified\s*[:=]\s*(\{[\s\S]*?\})\s*[,;]/,
  ]
  for (const pat of patterns) {
    const m = html.match(pat)
    if (m) {
      try {
        return JSON.parse(m[1])
      } catch {}
    }
  }
  return null
}

function findDistrictInText(text: string): string | null {
  const lower = text.toLowerCase()
  for (const d of KNOWN_DISTRICTS) {
    if (lower.includes(d)) return d.charAt(0).toUpperCase() + d.slice(1)
  }
  return null
}

export class HaloOglasiListingParser implements ListingParser {
  portalId = 'halo-oglasi'
  canHandle(url: string): boolean { try { return new URL(url).hostname.includes(DOMAIN) } catch { return false } }

  parse(html: string, url: string): EnrichedListing | null {
    const evidence: ListingEvidence = {}
    const missing: string[] = []

    // ── Title extraction (priority order) ──
    let title: string | null = null
    let titleSource = 'none'

    // 1. Classified JS object
    const classified = extractClassifiedObject(html)
    if (classified) {
      const ct = classified.Title ?? classified.title ?? classified.Name ?? classified.name
      if (typeof ct === 'string' && ct.length >= 3 && !JS_TOKENS.some(t => ct.includes(t))) {
        title = ct.trim()
        titleSource = 'classified_object'
      }
    }

    // 2. JSON-LD name/title
    if (!title) {
      const jsonLd = this.extractFromJsonLd(html)
      const jld = typeof jsonLd.name === 'string' ? jsonLd.name : typeof jsonLd.title === 'string' ? jsonLd.title : null
      if (jld && jld.length >= 3 && !JS_TOKENS.some(t => jld.includes(t))) {
        title = jld.trim()
        titleSource = 'json_ld'
      }
    }

    // 3. meta og:title
    if (!title) {
      const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      if (ogMatch) {
        const cleaned = cleanHaloText(ogMatch[1])
        if (cleaned.length >= 3) { title = cleaned; titleSource = 'og_title' }
      }
    }

    // 4. h1 text (after removing scripts)
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      if (h1Match) {
        const cleaned = cleanHaloText(h1Match[1])
        if (cleaned.length >= 3) { title = cleaned; titleSource = 'h1' }
      }
    }

    // 5. document title cleaned
    if (!title) {
      const docTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      if (docTitleMatch) {
        const cleaned = cleanHaloText(docTitleMatch[1])
        if (cleaned.length >= 3) { title = cleaned; titleSource = 'doc_title' }
      }
    }

    // Final validation - reject script-contaminated titles
    if (title && JS_TOKENS.some(t => title!.includes(t))) {
      title = null
      titleSource = 'rejected_contaminated'
    }

    console.log('[HaloParser] title source:', titleSource)
    console.log('[HaloParser] cleaned title:', title ?? '(empty)')

    // ── District extraction ──
    let district: string | null = null
    let districtSource = 'none'

    // 1. Classified object location fields
    if (classified) {
      const locFields = [
        classified.NeighborhoodName, classified.neighborhoodName,
        classified.LocationName, classified.locationName,
        classified.District, classified.district,
        classified.CityMunicipalityName, classified.cityMunicipalityName,
        classified.neighborhood, classified.Neighborhood,
      ]
      for (const f of locFields) {
        if (typeof f === 'string' && f.length >= 2) {
          district = f.trim()
          districtSource = 'classified_object'
          break
        }
      }
    }

    // 2. Breadcrumb text
    if (!district) {
      const breadcrumbMatch = html.match(/class="[^"]*breadcrumb[^"]*"[^>]*>([\s\S]*?)<\/(?:nav|div|ol|ul)>/i)
      if (breadcrumbMatch) {
        const bcText = cleanHaloText(breadcrumbMatch[1])
        const found = findDistrictInText(bcText)
        if (found) { district = found; districtSource = 'breadcrumb' }
      }
    }

    // 3. Meta description/title
    if (!district) {
      const metaContent = [
        html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1],
        html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1],
        html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)?.[1],
      ].filter(Boolean).join(' ')
      if (metaContent) {
        const found = findDistrictInText(metaContent)
        if (found) { district = found; districtSource = 'meta' }
      }
    }

    // 4. Page text around location labels
    if (!district) {
      const locLabelMatch = html.match(/(?:Lokacija|Location|Mikrolokacija)[^:]*:\s*([^\n<]+)/i)
      if (locLabelMatch) {
        const cleaned = cleanHaloText(locLabelMatch[1])
        if (cleaned.length >= 2) { district = cleaned; districtSource = 'location_label' }
      }
    }

    // 5. Title itself contains known district
    if (!district && title) {
      const found = findDistrictInText(title)
      if (found) { district = found; districtSource = 'title' }
    }

    // 6. URL path contains known district
    if (!district) {
      try {
        const path = new URL(url).pathname
        const found = findDistrictInText(path)
        if (found) { district = found; districtSource = 'url_path' }
      } catch {}
    }

    console.log('[HaloParser] district source:', districtSource)
    console.log('[HaloParser] district value:', district ?? '(empty)')

    // ── Other fields from existing extraction ──
    const jsonLd = this.extractFromJsonLd(html)
    const htmlData = this.extractFromHtml(html)
    const regexData = this.extractFromRegex(html)
    const merged = this.merge(jsonLd, htmlData, regexData, evidence, missing)
    const photos = this.extractPhotos(html)

    const m = merged
    const finalTitle = title ?? (typeof m.title === 'string' ? m.title : null) ?? null

    // Safe fallback if title still invalid
    let safeTitle = finalTitle
    if (!safeTitle || safeTitle.length < 3 || JS_TOKENS.some(t => safeTitle!.includes(t))) {
      const priceStr = typeof m.price === 'number' ? `${m.price}€` : ''
      const sizeStr = typeof m.sizeM2 === 'number' ? `${m.sizeM2}m²` : ''
      const parts = [priceStr, sizeStr].filter(Boolean).join(', ')
      safeTitle = parts ? `Halo Oglasi listing, ${parts}` : 'Halo Oglasi listing'
    }

    // Use classified district if merge didn't find one
    const finalDistrict = district ?? (typeof m.district === 'string' && m.district.length >= 2 ? m.district : null)

    return {
      portal: 'halo-oglasi', portalListingId: this.extractId(url), listingUrl: url,
      title: safeTitle,
      description: (typeof m.description === 'string' ? m.description : null) ?? null,
      price: (typeof m.price === 'number' ? m.price : null) ?? null,
      currency: (typeof m.currency === 'string' ? m.currency : 'EUR'),
      sizeM2: (typeof m.sizeM2 === 'number' ? m.sizeM2 : null) ?? null,
      rooms: (typeof m.rooms === 'number' ? m.rooms : null) ?? null,
      bathrooms: null, floor: (typeof m.floor === 'number' ? m.floor : null) ?? null,
      buildingFloors: null,
      balcony: (typeof m.balcony === 'boolean' ? m.balcony : null) ?? null,
      terrace: null,
      parking: (typeof m.parking === 'boolean' ? m.parking : null) ?? null,
      garage: null,
      heating: (typeof m.heating === 'string' ? m.heating : null) ?? null,
      furnished: (typeof m.furnished === 'boolean' ? m.furnished : null) ?? null,
      pets: null,
      elevator: (typeof m.elevator === 'boolean' ? m.elevator : null) ?? null,
      airConditioning: null, orientation: null, condition: null,
      agency: (typeof m.agency === 'string' ? m.agency : null) ?? null,
      owner: null, photos, coordinates: null,
      district: finalDistrict ?? null,
      city: (typeof m.city === 'string' ? m.city : null) ?? null,
      country: 'Serbia',
      constructionYear: null,
      publishedDate: (typeof m.publishedDate === 'string' ? m.publishedDate : null) ?? null,
      updatedDate: null,
      evidence, evidenceCoverage: calculateEvidenceCoverage(evidence), missingFields: missing,
    }
  }

  private extractFromJsonLd(html: string): Record<string, unknown> {
    const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    let m
    while ((m = re.exec(html)) !== null) {
      try {
        const data = JSON.parse(m[1])
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Apartment' || item['@type'] === 'Residence' || item['@type'] === 'RealEstateListing') {
            return item
          }
        }
      } catch {}
    }
    return {}
  }

  private extractFromHtml(html: string): Record<string, unknown> {
    const r: Record<string, unknown> = {}
    // Extract h1 but only if clean
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    if (h1) {
      const cleaned = cleanHaloText(h1[1])
      if (cleaned.length >= 3) r.title = cleaned
    }
    const priceMatch = html.match(/class="[^"]*(?:price|cena)[^"]*"[^>]*>[\s\S]*?([\d.,]+)\s*(?:€|EUR)/i)
    if (priceMatch) r.price = parseInt(priceMatch[1].replace(/[.,]/g, ''), 10)
    return r
  }

  private extractFromRegex(html: string): Record<string, unknown> {
    const r: Record<string, unknown> = {}
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const pm = text.match(/([\d.,]+)\s*(?:€|EUR)/i)
    if (pm) r.price = parseInt(pm[1].replace(/[.,]/g, ''), 10)
    const sm = text.match(/(\d{2,4})\s*(?:m2|m²)/i)
    if (sm) r.sizeM2 = parseInt(sm[1], 10)
    for (const [k, v] of Object.entries(ROOM_MAP)) { if (text.toLowerCase().includes(k)) { r.rooms = v; break } }
    if (r.rooms === undefined) { const sobM = text.match(/(\d)\s*(?:sob[ea]?|sobni|soban)/i); if (sobM) r.rooms = parseInt(sobM[1], 10) }
    const fm1 = text.match(/(\d+)\.\s*sprat/i); if (fm1) r.floor = parseInt(fm1[1], 10)
    if (r.floor === undefined) { const fm2 = text.match(/(?:sprat|spratu|etaža)[:\s]*(\d+)/i); if (fm2) r.floor = parseInt(fm2[1], 10) }
    if (r.floor === undefined) { const fm3 = text.match(/na\s+(\d+)\.\s*spratu/i); if (fm3) r.floor = parseInt(fm3[1], 10) }
    return r
  }

  private merge(
    jsonLd: Record<string, unknown>, htmlData: Record<string, unknown>, regexData: Record<string, unknown>,
    evidence: ListingEvidence, missing: string[],
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {}
    const srcs = [
      { d: jsonLd, s: 'structured_json' as FieldSource },
      { d: htmlData, s: 'html_element' as FieldSource },
      { d: regexData, s: 'description_text' as FieldSource },
    ]
    const pick = (field: string) => {
      for (const { d, s } of srcs) {
        if (d[field] !== undefined && d[field] !== null) {
          merged[field] = d[field]
          ;(evidence as Record<string, FieldEvidence>)[field] = { value: d[field], source: s, confidence: s === 'structured_json' ? 100 : s === 'html_element' ? 80 : 60 }
          return
        }
      }
      missing.push(field)
    }
    pick('title'); pick('price'); pick('sizeM2'); pick('rooms'); pick('floor')
    pick('balcony'); pick('parking'); pick('furnished'); pick('elevator'); pick('heating')
    pick('description'); pick('district'); pick('city'); pick('agency'); pick('publishedDate')

    if (jsonLd.offers && typeof jsonLd.offers === 'object') {
      const offers = jsonLd.offers as Record<string, unknown>
      if (typeof offers.price === 'number' && !merged.price) merged.price = offers.price
      if (typeof offers.priceCurrency === 'string') merged.currency = offers.priceCurrency
    }
    if (jsonLd.address && typeof jsonLd.address === 'object') {
      const addr = jsonLd.address as Record<string, unknown>
      if (typeof addr.addressLocality === 'string' && !merged.city) merged.city = addr.addressLocality
    }

    merged.currency = merged.currency ?? 'EUR'
    return merged
  }

  private extractPhotos(html: string): string[] {
    const photos: string[] = []
    const re = /<img[^>]*src="(https?:\/\/[^"]+)"/gi
    let m
    while ((m = re.exec(html)) !== null) {
      if (!m[1].includes('logo') && !m[1].includes('icon') && !m[1].includes('svg')) photos.push(m[1])
    }
    return [...new Set(photos)].slice(0, 20)
  }

  private extractId(url: string): string | null {
    try {
      const segs = new URL(url).pathname.split('/').filter(Boolean)
      const last = segs[segs.length - 1]
      return /^\d+$/.test(last) ? last : segs.join('/')
    } catch { return null }
  }
}