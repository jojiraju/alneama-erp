import React, { useState, useEffect } from 'react';
import { Folder, FileText, Upload, Save, CheckCircle } from 'lucide-react';

// Use the Vercel Environment variable or localhost for dev
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [view, setView] = useState('All');
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [metadata, setMetadata] = useState([]);

  // Fetch Documents
  useEffect(() => {
    fetch(`${API_URL}/documents?view=${view}`)
      .then(res => res.json())
      .then(data => setDocs(data))
      .catch(err => console.log("Backend not connected yet"));
  }, [view]);

  // Fetch Metadata
  useEffect(() => {
    if (selectedDoc) {
      fetch(`${API_URL}/documents/${selectedDoc.id}/properties`)
        .then(res => res.json())
        .then(data => setMetadata(data));
    }
  }, [selectedDoc]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800">

      {/* 1. LEFT SIDEBAR (Views) */}
      <div className="w-64 bg-slate-900 text-white p-4 flex flex-col">
        <h1 className="text-xl font-bold mb-8 text-blue-400">ALNEAMA VAULT</h1>
        <div className="space-y-1">
          <SidebarItem label="All Documents" active={view === 'All'} onClick={() => setView('All')} />
          <div className="pt-4 pb-2 text-xs font-bold text-gray-500 uppercase">By Class</div>
          <SidebarItem label="Invoices" active={view === 'Invoice'} onClick={() => setView('Invoice')} />
          <SidebarItem label="Contracts" active={view === 'Contract'} onClick={() => setView('Contract')} />
        </div>
      </div>

      {/* 2. MIDDLE PANE (File Grid) */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{view === 'All' ? 'All Documents' : view}</h2>
        <div className="grid grid-cols-3 gap-4">
          {docs.length === 0 && <p className="text-gray-400 col-span-3">No documents found. Upload one!</p>}
          {docs.map(doc => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`p-4 border rounded-lg cursor-pointer bg-white hover:shadow-md transition
                ${selectedDoc?.id === doc.id ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex justify-center text-blue-300 mb-2"><FileText size={40} /></div>
              <div className="text-center font-medium truncate">{doc.filename}</div>
              <div className="text-center text-xs text-gray-400 mt-1">{doc.state}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. RIGHT PANE (Metadata Card) */}
      {selectedDoc ? (
        <div className="w-80 bg-white border-l shadow-xl p-6 flex flex-col">
          <h3 className="text-lg font-bold mb-4 border-b pb-2">Metadata Card</h3>

          <div className="space-y-4 flex-1">
            <MetaField label="Class" value="Invoice" />
            <MetaField label="Customer" value="Alneama Corp" />
            <MetaField label="Date" value="2026-01-13" />
          </div>

          <div className="mt-auto pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">State</span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">{selectedDoc.state}</span>
            </div>
            <button className="w-full bg-blue-600 text-white py-2 rounded flex justify-center gap-2 hover:bg-blue-700">
              <Save size={18} /> Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="w-80 bg-gray-50 border-l flex items-center justify-center text-gray-400 text-sm">
          Select a document to view metadata
        </div>
      )}
    </div>
  );
}

function SidebarItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition
      ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-800'}`}
    >
      <Folder size={16} /> {label}
    </button>
  );
}

function MetaField({ label, value }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
      <input className="w-full border p-2 rounded text-sm" defaultValue={value} />
    </div>
  );
}