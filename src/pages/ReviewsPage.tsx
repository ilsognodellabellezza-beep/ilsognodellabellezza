import React, { useState, useEffect } from 'react';
import { Star, MessageSquarePlus, CheckCircle, ShieldCheck } from 'lucide-react';
import { Review } from '../types';
import { getStoredReviews, addReview } from '../lib/storage';
import { PageId } from '../types/navigation';

interface ReviewsPageProps {
  onNavigate: (page: PageId) => void;
}

export const ReviewsPage: React.FC<ReviewsPageProps> = ({ onNavigate }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [treatmentName, setTreatmentName] = useState('Laser EPILED 818NM');
  const [comment, setComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const loadReviews = () => {
    setReviews(getStoredReviews());
  };

  useEffect(() => {
    loadReviews();
    window.addEventListener('ilsogno_storage_change', loadReviews);
    return () => window.removeEventListener('ilsogno_storage_change', loadReviews);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;

    addReview({
      author: author.trim(),
      rating,
      treatmentName,
      comment: comment.trim(),
    });

    setAuthor('');
    setComment('');
    setFeedbackSuccess(true);
    setTimeout(() => setFeedbackSuccess(false), 4000);
  };

  return (
    <div className="py-12 lg:py-16 bg-[#FAF7F7] min-h-screen space-y-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header di Pagina */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">
            Recensioni & Opinioni Verificate
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">
            La Parola alle Nostre Clienti
          </h1>
          <p className="text-sm sm:text-base text-[#55474A]">
            La nostra reputazione è costruita su gentilezza, precisione e risultati tangibili.
            Scopri le esperienze vissute nel salone di Chiara e Melania.
          </p>
        </div>

        {/* Banner Sintesi Valutazioni */}
        <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-[#EEDFE1] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1 text-[#C5A059]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#C5A059]" />
              ))}
              <span className="font-serif font-bold text-xl text-[#261F21] ml-2">5.0 / 5</span>
            </div>
            <p className="text-sm font-semibold text-[#261F21]">
              Punteggio massimo basato su oltre 170 recensioni a Catania
            </p>
            <p className="text-xs text-[#8F7D82]">
              Fonti verificate: Google Maps & Fresha
            </p>
          </div>

          <button
            onClick={() => {
              const formEl = document.getElementById('review-form');
              formEl?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-3 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-2"
          >
            <MessageSquarePlus className="w-4 h-4 text-[#D8B268]" />
            <span>Lascia la tua Recensione</span>
          </button>
        </div>

        {/* Griglia Completa Recensioni */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-3xl p-6 border border-[#EEDFE1] shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#C5A059]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C5A059]" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#8F7D82]">{rev.date}</span>
                </div>

                <p className="text-xs font-semibold text-[#AA853D]">
                  Trattamento: {rev.treatmentName}
                </p>

                <p className="text-xs sm:text-sm text-[#4A4042] leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#F7EFEF] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#261F21]">{rev.author}</h4>
                  <span className="text-[10px] text-[#8F7D82]">Cliente Verificata</span>
                </div>
                <span className="text-[10px] font-mono text-[#8F7D82] bg-[#FAF5F5] px-2 py-0.5 rounded border border-[#EEDFE1]">
                  {rev.source}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modulo di Invio Nuova Recensione */}
        <div id="review-form" className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-[#EEDFE1] shadow-md space-y-5">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#AA853D]">
              Il Tuo Feedback Conta
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#261F21]">
              Scrivi una Recensione
            </h3>
            <p className="text-xs text-[#55474A]">
              Sei stata ospite di Chiara e Melania? Racconta come ti sei trovata!
            </p>
          </div>

          {feedbackSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Grazie di cuore! La tua recensione è stata pubblicata con successo.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#261F21]">Il tuo Nome e Cognome / Iniziale *</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Es. Elena M."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#261F21]">Valutazione</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-[#C5A059] fill-[#C5A059]'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-[#261F21] ml-2">
                  {rating} su 5 stelle
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#261F21]">Trattamento Effettuato</label>
              <select
                value={treatmentName}
                onChange={(e) => setTreatmentName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              >
                <option value="Laser EPILED 818NM">Laser EPILED 818NM</option>
                <option value="Laminazione Ciglia & Botox">Laminazione Ciglia & Botox</option>
                <option value="Massaggio Linfodrenante (Solo Donna)">Massaggio Linfodrenante (Solo Donna)</option>
                <option value="Pulizia Viso Idra-Glow">Pulizia Viso Idra-Glow</option>
                <option value="Manicure Russa & Semipermanente">Manicure Russa & Semipermanente</option>
                <option value="Architettura Sopracciglia Henné">Architettura Sopracciglia Henné</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#261F21]">La tua Recensione *</label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Condividi la tua esperienza con i trattamenti, la puntualità e l'ambiente..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              Pubblica Recensione
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
