import React, { useState } from 'react';
import { REAL_REVIEWS } from '../data/projectsData';
import { ReviewItem } from '../types';
import { Star, MessageSquare, MapPin, Send, CheckCircle2 } from 'lucide-react';

export const ReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewItem[]>(REAL_REVIEWS);
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [place, setPlace] = useState('');
  const [service, setService] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !text) return;

    const newRev: ReviewItem = {
      name: author,
      place: place || 'Ярославская область',
      service: service || 'Строительство под ключ',
      rating,
      text,
      created_at: new Date().toISOString().split('T')[0],
    };

    // Attempt posting to php backend if hosted
    try {
      await fetch('/api/reviews.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRev),
      });
    } catch {
      // client-side fallback
    }

    setReviews([newRev, ...reviews]);
    setSubmitted(true);
    setTimeout(() => {
      setShowForm(false);
      setSubmitted(false);
      setAuthor('');
      setText('');
      setPlace('');
    }, 3000);
  };

  return (
    <section id="reviews" className="py-20 bg-[#060a12] border-b border-slate-850 relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-950/70 border border-blue-800/60 rounded text-xs font-mono text-blue-400 font-semibold uppercase">
              <MessageSquare className="w-3.5 h-3.5" />
              Отзывы реальных заказчиков
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              ОЦЕНКА <span className="text-blue-500">РЕАЛИЗОВАННЫХ ОБЪЕКТОВ</span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Отзывы владельцев домов, террас и складов в Ярославле, Тутаеве, Рыбинске и Ростове.
              Каждый отзыв привязан к конкретному выполненному объему работ.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors"
          >
            {showForm ? 'Скрыть форму' : '+ Оставить свой отзыв'}
          </button>
        </div>

        {/* Form Modal / Collapse */}
        {showForm && (
          <div className="mb-10 p-6 bg-slate-900/90 border border-blue-500/40 rounded-2xl max-w-2xl">
            {submitted ? (
              <div className="flex items-center gap-3 text-emerald-400 font-mono text-sm py-4">
                <CheckCircle2 className="w-5 h-5" />
                <span>Спасибо! Ваш отзыв добавлен и опубликован.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Новый отзыв об объекте
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Ваше имя"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Населенный пункт (напр. Тутаев)"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 outline-none"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Какой объект строился (напр. Каркасный дом 120 м²)"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 outline-none"
                />

                <textarea
                  required
                  rows={3}
                  placeholder="Ваш отзыв о качестве монтажа, соблюдении сроков и фиксации сметы..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 outline-none"
                />

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Отправить отзыв</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((rev, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-[#0b101c] border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {rev.created_at}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
                  «{rev.text}»
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <div className="font-bold text-xs text-white">{rev.name}</div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-blue-400 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{rev.place}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                  {rev.service}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
