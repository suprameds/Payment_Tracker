import { createWorker, type Worker } from 'tesseract.js';

export interface OCRResult {
  tracking_id: string | null;
  amount: number | null;
  confidence: number;
  raw_text: string;
}

/**
 * Extract tracking ID and amount from OCR text
 */
export async function processImageWithOCR(imageFile: File): Promise<OCRResult> {
  let worker: Worker | null = null;

  try {
    // Create Tesseract worker
    worker = await createWorker('eng');
    
    // Perform OCR
    const { data } = await worker.recognize(imageFile);
    const text = data.text;
    const confidence = data.confidence;

    // Extract tracking ID (starts with EZ or JO)
    const trackingIdMatch = text.match(/\b(EZ|JO)[A-Z0-9]+\b/i);
    const tracking_id = trackingIdMatch ? trackingIdMatch[0].toUpperCase() : null;

    // Extract amount (various currency patterns)
    // Patterns: ₹500, Rs 500, Rs. 500, 500.00, etc.
    const amountMatch = text.match(/(?:₹|Rs\.?|INR)?\s*(\d+(?:[,.\s]\d+)*(?:\.\d{2})?)/i);
    let amount: number | null = null;
    
    if (amountMatch) {
      // Clean up the matched amount string
      const cleanAmount = amountMatch[1].replace(/[,\s]/g, '');
      amount = parseFloat(cleanAmount);
    }

    return {
      tracking_id,
      amount,
      confidence,
      raw_text: text,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to process image with OCR');
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Extract multiple records from an image (for batch processing)
 */
export async function processImageForMultipleRecords(imageFile: File): Promise<OCRResult[]> {
  const result = await processImageWithOCR(imageFile);
  
  // For now, return single result
  // In the future, this could be enhanced to detect multiple entries
  return result.tracking_id || result.amount ? [result] : [];
}
