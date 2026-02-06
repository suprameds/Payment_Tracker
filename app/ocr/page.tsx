'use client';

import { useState } from 'react';
import Image from 'next/image';
import { processImageWithOCR } from '@/lib/ocr/processor';
import { matchOCRWithDispatches, applyOCRMatch, type MatchResult } from '@/lib/ocr/matcher';
import { formatCurrency } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ImageProcessingState {
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: MatchResult;
  error?: string;
}

export default function OCRPage() {
  const [images, setImages] = useState<ImageProcessingState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;

    // Validate each file
    const validFiles: ImageProcessingState[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 10MB`);
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: Must be a valid image file`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setImages(prev => prev.map(img => 
          img.file === file ? { ...img, preview } : img
        ));
      };
      reader.readAsDataURL(file);

      validFiles.push({
        file,
        preview: '',
        status: 'pending'
      });
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError(null);
    }

    setImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleProcessAll = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setError(null);

    // Process each image sequentially
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      if (image.status !== 'pending') continue;

      // Update status to processing
      setImages(prev => prev.map((img, idx) => 
        idx === i ? { ...img, status: 'processing' as const } : img
      ));

      try {
        // Step 1: OCR Processing
        const ocrResult = await processImageWithOCR(image.file);
        
        if (!ocrResult.tracking_id && !ocrResult.amount) {
          throw new Error('Failed to extract tracking ID or amount from image');
        }

        // Step 2: Match with dispatches
        const matchResult = await matchOCRWithDispatches(ocrResult);

        // Step 3: Auto-apply if high confidence exact match
        if (matchResult.status === 'auto_applied' && matchResult.dispatch?.id) {
          await applyOCRMatch(matchResult.dispatch.id, ocrResult);
        }

        // Update with completed result
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { 
            ...img, 
            status: 'completed' as const,
            result: matchResult
          } : img
        ));

      } catch (err) {
        // Update with error
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { 
            ...img, 
            status: 'error' as const,
            error: err instanceof Error ? err.message : 'Processing failed'
          } : img
        ));
      }
    }

    setIsProcessing(false);
  };

  const handleConfirmMatch = async (index: number) => {
    const image = images[index];
    if (!image.result?.dispatch?.id || !image.result?.extraction?.amount) return;

    try {
      const success = await applyOCRMatch(image.result.dispatch.id, image.result.extraction);
      if (success) {
        setImages(prev => prev.map((img, idx) => 
          idx === index && img.result ? {
            ...img,
            result: { ...img.result, status: 'auto_applied' as const }
          } : img
        ));
        alert('Payment status updated successfully!');
      } else {
        alert('Failed to update payment status');
      }
    } catch {
      alert('Error updating payment status');
    }
  };

  const handleConfirmSelected = async () => {
    const promises = Array.from(selectedMatches).map(async (index) => {
      const image = images[index];
      if (!image.result?.dispatch?.id || !image.result?.extraction?.amount) return false;
      return await applyOCRMatch(image.result.dispatch.id, image.result.extraction);
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      setImages(prev => prev.map((img, idx) => {
        if (selectedMatches.has(idx) && img.result) {
          return { ...img, result: { ...img.result, status: 'auto_applied' as const } };
        }
        return img;
      }));
      alert(`${successCount} payment(s) updated successfully!`);
      setSelectedMatches(new Set());
    }
  };

  const handleConfirmAllHighConfidence = async () => {
    const highConfidenceIndices = images
      .map((img, idx) => ({ img, idx }))
      .filter(({ img }) => 
        img.result?.status === 'needs_review' && 
        img.result?.match_confidence === 'high'
      )
      .map(({ idx }) => idx);

    if (highConfidenceIndices.length === 0) return;

    const promises = highConfidenceIndices.map(async (index) => {
      const image = images[index];
      if (!image.result?.dispatch?.id || !image.result?.extraction?.amount) return false;
      return await applyOCRMatch(image.result.dispatch.id, image.result.extraction);
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      setImages(prev => prev.map((img, idx) => {
        if (highConfidenceIndices.includes(idx) && img.result) {
          return { ...img, result: { ...img.result, status: 'auto_applied' as const } };
        }
        return img;
      }));
      alert(`${successCount} high-confidence payment(s) updated successfully!`);
    }
  };

  const toggleSelectMatch = (index: number) => {
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const completedImages = images.filter(img => img.status === 'completed');
  const needsReviewCount = completedImages.filter(img => img.result?.status === 'needs_review').length;
  const autoAppliedCount = completedImages.filter(img => img.result?.status === 'auto_applied').length;
  const highConfidenceNeedsReview = completedImages.filter(img => 
    img.result?.status === 'needs_review' && img.result?.match_confidence === 'high'
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            OCR Batch Processing
          </h1>
          <p className="text-lg text-gray-600">
            Upload multiple handwritten Post Office reports to automatically extract and match payment information
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 animate-shake">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <p className="text-sm text-red-800 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
            </div>
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <Card variant={images.length > 0 ? "bordered" : "elevated"} hover className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📤</span>
              Upload Images
            </CardTitle>
            <CardDescription>
              Drag and drop images here or click to browse (max 10MB each)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative border-3 border-dashed rounded-xl p-12 text-center transition-all duration-200
                ${isDragOver 
                  ? 'border-blue-500 bg-blue-50 scale-105' 
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
                }
              `}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <div className="pointer-events-none">
                <div className="text-6xl mb-4">
                  {isDragOver ? '⬇️' : '🖼️'}
                </div>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  {isDragOver ? 'Drop files here!' : 'Drop images here'}
                </p>
                <p className="text-sm text-gray-500">
                  or <span className="text-blue-600 font-medium">browse</span> to choose files
                </p>
              </div>
            </div>

            {images.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {images.length} image{images.length !== 1 ? 's' : ''} selected
                  </p>
                  <Button
                    onClick={handleProcessAll}
                    disabled={isProcessing || images.every(img => img.status !== 'pending')}
                    variant="gradient"
                    size="lg"
                    isLoading={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : '✨ Process All'}
                  </Button>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className="group relative bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 animate-fade-in"
                    >
                      {/* Image Preview */}
                      <div className="aspect-square relative bg-gray-100">
                        {img.preview ? (
                          <Image
                            src={img.preview}
                            alt={img.file.name}
                            fill
                            className="object-contain"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-pulse text-gray-400">Loading...</div>
                          </div>
                        )}
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center text-sm font-bold shadow-lg"
                        >
                          ✕
                        </button>

                        {/* Status Badge */}
                        <div className="absolute bottom-2 left-2">
                          {img.status === 'pending' && (
                            <Badge variant="default" className="shadow-md">Pending</Badge>
                          )}
                          {img.status === 'processing' && (
                            <Badge variant="default" className="animate-pulse-glow shadow-md">
                              <span className="animate-spin mr-1">⚙️</span> Processing
                            </Badge>
                          )}
                          {img.status === 'completed' && (
                            <Badge variant="success" className="shadow-md">✓ Done</Badge>
                          )}
                          {img.status === 'error' && (
                            <Badge variant="danger" className="shadow-md">✗ Error</Badge>
                          )}
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="p-3 bg-white">
                        <p className="text-xs font-medium text-gray-700 truncate" title={img.file.name}>
                          {img.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(img.file.size / 1024).toFixed(1)} KB
                        </p>
                        {img.error && (
                          <p className="text-xs text-red-600 mt-1 line-clamp-2">{img.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processing Summary */}
        {completedImages.length > 0 && (
          <Card variant="gradient" className="mb-8 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Processing Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm">
                  <div className="text-4xl font-bold bg-gradient-to-br from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
                    {autoAppliedCount}
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Auto Applied</p>
                  <p className="text-xs text-gray-500 mt-1">High confidence matches</p>
                </div>
                <div className="text-center p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm">
                  <div className="text-4xl font-bold bg-gradient-to-br from-amber-500 to-orange-600 bg-clip-text text-transparent mb-2">
                    {needsReviewCount}
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Needs Review</p>
                  <p className="text-xs text-gray-500 mt-1">Manual confirmation required</p>
                </div>
                <div className="text-center p-4 bg-white/70 backdrop-blur-sm rounded-xl shadow-sm">
                  <div className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text text-transparent mb-2">
                    {completedImages.length}
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Total Processed</p>
                  <p className="text-xs text-gray-500 mt-1">Successfully completed</p>
                </div>
              </div>

              {highConfidenceNeedsReview > 0 && (
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <Button
                    onClick={handleConfirmAllHighConfidence}
                    variant="gradient"
                    size="lg"
                    className="shadow-lg"
                  >
                    ✓ Confirm All High Confidence ({highConfidenceNeedsReview})
                  </Button>
                  {selectedMatches.size > 0 && (
                    <Button
                      onClick={handleConfirmSelected}
                      variant="primary"
                      size="lg"
                      className="shadow-lg"
                    >
                      ✓ Confirm Selected ({selectedMatches.size})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Match Results */}
        {completedImages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Match Results</h2>
            
            {completedImages.map((img) => {
              const index = images.indexOf(img);
              const result = img.result;
              if (!result) return null;

              const confidenceColor = {
                high: 'text-green-700 bg-green-100 border-green-300',
                medium: 'text-yellow-700 bg-yellow-100 border-yellow-300',
                low: 'text-red-700 bg-red-100 border-red-300',
                none: 'text-gray-700 bg-gray-100 border-gray-300',
              }[result.match_confidence];

              const statusColor = {
                auto_applied: 'bg-green-500',
                needs_review: 'bg-yellow-500',
                no_match: 'bg-gray-400',
              }[result.status];

              return (
                <Card key={index} variant="elevated" hover className="animate-fade-in">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* Image Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-xl overflow-hidden shadow-md relative bg-gray-100">
                          {img.preview && (
                            <Image
                              src={img.preview}
                              alt="Result"
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="flex-1 space-y-4">
                        {/* Header with Status */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {result.dispatch?.customer_name || 'Match Found'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Tracking: <span className="font-mono font-semibold text-blue-600">{result.extraction.tracking_id || 'N/A'}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-3 h-3 rounded-full ${statusColor}`} />
                            <Badge variant={result.status === 'auto_applied' ? 'success' : result.status === 'needs_review' ? 'warning' : 'default'}>
                              {result.status === 'auto_applied' ? '✓ Applied' : result.status === 'needs_review' ? '⚠ Review' : 'No Match'}
                            </Badge>
                          </div>
                        </div>

                        {/* Data Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Extracted Amount</p>
                            <p className="text-base font-bold text-gray-900">{formatCurrency(result.extraction.amount || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Confidence</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${confidenceColor}`}>
                              {result.match_confidence.toUpperCase()}
                            </span>
                          </div>
                          {result.dispatch?.id && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Order ID</p>
                              <p className="text-base font-semibold text-gray-900">#{result.dispatch.id}</p>
                            </div>
                          )}
                          {result.dispatch?.amount !== undefined && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Expected Amount</p>
                              <p className="text-base font-semibold text-gray-900">{formatCurrency(Number(result.dispatch.amount))}</p>
                            </div>
                          )}
                        </div>

                        {/* Match Details */}
                        {result.message && (
                          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <p className="font-medium text-blue-900 mb-1">Match Details:</p>
                            <p>{result.message}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {result.status === 'needs_review' && (
                          <div className="flex items-center gap-3 pt-2">
                            <input
                              type="checkbox"
                              id={`select-${index}`}
                              checked={selectedMatches.has(index)}
                              onChange={() => toggleSelectMatch(index)}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor={`select-${index}`} className="text-sm text-gray-600 flex-1 cursor-pointer">
                              Select for bulk confirmation
                            </label>
                            <Button
                              onClick={() => handleConfirmMatch(index)}
                              variant="success"
                              size="sm"
                            >
                              ✓ Confirm Payment
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <Card variant="bordered" className="mt-8 animate-fade-in">
          <CardContent className="py-6">
            <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span>
              How it works
            </h4>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside ml-4">
              <li>Upload one or more images of handwritten Post Office reports</li>
              <li>Click &quot;Process All&quot; to extract data from all images</li>
              <li>OCR extracts tracking IDs (EZ/JO prefix) and amounts from each image</li>
              <li>System matches tracking IDs with dispatches in database</li>
              <li>High confidence matches with matching amounts are applied automatically</li>
              <li>Review and confirm medium/low confidence matches manually</li>
              <li>Use &quot;Confirm All High Confidence&quot; for bulk approval</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
