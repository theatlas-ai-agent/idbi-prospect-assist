import React, { useCallback } from 'react';

type Props = {
  onUpload: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
};

export function BankStatementUpload({ onUpload, accept = '.pdf,.csv', maxSizeMB = 10 }: Props) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.size <= maxSizeMB * 1024 * 1024) onUpload(file);
  }, [onUpload, maxSizeMB]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }, [onUpload]);

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        id="bank-statement-upload"
      />
      <label htmlFor="bank-statement-upload" className="cursor-pointer">
        <p className="text-gray-600">Drop PDF/CSV bank statement here, or click to browse</p>
        <p className="text-sm text-gray-400 mt-1">Max {maxSizeMB}MB</p>
      </label>
    </div>
  );
}
