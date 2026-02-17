import React, { useState } from 'react';
import { Upload, Check } from 'lucide-react';

const CreateChallenge = () => {
  const [formData, setFormData] = useState({
    title: '',
    pointValue: 500,
    difficulty: 'Easy',
    description: '',
    flagHash: ''
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handlePreview = () => {
    console.log('Preview challenge:', formData);
  };

  const handleDeploy = () => {
    console.log('Deploy challenge:', formData, uploadedFiles);
  };

  return (
    <div className="p-10 min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-slate-400">
        <span className="hover:text-cyan-500 cursor-pointer transition-colors">Admin</span>
        <span className="mx-2">{'>'}</span>
        <span className="hover:text-cyan-500 cursor-pointer transition-colors">Challenges</span>
        <span className="mx-2">{'>'}</span>
        <span className="text-slate-200">Create New Challenge</span>
      </div>

      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          Create New Challenge
        </h1>
        <p className="text-slate-400 text-lg">
          Design and deploy a forensic artifact challenge for the CTF participants.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="max-w-5xl">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-8 shadow-2xl">
          <div className="space-y-8">
            {/* Challenge Title */}
            <div>
              <label className="block text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
                Challenge Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. The Hidden Registry Key"
                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>

            {/* Point Value + Difficulty Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Point Value */}
              <div>
                <label className="block text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
                  Point Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="pointValue"
                    value={formData.pointValue}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pointValue: prev.pointValue + 50 }))}
                      className="text-slate-500 hover:text-cyan-500 transition-colors text-xs"
                    >
                      ▲
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pointValue: Math.max(0, prev.pointValue - 50) }))}
                      className="text-slate-500 hover:text-cyan-500 transition-colors text-xs"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              {/* Difficulty Level */}
              <div>
                <label className="block text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
                  Difficulty Level
                </label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1.25rem'
                  }}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                placeholder="Provide the challenge context, story, and hints here..."
                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
                File Upload (Artifacts)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/30'
                }`}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pcap,.E01,.mem,.zip"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-white text-lg mb-1">
                      Drag and drop forensic files or{' '}
                      <span className="text-blue-500 font-medium">browse</span>
                    </p>
                    <p className="text-slate-500 text-sm">
                      Supports .pcap, .E01, .mem, .zip (Max 500MB)
                    </p>
                  </div>
                </div>

                {/* Uploaded Files Display */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 bg-slate-900/50 border border-slate-800/50 rounded-lg px-4 py-2"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-slate-300 text-sm flex-1 text-left">
                          {file.name}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Flag Hash / Value */}
            <div>
              <label className="block text-xs font-semibold text-blue-500 uppercase tracking-wider mb-3">
                Flag Hash / Value
              </label>
              <input
                type="text"
                name="flagHash"
                value={formData.flagHash}
                onChange={handleInputChange}
                placeholder="TTT{flag_format_here}"
                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-mono"
              />
              <p className="mt-2 text-xs text-slate-500">
                Participants must find and submit this exact string to earn points.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 mt-10 pt-8 border-t border-slate-800/50">
            <button
              type="button"
              onClick={handlePreview}
              className="px-6 py-3 bg-transparent border border-slate-700 text-slate-300 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-all duration-200 font-medium"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleDeploy}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all duration-200 font-medium shadow-lg shadow-green-900/30 hover:shadow-green-800/40"
            >
              🚀 Deploy Challenge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChallenge;
