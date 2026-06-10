import type { AiFinding, AiFindingCreateInput, AiFindingUpdateInput } from '@/lib/types'
import { SupabaseAiFindingsRepository, type AiFindingsRepository } from './aiFindings.repository'

export class AiFindingsService {
  constructor(private readonly repository: AiFindingsRepository = new SupabaseAiFindingsRepository()) {}

  listByOpportunity(organizationId: string, opportunityId: string): Promise<AiFinding[]> {
    return this.repository.listByOpportunity(organizationId, opportunityId)
  }

  getById(organizationId: string, findingId: string): Promise<AiFinding | null> {
    return this.repository.getById(organizationId, findingId)
  }

  create(input: AiFindingCreateInput): Promise<AiFinding> {
    return this.repository.create(input)
  }

  update(organizationId: string, findingId: string, input: AiFindingUpdateInput): Promise<AiFinding> {
    return this.repository.update(organizationId, findingId, input)
  }

  delete(organizationId: string, findingId: string): Promise<boolean> {
    return this.repository.delete(organizationId, findingId)
  }
}

export const aiFindingsService = new AiFindingsService()
