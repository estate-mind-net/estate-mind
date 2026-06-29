/**
 * PortalRegistry.ts
 *
 * Registry of portal importers. Adding a new portal = register it here.
 * No engine changes required.
 */

import type { PortalImporter } from './PortalImporter'

export interface PortalCapabilities {
  id: string
  name: string
  domain: string
  supportsSearch: boolean
  supportsDetail: boolean
  supportsImages: boolean
  supportsPagination: boolean
  supportsMonitoring: boolean
}

class PortalRegistry {
  private importers: Map<string, PortalImporter> = new Map()
  private capabilities: Map<string, PortalCapabilities> = new Map()

  /** Register a portal importer with optional capabilities. */
  register(importer: PortalImporter, caps?: Partial<PortalCapabilities>): void {
    this.importers.set(importer.portalId, importer)
    const defaults: PortalCapabilities = {
      id: importer.portalId,
      name: importer.portalName,
      domain: '',
      supportsSearch: true,
      supportsDetail: true,
      supportsImages: false,
      supportsPagination: true,
      supportsMonitoring: false,
    }
    this.capabilities.set(importer.portalId, { ...defaults, ...caps })
  }

  /** Find the importer that can handle the given URL. */
  findByUrl(url: string): PortalImporter | null {
    console.log('[PortalRegistry] Registered importers:', [...this.importers.keys()])
    for (const importer of this.importers.values()) {
      if (importer.canHandle(url)) { console.log('[PortalRegistry] Selected importer:', importer.portalId, '(' + importer.constructor.name + ')'); return importer }
    }
    console.warn('[PortalRegistry] No importer matched URL:', url)
    return null
  }

  /** Get an importer by portal ID. */
  get(portalId: string): PortalImporter | null {
    return this.importers.get(portalId) ?? null
  }

  /** Get capabilities for a portal. */
  getCapabilities(portalId: string): PortalCapabilities | null {
    return this.capabilities.get(portalId) ?? null
  }

  /** List all registered portal IDs. */
  listPortals(): string[] {
    return [...this.importers.keys()]
  }

  /** List all registered importers. */
  listAll(): PortalImporter[] {
    return [...this.importers.values()]
  }

  /** List all registered portal capabilities. */
  listAllCapabilities(): PortalCapabilities[] {
    return [...this.capabilities.values()]
  }
}

/** Singleton registry instance. */
export const portalRegistry = new PortalRegistry()
