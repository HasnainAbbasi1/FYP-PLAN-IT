import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { importProjectsFromCSV, importProjectsFromJSON } from '@/utils/dataImport';

const CSVImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      if (fileExtension === 'csv' || fileExtension === 'json') {
        setFile(selectedFile);
        setError(null);
        setImportResult(null);
      } else {
        setError('Please select a CSV or JSON file');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      const fileExtension = file.name.split('.').pop().toLowerCase();
      let result;

      if (fileExtension === 'csv') {
        result = await importProjectsFromCSV(file);
      } else if (fileExtension === 'json') {
        result = await importProjectsFromJSON(file);
      } else {
        throw new Error('Unsupported file format');
      }

      if (result.success) {
        setImportResult(result);
      } else {
        setError(result.error || 'Failed to import file');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (importResult && importResult.valid.length > 0 && onImport) {
      await onImport(importResult.valid.map(item => item.data));
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setError(null);
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Projects</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import multiple projects at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-5">
          {!importResult ? (
            <>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="absolute w-px h-px opacity-0 overflow-hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="flex flex-col items-center justify-center py-10 px-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer transition-all duration-200 bg-slate-50 dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700">
                  <Upload className="w-12 h-12 text-slate-500 dark:text-slate-400 mb-3" />
                  <div>
                    <p className="text-base font-medium text-slate-800 dark:text-slate-200 mb-1">
                      {file ? file.name : 'Click to select CSV or JSON file'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Supported formats: CSV, JSON
                    </p>
                  </div>
                </label>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                  <FileText className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={!file || importing}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Process File
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800 border-l-4 border-green-500">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Valid Projects</p>
                      <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 m-0">{importResult.valid.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800 border-l-4 border-red-500">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Invalid Rows</p>
                      <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 m-0">{importResult.invalid.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800 border-l-4 border-blue-500">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Total Rows</p>
                      <p className="text-xl font-semibold text-slate-800 dark:text-slate-200 m-0">{importResult.total}</p>
                    </div>
                  </div>
                </div>

                {importResult.invalid.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Validation Errors</AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-col gap-2 mt-2">
                        {importResult.invalid.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive">Row {item.rowNumber}</Badge>
                            <span>{item.errors.join(', ')}</span>
                          </div>
                        ))}
                        {importResult.invalid.length > 5 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">
                            ... and {importResult.invalid.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {importResult.valid.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">Preview of projects to import:</p>
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                      {importResult.valid.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{item.data.title || `Project ${index + 1}`}</span>
                          {item.warnings.length > 0 && (
                            <Badge variant="outline" className="ml-auto text-[11px]">
                              {item.warnings.length} warning(s)
                            </Badge>
                          )}
                        </div>
                      ))}
                      {importResult.valid.length > 5 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center mt-1">
                          ... and {importResult.valid.length - 5} more projects
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {importResult.valid.length > 0 ? (
                  <Button onClick={handleConfirmImport}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Import {importResult.valid.length} Project(s)
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setImportResult(null)}>
                    <X className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportModal;

