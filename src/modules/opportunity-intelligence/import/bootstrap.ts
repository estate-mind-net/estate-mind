/**
 * bootstrap.ts
 *
 * Registers all portal importers with the registry.
 * Must be imported (side-effect) before any import operation.
 */

import { portalRegistry } from './PortalRegistry'
import { FourZidaImporter } from './connectors/FourZidaImporter'
import { HaloOglasiImporter } from './connectors/HaloOglasiImporter'

portalRegistry.register(new FourZidaImporter(), { domain: '4zida.rs', supportsImages: true })
portalRegistry.register(new HaloOglasiImporter(), { domain: 'halooglasi.com' })

console.log('[ImportBootstrap] Registered portals:', portalRegistry.listPortals())
