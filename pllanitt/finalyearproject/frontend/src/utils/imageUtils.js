/**
 * Image utility functions for optimization and validation
 */

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 2000; // Max width or height in pixels

/**
 * Validate image file
 */
export const validateImageFile = (file) => {
  const errors = [];

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Compress image
 */
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert file to base64
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Process and optimize image for upload
 */
export const processImageForUpload = async (file) => {
  // Validate first
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Compress if needed
  let processedFile = file;
  if (file.size > 500 * 1024) { // Compress if > 500KB
    try {
      const compressedBlob = await compressImage(file);
      processedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      // Continue with original file if compression fails
    }
  }

  // Convert to base64
  const base64 = await fileToBase64(processedFile);
  
  return {
    base64,
    file: processedFile,
    size: processedFile.size,
    type: processedFile.type
  };
};

/**
 * Create thumbnail from image
 */
export const createThumbnail = (file, size = 150) => {
  return compressImage(file, size, size, 0.7);
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

export default {
  validateImageFile,
  compressImage,
  fileToBase64,
  processImageForUpload,
  createThumbnail,
  getImageDimensions,
  MAX_FILE_SIZE_MB,
  ALLOWED_TYPES
};

