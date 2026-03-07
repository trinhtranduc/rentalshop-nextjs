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
  importChunk: (chunk: T[]) => Promise<ImportChunkResponse>,
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
    const response = await importChunk(chunk.map(item => item.payload));

    onProgress?.({
      currentChunk: chunkIndex + 1,
      totalChunks: chunks.length,
      processedRows: Math.min((chunkIndex + 1) * chunkSize, items.length),
      totalRows: items.length,
    });

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Import failed');
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

    // Stop on first failed chunk to avoid partial import drifting too far.
    if ((response.data.failed || 0) > 0 || chunkErrors.length > 0) {
      break;
    }
  }

  return result;
}
