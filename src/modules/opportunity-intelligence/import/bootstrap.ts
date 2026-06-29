/**
 * bootstrap.ts
 *
 * Registers all portal importers with the registry.
 * Must be imported (side-effect) before any import operation.
 */

import { portalRegistry } from './PortalRegistry'
import { FourZidaImporter } from './connectors/FourZidaImporter'

portalRegistry.register(new FourZidaImporter())

console.log('[ImportBootstrap] Registered:', portalRegistry.listPortals())