class ImagePreprocessor {
  static preprocessImage(imageElement, options = {}) {
    const {
      scale = 2,           // Upscale for better OCR
      contrast = 1.2,      // Increase contrast
      brightness = 1.1,    // Slight brightness boost
      grayscale = true     // Convert to grayscale
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = imageElement.width * scale;
    canvas.height = imageElement.height * scale;
    
    // Apply image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw and scale image
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Apply filters
    if (grayscale || contrast !== 1 || brightness !== 1) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Apply brightness and contrast
        r = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + (brightness - 1) * 128));
        g = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + (brightness - 1) * 128));
        b = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + (brightness - 1) * 128));
        
        // Convert to grayscale if requested
        if (grayscale) {
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          r = g = b = gray;
        }
        
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
      
      ctx.putImageData(imageData, 0, 0);
    }
    
    return canvas;
  }

  static async extractTextWithPreprocessing(imageFile) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        // Preprocess the image
        const processedCanvas = ImagePreprocessor.preprocessImage(img);
        
        // Convert canvas to blob for OCR
        processedCanvas.toBlob(async (blob) => {
          const text = await extractTextFromImage(blob);
          resolve(text);
        });
      };
      img.src = URL.createObjectURL(imageFile);
    });
  }
}

// Usage with file input
document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const text = await ImagePreprocessor.extractTextWithPreprocessing(file);
    console.log('Extracted text:', text);
  }
});