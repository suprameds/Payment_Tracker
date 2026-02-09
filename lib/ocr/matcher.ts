import { supabase } from '@/lib/supabase/client';
import { Dispatch } from '@/lib/types/database';
import { OCRResult } from './processor';

export interface MatchResult {
  extraction: OCRResult;
  dispatch: Dispatch | null;
  match_confidence: 'high' | 'medium' | 'low' | 'none';
  amount_matches: boolean;
  status: 'auto_applied' | 'needs_review' | 'no_match';
  message?: string;
}

const AMOUNT_TOLERANCE = 5; // ±5 rupees tolerance

/**
 * Match OCR extraction with database records
 */
export async function matchOCRWithDispatches(extraction: OCRResult): Promise<MatchResult> {
  if (!extraction.tracking_id) {
    return {
      extraction,
      dispatch: null,
      match_confidence: 'none',
      amount_matches: false,
      status: 'no_match',
      message: 'No tracking ID found in OCR',
    };
  }

  try {
    // Find dispatch by tracking ID
    const { data: dispatches, error } = await supabase
      .from('dispatches')
      .select('*')
      .eq('tracking_id', extraction.tracking_id)
      .limit(1);

    if (error) throw error;

    if (!dispatches || dispatches.length === 0) {
      return {
        extraction,
        dispatch: null,
        match_confidence: 'none',
        amount_matches: false,
        status: 'no_match',
        message: `No dispatch found with tracking ID: ${extraction.tracking_id}`,
      };
    }

    const dispatch = (dispatches[0] as unknown) as Dispatch;

    // Check if amount matches (with tolerance)
    let amount_matches = false;
    if (extraction.amount !== null) {
      const dispatchAmount = Number(dispatch.amount);
      const extractedAmount = extraction.amount;
      const difference = Math.abs(dispatchAmount - extractedAmount);
      amount_matches = difference <= AMOUNT_TOLERANCE;
    }

    // Determine match confidence
    let match_confidence: 'high' | 'medium' | 'low' = 'low';
    if (extraction.confidence > 80 && amount_matches) {
      match_confidence = 'high';
    } else if (extraction.confidence > 60 || amount_matches) {
      match_confidence = 'medium';
    }

    // Auto-apply if high confidence
    if (match_confidence === 'high' && !dispatch.payment_received) {
      return {
        extraction,
        dispatch,
        match_confidence,
        amount_matches,
        status: 'auto_applied',
        message: 'High confidence match - ready for auto-update',
      };
    }

    return {
      extraction,
      dispatch,
      match_confidence,
      amount_matches,
      status: 'needs_review',
      message: 'Match found but needs manual review',
    };
  } catch (error) {
    console.error('Error matching OCR with dispatches:', error);
    return {
      extraction,
      dispatch: null,
      match_confidence: 'none',
      amount_matches: false,
      status: 'no_match',
      message: 'Error during matching process',
    };
  }
}

/**
 * Apply matched OCR result to dispatch
 */
export async function applyOCRMatch(dispatchId: string, extraction: OCRResult): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('dispatches') as any)
      .update({
        payment_received: true,
        payment_received_at: new Date().toISOString(),
        payment_received_by: user?.email || 'ocr_auto',
        delivery_status: 'Delivered',
        ocr_processed: true,
        ocr_processed_at: new Date().toISOString(),
        ocr_confidence: extraction.confidence,
        ocr_raw_data: {
          tracking_id: extraction.tracking_id,
          amount: extraction.amount,
          raw_text: extraction.raw_text,
        },
        last_modified_by: user?.id || null,
      })
      .eq('id', dispatchId);

    if (error) {
      console.error('Error applying OCR match:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error applying OCR match:', error);
    return false;
  }
}
