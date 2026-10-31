import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquarePlus, Sparkles, X, ShieldCheck } from 'lucide-react';
import { Review } from '../types';
import { getStoredReviews, addReview } from '../lib/storage';

export const ReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [treatmentName, setTreatmentName] = useState('Laser EPILED 818NM');
  const [comment, setComment] = useState('');

  const loadReviews = () => {
    setReviews(getStoredReviews());
  };

  useEffect(() => {
    loadReviews();
    window.addEventListener('ilsogno_storage_change', loadReviews);
    return () => window.removeEventListener('ilsogno_storage_change', loadReviews);
  }, []);

  const handleSubmitReview = (e: React.FormEvent) => {
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
    setIsModalOpen(false);
  };

  return (
    <section id="recensioni" className="py-16 lg:py-24 bg-[#FAF5F5] border-y border-[#EEDFE1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Intestazione e Rating Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-[#AA853D] font-semibold">
              Fiducia e Trasparenza
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">
              Cosa dicono le nostre clienti
            </h2>
            <p className="text-sm text-[#55474A] max-w-xl">
              La cura dei dettagli, l'accoglienza calorosa di Melania e Chiara e l'efficacia dei nostri trattamenti
              raccontati attraverso le parole autentiche di chi ci ha scelto.
            </p>
          </div>

          {/* Badge Sintetico Google 5.0 */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-[#EEDFE1] shadow-2xs shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#C5A059] justify-end">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C5A059]" />
                ))}
              </div>
              <p className="font-serif font-bold text-lg text-[#261F21] mt-0.5">
                5.0 su 5 Stelle
              </p>
              <p className="text-[11px] text-[#8F7D82]">
                Oltre 170 recensioni a Catania
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <MessageSquarePlus className="w-4 h-4 text-[#D8B268]" />
              <span>Lascia Recensione</span>
            </button>
          </div>
        </div>

        {/* Griglia Recensioni */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-6 border border-[#EEDFE1] shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#C5A059]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#C5A059]" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#8F7D82]">{rev.date}</span>
                </div>

                <p className="text-xs font-semibold text-[#AA853D]">
                  Trattamento: {rev.treatmentName}
                </p>

                <p className="text-sm text-[#4A4042] leading-relaxed italic">
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

        {/* Modal per aggiungere nuova recensione */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#EEDFE1] shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#261F21]">
                    La tua esperienza
                  </h3>
                  <p className="text-xs text-[#55474A]">
                    Condividi il tuo feedback su Il Sogno della Bellezza
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#8F7D82] hover:text-[#261F21]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">Il tuo Nome *</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Es. Valentina G."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                      {rating} / 5
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">Trattamento ricevuto</label>
                  <select
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                    placeholder="Racconta come ti sei trovata con Chiara, Melania o le altre operatrici..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs text-[#55474A] hover:text-[#261F21]"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Pubblica Recensione
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
