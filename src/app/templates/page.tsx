'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  category: string;
  format: string;
  durationMinutes: number;
  niche: string;
  visualStyle: string;
  voice: string;
  description: string;
  promptStarter: string;
  badge: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadTemplates();
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLoggedIn(Boolean(d?.authenticated && d?.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  const categories = ['All', 'Shorts & Vertical', 'Long-Form Channel', 'News & Trends', 'Education & Science', 'Business & Finance'];

  const filtered = templates.filter((t) => {
    if (activeCategory !== 'All' && t.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.niche.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleUseTemplate = (t: Template) => {
    const target = `/content/new?preset=${t.format === 'Shorts' ? 'SHORT' : t.durationMinutes > 5 ? 'LONG' : 'STANDARD'}&topic=${encodeURIComponent(t.promptStarter)}`;
    if (loggedIn === false) {
      router.push(`/login?from=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-slate-900 flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Video templates</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
            Ready-made starting points for Shorts, documentaries, explainers and more. Pick one and Tillercast pre-fills the format and a prompt starter.
          </p>
        </div>
        <Link
          href={loggedIn === false ? `/login?from=${encodeURIComponent('/content/new')}` : '/content/new'}
          className="px-5 py-2.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-200"
        >
          Create a custom video
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-purple-100 rounded-2xl">
        <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Template categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                activeCategory === cat ? 'bg-purple-600 text-white font-bold' : 'text-slate-600 font-semibold hover:bg-purple-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="template-search">Search templates</label>
        <input
          id="template-search"
          type="search"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56 px-3 py-1.5 text-sm rounded-xl border border-purple-100 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500">No templates found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((t) => (
            <div key={t.id} className="flex flex-col gap-4 p-6 rounded-3xl bg-white border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-200">
                  {t.badge}
                </span>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {t.durationMinutes} min &bull; {t.format}
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.name}</h2>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{t.description}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Prompt starter</div>
                <div className="mt-1 text-sm italic text-purple-800">&ldquo;{t.promptStarter}&rdquo;</div>
              </div>
              <div className="mt-auto pt-4 border-t border-purple-50 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{t.niche}</span>
                <button
                  type="button"
                  onClick={() => handleUseTemplate(t)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  {loggedIn === false ? 'Sign in to use' : 'Use template'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
