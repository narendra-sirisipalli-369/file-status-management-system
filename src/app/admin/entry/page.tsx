"use client";

import React, { useState } from 'react';
import QRCode from 'react-qr-code';

export default function FileEntryPage() {
  const [formData, setFormData] = useState({
    description: '',
    proposalValue: '',
    head: '',
    department: '',
    typeProcessing: '',
  });
  
  const [generatedRef, setGeneratedRef] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          proposalValue: parseFloat(formData.proposalValue),
          head: formData.head,
          department: formData.department,
          typeProcessing: formData.typeProcessing
        })
      });

      if (res.ok) {
        const result = await res.json();
        setGeneratedRef(result.data.smsRefNo);
      } else {
        alert("Submission Failed");
      }
    } catch(err) {
      alert("Network Error");
    }
  };

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '2rem', borderRadius: '8px' }}>
        <h1>File Entry Module - Inward</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Enter File Metadata</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Description of Requirement</label>
              <input type="text" className="input-field" required onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Proposal Value (INR)</label>
              <input type="number" className="input-field" required onChange={e => setFormData({...formData, proposalValue: e.target.value})} />
            </div>
            <div className="input-group">
              <label>File Type / Head</label>
              <input type="text" className="input-field" required onChange={e => setFormData({...formData, head: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Department</label>
              <input type="text" className="input-field" required onChange={e => setFormData({...formData, department: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Type of Processing</label>
              <select className="input-field" required onChange={e => setFormData({...formData, typeProcessing: e.target.value})}>
                <option value="">Select...</option>
                <option value="GEM">GEM Portal</option>
                <option value="Manual">Manual Tender</option>
              </select>
            </div>
            <button type="submit" className="btn" style={{ marginTop: '1rem', width: '100%' }}>Create File Record</button>
          </form>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {generatedRef ? (
            <>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--success)' }}>Record Created Successfully</h2>
              <p style={{ marginBottom: '2rem' }}>Ref No: <strong>{generatedRef}</strong></p>
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
                <QRCode value={generatedRef} size={200} />
              </div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Scan this QR to attach to physical file</p>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>QR Code will appear here after creation</p>
          )}
        </div>
      </div>
    </div>
  );
}
