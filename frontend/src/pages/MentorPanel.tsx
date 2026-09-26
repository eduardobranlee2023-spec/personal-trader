import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Reveal from '../components/ui/Reveal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, Plus, Edit, Lock, Eye, EyeOff, ExternalLink, X, Save, ImagePlus, Loader2 } from 'lucide-react';

const MentorPanel: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image_url: '',
    external_link: '',
    category: '',
    type: 'comunidad'
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isAuthorized = profile?.plan === 'mentor' || profile?.role === 'admin';

  useEffect(() => {
    if (isAuthorized) {
      fetchMentorListings();
    } else {
      setLoading(false);
    }
  }, [profile, isAuthorized]);

  const fetchMentorListings = async () => {
    try {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('mentor_user_id', profile?.id)
        .order('created_at', { ascending: false });
      
      setListings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleListingStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('courses').update({ is_active: !currentStatus }).eq('id', id);
      fetchMentorListings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${profile?.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, cover_image_url: urlData.publicUrl }));
    } catch (err: any) {
      alert('Error al subir imagen: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const openModal = (listing?: any) => {
    if (listing) {
      setEditingId(listing.id);
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        cover_image_url: listing.cover_image_url || '',
        external_link: listing.external_link || '',
        category: listing.category || '',
        type: listing.type || 'comunidad'
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        cover_image_url: '',
        external_link: '',
        category: '',
        type: 'comunidad'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    
    try {
      const payload = {
        mentor_user_id: profile.id,
        ...formData
      };

      if (editingId) {
        await supabase.from('courses').update(payload).eq('id', editingId);
      } else {
        await supabase.from('courses').insert([payload]);
      }
      
      setIsModalOpen(false);
      fetchMentorListings();
    } catch (err) {
      console.error('Error saving', err);
      alert('Hubo un error al guardar. Revisa que el link o imagen sean correctos.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="flex justify-center py-20"><div className="spinner" /></div></AppLayout>;
  }

  // Not a mentor or admin => Show Upgrade Message
  if (!isAuthorized) {
    return (
      <AppLayout>
        <Reveal>
          <div className="max-w-2xl mx-auto panel-card text-center p-12 mt-10">
            <div className="w-16 h-16 rounded-full bg-acc-soft text-primary flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Aparece en el Directorio</h2>
            <p className="text-textMuted mb-8 leading-relaxed">
              La capacidad de promocionar tus propias comunidades, cursos y mentorías dentro 
              del Directorio de Personal Trader es exclusiva del Plan Mentor. 
              Sube de nivel tu cuenta para obtener exposición directa ante toda la base de usuarios de la plataforma.
            </p>
            <button className="btn btn-primary shadow-lg shadow-primary/20" onClick={() => navigate('/settings?upgrade=mentor')}>
              Conocer el Plan Mentor
            </button>
          </div>
        </Reveal>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Reveal>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Mis Promociones
            </h1>
            <p className="page-sub">
              Gestiona los anuncios de tus comunidades, cursos y mentorías en el directorio.
            </p>
          </div>
          <button className="btn btn-primary shadow-lg shadow-primary/20" onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-1" /> Crear Nueva
          </button>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="space-y-4">
          {listings.length === 0 ? (
            <div className="panel-card text-center p-10 text-textMuted italic bg-white/5 border-dashed">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-20" />
              Aún no has creado ninguna promoción. ¡Haz clic en "Crear Nueva" para aparecer en el directorio!
            </div>
          ) : (
            listings.map(listing => (
              <div key={listing.id} className="panel-card flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4 min-w-0 flex-grow">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-md bg-[var(--line)] flex-shrink-0 overflow-hidden">
                    {listing.cover_image_url ? (
                      <img src={listing.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--bg)]">
                        <GraduationCap className="w-6 h-6 text-textMuted/50" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`tag ${listing.type === 'comunidad' ? 'tag-info' : listing.type === 'curso' ? 'tag-warn' : 'tag-neutral'}`}>
                        {listing.type.toUpperCase()}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${listing.is_active ? 'bg-win/20 text-win' : 'bg-white/10 text-textMuted'}`}>
                        {listing.is_active ? 'Visible' : 'Oculto'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-text truncate">{listing.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-textMuted mt-1">
                      {listing.category && <span>Cat: <strong className="font-medium text-text">{listing.category}</strong></span>}
                      {listing.external_link && (
                        <a href={listing.external_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                          Link externo <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pl-4 border-l border-[var(--line)] shrink-0">
                  <button 
                    onClick={() => toggleListingStatus(listing.id, listing.is_active)}
                    className="btn btn-ghost btn-sm px-3"
                    title={listing.is_active ? 'Ocultar promoción del directorio' : 'Hacer visible en el directorio'}
                  >
                    {listing.is_active ? <EyeOff className="w-4 h-4 text-textMuted hover:text-loss" /> : <Eye className="w-4 h-4 text-textMuted hover:text-win" />}
                  </button>
                  <button onClick={() => openModal(listing)} className="btn btn-outline btn-sm px-4">
                    <Edit className="w-4 h-4 mr-1.5" /> Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Reveal>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg)] border border-white/10 p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Promoción' : 'Nueva Promoción'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textMuted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de promoción</label>
                  <select 
                    className="input w-full"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="comunidad">Comunidad</option>
                    <option value="curso">Curso</option>
                    <option value="mentoria">Mentoría</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    placeholder="Ej. Trading, Forex, Crypto" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input 
                  type="text" 
                  className="input w-full" 
                  required 
                  placeholder="Nombre de tu curso o comunidad"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Imagen de Portada</label>
                <div className="mt-1">
                  {/* Preview */}
                  {formData.cover_image_url && (
                    <div className="relative mb-3 rounded-lg overflow-hidden h-36 bg-white/5 border border-white/10">
                      <img 
                        src={formData.cover_image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, cover_image_url: ''})}
                        className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {/* Upload Button */}
                  <label className={`flex items-center justify-center gap-2 w-full p-3 border border-dashed border-white/20 rounded-lg cursor-pointer transition-colors ${
                    uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-white/5'
                  }`}>
                    {uploadingImage 
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                      : <><ImagePlus className="w-4 h-4" /> {formData.cover_image_url ? 'Cambiar imagen' : 'Subir imagen de portada'}</>
                    }
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                    />
                  </label>
                  <p className="text-[11px] text-textMuted mt-1.5">JPG, PNG, WEBP. Recomendado: 1200×630px.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Enlace Externo (A dónde dirigir al usuario)</label>
                <input 
                  type="url" 
                  className="input w-full" 
                  required
                  placeholder="https://t.me/tu_grupo o link de pago"
                  value={formData.external_link}
                  onChange={e => setFormData({...formData, external_link: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Presentación / Descripción</label>
                <textarea 
                  className="input w-full h-32 resize-none" 
                  placeholder="Escribe por qué deberían unirse..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? <div className="spinner w-4 h-4 border-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? 'Guardar Cambios' : 'Crear Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MentorPanel;
