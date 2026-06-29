/**
 * PortalRegistry.ts
 *
 * Registry of portal importers. Adding a new portal = register it here.
 * No engine changes required.
 */

import type { PortalImporter } from './PortalImporter'

class PortalRegistry {
  private importers: Map<string, PortalImporter> = new Map()

  /** Register a portal importer. */
  register(importer: PortalImporter): void {
    this.importers.set(importer.portalId, importer)
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

  /** List all registered portal IDs. */
  listPortals(): string[] {
    return [...this.importers.keys()]
  }

  /** List all registered importers. */
  listAll(): PortalImporter[] {
    return [...this.importers.values()]
  }
}

/** Singleton registry instance. */
export const portalRegistry = new PortalRegistry()
