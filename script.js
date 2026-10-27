const API_KEY = '0f153d20f931145362e9328e9b1f1965';
const FAVORITES_KEY = 'inge-meteo-favorites';
const RECENTS_KEY = 'inge-meteo-recents';
const THEME_KEY = 'inge-meteo-theme';
const MAX_RECENTS = 5;

const docTitle = document.title;
const cityInput = document.getElementById('city');
const weatherInfo = document.getElementById('weather-info');
const forecastInfo = document.getElementById('forecast-info');
const favoritesList = document.getElementById('favorites-list');
const recentList = document.getElementById('recent-list');
const searchSuggestions = document.getElementById('search-suggestions');
const searchStatus = document.getElementById('search-status');

window.addEventListener('blur', () => {
    document.title = 'Torna presto a vedere il meteo';
});
window.addEventListener('focus', () => {
    document.title = docTitle;
});

document.addEventListener('DOMContentLoaded', () => {
    renderFavorites();
    renderRecents();
    applySavedTheme();

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    cityInput.addEventListener('focus', showSearchSuggestions);
    cityInput.addEventListener('input', showSearchSuggestions);
    document.addEventListener('click', event => {
        if (!event.target.closest('.search-box')) {
            searchSuggestions.hidden = true;
        }
    });

    document.querySelector('.pol').addEventListener('click', event => {
        if (event.target.closest('a')) return;
        event.currentTarget.classList.add('hidden');
    });
});

async function getWeather(event) {
    event.preventDefault();
    const city = cityInput.value.trim();
    if (!city) {
        setStatus('Scrivi il nome di una città per iniziare.', true);
        cityInput.focus();
        return;
    }

    searchSuggestions.hidden = true;
    setStatus('Sto cercando le previsioni…');
    weatherInfo.innerHTML = '';
    forecastInfo.innerHTML = '';

    try {
        const query = encodeURIComponent(city);
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${API_KEY}&units=metric&lang=it`
        );
        if (!weatherResponse.ok) {
            throw new Error(weatherResponse.status === 404
                ? 'Non trovo questa città. Controlla il nome e riprova.'
                : 'Non riesco a recuperare il meteo in questo momento. Riprova tra poco.');
        }

        const weather = await weatherResponse.json();
        const canonicalCity = weather.name;
        renderCurrentWeather(weather);
        updateWeatherScene(weather.weather[0].main);
        const recentSaved = saveRecent(canonicalCity);
        renderFavorites();

        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${query}&appid=${API_KEY}&units=metric&lang=it`
        );
        if (!forecastResponse.ok) {
            throw new Error('Il meteo attuale è disponibile, ma non riesco a caricare le previsioni future.');
        }
        const forecast = await forecastResponse.json();
        renderForecast(forecast.list);
        setStatus(
            recentSaved
                ? `Meteo aggiornato per ${canonicalCity}.`
                : `Meteo aggiornato per ${canonicalCity}, ma non riesco a salvare le ricerche nel browser.`,
            !recentSaved
        );
        document.getElementById('disclaimer-title').hidden = false;
        document.getElementById('disclaimer-text').hidden = false;
    } catch (error) {
        setStatus(error.message, true);
        if (!weatherInfo.hasChildNodes()) {
            forecastInfo.innerHTML = '';
        }
    }
}

function renderCurrentWeather(data) {
    const condition = data.weather[0];
    const card = document.createElement('article');
    card.className = 'weather-card';
    card.innerHTML = `
        <div class="weather-card-top">
            <div>
                <p class="eyebrow">METEO ATTUALE</p>
                <h2 class="weather-city"></h2>
                <p class="weather-description"></p>
            </div>
            <img class="weather-icon" alt="" />
        </div>
        <div class="temperature">${data.main.temp}<span>°C</span></div>
        <p class="feels-like"></p>
        <div class="weather-details">
            <div><span>Umidità</span><strong class="humidity"></strong></div>
            <div><span>Vento</span><strong class="wind"></strong></div>
            <div><span>Pressione</span><strong class="pressure"></strong></div>
            <div><span>Direzione</span><strong class="wind-direction"></strong></div>
        </div>
        <button class="favorite-toggle" type="button" aria-pressed="false"></button>
    `;

    card.querySelector('.weather-city').textContent = `${data.name}, ${data.sys.country}`;
    card.querySelector('.weather-description').textContent =
        condition.description.charAt(0).toUpperCase() + condition.description.slice(1);
    card.querySelector('.weather-icon').src =
        `https://openweathermap.org/img/wn/${condition.icon}@2x.png`;
    card.querySelector('.weather-icon').alt = condition.description;
    card.querySelector('.feels-like').textContent = `Percepita ${data.main.feels_like}°C`;
    card.querySelector('.humidity').textContent = `${data.main.humidity}%`;
    card.querySelector('.wind').textContent = `${data.wind.speed} m/s`;
    card.querySelector('.pressure').textContent = `${data.main.pressure} hPa`;
    card.querySelector('.wind-direction').textContent =
        `${data.wind.deg === undefined ? '—' : `${data.wind.deg}°`}`;

    const favoriteButton = card.querySelector('.favorite-toggle');
    favoriteButton.addEventListener('click', () => toggleFavorite(data.name));
    updateFavoriteButton(favoriteButton, data.name);
    weatherInfo.replaceChildren(card);
}

function renderForecast(forecasts) {
    const forecastHeading = document.createElement('h2');
    forecastHeading.className = 'section-heading';
    forecastHeading.textContent = 'Previsioni dei prossimi giorni';
    forecastInfo.replaceChildren(forecastHeading);

    groupForecastsByDay(forecasts).forEach(dayForecast => {
        const date = new Date(dayForecast[0].dt * 1000);
        const table = document.createElement('table');
        table.className = 'forecast-table';
        const header = table.insertRow();
        const heading = document.createElement('th');
        heading.colSpan = 3;
        heading.textContent = `${getDayOfWeek(date.getDay())} · ${date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long'
        })}`;
        header.appendChild(heading);

        dayForecast.forEach(forecast => {
            const row = table.insertRow();
            [formatTime(new Date(forecast.dt * 1000).getHours()),
                `${forecast.main.temp}°C`,
                forecast.weather[0].description]
                .forEach((value, index) => {
                    const cell = row.insertCell();
                    cell.textContent = value;
                    if (index < 2) cell.className = 'forecast-emphasis';
                });
        });
        forecastInfo.appendChild(table);
    });
}

function groupForecastsByDay(forecasts) {
    const grouped = new Map();
    forecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(forecast);
    });
    return Array.from(grouped.values()).slice(0, 5);
}

function saveRecent(city) {
    const recents = readStorage(RECENTS_KEY);
    const updated = [city, ...recents.filter(item => item.toLocaleLowerCase() !== city.toLocaleLowerCase())]
        .slice(0, MAX_RECENTS);
    const saved = writeStorage(RECENTS_KEY, updated);
    renderRecents();
    return saved;
}

function toggleFavorite(city) {
    const favorites = readStorage(FAVORITES_KEY);
    const exists = favorites.some(item => item.toLocaleLowerCase() === city.toLocaleLowerCase());
    const updated = exists
        ? favorites.filter(item => item.toLocaleLowerCase() !== city.toLocaleLowerCase())
        : [...favorites, city];
    const saved = writeStorage(FAVORITES_KEY, updated);
    renderFavorites();
    document.querySelectorAll('.favorite-toggle').forEach(button => updateFavoriteButton(button, city));
    if (!saved) setStatus('Non riesco a salvare i preferiti nel browser.', true);
}

function updateFavoriteButton(button, city) {
    const isFavorite = readStorage(FAVORITES_KEY)
        .some(item => item.toLocaleLowerCase() === city.toLocaleLowerCase());
    button.textContent = isFavorite ? '★ Salvata tra i preferiti' : '☆ Aggiungi ai preferiti';
    button.setAttribute('aria-pressed', String(isFavorite));
}

function renderFavorites() {
    renderCityList(favoritesList, readStorage(FAVORITES_KEY), 'Nessuna città salvata. Cerca una città e aggiungila con la stellina.');
}

function renderRecents() {
    renderCityList(recentList, readStorage(RECENTS_KEY).slice(0, MAX_RECENTS), 'Le città cercate appariranno qui.');
    renderCityList(searchSuggestions, readStorage(RECENTS_KEY).slice(0, MAX_RECENTS), 'Nessuna ricerca recente.');
}

function renderCityList(container, cities, emptyMessage) {
    container.replaceChildren();
    if (!cities.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-list';
        empty.textContent = emptyMessage;
        container.appendChild(empty);
        return;
    }

    cities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'city-list-item';
        const cityButton = document.createElement('button');
        cityButton.type = 'button';
        cityButton.className = 'city-select';
        cityButton.textContent = city;
        cityButton.addEventListener('click', () => {
            cityInput.value = city;
            searchSuggestions.hidden = true;
            document.getElementById('weather-form').requestSubmit();
        });
        item.appendChild(cityButton);

        if (container === favoritesList) {
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'remove-favorite';
            removeButton.setAttribute('aria-label', `Rimuovi ${city} dai preferiti`);
            removeButton.textContent = '★';
            removeButton.addEventListener('click', () => toggleFavorite(city));
            item.appendChild(removeButton);
        }
        container.appendChild(item);
    });
}

function showSearchSuggestions() {
    renderCityList(searchSuggestions, readStorage(RECENTS_KEY).slice(0, MAX_RECENTS), 'Le città cercate appariranno qui.');
    searchSuggestions.hidden = false;
}

function updateWeatherScene(condition) {
    const normalized = condition.toLowerCase();
    const scene = normalized.includes('thunder') ? 'storm'
        : normalized.includes('rain') || normalized.includes('drizzle') ? 'rain'
            : normalized.includes('snow') ? 'snow'
                : normalized.includes('cloud') || normalized.includes('mist') ||
                    normalized.includes('fog') || normalized.includes('haze') ? 'cloudy'
                    : normalized.includes('clear') ? 'clear' : 'cloudy';
    document.body.dataset.weather = scene;
}

function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    writeStorage(THEME_KEY, nextTheme);
    updateThemeButton(nextTheme);
}

function applySavedTheme() {
    let savedTheme = 'dark';
    try {
        savedTheme = JSON.parse(localStorage.getItem(THEME_KEY) || '"dark"') === 'light' ? 'light' : 'dark';
    } catch {
        setStatus('Impossibile leggere il tema salvato nel browser; uso il tema scuro.', true);
    }
    const theme = savedTheme;
    document.documentElement.dataset.theme = theme;
    updateThemeButton(theme);
}

function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle');
    button.textContent = theme === 'light' ? '☾' : '☀';
    button.setAttribute('aria-label', theme === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro');
    button.setAttribute('aria-pressed', String(theme === 'light'));
}

function readStorage(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
    } catch {
        setStatus('Impossibile leggere i dati salvati nel browser. Verifica le impostazioni di archiviazione.', true);
        return [];
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        setStatus('Impossibile salvare le preferenze nel browser. Controlla le impostazioni di archiviazione.', true);
        return false;
    }
}

function setStatus(message, isError = false) {
    searchStatus.textContent = message;
    searchStatus.classList.toggle('error', isError);
}

function formatTime(hours) {
    return `${hours.toString().padStart(2, '0')}:00`;
}

function getDayOfWeek(day) {
    return ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][day];
}
