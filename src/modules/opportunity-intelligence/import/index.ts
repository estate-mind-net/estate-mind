/**
 * import -- Portal Import Engine
 *
 * Public API for portal imports.
 */

export type { PortalImporter, ExtractedListing, PageFetchResult } from './PortalImporter'
export type { PortalImportResult, ImportMetadata, ImportConfig } from './PortalImportResult'
export { portalRegistry } from './PortalRegistry'
export { PortalImportEngine, portalImportEngine } from './PortalImportEngine'

// Register all importers
import { portalRegistry } from './PortalRegistry'
import { FourZidaImporter } from './connectors/FourZidaImporter'

portalRegistry.register(new FourZidaImporter())
