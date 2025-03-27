// weather.js
const weatherConfig = {
  API_KEY: "37acc46646715d87002d2f94f7389db2",
  BASE_URL: "https://api.openweathermap.org/data/2.5/weather",
  ICON_URL: "https://openweathermap.org/img/wn/",
};

// Weather condition codes and their corresponding icons
const weatherIcons = {
  "01d": "☀️", // clear sky (day)
  "01n": "🌙", // clear sky (night)
  "02d": "⛅", // few clouds (day)
  "02n": "⛅", // few clouds (night)
  "03d": "☁️", // scattered clouds
  "03n": "☁️", // scattered clouds
  "04d": "☁️", // broken clouds
  "04n": "☁️", // broken clouds
  "09d": "🌧️", // shower rain
  "09n": "🌧️", // shower rain
  "10d": "🌦️", // rain (day)
  "10n": "🌧️", // rain (night)
  "11d": "⚡", // thunderstorm
  "11n": "⚡", // thunderstorm
  "13d": "❄️", // snow
  "13n": "❄️", // snow
  "50d": "🌫️", // mist
  "50n": "🌫️", // mist
};

// Language-specific weather responses
const weatherResponses = {
  en: {
    currentWeather: "Current weather in {city}: {temp}°C, {description} {icon}",
    feelsLike: "Feels like: {feels_like}°C",
    humidity: "Humidity: {humidity}%",
    wind: "Wind: {wind_speed} km/h",
    pressure: "Pressure: {pressure} hPa",
    error: "Sorry, I couldn't fetch weather data for {city}.",
    noLocation: "Please specify a location for weather information.",
  },
  hi: {
    currentWeather: "{city} का मौसम: {temp}°C, {description} {icon}",
    feelsLike: "महसूस हो रहा है: {feels_like}°C",
    humidity: "नमी: {humidity}%",
    wind: "हवा: {wind_speed} km/h",
    pressure: "दबाव: {pressure} hPa",
    error: "क्षमा करें, मैं {city} के लिए मौसम डेटा प्राप्त नहीं कर सका।",
    noLocation: "कृपया मौसम की जानकारी के लिए स्थान निर्दिष्ट करें।",
  },
  fr: {
    currentWeather: "Météo actuelle à {city}: {temp}°C, {description} {icon}",
    feelsLike: "Ressenti: {feels_like}°C",
    humidity: "Humidité: {humidity}%",
    wind: "Vent: {wind_speed} km/h",
    pressure: "Pression: {pressure} hPa",
    error: "Désolé, je n'ai pas pu récupérer les données météo pour {city}.",
    noLocation:
      "Veuillez spécifier un lieu pour les informations météorologiques.",
  },
};

const injectWeatherStyles = () => {
  const weatherStyles = `
  .weather-card {
    background: linear-gradient(135deg, #72b5f7 0%, #3a7bd5 100%);
    border-radius: 14px;
    padding: 14px;
    margin: 10px 0;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;
    transform: translateY(10px);
    opacity: 0;
    animation: fadeInUp 0.4s ease-out forwards;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 100%;
    box-sizing: border-box;
  }

  .weather-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .weather-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    gap: 10px;
  }

  .weather-city {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 4px 0;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .weather-desc {
    font-size: 0.85rem;
    margin: 0;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .weather-icon-temp {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .weather-temp {
    font-size: 1.8rem;
    font-weight: 300;
    margin: 0;
    min-width: 36px;
    text-align: center;
  }

  .weather-temp::after {
    content: '°C';
    font-size: 0.7rem;
    position: relative;
    top: -0.5rem;
    margin-left: 2px;
  }

  .weather-icon {
    font-size: 2rem;
    animation: float 3s ease-in-out infinite;
  }

  .weather-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-top: 10px;
  }

  .weather-detail {
    background: rgba(255, 255, 255, 0.12);
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .weather-detail i {
    font-size: 0.8rem;
    min-width: 14px;
    text-align: center;
  }

  .weather-detail span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Weather condition specific styles */
  .weather-card.sunny {
    background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  }

  .weather-card.cloudy {
    background: linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%);
  }

  .weather-card.rainy {
    background: linear-gradient(135deg, #4b79cf 0%, #283e51 100%);
  }

  .weather-card.thunderstorm {
    background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  }

  .weather-card.snowy {
    background: linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%);
    color: #333;
  }

  .weather-card.misty {
    background: linear-gradient(135deg, #606c88 0%, #3f4c6b 100%);
  }

  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  /* ==================== */
  /* Enhanced Mobile Styles */
  /* ==================== */
  @media (max-width: 640px) {
    .weather-card {
      padding: 12px;
      border-radius: 12px;
    }
    
    .weather-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .weather-icon-temp {
      width: 100%;
      justify-content: space-between;
      margin-top: 4px;
    }
    
    .weather-city {
      font-size: 1.1rem;
    }
    
    .weather-desc {
      font-size: 0.8rem;
    }
    
    .weather-temp {
      font-size: 1.6rem;
    }
    
    .weather-icon {
      font-size: 1.8rem;
    }
    
    .weather-details {
      grid-template-columns: repeat(2, 1fr);
      gap: 5px;
    }
    
    .weather-detail {
      padding: 5px 6px;
      font-size: 0.7rem;
    }
  }

  @media (max-width: 400px) {
    .weather-card {
      padding: 10px;
    }
    
    .weather-details {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .weather-city {
      font-size: 1rem;
    }
    
    .weather-temp {
      font-size: 1.5rem;
    }
    
    .weather-icon {
      font-size: 1.6rem;
    }
    
    .weather-detail {
      padding: 4px 6px;
    }
  }

  /* Smallest devices (e.g. iPhone SE) */
  @media (max-width: 320px) {
    .weather-card {
      padding: 8px;
      border-radius: 10px;
    }
    
    .weather-city {
      font-size: 0.95rem;
    }
    
    .weather-desc {
      font-size: 0.75rem;
    }
    
    .weather-temp {
      font-size: 1.4rem;
    }
    
    .weather-icon {
      font-size: 1.5rem;
    }
    
    .weather-detail {
      font-size: 0.65rem;
    }
  }
  `;

  const styleElement = document.createElement("style");
  styleElement.innerHTML = weatherStyles;
  document.head.appendChild(styleElement);

  // Add Font Awesome if not already present
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
    document.head.appendChild(faLink);
  }
};
// Call this once when your app loads
injectWeatherStyles();

async function handleWeatherQuery(query, addMessage, speak, language = "en") {
  try {
    // Extract location from query
    const location = extractLocationFromQuery(query, language);

    if (!location) {
      const noLocationMsg =
        weatherResponses[language]?.noLocation ||
        weatherResponses.en.noLocation;
      addMessage("assistant", noLocationMsg);
      speak(noLocationMsg);
      return;
    }

    // Fetch weather data
    const weatherData = await fetchWeatherData(location);

    if (!weatherData) {
      const errorMsg = (
        weatherResponses[language]?.error || weatherResponses.en.error
      ).replace("{city}", location);
      addMessage("assistant", formatErrorResponse(errorMsg));
      speak(errorMsg);
      return;
    }

    // Format weather response
    const weatherMessage = formatWeatherResponse(weatherData, language);
    addMessage("assistant", weatherMessage);
    speak(weatherMessage.replace(/<[^>]*>?/gm, "")); // Remove HTML tags for speech
  } catch (error) {
    console.error("Weather error:", error);
    const errorMsg =
      weatherResponses[language]?.error || weatherResponses.en.error;
    addMessage("assistant", formatErrorResponse(errorMsg));
    speak(errorMsg);
  }
}

function extractLocationFromQuery(query, language) {
  // Common weather-related phrases in different languages
  const weatherPhrases = {
    en: [
      "weather in",
      "weather of",
      "temperature in",
      "temperature of",
      "forecast for",
      "how is the weather in",
      "what is the weather in",
      "what is the weather of",
      "what is the temperature of",
      "what is the temperature in",
    ],
    hi: ["मौसम", "तापमान", "मौसम कैसा है"],
    fr: ["météo à", "température à", "prévisions pour"],
  };

  const phrases = weatherPhrases[language] || weatherPhrases.en;

  for (const phrase of phrases) {
    if (query.toLowerCase().includes(phrase)) {
      return query.split(phrase)[1].trim();
    }
  }

  // If no phrase matched, try to extract location after "weather" or "temperature"
  if (/weather|temperature|temp|forecast/i.test(query.toLowerCase())) {
    const parts = query.split(/weather|temperature|temp|forecast/i);
    if (parts.length > 1) {
      return parts[1].replace(/in|for|at|,/gi, "").trim();
    }
  }

  return null;
}

async function fetchWeatherData(location) {
  try {
    const response = await fetch(
      `${weatherConfig.BASE_URL}?q=${encodeURIComponent(
        location
      )}&units=metric&appid=${weatherConfig.API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return null;
  }
}

function formatWeatherResponse(weatherData, language) {
  const responses = weatherResponses[language] || weatherResponses.en;
  const iconCode = weatherData.weather[0].icon;
  const icon = weatherIcons[iconCode] || "";
  const weatherClass = getWeatherClass(weatherData.weather[0].main);

  const mainData = {
    city: weatherData.name,
    temp: Math.round(weatherData.main.temp),
    description: capitalizeFirstLetter(weatherData.weather[0].description),
    icon: icon,
    feels_like: Math.round(weatherData.main.feels_like),
    humidity: weatherData.main.humidity,
    wind_speed: Math.round(weatherData.wind.speed * 3.6),
    pressure: weatherData.main.pressure,
    sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    visibility: weatherData.visibility
      ? (weatherData.visibility / 1000).toFixed(1)
      : null,
  };

  return `
    <div class="weather-card ${weatherClass}">
      <div class="weather-header">
        <h2 class="weather-city">${mainData.city}</h2>
        <div class="weather-icon">${mainData.icon}</div>
      </div>
      
      <div class="weather-main">
        <p class="weather-temp">${mainData.temp}</p>
        <p class="weather-desc">${mainData.description}</p>
      </div>
      
      <div class="weather-details">
        <div class="weather-detail">
          <i class="fas fa-temperature-low"></i>
          ${responses.feelsLike.replace("{feels_like}", mainData.feels_like)}
        </div>
        <div class="weather-detail">
          <i class="fas fa-tint"></i>
          ${responses.humidity.replace("{humidity}", mainData.humidity)}
        </div>
        <div class="weather-detail">
          <i class="fas fa-wind"></i>
          ${responses.wind.replace("{wind_speed}", mainData.wind_speed)}
        </div>
        <div class="weather-detail">
          <i class="fas fa-tachometer-alt"></i>
          ${responses.pressure.replace("{pressure}", mainData.pressure)}
        </div>
        ${
          mainData.visibility
            ? `
        <div class="weather-detail">
          <i class="fas fa-eye"></i>
          Visibility: ${mainData.visibility} km
        </div>`
            : ""
        }
        <div class="weather-detail">
          <i class="fas fa-sun"></i>
          Sunrise: ${mainData.sunrise}
        </div>
        <div class="weather-detail">
          <i class="fas fa-moon"></i>
          Sunset: ${mainData.sunset}
        </div>
      </div>
    </div>
  `;
}

function formatErrorResponse(errorMsg) {
  return `
    <div class="weather-card weather-error">
      <div class="weather-header">
        <h2 class="weather-city">Error</h2>
      </div>
      <p>${errorMsg}</p>
    </div>
  `;
}

function getWeatherClass(weatherMain) {
  const weatherClasses = {
    Clear: "sunny",
    Clouds: "cloudy",
    Rain: "rainy",
    Drizzle: "rainy",
    Thunderstorm: "thunderstorm",
    Snow: "snowy",
    Mist: "misty",
    Fog: "misty",
    Haze: "misty",
  };
  return weatherClasses[weatherMain] || "";
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Export functions if using modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    handleWeatherQuery,
    fetchWeatherData,
    formatWeatherResponse,
    injectWeatherStyles,
  };
}
