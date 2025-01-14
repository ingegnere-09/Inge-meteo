const API_KEY = '0f153d20f931145362e9328e9b1f1965';

let docTitle = document.title;
window.addEventListener('blur', () => {
    document.title = "Torna presto a vedere il meteo";
});
window.addEventListener("focus", () => {
    document.title = docTitle;
});

function getWeather(event) {
    event.preventDefault();
    const city = document.getElementById('city').value;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=it`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=it`;

    // Effettua la richiesta per le informazioni attuali del tempo
    fetch(weatherUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nella richiesta delle previsioni meteo');
            }
            return response.json();
        })
        .then(data => {
            // Estrai le informazioni meteo attuali
            const temperature = data.main.temp;
            const feels_like = data.main.feels_like;
            const pressure = data.main.pressure;
            const humidity = data.main.humidity;
            const wind_speed = data.wind.speed;
            const wind_direction = data.wind.deg;
            const description = data.weather[0].description;

            const weatherInfo = document.getElementById('weather-info');
            weatherInfo.innerHTML = `
                <h2>Condizioni meteo di: ${city}</h2>
                <h3>Temperatura: ${temperature}°C</h3>
                <h3>Temperatura percepita: ${feels_like}°C</h3>
                <h3>Pressione: ${pressure} hPa</h3>
                <h3>Umidità: ${humidity}%</h3>
                <h3>Velocità del vento: ${wind_speed} m/s</h3>
                <h3>Direzione del vento: ${wind_direction}°</h3>
                <h3>Condizioni meteo: ${description}</h3>
                <p><a class="down" href="https://mega.nz/file/pQokxSAI#8cb1MIkvnsV76zlLN3zAUbznrKZVF9ZB79PY9wZy0LU">Clicca qui per scaricare l'app</a></p>
                <hr>
            `;

            // Ora, effettua la richiesta per le previsioni a lungo termine
            return fetch(forecastUrl);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nella richiesta delle previsioni a lungo termine');
            }
            return response.json();
        })
        .then(data => {
            // Estrai le previsioni a lungo termine per i prossimi cinque giorni
            const forecasts = data.list;

            // Raggruppa le previsioni per giorno
            const groupedForecasts = groupForecastsByDay(forecasts);

            // Mostra le previsioni per ciascun giorno con tutti gli orari in una tabella
            const forecastInfo = document.getElementById('forecast-info');
            forecastInfo.innerHTML = '<h2>Previsioni future:</h2>';

            groupedForecasts.forEach(dayForecast => {
                const dateObj = new Date(dayForecast[0].dt * 1000);
                const dayOfWeek = getDayOfWeek(dateObj.getDay());

                // Creazione della tabella per le previsioni di questo giorno
                const table = document.createElement('table');
                table.classList.add('forecast-table');

                // Intestazione della tabella
                const headerRow = table.insertRow();
                headerRow.innerHTML = `
                    <th colspan="3">${dayOfWeek} (${dateObj.toLocaleDateString()})</th>
                `;

                // Righe per ogni ora
                dayForecast.forEach(forecast => {
                    const forecastDate = new Date(forecast.dt * 1000);
                    const forecastTime = forecastDate.getHours();
                    const forecastTemperature = forecast.main.temp;
                    const forecastDescription = forecast.weather[0].description;

                    const row = table.insertRow();
                    row.innerHTML = `
                        <td><b>${formatTime(forecastTime)}</b></td>
                        <td><b>${forecastTemperature}°C</b></td>
                        <td><b>${forecastDescription}</b></td>
                    `;
                });

                forecastInfo.appendChild(table);
            });

            // Mostra il disclaimer
            document.getElementById('disclaimer-title').style.display = 'block';
            document.getElementById('disclaimer-text').style.display = 'block';
            const footer = document.querySelector('.fine');
            footer.style.position = 'relative';
        })
        .catch(error => {
            const weatherInfo = document.getElementById('weather-info');
            weatherInfo.innerHTML = `<p>${error}</p>`;
            const forecastInfo = document.getElementById('forecast-info');
            forecastInfo.innerHTML = ''; // Cancella le previsioni in caso di errore
        });
}

// Funzione per raggruppare le previsioni per giorno
function groupForecastsByDay(forecasts) {
    const groupedForecasts = {};
    forecasts.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        const forecastDay = forecastDate.getDate();
        const key = `${forecastDay}-${forecastDate.getMonth() + 1}-${forecastDate.getFullYear()}`;
        if (!groupedForecasts[key]) {
            groupedForecasts[key] = [];
        }
        groupedForecasts[key].push(forecast);
    });
    return Object.values(groupedForecasts).slice(0, 5); // Prendi solo i primi 5 giorni
}

// Funzione per formattare l'ora come "HH:MM"
function formatTime(hours) {
    return hours.toString().padStart(2, '0') + ":00";
}

// Funzione per ottenere il nome del giorno della settimana da un numero (0 = domenica, ..., 6 = sabato)
function getDayOfWeek(day) {
    const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return daysOfWeek[day];
}
