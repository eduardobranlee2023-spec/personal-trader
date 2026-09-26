import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Reveal from '../components/ui/Reveal';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ExternalLink, GraduationCap, User, FolderOpen } from 'lucide-react';

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchListing();
    }
  }, [courseId]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select(`*, mentor:profiles!mentor_user_id(full_name, email)`)
        .eq('id', courseId)
        .single();
      
      if (error) throw error;
      setListing(data);
    } catch (err) {
      console.error('Error fetching listing', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="flex justify-center py-20"><div className="spinner" /></div></AppLayout>;
  }

  if (!listing) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-textMuted mb-4">La promoción no fue encontrada o ya no está disponible.</p>
          <button onClick={() => navigate('/aprender')} className="btn btn-primary">Volver al catálogo</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <button onClick={() => navigate('/aprender')} className="btn btn-ghost mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver al Directorio
      </button>

      <Reveal>
        <div className="max-w-4xl mx-auto panel-card overflow-hidden p-0">
          {/* Hero Banner / Cover */}
          <div className="h-64 sm:h-80 bg-[var(--line)] relative overflow-hidden">
            {listing.cover_image_url ? (
              <img 
                src={listing.cover_image_url} 
                alt={listing.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-textMuted/30 bg-[var(--bg)]">
                <GraduationCap className="w-20 h-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md shadow-sm mb-3 inline-block ${
                  listing.type === 'comunidad' ? 'bg-[var(--blu)] text-white' :
                  listing.type === 'curso' ? 'bg-[var(--acc)] text-white' : 'bg-[var(--warn)] text-white'
                }`}>
                  {listing.type}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-text mb-2 leading-tight drop-shadow-md">
                  {listing.title}
                </h1>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Main Content */}
              <div className="md:col-span-2">
                <h2 className="text-xl font-bold mb-4 border-b border-[var(--line)] pb-2">Presentación</h2>
                <div className="prose prose-invert max-w-none text-text/90 whitespace-pre-wrap leading-relaxed">
                  {listing.description}
                </div>
              </div>

              {/* Sidebar / CTA */}
              <div className="space-y-6">
                <div className="panel-card bg-white/5 border border-white/10 p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-acc-soft flex items-center justify-center text-primary mb-4 shadow-inner">
                    <User className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">{listing.mentor?.full_name || 'Mentor'}</h3>
                  <p className="text-xs text-textMuted mb-6">Creador de la promoción</p>
                  
                  {listing.external_link ? (
                    <a 
                      href={listing.external_link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-primary w-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      <span>
                        {listing.type === 'comunidad' ? 'Unirme a la comunidad' : 
                         listing.type === 'curso' ? 'Ver el curso' : 'Contactar al mentor'}
                      </span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ) : (
                    <button disabled className="btn btn-primary w-full opacity-50 cursor-not-allowed">
                      Link no disponible
                    </button>
                  )}
                  <p className="text-[10px] text-textMuted mt-4 opacity-70">
                    Al hacer clic, serás redirigido a una plataforma externa. Esta transacción o comunidad es independiente de Personal Trader.
                  </p>
                </div>

                {listing.category && (
                  <div className="flex items-center gap-3 text-sm text-textMuted px-2">
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span>Categoría: <strong className="text-text">{listing.category}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </AppLayout>
  );
};

export default CourseDetail;
