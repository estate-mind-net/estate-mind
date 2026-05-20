import { getSupabaseClient } from './client'

export interface UploadResult {
  path: string
  publicUrl?: string
}

export class StorageService {
  async uploadDocument(
    file: File,
    folder: 'documents' | 'images' | 'reports' = 'documents'
  ): Promise<{ data: UploadResult | null; error: Error | null }> {
    const client = getSupabaseClient()
    
    if (!client) {
      return {
        data: null,
        error: new Error('Supabase not configured. Storage is not available in mock mode.'),
      }
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { data, error } = await client.storage
        .from('estate-mind-files')
        .upload(filePath, file)

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      const { data: { publicUrl } } = client.storage
        .from('estate-mind-files')
        .getPublicUrl(data.path)

      return {
        data: {
          path: data.path,
          publicUrl,
        },
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error during file upload'),
      }
    }
  }

  async downloadDocument(path: string): Promise<{ data: Blob | null; error: Error | null }> {
    const client = getSupabaseClient()
    
    if (!client) {
      return {
        data: null,
        error: new Error('Supabase not configured. Storage is not available in mock mode.'),
      }
    }

    try {
      const { data, error } = await client.storage
        .from('estate-mind-files')
        .download(path)

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error during file download'),
      }
    }
  }

  async deleteDocument(path: string): Promise<{ error: Error | null }> {
    const client = getSupabaseClient()
    
    if (!client) {
      return {
        error: new Error('Supabase not configured. Storage is not available in mock mode.'),
      }
    }

    try {
      const { error } = await client.storage
        .from('estate-mind-files')
        .remove([path])

      if (error) {
        return { error: new Error(error.message) }
      }

      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown error during file deletion'),
      }
    }
  }

  getPublicUrl(path: string): string | null {
    const client = getSupabaseClient()
    
    if (!client) {
      return null
    }

    const { data: { publicUrl } } = client.storage
      .from('estate-mind-files')
      .getPublicUrl(path)

    return publicUrl
  }
}

export const storageService = new StorageService()
