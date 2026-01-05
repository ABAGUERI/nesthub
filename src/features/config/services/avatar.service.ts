import { supabase } from '@/shared/utils/supabase';

const BUCKET_NAME = 'avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const TARGET_SIZE = 500; // 500x500px

/**
 * Valider fichier avatar
 */
export const validateAvatarFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format non supporté. Utilisez JPG, PNG ou WebP.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'Fichier trop volumineux (max 2MB).';
  }

  return null;
};

/**
 * Redimensionner image à 500x500px (carré)
 */
export const resizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        // Calculer crop carré
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;

        // Redimensionner à 500x500
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          size,
          size,
          0,
          0,
          TARGET_SIZE,
          TARGET_SIZE
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/jpeg',
          0.9
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

/**
 * Upload avatar vers Supabase Storage
 */
export const uploadAvatar = async (
  userId: string,
  childId: string,
  file: File
): Promise<string> => {
  // Valider
  const error = validateAvatarFile(file);
  if (error) throw new Error(error);

  // Redimensionner
  const resizedBlob = await resizeImage(file);

  // Générer nom fichier
  const fileExt = 'jpg'; // Toujours JPG après resize
  const fileName = `${userId}/${childId}.${fileExt}`;

  // Upload vers Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, resizedBlob, {
      contentType: 'image/jpeg',
      upsert: true, // Remplacer si existe déjà
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Récupérer URL publique
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

  return data.publicUrl;
};

/**
 * Supprimer avatar de Supabase Storage
 */
export const deleteAvatar = async (
  userId: string,
  childId: string
): Promise<void> => {
  const fileName = `${userId}/${childId}.jpg`;

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
};

/**
 * Obtenir URL avatar (avec cache-busting)
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
  if (!avatarUrl) return null;

  // Ajouter timestamp pour éviter cache browser
  const url = new URL(avatarUrl);
  url.searchParams.set('t', Date.now().toString());
  return url.toString();
};
