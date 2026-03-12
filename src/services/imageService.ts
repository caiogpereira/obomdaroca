import { supabase } from '../lib/supabase';

const MAX_UPLOAD_SIZE = 50 * 1024; // 50kb no Storage
const BUCKET_NAME = 'produtos-imagens';

/**
 * Comprime uma imagem progressivamente até atingir o tamanho alvo.
 * Reduz dimensões e qualidade iterativamente.
 */
export const compressImage = async (
  file: File,
  maxSizeKB: number = 50
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const targetBytes = maxSizeKB * 1024;

        // Começa com dimensão máxima de 800px
        let maxDimension = 800;
        let quality = 0.85;

        const tryCompress = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Reduz dimensões proporcionalmente
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height / width) * maxDimension);
              width = maxDimension;
            } else {
              width = Math.round((width / height) * maxDimension);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Falha ao processar imagem'));
            return;
          }

          // Fundo branco (evita transparência que aumenta tamanho)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }

              if (blob.size <= targetBytes) {
                // Tamanho OK — retorna
                const compressed = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressed);
                return;
              }

              // Ainda grande — reduz qualidade ou dimensão
              if (quality > 0.2) {
                quality -= 0.1;
              } else if (maxDimension > 200) {
                maxDimension = Math.round(maxDimension * 0.75);
                quality = 0.7;
              } else {
                // Limite atingido — aceita o menor possível
                const compressed = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressed);
                return;
              }

              tryCompress();
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };

      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
};

export const uploadProductImage = async (
  file: File,
  productId: string
): Promise<{ url: string; path: string }> => {
  try {
    // Sempre comprime para máximo 50kb
    const compressed = await compressImage(file, 50);

    const fileExt = 'jpg'; // sempre salva como jpg após compressão
    const fileName = `${productId}.${fileExt}`;
    const filePath = fileName; // raiz do bucket, sem subpasta

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, compressed, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    throw error;
  }
};

export const deleteProductImage = async (path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw error;
  }
};

export const validateImageFile = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (!validTypes.includes(file.type)) {
    return 'Formato inválido. Use JPG, PNG, WEBP ou GIF.';
  }

  // Aceita até 20MB para upload — comprime para 50kb automaticamente
  if (file.size > 20 * 1024 * 1024) {
    return 'Arquivo muito grande. Tamanho máximo: 20MB.';
  }

  return null;
};
