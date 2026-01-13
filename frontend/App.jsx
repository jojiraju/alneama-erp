import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Folder, FileText, CheckCircle, Clock, Upload, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
    const [view, setView] = useState('All');
    const [docs, setDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [metadata, setMetadata] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch Documents when View changes
    useEffect(() => {
        axios.get(`${API_URL}/documents?view=${view}`)
            .then(res => setDocs(res.data))
            .catch(err => console.error(err));
    }, [view, refreshKey]);

    // Fetch Metadata when a Document is clicked
    useEffect(() => {
        if (selectedDoc) {
            axios.get(`${API_URL}/documents/${selectedDoc.id}/properties`)
                .then(res => setMetadata(res.data));
        }
    }, [selectedDoc]);

    // Handle File Upload
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        await axios.post(`${API_URL}/upload/`, formData);
        setRefreshKey(old => old + 1); // Refresh list
    };

    // Update Metadata Field
    const updateMeta = async (key, value) => {
        // Optimistic UI update
        setMetadata(prev => {
            const existing = prev.find(p => p.key === key);
            if (existing) return prev.map(p => p.key === key ? { ...p, value } : p);
            return [...prev, { key, value }];
        });

        await axios.post(`${API_URL}/documents/${selectedDoc.id}/properties`, { key, value });
    };

    // Workflow Transition
    const setWorkflowState = async (newState) => {
        await axios.post(`${API_URL}/documents/${selectedDoc.id}/workflow`, { new_state: newState });
        setSelectedDoc({ ...selectedDoc, state: newState });
        setRefreshKey(old => old + 1);
    };

    return (
        <div className="flex h-screen bg-gray-50 text-slate-800 font-sans">

            {/* LEFT SIDEBAR: Virtual Views */}
            <div className="w-64 bg-slate-900 text-white flex flex-col p-4">
                <div className="text-xl font-bold mb-8 text-blue-400">ALNEAMA Vault</div>

                <div className="space-y-1">
                    <ViewButton label="All Documents" active={view === 'All'} onClick={() => setView('All')} />
                    <div className="pt-4 pb-2 text-xs font-bold text-gray-500 uppercase">By Class</div>
                    <ViewButton label="Invoices" active={view === 'Invoice'} onClick={() => setView('Invoice')} />
                    <ViewButton label="Contracts" active={view === 'Contract'} onClick={() => setView('Contract')} />
                    <ViewButton label="Proposals" active={view === 'Proposal'} onClick={() => setView('Proposal')} />
                </div>

                <div className="mt-auto">
                    <label className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded cursor-pointer transition">
                        <Upload size={18} /> Upload File
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            </div>

            {/* MIDDLE: File Grid */}
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    {view === 'All' ? 'All Documents' : view}
                    <span className="text-sm font-normal text-gray-400 bg-white px-2 py-1 rounded border shadow-sm">
                        {docs.length} objects
                    </span>
                </h1>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {docs.map(doc => (
                        <div
                            key={doc.id}
                            onClick={() => setSelectedDoc(doc)}
                            className={`p-4 bg-white border rounded-lg cursor-pointer hover:shadow-lg transition relative
                ${selectedDoc?.id === doc.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'}
              `}
                        >
                            <div className="h-24 bg-gray-50 rounded mb-3 flex items-center justify-center text-blue-300">
                                <FileText size={48} />
                            </div>
                            <div className="font-medium truncate">{doc.filename}</div>
                            <div className="flex justify-between items-center mt-2">
                                <Badge state={doc.state} />
                                <span className="text-xs text-gray-400">#{doc.id}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Metadata Card */}
            {selectedDoc && (
                <div className="w-96 bg-white border-l shadow-xl flex flex-col h-full">
                    {/* Workflow Header */}
                    <div className="p-6 bg-slate-50 border-b">
                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">Workflow State</div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">{selectedDoc.state}</h2>
                            <div className="flex gap-1">
                                {selectedDoc.state === 'Draft' && (
                                    <button onClick={() => setWorkflowState('Review')} className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">Submit</button>
                                )}
                                {selectedDoc.state === 'Review' && (
                                    <button onClick={() => setWorkflowState('Approved')} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Approve</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Properties Form */}
                    <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                        <PropertyField
                            label="Document Class"
                            value={metadata.find(m => m.key === 'Class')?.value || 'Unclassified'}
                            onChange={(v) => updateMeta('Class', v)}
                            options={['Unclassified', 'Invoice', 'Contract', 'Proposal']}
                        />

                        <PropertyField
                            label="Customer Name"
                            value={metadata.find(m => m.key === 'Customer')?.value || ''}
                            onChange={(v) => updateMeta('Customer', v)}
                            type="text"
                        />

                        <PropertyField
                            label="Expiry Date"
                            value={metadata.find(m => m.key === 'Expiry')?.value || ''}
                            onChange={(v) => updateMeta('Expiry', v)}
                            type="date"
                        />
                    </div>

                    <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-400">
                        ALNEAMA ERP • ID: {selectedDoc.id}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Helper Components ---

function ViewButton({ label, active, onClick }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-3 w-full px-3 py-2 rounded text-sm transition
      ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
            <Folder size={16} /> {label}
        </button>
    );
}

function Badge({ state }) {
    const colors = {
        'Draft': 'bg-gray-100 text-gray-600',
        'Review': 'bg-yellow-100 text-yellow-700',
        'Approved': 'bg-green-100 text-green-700'
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[state] || colors['Draft']}`}>{state}</span>;
}

function PropertyField({ label, value, onChange, options, type = "text" }) {
    return (
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
            {options ? (
                <select
                    className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options.map(opt => <option key={opt}>{opt}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
}