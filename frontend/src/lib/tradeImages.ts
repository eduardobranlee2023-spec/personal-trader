import { supabase } from './supabase';

export const TRADE_IMAGES_BUCKET = 'trade-images';
export const TRADE_IMAGE_PREFIX = 'storage:';
export const TRADE_IMAGES_JSON_PREFIX = 'storage-multi:';
export const MAX_TRADE_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_TRADE_IMAGES = 4;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Obtiene los paths relativos de Supabase Storage para un registro de trade.
 * Soporta retrocompatibilidad (storage:path) y múltiples imágenes (storage-multi:[path1, path2...]).
 */
export const getTradeImagePaths = (value: string | null): string[] => {
  if (!value) return [];
  if (value.startsWith(TRADE_IMAGES_JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(TRADE_IMAGES_JSON_PREFIX.length));
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
      }
    } catch {
      return [];
    }
  }
  if (value.startsWith(TRADE_IMAGE_PREFIX)) {
    const single = value.slice(TRADE_IMAGE_PREFIX.length).trim();
    return single ? [single] : [];
  }
  return [];
};

/**
 * Retorna el primer path para compatibilidad rápida
 */
export const getTradeImagePath = (value: string | null): string | null => {
  const paths = getTradeImagePaths(value);
  return paths.length > 0 ? paths[0] : null;
};

/**
 * Determina si el valor almacenado corresponde a imágenes subidas a Storage
 */
export const isTradeImage = (value: string | null): boolean => {
  if (!value) return false;
  return value.startsWith(TRADE_IMAGE_PREFIX) || value.startsWith(TRADE_IMAGES_JSON_PREFIX);
};

/**
 * Serializa una lista de paths de storage para guardar en el campo tradingview_link.
 * Si no hay paths, retorna null. Si hay 1, puede ser storage:path o storage-multi:.
 * Usar storage-multi para consistencia cuando son múltiples o storage: si es única.
 */
export const encodeTradeImagePaths = (paths: string[]): string | null => {
  if (!paths || paths.length === 0) return null;
  return `${TRADE_IMAGES_JSON_PREFIX}${JSON.stringify(paths)}`;
};

export async function uploadTradeImage(file: File, userId: string) {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return { path: null, error: new Error('Formato no compatible. Usá JPG, PNG, WebP, GIF o AVIF.') };
  }
  if (file.size > MAX_TRADE_IMAGE_SIZE) {
    return { path: null, error: new Error('La imagen no puede superar los 10 MB.') };
  }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(TRADE_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  return { path: error ? null : path, error };
}

export async function createTradeImageUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(TRADE_IMAGES_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return { url: data?.signedUrl ?? null, error };
}

export async function createTradeImageUrls(paths: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const path of paths) {
    const { url } = await createTradeImageUrl(path);
    if (url) urls.push(url);
  }
  return urls;
}

export async function removeTradeImageIfUnused(path: string) {
  const { data, error } = await supabase
    .from('trades')
    .select('id, tradingview_link')
    .ilike('tradingview_link', `%${path}%`)
    .limit(1);

  if (error) return error;
  if (data && data.length > 0) return null;

  const { error: removeError } = await supabase.storage
    .from(TRADE_IMAGES_BUCKET)
    .remove([path]);
  return removeError;
}

export async function removeMultipleTradeImagesIfUnused(paths: string[]) {
  const errors = [];
  for (const p of paths) {
    const err = await removeTradeImageIfUnused(p);
    if (err) errors.push(err);
  }
  return errors.length > 0 ? errors[0] : null;
}
