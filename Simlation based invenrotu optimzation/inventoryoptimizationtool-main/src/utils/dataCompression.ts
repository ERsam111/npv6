import pako from 'pako';

/**
 * Compress data using gzip compression
 * @param data - Any serializable data
 * @returns Base64 encoded compressed string
 */
export function compressData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = pako.deflate(jsonString);
    
    // Convert Uint8Array to base64 without spread operator (handles large arrays)
    let binary = '';
    const len = compressed.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Compression error:', error);
    throw error;
  }
}

/**
 * Decompress data from gzip compression
 * @param compressedData - Base64 encoded compressed string
 * @returns Original data object
 */
export function decompressData(compressedData: string): any {
  try {
    const binaryString = atob(compressedData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes, { to: 'string' });
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Decompression error:', error);
    throw error;
  }
}

/**
 * Chunk large data into smaller pieces for parallel processing
 * @param data - Data to chunk
 * @param chunkSizeMB - Size of each chunk in MB (default 5MB)
 * @returns Array of compressed chunks
 */
export function chunkData(data: any, chunkSizeMB: number = 5): string[] {
  const jsonString = JSON.stringify(data);
  const chunkSize = chunkSizeMB * 1024 * 1024; // Convert to bytes
  const chunks: string[] = [];
  
  for (let i = 0; i < jsonString.length; i += chunkSize) {
    const chunk = jsonString.slice(i, i + chunkSize);
    const compressed = pako.deflate(chunk);
    
    // Convert to base64 without spread operator
    let binary = '';
    for (let j = 0; j < compressed.byteLength; j++) {
      binary += String.fromCharCode(compressed[j]);
    }
    chunks.push(btoa(binary));
  }
  
  return chunks;
}

/**
 * Reconstruct data from chunks
 * @param chunks - Array of compressed chunks
 * @returns Original data object
 */
export function reconstructFromChunks(chunks: string[]): any {
  const decompressedChunks = chunks.map(chunk => {
    const binaryString = atob(chunk);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return pako.inflate(bytes, { to: 'string' });
  });
  
  const fullJsonString = decompressedChunks.join('');
  return JSON.parse(fullJsonString);
}

/**
 * Get compression ratio as percentage
 * @param original - Original data size in bytes
 * @param compressed - Compressed data size in bytes
 * @returns Compression ratio as percentage
 */
export function getCompressionRatio(original: number, compressed: number): number {
  return ((1 - compressed / original) * 100);
}

/**
 * Format bytes to human readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
