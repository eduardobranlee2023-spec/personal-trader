import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Reveal from '../components/ui/Reveal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, ArrowRight, User, Settings } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  type: string;
  category: string | null;
  mentor_user_id: string;
  mentor_name?: string;
}

const LearnPage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const isAuthorizedMentor = profile?.plan === 'mentor' || profile?.role === 'admin';

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    let filtered = listings;
    if (typeFilter !== 'todos') {
      filtered = filtered.filter(l => l.type === typeFilter);
    }
    if (categoryFilter !== 'todas') {
      filtered = filtered.filter(l => l.category === categoryFilter);
    }
    setFilteredListings(filtered);
  }, [typeFilter, categoryFilter, listings]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id, title, description, cover_image_url, type, category, mentor_user_id,
          mentor:profiles!mentor_user_id(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (data || []).map((c: any) => ({
        ...c,
        mentor_name: c.mentor?.full_name || 'Mentor',
      }));
      setListings(formatted);
    } catch (err) {
      console.error('Error fetching listings', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(listings.map(l => l.category).filter(Boolean))) as string[];

  return (
    <AppLayout>
      <Reveal>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Descubre Comunidades y Cursos
            </h1>
            <p className="page-sub">
              Explora comunidades, cursos y mentorías ofrecidas por nuestros traders.
            </p>
          </div>
          {isAuthorizedMentor && (
            <button 
              onClick={() => navigate('/mentor/cursos')} 
              className="btn btn-primary shrink-0"
            >
              <Settings className="w-4 h-4 mr-2" />
              Mis Promociones
            </button>
          )}
        </div>
      </Reveal>

      {/* Filters */}
      <Reveal delay={50}>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {['todos', 'curso', 'mentoria', 'comunidad'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  typeFilter === type 
                    ? 'bg-primary text-background' 
                    : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-text'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <button
                onClick={() => setCategoryFilter('todas')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === 'todas' 
                    ? 'bg-acc-soft text-primary' 
                    : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-text'
                }`}
              >
                Todas las categorías
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === cat 
                      ? 'bg-acc-soft text-primary' 
                      : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-text'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : filteredListings.length === 0 ? (
        <Reveal delay={100}>
          <div className="panel-card text-center p-8 text-textMuted italic">
            No hay promociones activas con estos filtros.
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredListings.map((listing, i) => (
            <Reveal key={listing.id} delay={100 + (i % 4) * 50}>
              <div 
                className="panel-card flex flex-col h-full group hover:border-primary/50 transition-colors cursor-pointer overflow-hidden p-0"
                onClick={() => navigate(`/aprender/${listing.id}`)}
              >
                {/* Cover Image */}
                <div className="h-40 bg-[var(--line)] relative overflow-hidden flex-shrink-0">
                  {listing.cover_image_url ? (
                    <img 
                      src={listing.cover_image_url} 
                      alt={listing.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-textMuted/30">
                      <GraduationCap className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm ${
                      listing.type === 'comunidad' ? 'bg-[var(--blu)]/90 text-white' :
                      listing.type === 'curso' ? 'bg-[var(--acc)]/90 text-white' : 'bg-[var(--warn)]/90 text-white'
                    }`}>
                      {listing.type}
                    </span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-acc-soft flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <span className="text-xs text-textMuted font-medium truncate">{listing.mentor_name}</span>
                  </div>

                  <h3 className="text-lg font-bold text-text mb-2 line-clamp-2 leading-tight">{listing.title}</h3>
                  <p className="text-sm text-textMuted mb-4 flex-grow line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="flex items-center text-primary text-sm font-medium mt-auto group-hover:underline">
                    Ver presentación <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default LearnPage;
