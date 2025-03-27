// Import the Gemini AI library
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Initialize with your API key
const genAI = new GoogleGenerativeAI("AIzaSyDsdvYPIRx0taU2zrCZ_RUeNK7OPQGeLFQ");

// Export genAI so other files can use it
export { genAI, GoogleGenerativeAI };
