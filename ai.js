import { genAI } from "./gemini.js";

document.addEventListener("DOMContentLoaded", () => {
  let chat;
  const imageGenerator = new DynamicImageGenerator();
  const imageAnalyzer = new ImageAnalyzer();

  // DOM Elements
  const chatContainer = document.getElementById("chat-container");
  const statusLight = document.getElementById("status-light");
  const statusGlow = document.getElementById("status-glow");
  const statusText = document.getElementById("status-text");
  const listeningIndicator = document.getElementById("listening-indicator");
  const speakingIndicator = document.getElementById("speaking-indicator");
  const micBtn = document.getElementById("mic-btn");
  const micIcon = document.getElementById("mic-icon");
  const stopSpeechBtn = document.getElementById("stop-speech-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const clearChatBtn = document.getElementById("clear-chat-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettings = document.getElementById("close-settings");
  const saveSettings = document.getElementById("save-settings");
  const testVoice = document.getElementById("test-voice");
  const voiceSelect = document.getElementById("voice-select");
  const speechRate = document.getElementById("speech-rate");
  const rateValue = document.getElementById("rate-value");
  const speechPitch = document.getElementById("speech-pitch");
  const pitchValue = document.getElementById("pitch-value");
  const languageSelect = document.getElementById("language-select");
  const uploadImageBtn = document.getElementById("upload-image-btn");

  // App Configuration
  const config = {
    wakeWords: {
      en: "jarvis",
      hi: "जार्विस",
      fr: "jarvis",
      de: "jarvis",
      hu: "jarvis",
      es: "jarvis",
      ar: "جارفيس",
      zh: "贾维斯",
      ja: "ジャービス",
      ru: "джарвис",
      pt: "jarvis",
      it: "jarvis",
    },
    sleepCommands: {
      en: "go to sleep",
      hi: "सो जाओ",
      fr: "va dormir",
      de: "schlaf jetzt",
      hu: "aludj most",
      es: "vete a dormir",
      ar: "اذهب للنوم",
      zh: "去睡觉",
      ja: "眠りなさい",
      ru: "иди спать",
      pt: "vai dormir",
      it: "vai a dormire",
    },
    stopCommands: {
      en: "stop speaking",
      hi: "बोलना बंद करो",
      fr: "arrête de parler",
      de: "hör auf zu sprechen",
      hu: "ne beszélj",
      es: "deja de hablar",
      ar: "توقف عن الكلام",
      zh: "停止说话",
      ja: "話すのをやめて",
      ru: "перестань говорить",
      pt: "pare de falar",
      it: "smetti di parlare",
    },
    aiModel: "gemini-1.5-flash-latest",
    defaultSearchEngine: "https://www.google.com/search?q=",
    defaultWebsitePrefix: "https://www.",
    defaultWebsiteSuffix: ".com",
    micReactivationDelay: 2000,
    maxStoredMessages: 50,
  };

  // App State
  let isActive = false;
  let isListening = false;
  let isProcessing = false; // Added to track processing state
  let lastProcessedQuery = ""; // Added for deduplication
  let lastProcessedTime = 0; // Added for deduplication
  const QUERY_COOLDOWN = 2000; // 2 seconds cooldown
  let recognition;
  let isSpeaking = false;
  const synth = window.speechSynthesis;

  // Voice Settings
  let voiceSettings = {
    voiceType: "default",
    rate: 1,
    pitch: 1,
    language: "en",
  };

  // Current language commands
  let currentCommands = {
    wakeWord: config.wakeWords.en,
    sleepCommand: config.sleepCommands.en,
    stopCommand: config.stopCommands.en,
  };

  // Initialize Gemini chat
  function initGeminiChat(modelName = config.aiModel) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.9,
      },
    });
    chat = model.startChat({
      history: [],
    });
  }

  // Initialize speech recognition
  function initSpeechRecognition() {
    recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceSettings.language;

    recognition.onstart = () => {
      isListening = true;
      micIcon.className = "fas fa-microphone-slash text-xl";
      listeningIndicator.classList.remove("hidden");
      micBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
      micBtn.classList.add("neon-btn-danger");
      micBtn.classList.add("animate-pulse");
    };

    recognition.onend = () => {
      if (recognition) recognition.stop();
      isListening = false;
      micIcon.className = "fas fa-microphone text-xl";
      listeningIndicator.classList.add("hidden");
      micBtn.classList.remove("neon-btn-danger");
      micBtn.classList.add("neon-btn");
      micBtn.classList.remove("animate-pulse");
    };

    recognition.onresult = (event) => {
      const results = event.results;
      const last = results[results.length - 1];

      if (last.isFinal && !isProcessing) {
        const transcript = last[0].transcript.trim().toLowerCase();
        processVoiceCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      addMessage("assistant", getLanguageResponse("speechNotSupported"));
    };
  }

  // Process voice commands with deduplication
  function processVoiceCommand(transcript) {
    const now = Date.now();

    // Skip if this is the same as the last query within cooldown period
    if (
      transcript === lastProcessedQuery &&
      now - lastProcessedTime < QUERY_COOLDOWN
    ) {
      return;
    }

    lastProcessedQuery = transcript;
    lastProcessedTime = now;

    if (!isActive && transcript.includes(currentCommands.wakeWord)) {
      // Wake up the assistant
      isActive = true;
      statusLight.classList.add("bg-green-500");
      statusGlow.classList.add("opacity-100");
      statusText.textContent = getLanguageResponse("activeStatus");
      addMessage("assistant", getLanguageResponse("wakeResponse"));
      speak(getLanguageResponse("wakeResponse"));
    } else if (isActive && transcript.includes(currentCommands.sleepCommand)) {
      // Put assistant to sleep
      isActive = false;
      statusLight.classList.remove("bg-green-500");
      statusGlow.classList.remove("opacity-100");
      statusText.textContent = getLanguageResponse("sleepingStatus");
      addMessage("assistant", getLanguageResponse("sleepResponse"));
      speak(getLanguageResponse("sleepResponse"));
    } else if (isActive && transcript.includes(currentCommands.stopCommand)) {
      // Stop speaking
      stopSpeaking();
    } else if (isActive) {
      // Process user query
      addMessage("user", transcript);
      processCommand(transcript);
    }
  }

  // Process commands with processing lock
  async function processCommand(command) {
    const lowerCommand = command.toLowerCase();

    // Early return if command is too short
    if (!command || command.length < 3) return;

    // Check if already processing
    if (isProcessing) {
      addMessage("assistant", "I'm still processing your previous request...");
      return;
    }

    // Check for stop speaking command
    if (lowerCommand.includes(currentCommands.stopCommand)) {
      stopSpeaking();
      return;
    }

    // Check for wake word
    if (lowerCommand.includes(currentCommands.wakeWord)) {
      if (!isActive) {
        isActive = true;
        statusLight.className = "w-3 h-3 rounded-full bg-green-500";
        statusGlow.classList.add("opacity-100");
        setTimeout(() => {
          statusGlow.classList.remove("opacity-100");
        }, 1000);
        statusText.textContent = getLanguageResponse("activeStatus");
        const response = getLanguageResponse("wakeResponse");
        addMessage("assistant", response);
        speak(response);
      }
      return;
    }

    // Check for sleep command
    if (lowerCommand.includes(currentCommands.sleepCommand)) {
      if (isActive) {
        isActive = false;
        statusLight.className = "w-3 h-3 rounded-full bg-gray-500";
        statusText.textContent = getLanguageResponse("sleepingStatus");
        const response = getLanguageResponse("sleepResponse");
        addMessage("assistant", response);
        speak(response);
        stopVoiceRecognition();
      }
      return;
    }

    // Check for search command
    if (lowerCommand.includes("search") || lowerCommand.includes("look up")) {
      const query = command.replace(/search|look up/gi, "").trim();
      if (query) {
        searchGoogle(query);
        return;
      }
    }

    // Check for weather info
    if (
      /weather|temperature|temp|forecast|how hot|cold|humid|climate/i.test(
        lowerCommand
      )
    ) {
      handleWeatherQuery(command, addMessage, speak, voiceSettings.language);
      return;
    }

    // Check for image generation command
    if (
      lowerCommand.includes("generate image") ||
      lowerCommand.includes("create image") ||
      lowerCommand.includes("show me") ||
      (lowerCommand.includes("draw") && !lowerCommand.includes("drawer"))
    ) {
      if (!isActive) {
        addMessage("assistant", getLanguageResponse("sleepingResponse"));
        return;
      }

      // Extract and clean the prompt
      let prompt = command
        .replace(/generate image|create image|show me|draw/gi, "")
        .trim()
        .replace(/^of /i, "");

      if (!prompt) {
        addMessage(
          "assistant",
          "Please describe what image you'd like me to generate."
        );
        return;
      }

      // Add a message indicating we're generating the image
      const messageId = addMessage(
        "assistant",
        `Generating an image of: ${prompt}`,
        true
      );

      try {
        isProcessing = true;
        // Generate the image
        const result = await imageGenerator.generateImage(prompt);

        if (result && result.element) {
          // Create a container for the image in the chat
          const messageContainer = document.createElement("div");
          messageContainer.className = "message-image-container";
          messageContainer.appendChild(result.element);

          // Find the message we just created and append the image
          const messageElement = document.getElementById(`msg-${messageId}`);
          if (messageElement) {
            const contentElement = messageElement.querySelector(".msg-content");
            if (contentElement) {
              contentElement.appendChild(messageContainer);
            }
          }

          // Scroll to show the new image
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      } catch (error) {
        console.error("Image generation error:", error);
        addMessage(
          "assistant",
          "Sorry, I couldn't generate that image. Please try again."
        );
      } finally {
        isProcessing = false;
      }
      return;
    }

    // Check for image analysis command
    if (
      lowerCommand.includes("describe image") ||
      lowerCommand.includes("what's in this image") ||
      lowerCommand.includes("analyze image") ||
      (lowerCommand.includes("what") && lowerCommand.includes("image")) ||
      lowerCommand.includes("upload image")
    ) {
      if (!isActive) {
        addMessage("assistant", getLanguageResponse("sleepingResponse"));
        return;
      }

      let imageSource = null;

      // Case 1: URL provided in command
      const urlMatch = command.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch && urlMatch[0]) {
        imageSource = urlMatch[0];
      }
      // Case 2: User wants to upload an image
      else if (lowerCommand.includes("upload image")) {
        addMessage(
          "assistant",
          "Please select an image file to analyze.",
          true
        );
        imageSource = await imageAnalyzer.promptForUpload();
        if (!imageSource) {
          addMessage("assistant", "Image upload canceled.");
          return;
        }
      }
      // Case 3: No source specified
      else {
        addMessage(
          "assistant",
          `Please either:<br>
          1. Provide an image URL after your request, or<br>
          2. Say "upload image" to select a file from your device`,
          true
        );
        return;
      }

      // Add analyzing message
      const messageId = addMessage(
        "assistant",
        imageSource instanceof File
          ? `Analyzing uploaded image: ${imageSource.name}`
          : `Analyzing image at: ${imageSource}`,
        true
      );

      try {
        isProcessing = true;
        const result = await imageAnalyzer.analyzeImage(imageSource);

        if (result.success) {
          const messageElement = document.getElementById(`msg-${messageId}`);
          if (messageElement) {
            const contentElement = messageElement.querySelector(".msg-content");
            if (contentElement) {
              contentElement.innerHTML = `
                <div class="image-analysis-result">
                  <div class="image-preview">
                    <img src="${
                      result.url
                    }" alt="Analyzed image" class="analyzed-image">
                    ${
                      result.sourceType === "file"
                        ? `<div class="image-source">Uploaded: ${imageSource.name}</div>`
                        : ""
                    }
                  </div>
                  <div class="image-description">
                    <h4>Image Analysis:</h4>
                    <p>${result.description}</p>
                  </div>
                </div>
              `;
            }
          }
        } else {
          addMessage(
            "assistant",
            `Sorry, I couldn't analyze that image: ${result.error}`
          );
        }
      } catch (error) {
        console.error("Image analysis error:", error);
        addMessage(
          "assistant",
          "Sorry, I encountered an error analyzing that image."
        );
      } finally {
        isProcessing = false;
      }
      return;
    }

    // Check for YouTube song command
    if (
      (lowerCommand.includes("play") || lowerCommand.includes("open")) &&
      (lowerCommand.includes("song") || lowerCommand.includes("music"))
    ) {
      const songQuery = command.replace(/play|open|song|music/gi, "").trim();
      openYoutubeSong(songQuery);
      return;
    }

    // Check for YouTube command
    if (lowerCommand.includes("open youtube")) {
      openWebsite("youtube.com");
      return;
    }

    // Check for website opening command
    if (lowerCommand.includes("open")) {
      const websiteName = extractWebsiteName(command);
      if (websiteName) {
        openWebsite(websiteName);
      } else {
        addMessage("assistant", getLanguageResponse("specifyWebsite"));
      }
      return;
    }

    // Check for clear chat command
    if (
      lowerCommand.includes("clear chat") ||
      lowerCommand.includes("clear messages")
    ) {
      clearAllMessages();
      addMessage("assistant", getLanguageResponse("chatCleared"));
      return;
    }

    // Process normal command if active
    if (isActive) {
      getAIResponse(command);
    } else {
      addMessage("assistant", getLanguageResponse("sleepingResponse"));
    }
  }

  // Start voice recognition
  function startVoiceRecognition() {
    if (!recognition) {
      initSpeechRecognition();
    }

    try {
      recognition.lang = voiceSettings.language;
      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      addMessage("assistant", getLanguageResponse("speechNotSupported"));
    }
  }

  // Stop voice recognition
  function stopVoiceRecognition() {
    if (recognition) {
      recognition.stop();
    }
    isListening = false;
    listeningIndicator.classList.add("hidden");
    micIcon.classList.remove("fa-microphone-slash");
    micIcon.classList.add("fa-microphone");
  }

  // Toggle voice recognition
  function toggleVoiceRecognition() {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  }

  // Get AI response with processing lock
  async function getAIResponse(query) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const thinkingId = addMessage(
        "assistant",
        `
          <div class="typing-indicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
          </div>
        `,
        true
      );

      // Add abort controller for better cleanup
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Use Gemini AI
      const result = await chat.sendMessage(query, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const response = await result.response;
      const fullResponse = response.text();

      removeMessage(thinkingId);

      // Only proceed if we're still active (user hasn't canceled)
      if (isActive) {
        const messageId = addMessage("assistant", "", true);
        const responseElement = document
          .getElementById(`msg-${messageId}`)
          .querySelector(".msg-content");

        responseElement.innerHTML = `<div class="ai-response">${formatAIResponse(
          fullResponse
        )}</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Save the full AI response to localStorage
        saveMessages("assistant", fullResponse);
        speak(fullResponse);
      }
    } catch (error) {
      // Handle errors appropriately
      if (error.name !== "AbortError") {
        console.error("AI Error:", error);
        const errorMessage = getLanguageResponse("aiError");
        addMessage("assistant", errorMessage);
        saveMessages("assistant", errorMessage);
      }
    } finally {
      isProcessing = false;
    }
  }

  // Format AI response
  function formatAIResponse(text) {
    // First clean up the markdown formatting
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<span class="bold-gradient">$1</span>') // Handle bold text
      .replace(/\*(.*?)\*/g, '<span class="italic-text">$1</span>') // Handle italic text
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>') // Handle inline code
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="code-block"><code>$1</code></pre>'
      ) // Handle code blocks
      .replace(/^# (.*$)/gm, '<h1 class="ai-heading">$1</h1>') // Handle h1
      .replace(/^## (.*$)/gm, '<h2 class="ai-subheading">$1</h2>') // Handle h2
      .replace(/^### (.*$)/gm, '<h3 class="ai-subheading">$1</h3>') // Handle h3
      .replace(/^#### (.*$)/gm, '<h4 class="ai-subheading">$1</h4>') // Handle h4
      .replace(/^##### (.*$)/gm, '<h5 class="ai-subheading">$1</h5>') // Handle h5
      .replace(/^###### (.*$)/gm, '<h6 class="ai-subheading">$1</h6>') // Handle h6
      .replace(/---/g, '<hr class="ai-divider">') // Handle horizontal rules
      .replace(/^\s*[-•*]\s+(.*$)/gm, '<li class="colorful-bullet">$1</li>') // Handle bullet points
      .replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="numbered-item">$1</li>') // Handle numbered lists
      .replace(/^>\s*(.*$)/gm, '<blockquote class="ai-quote">$1</blockquote>') // Handle blockquotes
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" class="ai-link" target="_blank">$1</a>'
      ) // Handle links
      .replace(/\n/g, "<br>"); // Handle line breaks

    // Wrap bullet points in lists
    formatted = formatted.replace(
      /(<li class="colorful-bullet">.*?<\/li>(<br>)?)+/g,
      '<ul class="ai-bullet-list">$&</ul>'
    );
    formatted = formatted.replace(
      /(<li class="numbered-item">.*?<\/li>(<br>)?)+/g,
      '<ol class="ai-numbered-list">$&</ol>'
    );

    // Handle paragraphs (text between two line breaks)
    formatted = formatted.replace(
      /([^<>]+)(<br><br>|$)/g,
      '<p class="ai-paragraph">$1</p>'
    );

    return `<div class="ai-message-content">${formatted}</div>`;
  }

  // Stop speaking
  function stopSpeaking() {
    if (synth.speaking) {
      synth.cancel();
      isSpeaking = false;
      speakingIndicator.classList.add("hidden");
      stopSpeechBtn.classList.add("hidden");
      addMessage("assistant", getLanguageResponse("speechStopped"));

      if (isListening) {
        setTimeout(() => {
          startVoiceRecognition();
        }, config.micReactivationDelay);
      }
    }
  }

  // Speak text with better coordination
  function speak(text) {
    // Cancel any ongoing speech
    if (synth.speaking) {
      synth.cancel();
      // Add small delay to ensure clean state
      return new Promise((resolve) => {
        setTimeout(() => {
          _speak(text);
          resolve();
        }, 300);
      });
    } else {
      return _speak(text);
    }
  }

  function _speak(text) {
    const wasListening = isListening;
    if (wasListening) stopVoiceRecognition();

    isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;

    const voices = synth.getVoices();
    let selectedVoice = null;

    if (voices.length > 0) {
      if (voiceSettings.voiceType === "male") {
        selectedVoice = voices.find(
          (v) =>
            v.name.includes("Male") ||
            v.name.includes("male") ||
            v.name.includes("David") ||
            v.name.includes("Alex")
        );
      } else if (voiceSettings.voiceType === "female") {
        selectedVoice = voices.find(
          (v) =>
            v.name.includes("Female") ||
            v.name.includes("female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Zira") ||
            v.name.includes("Karen")
        );
      }

      if (!selectedVoice) {
        selectedVoice = voices.find((v) => v.default) || voices[0];
      }

      // Try to find a voice matching the current language
      const langCode = voiceSettings.language;
      const langVoices = voices.filter((v) => v.lang.startsWith(langCode));
      if (langVoices.length > 0) {
        // Prefer the selected voice type in the current language
        const matchingVoice = langVoices.find(
          (v) =>
            (voiceSettings.voiceType === "male" &&
              v.name.toLowerCase().includes("male")) ||
            (voiceSettings.voiceType === "female" &&
              v.name.toLowerCase().includes("female")) ||
            voiceSettings.voiceType === "default"
        );
        if (matchingVoice) {
          selectedVoice = matchingVoice;
        } else {
          selectedVoice = langVoices[0];
        }
      }

      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      speakingIndicator.classList.remove("hidden");
      stopSpeechBtn.classList.remove("hidden");
    };

    utterance.onend = utterance.onerror = () => {
      isSpeaking = false;
      speakingIndicator.classList.add("hidden");
      stopSpeechBtn.classList.add("hidden");

      if (wasListening) {
        setTimeout(() => {
          startVoiceRecognition();
        }, config.micReactivationDelay);
      }
    };

    synth.speak(utterance);
  }
  // Test voice settings
  function testVoiceSettings() {
    const testTexts = {
      en: "This is a test of your current voice settings. You can adjust the voice type, rate and pitch to your preference.",
      hi: "यह आपकी वर्तमान आवाज सेटिंग्स का परीक्षण है। आप आवाज प्रकार, गति और पिच को अपनी पसंद के अनुसार समायोजित कर सकते हैं।",
      fr: "Ceci est un test de vos paramètres vocaux actuels. Vous pouvez ajuster le type de voix, la vitesse et la hauteur selon vos préférences.",
      de: "Dies ist ein Test Ihrer aktuellen Stimmeinstellungen. Sie können den Stimmentyp, die Geschwindigkeit und die Tonhöhe nach Ihren Wünschen anpassen.",
      hu: "Ez az aktuális hangbeállítások tesztelése. A hang típusát, sebességét és magasságát saját preferenciái szerint állíthatja be.",
      es: "Esta es una prueba de la configuración actual de su voz. Puede ajustar el tipo de voz, la velocidad y el tono según sus preferencias.",
      ar: "هذا اختبار لإعدادات الصوت الحالية الخاصة بك. يمكنك ضبط نوع الصوت والمعدل والدرجة حسب تفضيلاتك.",
      zh: "这是对您当前语音设置的测试。您可以根据自己的喜好调整语音类型、语速和音高。",
      ja: "これは現在の音声設定のテストです。音声の種類、速度、高さをお好みに合わせて調整できます。",
      ru: "Это тест ваших текущих голосовых настроек. Вы можете настроить тип голоса, скорость и высоту тона по своему усмотрению.",
      pt: "Este é um teste das configurações de voz atuais. Você pode ajustar o tipo de voz, velocidade e tom de acordo com sua preferência.",
      it: "Questo è un test delle impostazioni vocali correnti. Puoi regolare il tipo di voce, la velocità e l'altezza in base alle tue preferenze.",
    };

    const testText = testTexts[voiceSettings.language] || testTexts.en;
    speak(testText);
  }

  // Add message to chat
  function addMessage(sender, text, returnId = false, skipSave = false) {
    const messageId = Date.now();
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";
    messageDiv.id = `msg-${messageId}`;

    // Check if the text is already HTML (contains tags)
    const isAlreadyFormatted = /<[a-z][\s\S]*>/i.test(text);

    const displayContent =
      sender === "assistant" && !isAlreadyFormatted
        ? formatAIResponse(text)
        : text;

    if (sender === "user") {
      messageDiv.innerHTML = `
        <div class="flex items-start space-x-2 justify-end">
          <div class="max-w-[85%] bg-blue-500/20 rounded-xl p-3">
            <p class="text-white">${displayContent}</p>
          </div>
          <div class="bg-blue-500/20 rounded-full w-8 h-8 flex items-center justify-center">
            <i class="fas fa-user text-blue-300"></i>
          </div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="flex items-start space-x-2">
          <div class="bg-blue-500/20 rounded-full w-8 h-8 flex items-center justify-center">
            <i class="fas fa-robot text-blue-400"></i>
          </div>
          <div class="max-w-[85%]">
            <p class="text-blue-400 font-medium">Jarvis:</p>
            <div class="msg-content">${displayContent}</div>
          </div>
        </div>
      `;
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (!skipSave) {
      // Save the original text, not the formatted version
      saveMessages(sender, text);
    }

    if (returnId) return messageId;
  }

  // Remove message from chat
  function removeMessage(id) {
    const message = document.getElementById(`msg-${id}`);
    if (message) message.remove();
  }

  // Save messages to localStorage
  function saveMessages(sender, text) {
    const messages = JSON.parse(localStorage.getItem("jarvisMessages") || "[]");
    messages.push({ sender, text, timestamp: new Date().toISOString() });

    // Keep only the most recent messages
    if (messages.length > config.maxStoredMessages) {
      messages.splice(0, messages.length - config.maxStoredMessages);
    }

    localStorage.setItem("jarvisMessages", JSON.stringify(messages));
  }

  // Load messages from localStorage
  function loadMessages() {
    const messages = JSON.parse(localStorage.getItem("jarvisMessages") || "[]");

    // Clear existing messages except the first welcome message
    while (chatContainer.children.length > 1) {
      chatContainer.removeChild(chatContainer.lastChild);
    }

    // Add stored messages
    messages.forEach((msg) => {
      addMessage(msg.sender, msg.text, false, true);
    });
  }

  // Clear chat history
  function clearChat() {
    localStorage.removeItem("jarvisMessages");

    // Clear chat container except the first welcome message
    while (chatContainer.children.length > 1) {
      chatContainer.removeChild(chatContainer.lastChild);
    }

    addMessage("assistant", getLanguageResponse("chatCleared"));
  }

  // Open settings modal
  function openSettings() {
    settingsModal.classList.remove("opacity-0", "pointer-events-none");
    settingsModal.classList.add("opacity-100");
    setTimeout(() => {
      settingsModal.querySelector("div").classList.remove("scale-95");
      settingsModal.querySelector("div").classList.add("scale-100");
    }, 10);
  }

  // Close settings modal
  function closeSettingsModal() {
    settingsModal.querySelector("div").classList.remove("scale-100");
    settingsModal.querySelector("div").classList.add("scale-95");
    setTimeout(() => {
      settingsModal.classList.remove("opacity-100");
      settingsModal.classList.add("opacity-0", "pointer-events-none");
    }, 300);
  }

  // Load settings from localStorage
  function loadSettings() {
    const savedSettings = JSON.parse(
      localStorage.getItem("jarvisVoiceSettings")
    );
    if (savedSettings) {
      voiceSettings = savedSettings;

      // Update UI to reflect loaded settings
      voiceSelect.value = voiceSettings.voiceType;
      speechRate.value = voiceSettings.rate;
      speechPitch.value = voiceSettings.pitch;
      languageSelect.value = voiceSettings.language;

      // Update displayed values
      updateRateValue();
      updatePitchValue();

      // Update current commands based on language
      updateLanguageCommands();
    }
  }

  // Save voice settings to localStorage
  function saveVoiceSettings() {
    voiceSettings = {
      voiceType: voiceSelect.value,
      rate: parseFloat(speechRate.value),
      pitch: parseFloat(speechPitch.value),
      language: languageSelect.value,
    };

    localStorage.setItem("jarvisVoiceSettings", JSON.stringify(voiceSettings));
    updateLanguageCommands();

    addMessage("assistant", getLanguageResponse("settingsSaved"));
    speak(getLanguageResponse("settingsSaved"));
    closeSettingsModal();
  }

  // Update rate value display
  function updateRateValue() {
    const rate = parseFloat(speechRate.value);
    voiceSettings.rate = rate;

    if (rate < 0.8) {
      rateValue.textContent = getLanguageResponse("slow");
    } else if (rate > 1.2) {
      rateValue.textContent = getLanguageResponse("fast");
    } else {
      rateValue.textContent = getLanguageResponse("normal");
    }
  }

  // Update pitch value display
  function updatePitchValue() {
    const pitch = parseFloat(speechPitch.value);
    voiceSettings.pitch = pitch;

    if (pitch < 0.8) {
      pitchValue.textContent = getLanguageResponse("low");
    } else if (pitch > 1.2) {
      pitchValue.textContent = getLanguageResponse("high");
    } else {
      pitchValue.textContent = getLanguageResponse("normal");
    }
  }

  // Update language commands based on current language
  function updateLanguageCommands() {
    currentCommands = {
      wakeWord: config.wakeWords[voiceSettings.language] || config.wakeWords.en,
      sleepCommand:
        config.sleepCommands[voiceSettings.language] || config.sleepCommands.en,
      stopCommand:
        config.stopCommands[voiceSettings.language] || config.stopCommands.en,
    };

    // Update recognition language if it's running
    if (recognition && isListening) {
      recognition.stop();
      recognition.lang = voiceSettings.language;
      setTimeout(() => recognition.start(), 500);
    }
  }

  // Extract website name from command
  function extractWebsiteName(command) {
    const cleanCommand = command.toLowerCase().replace("open", "").trim();
    const websiteName = cleanCommand.split(/\s+/)[0];

    if (websiteName === "google") return "google.com";
    if (websiteName === "facebook") return "facebook.com";
    if (websiteName === "twitter") return "twitter.com";
    if (websiteName === "instagram") return "instagram.com";

    return websiteName;
  }

  // Open YouTube song
  function openYoutubeSong(songName) {
    const encodedSong = encodeURIComponent(songName);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedSong}`;
    addMessage(
      "assistant",
      `${getLanguageResponse("searchingYoutube")}: ${songName}`
    );
    window.open(youtubeUrl, "_blank");
  }

  // Open website
  function openWebsite(websiteName) {
    // Temporarily stop listening while opening website
    const wasListening = isListening;
    if (wasListening) {
      stopVoiceRecognition();
    }

    // Clean the website name
    websiteName = websiteName.toLowerCase().trim();

    // Remove common prefixes/suffixes if present
    websiteName = websiteName.replace(/^https?:\/\//, "");
    websiteName = websiteName.replace(/^www\./, "");
    websiteName = websiteName.replace(/\/$/, "");

    // Try to construct the URL
    let websiteUrl;

    // Check if it's a known domain with special handling
    if (websiteName.includes(".")) {
      // If it already has a domain extension
      websiteUrl = `https://www.${websiteName}`;
    } else {
      // Default to .com
      websiteUrl = `https://www.${websiteName}.com`;
    }

    addMessage("assistant", `${getLanguageResponse("opening")} ${websiteName}`);

    // Open website in new tab
    const newWindow = window.open(websiteUrl, "_blank");

    // Restore mic state after a delay
    if (wasListening) {
      setTimeout(() => {
        if (!isListening) {
          startVoiceRecognition();
        }
      }, 1000);
    }
  }

  // Search Google
  function searchGoogle(query) {
    try {
      // Validate input
      if (!query || typeof query !== "string" || query.trim() === "") {
        addMessage("assistant", "Please provide a valid search query");
        return;
      }

      // Store voice recognition state
      const wasListening = isListening;
      if (wasListening) {
        stopVoiceRecognition();
      }

      // Create search URL with proper encoding
      const cleanQuery = query.trim();
      const encodedQuery = encodeURIComponent(cleanQuery);
      const searchUrl = `${config.defaultSearchEngine}${encodedQuery}`;

      // Attempt to open the search in a new tab
      const newWindow = window.open(searchUrl, "_blank");

      if (
        !newWindow ||
        newWindow.closed ||
        typeof newWindow.closed === "undefined"
      ) {
        // If popup was blocked, provide clickable link
        addMessage(
          "assistant",
          `Popup was blocked. <a href="${searchUrl}" target="_blank">Click here to search for "${cleanQuery}"</a>`
        );
      } else {
        // Success case
        addMessage("assistant", `Searching for "${cleanQuery}"`);
      }

      // Restore mic state if needed
      if (wasListening) {
        setTimeout(() => {
          if (!isListening) {
            startVoiceRecognition();
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error in searchGoogle:", error);
      addMessage("assistant", `Failed to search for "${query}"`);
    }
  }

  // Get language-specific response
  function getLanguageResponse(type) {
    const responses = {
      wakeResponse: {
        en: "Yes, I'm listening. How can I help you?",
        hi: "हाँ, मैं सुन रहा हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
        fr: "Oui, je vous écoute. Comment puis-je vous aider?",
        de: "Ja, ich höre zu. Wie kann ich Ihnen helfen?",
        hu: "Igen, hallom. Hogyan segíthetek?",
        es: "Sí, estoy escuchando. ¿Cómo puedo ayudarte?",
        ar: "نعم، أنا أستمع. كيف يمكنني مساعدتك؟",
        zh: "是的，我在听。我该如何帮助你？",
        ja: "はい、聞いています。どうすればお手伝いできますか？",
        ru: "Да, я слушаю. Как я могу вам помочь?",
        pt: "Sim, estou ouvindo. Como posso te ajudar?",
        it: "Sì, ti sto ascoltando. Come posso aiutarti?",
      },
      sleepResponse: {
        en: `Going to sleep. Say "${currentCommands.wakeWord}" to wake me up again.`,
        hi: `सो रहा हूँ। मुझे फिर से जगाने के लिए "${currentCommands.wakeWord}" कहें।`,
        fr: `Je m'endors. Dites "${currentCommands.wakeWord}" pour me réveiller.`,
        de: `Ich gehe schlafen. Sage "${currentCommands.wakeWord}" um mich wieder zu wecken.`,
        hu: `Elmegyek aludni. Mondja "${currentCommands.wakeWord}" hogy felébresszen.`,
        es: `Me voy a dormir. Di "${currentCommands.wakeWord}" para despertarme.`,
        ar: `أنا ذاهب للنوم. قل "${currentCommands.wakeWord}" لإيقاظي مرة أخرى.`,
        zh: `我要睡觉了。说"${currentCommands.wakeWord}"可以再次唤醒我。`,
        ja: `眠ります。"${currentCommands.wakeWord}"と言ってまた起こしてください。`,
        ru: `Я иду спать. Скажите "${currentCommands.wakeWord}" чтобы разбудить меня.`,
        pt: `Indo dormir. Diga "${currentCommands.wakeWord}" para me acordar novamente.`,
        it: `Sto andando a dormire. Di "${currentCommands.wakeWord}" per svegliarmi.`,
      },
      sleepingResponse: {
        en: `I'm currently sleeping. Say "${currentCommands.wakeWord}" to wake me up.`,
        hi: `मैं अभी सो रहा हूँ। मुझे जगाने के लिए "${currentCommands.wakeWord}" कहें।`,
        fr: `Je suis actuellement en sommeil. Dites "${currentCommands.wakeWord}" pour me réveiller.`,
        de: `Ich schlafe gerade. Sage "${currentCommands.wakeWord}" um mich zu wecken.`,
        hu: `Jelenleg alszom. Mondja "${currentCommands.wakeWord}" hogy felébresszen.`,
        es: `Actualmente estoy durmiendo. Di "${currentCommands.wakeWord}" para despertarme.`,
        ar: `أنا نائم حاليا. قل "${currentCommands.wakeWord}" لإيقاظي.`,
        zh: `我正在睡觉。说"${currentCommands.wakeWord}"可以唤醒我。`,
        ja: `現在眠っています。"${currentCommands.wakeWord}"と言って起こしてください。`,
        ru: `Я сейчас сплю. Скажите "${currentCommands.wakeWord}" чтобы разбудить меня.`,
        pt: `Atualmente estou dormindo. Diga "${currentCommands.wakeWord}" para me acordar.`,
        it: `Attualmente sto dormendo. Di "${currentCommands.wakeWord}" per svegliarmi.`,
      },
      speechStopped: {
        en: "Speech stopped.",
        hi: "बोलना बंद कर दिया।",
        fr: "Discours arrêté.",
        de: "Sprache gestoppt.",
        hu: "Beszéd leállítva.",
        es: "Discurso detenido.",
        ar: "توقف الكلام.",
        zh: "语音已停止。",
        ja: "音声を停止しました。",
        ru: "Речь остановлена.",
        pt: "Fala parada.",
        it: "Discorso fermato.",
      },
      specifyWebsite: {
        en: "Please specify a website name to open.",
        hi: "कृपया खोलने के लिए एक वेबसाइट नाम निर्दिष्ट करें।",
        fr: "Veuillez spécifier un nom de site Web à ouvrir.",
        de: "Bitte geben Sie einen Website-Namen zum Öffnen an.",
        hu: "Kérjük, adjon meg egy webhelynevet a megnyitáshoz.",
        es: "Por favor especifique un nombre de sitio web para abrir.",
        ar: "يرجى تحديد اسم موقع لفتحه.",
        zh: "请指定要打开的网站名称。",
        ja: "開くウェブサイト名を指定してください。",
        ru: "Пожалуйста, укажите название сайта для открытия.",
        pt: "Por favor, especifique um nome de site para abrir.",
        it: "Si prega di specificare un nome di sito web da aprire.",
      },
      searchingYoutube: {
        en: "Searching YouTube for",
        hi: "यूट्यूब पर खोज रहा है",
        fr: "Recherche sur YouTube pour",
        de: "Suche auf YouTube nach",
        hu: "Keresés a YouTube-on",
        es: "Buscando en YouTube",
        ar: "البحث على يوتيوب عن",
        zh: "正在YouTube上搜索",
        ja: "YouTubeで検索中",
        ru: "Поиск на YouTube",
        pt: "Pesquisando no YouTube por",
        it: "Cercando su YouTube",
      },
      opening: {
        en: "Opening",
        hi: "खोल रहा है",
        fr: "Ouverture de",
        de: "Öffne",
        hu: "Megnyitás",
        es: "Abriendo",
        ar: "فتح",
        zh: "正在打开",
        ja: "開いています",
        ru: "Открытие",
        pt: "Abrindo",
        it: "Apertura di",
      },
      settingsSaved: {
        en: "Settings saved successfully",
        hi: "सेटिंग्स सफलतापूर्वक सहेजी गईं",
        fr: "Paramètres enregistrés avec succès",
        de: "Einstellungen erfolgreich gespeichert",
        hu: "Beállítások sikeresen mentve",
        es: "Configuración guardada correctamente",
        ar: "تم حفظ الإعدادات بنجاح",
        zh: "设置已成功保存",
        ja: "設定が正常に保存されました",
        ru: "Настройки успешно сохранены",
        pt: "Configurações salvas com sucesso",
        it: "Impostazioni salvate con successo",
      },
      speechNotSupported: {
        en: "Speech recognition is not supported in your browser.",
        hi: "आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।",
        fr: "La reconnaissance vocale n'est pas prise en charge dans votre navigateur.",
        de: "Spracherkennung wird in Ihrem Browser nicht unterstützt.",
        hu: "A beszédfelismerés nem támogatott a böngészőjében.",
        es: "El reconocimiento de voz no es compatible en su navegador.",
        ar: "التعرف على الكلام غير مدعوم في متصفحك.",
        zh: "您的浏览器不支持语音识别。",
        ja: "お使いのブラウザでは音声認識がサポートされていません。",
        ru: "Распознавание речи не поддерживается в вашем браузере.",
        pt: "O reconhecimento de fala não é suportado no seu navegador.",
        it: "Il riconoscimento vocale non è supportato nel tuo browser.",
      },
      aiError: {
        en: "Sorry, I encountered an error processing your request.",
        hi: "क्षमा करें, मैंने आपके अनुरोध को संसाधित करते समय एक त्रुटि का सामना किया।",
        fr: "Désolé, j'ai rencontré une erreur lors du traitement de votre demande.",
        de: "Entschuldigung, bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten.",
        hu: "Sajnálom, hiba történt a kérés feldolgozása során.",
        es: "Lo siento, encontré un error al procesar tu solicitud.",
        ar: "عذرا، واجهت خطأ أثناء معالجة طلبك.",
        zh: "抱歉，处理您的请求时遇到错误。",
        ja: "申し訳ありませんが、リクエストの処理中にエラーが発生しました。",
        ru: "Извините, я столкнулся с ошибкой при обработке вашего запроса.",
        pt: "Desculpe, encontrei um erro ao processar sua solicitação.",
        it: "Spiacente, ho riscontrato un errore durante l'elaborazione della tua richiesta.",
      },
      activeStatus: {
        en: "Active",
        hi: "सक्रिय",
        fr: "Actif",
        de: "Aktiv",
        hu: "Aktív",
        es: "Activo",
        ar: "نشط",
        zh: "活跃",
        ja: "アクティブ",
        ru: "Активный",
        pt: "Ativo",
        it: "Attivo",
      },
      sleepingStatus: {
        en: "Sleeping",
        hi: "सो रहा है",
        fr: "Dormir",
        de: "Schlafen",
        hu: "Alszik",
        es: "Durmiendo",
        ar: "نائم",
        zh: "睡眠中",
        ja: "スリープ中",
        ru: "Спящий",
        pt: "Dormindo",
        it: "Dormiente",
      },
      slow: {
        en: "Slow",
        hi: "धीमा",
        fr: "Lent",
        de: "Langsam",
        hu: "Lassú",
        es: "Lento",
        ar: "بطيء",
        zh: "慢",
        ja: "遅い",
        ru: "Медленно",
        pt: "Lento",
        it: "Lento",
      },
      fast: {
        en: "Fast",
        hi: "तेज़",
        fr: "Rapide",
        de: "Schnell",
        hu: "Gyors",
        es: "Rápido",
        ar: "سريع",
        zh: "快",
        ja: "速い",
        ru: "Быстро",
        pt: "Rápido",
        it: "Veloce",
      },
      normal: {
        en: "Normal",
        hi: "सामान्य",
        fr: "Normal",
        de: "Normal",
        hu: "Normál",
        es: "Normal",
        ar: "عادي",
        zh: "正常",
        ja: "通常",
        ru: "Нормальный",
        pt: "Normal",
        it: "Normale",
      },
      low: {
        en: "Low",
        hi: "कम",
        fr: "Bas",
        de: "Niedrig",
        hu: "Alacsony",
        es: "Bajo",
        ar: "منخفض",
        zh: "低",
        ja: "低い",
        ru: "Низкий",
        pt: "Baixo",
        it: "Basso",
      },
      high: {
        en: "High",
        hi: "उच्च",
        fr: "Haut",
        de: "Hoch",
        hu: "Magas",
        es: "Alto",
        ar: "عالي",
        zh: "高",
        ja: "高い",
        ru: "Высокий",
        pt: "Alto",
        it: "Alto",
      },
      chatCleared: {
        en: "Chat history has been cleared.",
        hi: "चैट इतिहास साफ कर दिया गया है।",
        fr: "L'historique de discussion a été effacé.",
        de: "Chat-Verlauf wurde gelöscht.",
        hu: "A csetelési előzmények törölve lettek.",
        es: "El historial de chat ha sido borrado.",
        ar: "تم مسح سجل الدردشة.",
        zh: "聊天记录已清除。",
        ja: "チャット履歴が消去されました。",
        ru: "История чата была очищена.",
        pt: "O histórico de chat foi limpo.",
        it: "La cronologia della chat è stata cancellata.",
      },
    };

    return responses[type][voiceSettings.language] || responses[type].en;
  }

  // Initialize event listeners
  micBtn.addEventListener("click", toggleVoiceRecognition);
  stopSpeechBtn.addEventListener("click", stopSpeaking);
  settingsBtn.addEventListener("click", openSettings);
  clearChatBtn.addEventListener("click", clearChat);
  closeSettings.addEventListener("click", closeSettingsModal);
  saveSettings.addEventListener("click", saveVoiceSettings);
  testVoice.addEventListener("click", testVoiceSettings);
  speechRate.addEventListener("input", updateRateValue);
  speechPitch.addEventListener("input", updatePitchValue);
  languageSelect.addEventListener("change", () => {
    voiceSettings.language = languageSelect.value;
    updateLanguageCommands();
  });
  uploadImageBtn.addEventListener("click", async () => {
    if (!isActive) {
      addMessage("assistant", getLanguageResponse("sleepingResponse"));
      return;
    }

    addMessage("assistant", "Please select an image file to analyze.", true);
    const file = await imageAnalyzer.promptForUpload();

    if (!file) {
      addMessage("assistant", "Image upload canceled.");
      return;
    }

    const messageId = addMessage(
      "assistant",
      `Analyzing uploaded image: ${file.name}`,
      true
    );

    try {
      const result = await imageAnalyzer.analyzeImage(file);

      if (result.success) {
        const messageElement = document.getElementById(`msg-${messageId}`);
        if (messageElement) {
          const contentElement = messageElement.querySelector(".msg-content");
          if (contentElement) {
            contentElement.innerHTML = `
              <div class="image-analysis-result">
                <div class="image-preview">
                  <img src="${result.url}" alt="Analyzed image" class="analyzed-image">
                  <div class="image-source">Uploaded: ${file.name}</div>
                </div>
                <div class="image-description">
                  <h4>Image Analysis:</h4>
                  <p>${result.description}</p>
                </div>
              </div>
            `;
          }
        }
      } else {
        addMessage(
          "assistant",
          `Sorry, I couldn't analyze that image: ${result.error}`
        );
      }
    } catch (error) {
      console.error("Image analysis error:", error);
      addMessage(
        "assistant",
        "Sorry, I encountered an error analyzing that image."
      );
    }
  });

  // Initialize the app
  initGeminiChat();
  loadSettings();
  loadMessages();

  // Load voices when they become available
  synth.onvoiceschanged = function () {
    // This ensures we have voices loaded when we need them
  };

  // Handle page visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isListening) {
      setTimeout(() => {
        stopVoiceRecognition();
        startVoiceRecognition();
      }, 500);
    }
  });
});
