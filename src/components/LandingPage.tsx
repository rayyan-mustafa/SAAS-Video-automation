'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function LandingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [heroPrompt, setHeroPrompt] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'facebook'>('youtube');

  const handleHeroGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = heroPrompt.trim() || 'A 45-second high-retention documentary about the Mariana Trench in 9:16';
    router.push(`/content/new?prompt=${encodeURIComponent(prompt)}`);
  };

  const handleQuickChipClick = (starter: string) => {
    setHeroPrompt(starter);
  };

  const faqs = [
    {
      q: 'How does the 300 Free Trial Credits & 1 Free Social Publish work?',
      a: 'When you create an account, you instantly receive 300 credits valid for 15 days. You can test our full conversational agent, generate scripts, and preview videos. In addition, you get 1 free, 100% watermark-free direct social publish to your YouTube Shorts or TikTok account so you can see live views on your own channel before paying a dime.',
    },
    {
      q: 'How does Multi-Platform Auto-Publishing work across 4 platforms?',
      a: 'Tillercast connects directly to official APIs: YouTube Data API v3, TikTok Direct Post API v2, Instagram Reels Graph API, and Facebook Pages API. Once you approve a video, Tillercast publishes directly with platform-compliant safe-zones (no UI button cutoff), AI synthetic media disclosure tags, and viral hashtags.',
    },
    {
      q: 'What is the Zero-Waste Instant Auto-Refund guarantee?',
      a: 'Unlike other video platforms that charge credits for failed or glitched videos, Tillercast has a fail-closed refund engine. If a render ever encounters a network timeout or provider glitch, 100% of consumed credits are refunded to your wallet instantly and automatically.',
    },
    {
      q: 'What voices are included across the plans?',
      a: 'All plans (including Free Trial and Starter) include Google Cloud Neural2 multi-accent studio narrators in American (US), British (UK), Australian (AU), and Indian (IN) English. The Creator and Pro plans unlock hyper-realistic ElevenLabs narrators (Adam, Brian, Chris, Rachel) and custom voice cloning.',
    },
    {
      q: 'Can I purchase extra credit packs if I run out?',
      a: 'Yes! Active subscribers can top up with 4 flexible extra credit packs starting at $9.99 for 200 credits up to 5,000 credits for $129.99 with up to 48% volume savings. Extra credits stack on top of your plan and remain valid for up to 365 days.',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(100%_100%_at_50%_0%,#F5F3FF_0%,#FAF7FF_40%,#FFFFFF_100%)] text-slate-900 font-sans antialiased overflow-x-hidden selection:bg-purple-100 selection:text-purple-900">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NOTIFICATION BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 text-white text-xs font-semibold py-2 px-4 text-center shadow-inner flex items-center justify-center gap-2">
        <span>⚡</span>
        <span>
          <strong>AUTONOMOUS AI VIDEO AGENT v3.0:</strong> Try the conversational studio with 300 free trial credits + 1 watermark-free social publish!
        </span>
        <Link
          href="/content/new"
          className="underline font-bold hover:text-purple-200 ml-1"
        >
          Try Live Demo →
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. LIGHT-MODERN NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-purple-100/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-200 font-black text-sm">
              ⚡
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Tiller<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">cast</span>
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
              v3.0 Agentic
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-purple-50/50 p-1 rounded-full border border-purple-100/80 text-xs font-semibold text-slate-600">
            <a href="#features" className="px-4 py-1.5 rounded-full hover:text-purple-700 hover:bg-white transition-all">
              Features
            </a>
            <a href="#showcase" className="px-4 py-1.5 rounded-full hover:text-purple-700 hover:bg-white transition-all">
              Showcase
            </a>
            <a href="#comparison" className="px-4 py-1.5 rounded-full hover:text-purple-700 hover:bg-white transition-all">
              Compare
            </a>
            <a href="#pricing" className="px-4 py-1.5 rounded-full hover:text-purple-700 hover:bg-white transition-all">
              Pricing
            </a>
            <Link href="/blog" className="px-4 py-1.5 rounded-full hover:text-purple-700 hover:bg-white transition-all text-purple-600 font-bold">
              Blog
            </Link>
          </nav>

          {/* Auth Controls */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-block text-xs font-bold text-slate-600 hover:text-purple-700 px-3 py-1.5"
            >
              Log In
            </Link>
            <Link
              href="/content/new"
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span> 300 Free Credits
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. HERO SECTION WITH INTERACTIVE PROMPT BOX (CRO BLUEPRINT)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        {/* Soft Violet Radial Backdrop Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-300/20 blur-[90px] rounded-full pointer-events-none -z-10" />

        {/* Hero Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
          <span>AUTONOMOUS AI VIDEO CREATION & SOCIAL PUBLISHING</span>
        </div>

        {/* Razor-Sharp Value Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 max-w-4xl mx-auto leading-[1.08]">
          Turn Simple Prompts Into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500">
            Viral Videos.
          </span>
          <br className="hidden sm:inline" /> Published Across 4 Platforms While You Sleep.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The conversational AI agent that researches viral hooks, drafts the script, narrates in human studio voices, and automatically publishes to <strong>YouTube, TikTok, Instagram & Facebook</strong> with zero manual editing.
        </p>

        {/* ─────────────────────────────────────────────────────────────
            INTERACTIVE HERO PROMPT BOX (Converts Visitors in 60s)
        ───────────────────────────────────────────────────────────── */}
        <div className="mt-8 max-w-3xl mx-auto">
          <form
            onSubmit={handleHeroGenerate}
            className="p-3 bg-white rounded-3xl border border-purple-100 shadow-xl shadow-purple-900/5 focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-100/50 transition-all text-left"
          >
            <div className="p-3">
              <label htmlFor="hero-prompt-input" className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1 mb-1">
                <span>✨</span> Try it live: Describe any video topic...
              </label>
              <textarea
                id="hero-prompt-input"
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                placeholder='e.g. "A 45-second high-retention documentary about the Mariana Trench in 9:16 with suspenseful pacing and dramatic visuals..."'
                rows={2}
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 outline-none resize-none font-medium leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-50 px-3 pb-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[11px]">
                  9:16 Vertical
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  Google Neural2 Voice
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                  Stock + Flash Motion
                </span>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>⚡</span> Generate Free Video Preview
              </button>
            </div>
          </form>

          {/* Quick Start Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Quick start:</span>
            {[
              { label: '📝 Script to Video', text: 'Turn this script into a 45-second high-retention video: ' },
              { label: '🔥 Mystery Documentary', text: 'Create a 45-second dramatic documentary on black holes' },
              { label: '🧠 Tech Explainer', text: 'Create a 60-second crisp educational explainer on how AI works' },
              { label: '🕵️ Viral Outlier Spy', text: 'Adapt a viral competitor hook about ' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQuickChipClick(chip.text)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-purple-100 shadow-sm transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Trust Guarantees */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500 font-bold">★ 4.9/5</span> Rating
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-600 font-bold">💳</span> No Credit Card Required
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">🛡️</span> 100% Zero-Waste Auto-Refund
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-pink-600 font-bold">🚀</span> 1 Free Social Publish
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. DUAL-PANE LIVE SHOWCASE: AGENT CHAT vs KINETIC VIDEO
      ───────────────────────────────────────────────────────────── */}
      <section id="showcase" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            Interactive Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            The Conversational Agentic Workflow
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Say goodbye to clunky, complicated timeline editors. Just chat, review your script, and let our autonomous pipeline publish.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-purple-100 shadow-xl p-6 sm:p-8">
          {/* Left: Chat Simulation */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-purple-50">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                🤖
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Tillercast Agent</div>
                <div className="text-[10px] text-emerald-600 font-semibold">● Active Session</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-purple-50/70 p-3 rounded-2xl rounded-bl-none text-slate-800 border border-purple-100">
                What topic or story angle are you exploring today?
              </div>
              <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-br-none ml-auto max-w-[85%]">
                A 45-second high-retention documentary about the Mariana Trench in vertical 9:16
              </div>
              <div className="bg-purple-50/70 p-3 rounded-2xl rounded-bl-none text-slate-800 border border-purple-100 space-y-2">
                <div>Got it! What tone and voiceover would you like?</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 font-semibold text-[11px]">
                    🔥 Dramatic & Mysterious
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 font-semibold text-[11px]">
                    🇬🇧 British Studio (Ryan Neural)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 font-semibold text-[11px]">
                    ⚡ Decide for me
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-3 rounded-2xl text-[11px] font-semibold shadow-md">
                🎉 I've drafted a 7-scene script for "The Abyssal Void" (~42s)! Review scene by scene on the right or type to refine any detail.
              </div>
            </div>
          </div>

          {/* Right: Embedded Vertical Preview Theater */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950 p-6 rounded-2xl text-white shadow-2xl relative overflow-hidden aspect-[9/16] max-h-[500px]">
            <div className="w-full h-full flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded bg-white/20">Scene 1 · The Hook</span>
                <span className="text-purple-300">Fast push-in</span>
              </div>

              <div className="text-center space-y-2">
                <div className="text-4xl">🌊</div>
                <div className="text-xs font-bold text-purple-200">[STOCK B-ROLL · 1 CREDIT]</div>
                <p className="text-[11px] text-slate-300 italic px-4">
                  "At 36,000 feet below the surface, the water pressure is enough to crush a nuclear submarine like a soda can..."
                </p>
              </div>

              <div className="text-center">
                <div className="inline-block bg-black/80 px-3 py-1 rounded-lg border border-white/20 text-yellow-300 font-black text-xs">
                  CRUSH A NUCLEAR SUBMARINE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. BENTO GRID: OUR 3 CORE COMPETITIVE ADVANTAGES
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            Why Creators Choose Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Engineered For True Autopilot Channels
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 4-Platform Direct Auto-Publish */}
          <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md">
              🚀
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              4-Platform Autopilot
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Don’t waste 45 minutes downloading MP4s and re-typing tags on 4 apps. Tillercast publishes directly to <strong>YouTube, TikTok, Instagram Reels & Facebook Reels</strong> with safe-zones and automated AI disclosure tags.
            </p>
          </div>

          {/* Card 2: Viral Outlier Spy */}
          <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-md">
              🕵️
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Competitor Outlier Spy
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Never stare at a blank prompt box. Our radar tracks top competitor channels in your niche, identifies breakout videos gaining 5x–10x their normal views, and adapts their winning hook formula with 1 click.
            </p>
          </div>

          {/* Card 3: Zero-Waste Trust Guarantee */}
          <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl shadow-md">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Zero-Waste Auto-Refund
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Never lose expensive credits to broken renders. If any AI generation or FFmpeg composition fails, 100% of consumed credits are instantly returned to your wallet. You only pay for pristine, working videos.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HEAD-TO-HEAD COMPARISON TABLE: TILLERCAST VS OTHERS
      ───────────────────────────────────────────────────────────── */}
      <section id="comparison" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            Feature Comparison
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
            Tillercast vs. Other Video SaaS Tools
          </h2>
        </div>

        <div className="overflow-x-auto bg-white rounded-3xl border border-purple-100 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-purple-100 bg-purple-50/50">
                <th className="p-4 font-bold text-slate-700">Capability / Feature</th>
                <th className="p-4 font-extrabold text-purple-700 bg-purple-100/40">⚡ Tillercast v3.0</th>
                <th className="p-4 font-bold text-slate-500">Other Platforms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              <tr>
                <td className="p-4 font-bold text-slate-800">Video Creation Interface</td>
                <td className="p-4 font-bold text-purple-700 bg-purple-50/20">✅ Conversational Agent Chat</td>
                <td className="p-4 text-slate-500">❌ Cluttered Timeline / Rigid Wizard</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800">Social Publishing</td>
                <td className="p-4 font-bold text-purple-700 bg-purple-50/20">✅ Direct Autopilot to 4 Platforms</td>
                <td className="p-4 text-slate-500">❌ Manual MP4 downloads only</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800">Competitor Outlier Radar</td>
                <td className="p-4 font-bold text-purple-700 bg-purple-50/20">✅ 1-Click Viral Topic Extractor</td>
                <td className="p-4 text-slate-500">❌ Not available</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800">Broken Render Refunds</td>
                <td className="p-4 font-bold text-purple-700 bg-purple-50/20">✅ 100% Instant Auto-Refund</td>
                <td className="p-4 text-slate-500">❌ Credits lost / Disputed</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800">Free Trial Offering</td>
                <td className="p-4 font-bold text-purple-700 bg-purple-50/20">✅ 300 Credits + 1 Watermark-Free Post</td>
                <td className="p-4 text-slate-500">⚠️ Heavy watermarks / restricted</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800">Voice Catalog Quality</td>
                <td className="p-4 font-bold text-purple-700 bg-purple-50/20">✅ Google Neural2 Multi-Accent + ElevenLabs Pro</td>
                <td className="p-4 text-slate-500">⚠️ Paywalled behind $60+ plans</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. TRANSPARENT 3-TIER PRICING WITH ANNUAL TOGGLE
      ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
            Predictable Costs. Guaranteed Margins.
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            All plans include 300 free trial credits for 15 days. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-6 inline-flex items-center gap-2 p-1 bg-white rounded-full border border-purple-100 shadow-sm text-xs font-bold">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <span>Annual</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm space-y-5 text-left">
            <div>
              <div className="text-sm font-bold text-slate-800">Starter Plan</div>
              <div className="text-3xl font-black text-slate-950 mt-2">
                ${billingCycle === 'annual' ? 24 : 29}
                <span className="text-xs font-medium text-slate-400">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Perfect for solo creators posting every other day.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-t border-purple-50 pt-4">
              <div className="font-bold text-purple-700">⚡ 500 Credits / month (~62 Stock Shorts)</div>
              <div>✓ 1080p Full HD MP4 Exports</div>
              <div>✓ Google Neural2 Multi-Accent Voices</div>
              <div>✓ Stock B-Roll & Flash Motion visuals</div>
              <div>✓ 1 Connected Social Channel Autopilot</div>
              <div>✓ Zero-Waste Instant Auto-Refund</div>
            </div>

            <Link
              href="/signup?plan=starter"
              className="block w-full py-2.5 rounded-xl text-center text-xs font-bold bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 shadow-sm transition-all"
            >
              Get Starter Plan
            </Link>
          </div>

          {/* Creator Plan (Featured) */}
          <div className="p-6 rounded-3xl bg-white border-2 border-purple-500 shadow-xl space-y-5 text-left relative ring-4 ring-purple-100/50">
            <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md">
              MOST POPULAR · 1 DAILY VIDEO
            </span>

            <div>
              <div className="text-sm font-bold text-purple-700">Creator Plan</div>
              <div className="text-3xl font-black text-slate-950 mt-2">
                ${billingCycle === 'annual' ? 39 : 49}
                <span className="text-xs font-medium text-slate-400">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Post 1 high-retention video every day across YouTube & TikTok.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-t border-purple-50 pt-4">
              <div className="font-bold text-purple-700">⚡ 1,200 Credits / month (~150 Stock Shorts)</div>
              <div>✓ 100% ElevenLabs Hyper-Realistic Narrators</div>
              <div>✓ Google Veo 3.1 Lite AI Video Clips 👑</div>
              <div>✓ 2 Connected Social Channels (YT + TikTok)</div>
              <div>✓ Competitor Outlier Spy & Winner-Bias</div>
              <div>✓ Conversational Scene Refinement Studio</div>
              <div>✓ Zero-Waste Instant Auto-Refund</div>
            </div>

            <Link
              href="/signup?plan=creator"
              className="block w-full py-3 rounded-xl text-center text-xs font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200 hover:shadow-lg transition-all"
            >
              Get Creator Plan ($49/mo)
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="p-6 rounded-3xl bg-white border border-purple-100 shadow-sm space-y-5 text-left">
            <div>
              <div className="text-sm font-bold text-slate-800">Pro Automation</div>
              <div className="text-3xl font-black text-slate-950 mt-2">
                ${billingCycle === 'annual' ? 79 : 99}
                <span className="text-xs font-medium text-slate-400">/month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Full 4-platform syndication with personal voice cloning.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-t border-purple-50 pt-4">
              <div className="font-bold text-purple-700">⚡ 3,000 Credits / month (~375 Stock Shorts)</div>
              <div>✓ All 4 Social Platforms Autopilot (YT, TikTok, IG, FB)</div>
              <div>✓ Google Veo 3.1 Fast & Kling Pro Video</div>
              <div>✓ Custom Voice Cloning Studio</div>
              <div>✓ 4K Master Exports & VIP Turbo Queue</div>
              <div>✓ 5 Connected Social Channels</div>
              <div>✓ Zero-Waste Instant Auto-Refund</div>
            </div>

            <Link
              href="/signup?plan=pro"
              className="block w-full py-2.5 rounded-xl text-center text-xs font-bold bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 shadow-sm transition-all"
            >
              Get Pro Plan ($99/mo)
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FREQUENTLY ASKED QUESTIONS
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-left">
        <div className="text-center mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            FAQ
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={faq.q}
              className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm cursor-pointer"
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
            >
              <div className="flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900">
                <span>{faq.q}</span>
                <span className="text-purple-600 text-sm font-bold">
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-purple-50 pt-3">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. STICKY BOTTOM CONVERSION BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-30 p-3 bg-white/90 backdrop-blur-md border-t border-purple-100 shadow-lg text-center flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs font-bold text-slate-800">
          ✨ Ready to launch your automated video channel?
        </span>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          300 free trial credits included • 1 free watermark-free direct social post
        </span>
        <Link
          href="/content/new"
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          Create First Video in 60s ➔
        </Link>
      </div>
    </div>
  );
}
