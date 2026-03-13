import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'produtos-imagens';

/**
 * Comprime imagem para ~50KB usando Canvas
 * - Reduz dimensões progressivamente
 * - Aplica fundo branco (evita transparência que aumenta tamanho)
 * - Salva sempre como JPEG
 */
export const compressImage = async (file: File, targetSizeKB: number = 50): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');

        // Reduzir dimensão máxima para manter o arquivo pequeno
        let maxDimension = 800;
        let width = img.width;
        let height = img.height;

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
          reject(new Error('Falha ao criar contexto do canvas'));
          return;
        }

        // Fundo branco (evita transparência PNG que aumenta tamanho)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const targetSize = targetSizeKB * 1024;
        let quality = 0.7;

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }

              if (blob.size <= targetSize || quality <= 0.1) {
                const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                console.log(`📸 Imagem comprimida: ${Math.round(file.size / 1024)}KB → ${Math.round(blob.size / 1024)}KB (quality: ${quality.toFixed(1)})`);
                resolve(compressedFile);
              } else {
                quality -= 0.1;
                // Se quality está baixa e ainda grande, reduz dimensões
                if (quality <= 0.3 && maxDimension > 400) {
                  maxDimension = 400;
                  width = Math.min(img.width, maxDimension);
                  height = Math.round((img.height / img.width) * width);
                  canvas.width = width;
                  canvas.height = height;
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, width, height);
                  ctx.drawImage(img, 0, 0, width, height);
                }
                tryCompress();
              }
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

/**
 * Upload de imagem do produto para o Supabase Storage
 * - Comprime automaticamente
 * - Salva na raiz do bucket (sem subpasta)
 * - Retorna URL pública e path
 */
export const uploadProductImage = async (
  file: File, 
  productId: string
): Promise<{ url: string; path: string }> => {
  try {
    // Sempre comprimir
    const fileToUpload = await compressImage(file);

    // Nome do arquivo: productId-timestamp.jpg (na raiz, sem subpasta)
    const fileName = `${productId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log('✅ Imagem salva:', data.publicUrl);

    return {
      url: data.publicUrl,
      path: fileName,
    };
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};

/**
 * Remove imagem do Storage
 */
export const deleteProductImage = async (path: string): Promise<void> => {
  try {
    if (!path) return;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    // Não propagar - deletar imagem antiga não deve bloquear o fluxo
  }
};

/**
 * Validação de arquivo antes do upload
 */
export const validateImageFile = (file: File): string | null => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!validTypes.includes(file.type)) {
    return 'Formato inválido. Use JPG, PNG ou WEBP.';
  }

  // Aceitar até 20MB (vai ser comprimido para ~50KB)
  if (file.size > 20 * 1024 * 1024) {
    return 'Arquivo muito grande. Tamanho máximo: 20MB.';
  }

  return null;
};
