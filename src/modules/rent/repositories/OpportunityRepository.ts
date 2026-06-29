import { rentSupabaseAdapter } from '../services/rentSupabaseAdapter'
import type { RentalApartment, RentalStatus } from '../types'
import type { AdapterContext } from '../services/rentSupabaseAdapter'
import { requireDataContext } from '@/modules/opportunity-intelligence/auth/ContextValidation'

export interface RepositoryResult<T = RentalApartment> {
  success: boolean
  data?: T
  error?: string
}

export interface RepositoryListResult {
  success: boolean
  data: RentalApartment[]
  error?: string
}

class OpportunityRepository {
  async list(context: AdapterContext): Promise<RepositoryListResult> {
    requireDataContext(context)
    return rentSupabaseAdapter.listRentApartments(context)
  }

  async getById(id: string, context: AdapterContext): Promise<RepositoryResult> {
    requireDataContext(context)
    return rentSupabaseAdapter.getRentApartmentById(id, context)
  }

  async create(apartment: Omit<RentalApartment, 'id'>, context: AdapterContext): Promise<RepositoryResult> {
    requireDataContext(context)
    return rentSupabaseAdapter.createRentApartment(apartment, context)
  }

  async update(apartment: RentalApartment, context: AdapterContext): Promise<RepositoryResult> {
    requireDataContext(context)
    return rentSupabaseAdapter.updateRentApartment(apartment, context)
  }

  async updateStatus(id: string, status: RentalStatus, context: AdapterContext): Promise<RepositoryResult> {
    requireDataContext(context)
    return rentSupabaseAdapter.updateRentApartmentStatus(id, status, context)
  }

  async delete(id: string, context: AdapterContext): Promise<RepositoryResult<boolean>> {
    requireDataContext(context)
    return rentSupabaseAdapter.deleteRentApartment(id, context)
  }

  async existsBySourceUrl(sourceUrl: string, context: AdapterContext): Promise<boolean> {
    requireDataContext(context)
    return rentSupabaseAdapter.existsBySourceUrl(sourceUrl, context)
  }
}

export const opportunityRepository = new OpportunityRepository()