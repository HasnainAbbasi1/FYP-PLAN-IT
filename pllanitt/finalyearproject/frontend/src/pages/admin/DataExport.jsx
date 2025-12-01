import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Download, Database } from 'lucide-react';

const DataExport = () => {
  const [selectedTables, setSelectedTables] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');

  const tables = [
    { name: 'users', records: 150, size: '2.4 MB' },
    { name: 'projects', records: 324, size: '8.7 MB' },
    { name: 'polygons', records: 1289, size: '45.3 MB' },
    { name: 'terrain_analysis', records: 567, size: '78.9 MB' },
    { name: 'zoning_results', records: 892, size: '34.2 MB' }
  ];

  const handleExport = () => {
    if (selectedTables.length === 0) {
      alert('Please select at least one table to export');
      return;
    }
    alert(`Exporting ${selectedTables.length} table(s) as ${exportFormat.toUpperCase()}`);
  };

  const toggleTable = (tableName) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 m-0">Data Export</h1>
            <p className="text-base text-slate-500 mt-1">Export database tables and reports</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                Select Tables to Export
              </CardTitle>
              <CardDescription>Choose which tables to include in the export</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tables.map((table) => (
                  <div
                    key={table.name}
                    style={{
                      padding: '1rem',
                      background: selectedTables.includes(table.name) ? '#eff6ff' : '#f8fafc',
                      border: `2px solid ${selectedTables.includes(table.name) ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => toggleTable(table.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                          {table.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {table.records.toLocaleString()} records · {table.size}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.name)}
                        onChange={() => {}}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Export Configuration
              </CardTitle>
              <CardDescription>Configure export settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="csv">CSV (Comma Separated Values)</option>
                    <option value="json">JSON (JavaScript Object Notation)</option>
                    <option value="excel">Excel (XLSX)</option>
                    <option value="sql">SQL (Database Dump)</option>
                  </select>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                    Export Summary
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    <p>Selected Tables: <strong>{selectedTables.length}</strong></p>
                    <p>Format: <strong>{exportFormat.toUpperCase()}</strong></p>
                  </div>
                </div>

                <button 
                  onClick={handleExport}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-base hover:-translate-y-px hover:shadow-lg transition-all duration-200" 
                  style={{ width: '100%' }}
                  disabled={selectedTables.length === 0}
                >
                  <Download size={18} />
                  Export Data
                </button>

                <div style={{ padding: '1rem', background: '#fffbeb', borderRadius: '0.5rem', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                    <strong>Note:</strong> Large exports may take several minutes. You'll receive a download link once the export is complete.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Exports</CardTitle>
            <CardDescription>Download previously exported data</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <Upload size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No previous exports available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DataExport;

