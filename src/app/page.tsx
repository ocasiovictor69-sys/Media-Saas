import Link from "next/link";

export default function FLO_MEDIALanding() {
  const features = [
    {
      title: "AI Avatar Videos",
      description: "HeyGen-powered avatar generation with lip-sync, 140+ languages, and SSML delivery control for consistent brand voice.",
      stat: "AI",
    },
    {
      title: "Programmatic Motion Graphics",
      description: "Remotion-based data visualization and animated infographics built from React components for scalable content.",
      stat: "Code",
    },
    {
      title: "Professional Videography",
      description: "High-production-value live footage, event coverage, and B-roll captured by Flo-Genius for premium content.",
      stat: "Pro",
    },
    {
      title: "Multi-Platform Distribution",
      description: "Automated scheduling and distribution across YouTube, Instagram, LinkedIn, TikTok, and Twitter via Buffer.",
      stat: "5x",
    },
  ];

  const pipelineStages = [
    { stage: "Script", tool: "Human/AI", output: "SSML-enhanced script" },
    { stage: "Avatar", tool: "HeyGen API", output: "Lip-sync video" },
    { stage: "Motion", tool: "Remotion", output: "Animated overlays" },
    { stage: "Process", tool: "FFmpeg", output: "Normalized output" },
    { stage: "Edit", tool: "Video Editor", output: "Platform exports" },
    { stage: "Distribute", tool: "Buffer", output: "Social posts" },
  ];

  const platforms = [
    { name: "YouTube", format: "16:9 HD", type: "Long-form" },
    { name: "Instagram", format: "9:16 Reels", type: "Short-form" },
    { name: "LinkedIn", format: "16:9 Professional", type: "B2B" },
    { name: "TikTok", format: "9:16 Vertical", type: "Viral" },
    { name: "Twitter/X", format: "16:9 + 1:1", type: "News" },
  ];

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <p className="text-sm font-bold text-brand-purple uppercase tracking-[0.3em] mb-4">
          FLO_MEDIA Visibility Engine
        </p>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-8 text-black">
          Manufacture Your{" "}
          <span className="text-brand-purple">Brand Visibility</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12">
          AI-powered video production + professional videography + automated distribution. 
          Scale your content output without linear headcount growth.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/signup" 
            className="px-8 py-4 rounded-full bg-brand-purple text-white font-semibold transition-all hover:scale-105 shadow-lg"
          >
            Start Producing
          </Link>
          <Link 
            href="/login" 
            className="px-8 py-4 rounded-full border border-slate-200 hover:bg-slate-50 transition-all text-black font-semibold"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Production Pipeline */}
      <section className="w-full bg-slate-50 py-24 border-y border-slate-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black">
              6-Stage Production Pipeline
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From script to distribution—automated, tracked, and scalable.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {pipelineStages.map((stage, idx) => (
              <div key={stage.stage} className="glass-card text-center p-4">
                <div className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center mx-auto mb-3 font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="text-lg font-bold text-black mb-1">{stage.stage}</div>
                <div className="text-sm text-brand-purple font-semibold mb-1">{stage.tool}</div>
                <div className="text-xs text-slate-500">{stage.output}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black">
            AI + Human Hybrid Production
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Combine the scale of AI with the quality of professional videography.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="glass-card flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-brand-purple">{feature.stat}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-black">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Distribution */}
      <section className="w-full bg-slate-50 py-24 border-y border-slate-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black">
              Multi-Platform Distribution
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              One production, multiple formats, all major platforms. Automated scheduling via Buffer.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {platforms.map((platform) => (
              <div key={platform.name} className="glass-card text-center">
                <div className="text-lg font-bold text-black mb-1">{platform.name}</div>
                <div className="text-sm text-brand-purple font-semibold">{platform.format}</div>
                <div className="text-xs text-slate-500 mt-1">{platform.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Media + AI Hybrid */}
      <section className="container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-black">
              Live Media + AI Integration
            </h2>
            <p className="text-lg text-slate-600 mb-6">
              FLO_MEDIA combines professional live videography with AI-generated content 
              for a complete visibility solution.
            </p>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-purple" />
                Live event coverage and B-roll capture
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-purple" />
                AI avatar narration for explainer content
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-purple" />
                Real-time highlight clipping and distribution
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-purple" />
                Hybrid workflows: Live footage + AI graphics
              </li>
            </ul>
          </div>
          <div className="glass-card p-8">
            <h3 className="text-xl font-semibold mb-4 text-black">Content Production Tiers</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <div>
                  <div className="font-semibold text-black">Essential</div>
                  <div className="text-sm text-slate-500">AI avatar only</div>
                </div>
                <div className="text-brand-purple font-bold">Scale</div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <div>
                  <div className="font-semibold text-black">Professional</div>
                  <div className="text-sm text-slate-500">AI + 2 hrs/quarter human</div>
                </div>
                <div className="text-brand-purple font-bold">Hybrid</div>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <div className="font-semibold text-black">Enterprise</div>
                  <div className="text-sm text-slate-500">Dedicated videographer</div>
                </div>
                <div className="text-brand-purple font-bold">Premium</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="w-full bg-slate-50 py-24 border-y border-slate-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center max-w-4xl mx-auto">
            <div>
              <div className="text-5xl font-bold mb-2 text-black">6-Stage</div>
              <div className="text-slate-500 uppercase tracking-widest text-sm font-semibold">Pipeline</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-black">5</div>
              <div className="text-slate-500 uppercase tracking-widest text-sm font-semibold">Platforms</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-black">24/7</div>
              <div className="text-slate-500 uppercase tracking-widest text-sm font-semibold">Production</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-white py-24 border-t border-slate-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black">
            Scale Your Content Output
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            FLO_MEDIA handles the 90% of production and distribution, 
            so you can focus on the 10% that matters: <span className="font-semibold">Strategy</span>.
          </p>
          <Link 
            href="/signup" 
            className="px-8 py-4 rounded-full bg-brand-purple text-white font-semibold transition-all hover:scale-105 shadow-lg inline-block"
          >
            Start Producing
          </Link>
          <p className="text-sm text-slate-500 mt-6">
            14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xl font-bold text-black">
            TOMORROW<span className="text-brand-purple">NOW</span> AI
          </span>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="https://tomorrownowai.com" className="hover:text-black transition-colors">Website</Link>
            <Link href="/login" className="hover:text-black transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-black transition-colors">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
