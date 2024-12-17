const cityInput = document.querySelector('.city-input');
const searchBtn = document.querySelector('.search-btn');
const searchDropdown = document.getElementById('searchDropdown');
const searchHistoryContainer = document.getElementById('searchHistory');

const weatherInfoSection = document.querySelector('.weather-info');
const notFoundSection = document.querySelector('.not-found');
const searchCitySection = document.querySelector('.search-city');

const countryTxt = document.querySelector('.country-txt');
const tempTxt = document.querySelector('.temp-txt');
const conditionTxt = document.querySelector('.condition-txt');
const humidityValueTxt = document.querySelector('.humidity-value-txt');
const windValueTxt = document.querySelector('.wind-value-txt');
const weatherSummaryImg = document.querySelector('.weather-summary-img');
const currentDateTxt = document.querySelector('.current-date-txt');

const forecastItemsContainer = document.querySelector('.forecast-items-container');

const apiKey = 'c204e6fb52b44d2758c8d715c9ccea14';
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Event listener to show dropdown and search history
cityInput.addEventListener('click', () => {
    displaySearchHistory();
    searchDropdown.style.display = 'block';
});

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-container')) {
        searchDropdown.style.display = 'none';
    }
});

searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleSearch();
});

function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        updateWeatherInfo(city);
        saveToHistory(city);
        cityInput.value = '';
        searchDropdown.style.display = 'none';
    }
}

// Fetch data from the API
async function getFetchData(endpoint, queryParams) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/${endpoint}?${queryParams}&appid=${apiKey}&units=metric`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('City not found');
    return await response.json();
}

// Geolocation to get weather for the current location
function getWeatherForCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async ({ coords: { latitude, longitude } }) => {
                try {
                    // Fetch weather data for the current coordinates
                    const weatherData = await getFetchData('weather', `lat=${latitude}&lon=${longitude}`);
                    displayWeatherData(weatherData);
                    await updateForecastsInfo(weatherData.name); // Use city name from the data
                    showDisplaySection(weatherInfoSection);
                } catch (error) {
                    console.error('Error fetching location-based weather data:', error);
                    alert('Could not retrieve weather data for your current location.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Geolocation is disabled or unavailable.');
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Display weather information
function displayWeatherData(weatherData) {
    const { name: country, main: { temp, humidity }, weather: [{ id, main }], wind: { speed } } = weatherData;

    countryTxt.textContent = country;
    tempTxt.textContent = `${Math.round(temp)} °C`;
    conditionTxt.textContent = main;
    humidityValueTxt.textContent = `${humidity} %`;
    windValueTxt.textContent = `${speed} M/s`;
    currentDateTxt.textContent = getCurrentDate();
    weatherSummaryImg.src = `assets/weather/${getWeatherIcon(id)}`;
}

// Update weather information based on city name
async function updateWeatherInfo(city) {
    try {
        const weatherData = await getFetchData('weather', `q=${city}`);
        displayWeatherData(weatherData);
        await updateForecastsInfo(city);
        showDisplaySection(weatherInfoSection);
    } catch (error) {
        console.error('Error:', error);
        showDisplaySection(notFoundSection);
    }
}

// Display search history in the dropdown
function displaySearchHistory() {
    searchHistoryContainer.innerHTML = `
        <p class="dropdown-item" id="current-location" onclick="getWeatherForCurrentLocation()">Get weather for my location</p>
    `;
    searchHistory.forEach(city => {
        const item = document.createElement('p');
        item.classList.add('dropdown-item');
        item.textContent = city;
        item.onclick = () => {
            cityInput.value = city;
            updateWeatherInfo(city);
            searchDropdown.style.display = 'none';
        };
        searchHistoryContainer.appendChild(item);
    });
}

// Save search to history and update local storage
function saveToHistory(city) {
    if (!searchHistory.includes(city)) {
        searchHistory.unshift(city);
        if (searchHistory.length > 5) searchHistory.pop();
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }
}

// Update 6-day forecast information
async function updateForecastsInfo(city) {
    try {
        const forecastData = await getFetchData('forecast', `q=${city}`);
        const forecastDates = {};

        forecastData.list.forEach(forecast => {
            const [forecastDate] = forecast.dt_txt.split(' ');
            if (!forecastDates[forecastDate]) {
                forecastDates[forecastDate] = { temps: [], weatherIds: [] };
            }
            forecastDates[forecastDate].temps.push(forecast.main.temp);
            forecastDates[forecastDate].weatherIds.push(forecast.weather[0].id);
        });

        forecastItemsContainer.innerHTML = '';
        Object.keys(forecastDates).slice(1, 6).forEach(date => {
            const avgTemp = Math.round(
                forecastDates[date].temps.reduce((a, b) => a + b, 0) / forecastDates[date].temps.length
            );
            const weatherId = forecastDates[date].weatherIds[0];

            const forecastItem = `
                <div class="forecast-item">
                    <h5 class="forecast-item-date regular-txt">${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h5>
                    <img src="assets/weather/${getWeatherIcon(weatherId)}" class="forecast-item-img">
                    <h5 class="forecast-item-temp">${avgTemp} °C</h5>
                </div>
            `;
            forecastItemsContainer.insertAdjacentHTML('beforeend', forecastItem);
        });
    } catch (error) {
        console.error('Error fetching forecast data:', error);
    }
}

function showDisplaySection(section) {
    [weatherInfoSection, searchCitySection, notFoundSection].forEach(s => s.style.display = 'none');
    section.style.display = 'flex';
}

// Helper function to get the current date
function getCurrentDate() {
    return new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

// Helper function to get weather icon based on weather ID
function getWeatherIcon(id) {
    if (id <= 232) return 'thunderstorm.svg';
    if (id <= 321) return 'drizzle.svg';
    if (id <= 531) return 'rain.svg';
    if (id <= 622) return 'snow.svg';
    if (id === 800) return 'clear.svg';
    if (id <= 781) return 'atmosphere.svg';
    return 'clouds.svg';
}
