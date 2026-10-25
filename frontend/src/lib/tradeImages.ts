import { supabase } from './supabase';

export const TRADE_IMAGES_BUCKET = 'trade-images';
export const TRADE_IMAGE_PREFIX = 'storage:';
export const MAX_TRADE_IMAGE_SIZE = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const getTradeImagePath = (value: string | null): string | null =>
  value?.startsWith(TRADE_IMAGE_PREFIX) ? value.slice(TRADE_IMAGE_PREFIX.length) : null;

export const isTradeImage = (value: string | null): boolean => getTradeImagePath(value) !== null;

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

export async function removeTradeImageIfUnused(path: string) {
  const { data, error } = await supabase
    .from('trades')
    .select('id')
    .eq('tradingview_link', `${TRADE_IMAGE_PREFIX}${path}`)
    .limit(1);
  if (error) return error;
  if (data.length > 0) return null;

  const { error: removeError } = await supabase.storage
    .from(TRADE_IMAGES_BUCKET)
    .remove([path]);
  return removeError;
}
