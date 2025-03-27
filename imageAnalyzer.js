class ImageAnalyzer {
  constructor() {
    this.supportedFormats = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
    this.uploadInput = this.createUploadInput();
  }

  createUploadInput() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    return input;
  }

  isSupportedImage(urlOrFile) {
    if (!urlOrFile) return false;

    if (typeof urlOrFile === "string") {
      const extension = urlOrFile.split(".").pop().toLowerCase().split("?")[0];
      return this.supportedFormats.includes(extension);
    } else if (urlOrFile instanceof File) {
      const extension = urlOrFile.name.split(".").pop().toLowerCase();
      return this.supportedFormats.includes(extension);
    }
    return false;
  }

  async analyzeImage(source) {
    try {
      let imageUrl;

      if (typeof source === "string") {
        // URL analysis
        if (!this.isSupportedImage(source)) {
          throw new Error("Unsupported image format");
        }
        await this.validateImageUrl(source);
        imageUrl = source;
      } else if (source instanceof File) {
        // File upload analysis
        if (!this.isSupportedImage(source)) {
          throw new Error("Unsupported image format");
        }
        imageUrl = await this.uploadImage(source);
      } else {
        throw new Error("Invalid image source");
      }

      // Show loading state
      const loadingMessage = `Analyzing image...`;

      // Call puter.ai API
      const result = await puter.ai.img2txt(imageUrl);

      if (!result || typeof result !== "string") {
        throw new Error("No analysis results returned");
      }

      return {
        success: true,
        description: result,
        url: imageUrl,
        sourceType: typeof source === "string" ? "url" : "file",
      };
    } catch (error) {
      console.error("Image analysis error:", error);
      return {
        success: false,
        error: error.message || "Failed to analyze image",
        sourceType: typeof source === "string" ? "url" : "file",
      };
    }
  }

  async uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Create a temporary image element to validate the file
        const img = new Image();
        img.onload = () => resolve(e.target.result);
        img.onerror = () => reject(new Error("Invalid image file"));
        img.src = e.target.result;
      };
      reader.onerror = (e) => reject(new Error("File reading failed"));
      reader.readAsDataURL(file);
    });
  }

  async validateImageUrl(url) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) {
        throw new Error("Image URL not accessible");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        throw new Error("URL does not point to an image");
      }

      return true;
    } catch (error) {
      throw new Error(`Image URL validation failed: ${error.message}`);
    }
  }

  promptForUpload() {
    return new Promise((resolve) => {
      this.uploadInput.value = ""; // Clear previous selection
      this.uploadInput.onchange = (e) => {
        if (e.target.files.length > 0) {
          resolve(e.target.files[0]);
        } else {
          resolve(null);
        }
      };
      this.uploadInput.click();
    });
  }
}
