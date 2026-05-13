import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />
      <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl w-full text-center space-y-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-gray-300">
          <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
          Flow Media Production v2.0
        </div>

        <h1 className="text-7xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
          AI Video <br />
          <span className="text-purple-400">Reimagined</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Create studio-grade video assets in seconds. Powered by Higgsfield AI, HeyGen avatars, and professional orchestration.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <button className="px-10 py-5 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-purple-500/20 active:scale-95">
            Start Creating
          </button>
          <button className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-lg backdrop-blur-xl transition-all active:scale-95">
            View Gallery
          </button>
        </div>

        {/* Dynamic Preview Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-video bg-white/5 rounded-xl border border-white/10 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
