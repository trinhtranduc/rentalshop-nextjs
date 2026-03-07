'use client';

export interface ImportRowError {
  row: number;
  error: string;
}

export interface ImportChunkResponseData {
  imported?: number;
  skipped?: number;
  failed?: number;
  total?: number;
  errors?: ImportRowError[];
}

export interface ImportChunkResponse {
  success: boolean;
  message?: string;
  data?: ImportChunkResponseData;
}

export interface ChunkedImportItem<T> {
  originalRow: number;
  payload: T;
}

export interface ChunkedImportProgress {
  currentChunk: number;
  totalChunks: number;
  processedRows: number;
  totalRows: number;
}

export interface ChunkedImportResult {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
  errors: ImportRowError[];
}

const chunkItems = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

export async function importInChunks<T>(
  items: ChunkedImportItem<T>[],
  chunkSize: number,
  importChunk: (chunk: T[], chunkIndex: number) => Promise<ImportChunkResponse>,
  onProgress?: (progress: ChunkedImportProgress) => void
): Promise<ChunkedImportResult> {
  const chunks = chunkItems(items, chunkSize);
  const result: ChunkedImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    total: items.length,
    errors: [],
  };

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    
    try {
      const response = await importChunk(chunk.map(item => item.payload), chunkIndex);

    onProgress?.({
      currentChunk: chunkIndex + 1,
      totalChunks: chunks.length,
      processedRows: Math.min((chunkIndex + 1) * chunkSize, items.length),
      totalRows: items.length,
    });

      // If API call failed completely (network error, server error, etc.)
    if (!response.success || !response.data) {
        // If this is a critical error (not just some rows failed), stop importing
        // Otherwise, continue with next chunk
        const errorMessage = response.message || 'Import chunk failed';
        console.error(`Chunk ${chunkIndex + 1} failed:`, errorMessage);
        
        // Mark all rows in this chunk as failed
        chunk.forEach((item) => {
          result.failed++;
          result.errors.push({
            row: item.originalRow,
            error: errorMessage,
          });
        });
        
        // Continue with next chunk instead of stopping
        // This allows partial success when some chunks fail
        continue;
    }

    const chunkErrors = (response.data.errors || []).map(error => {
      const matchedRow = chunk[error.row - 1];

      return {
        row: matchedRow?.originalRow || error.row,
        error: error.error,
      };
    });

    result.imported += response.data.imported || 0;
    result.skipped += response.data.skipped || 0;
    result.failed += response.data.failed || 0;
    result.errors.push(...chunkErrors);

      // Continue with next chunk even if some rows failed
      // Only stop if ALL rows in chunk failed (which is unlikely with transaction timeout)
      const totalInChunk = chunk.length;
      const failedInChunk = (response.data.failed || 0) + chunkErrors.length;
      
      // If entire chunk failed, log warning but continue
      if (failedInChunk >= totalInChunk) {
        console.warn(`Chunk ${chunkIndex + 1} had all rows failed, but continuing with next chunk`);
      }
    } catch (error: any) {
      // Network or unexpected error - mark chunk as failed but continue
      console.error(`Error importing chunk ${chunkIndex + 1}:`, error);
      
      chunk.forEach((item) => {
        result.failed++;
        result.errors.push({
          row: item.originalRow,
          error: error.message || 'Unexpected error during import',
        });
      });
      
      // Continue with next chunk
      continue;
    }
  }

  return result;
}
