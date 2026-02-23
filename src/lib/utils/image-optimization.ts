/**
 * Image optimization utilities for client-side image processing
 * Optimizes images before upload to reduce storage costs and improve performance
 */

/**
 * Resize and compress an image file
 * @param file - The image file to optimize
 * @param maxWidth - Maximum width in pixels (default: 512)
 * @param maxHeight - Maximum height in pixels (default: 512)
 * @param quality - JPEG/WebP quality 0-1 (default: 0.85)
 * @returns Optimized File or null if error
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 512,
  maxHeight: number = 512,
  quality: number = 0.85
): Promise<File | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }

            // Convert to WebP if supported, otherwise keep original format
            const isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            const mimeType = isWebPSupported ? 'image/webp' : file.type || 'image/jpeg';
            
            // Create new File with optimized data
            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, isWebPSupported ? '.webp' : ''),
              {
                type: mimeType,
                lastModified: Date.now(),
              }
            );

            resolve(optimizedFile);
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve(null);
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        resolve(null);
      }
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file before optimization
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default: 2)
 * @returns Error message or null if valid
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 2
): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Le fichier doit être une image';
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return `Le fichier est trop volumineux (max ${maxSizeMB}MB)`;
  }

  return null;
}

/**
 * Get image dimensions without loading full image
 * @param file - Image file
 * @returns Promise with width and height
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        resolve(null);
      };
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        resolve(null);
      }
    };
    
    reader.onerror = () => {
      resolve(null);
    };
    
    reader.readAsDataURL(file);
  });
}

