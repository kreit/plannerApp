// ============================================
// API CONFIGURATION
// ============================================

// IMPORTANT: Replace these with your own API keys!
// Get free API keys from:
// - OpenWeatherMap: https://openweathermap.org/api
// - Quotable API: No key needed (free public API)

const API_KEYS = {
    WEATHER: '8dee0842d9eb5a967b4ad17482035599'
};

// ============================================
// APPLICATION STATE MANAGEMENT
// ============================================

let appState = {
    currentUser: null,
    users: [],
    tasks: [],
    events: [],
    isDarkMode: false,
    currentTheme: 'default',
    currentDate: new Date(),
    selectedDate: null
};

document.addEventListener('DOMContentLoaded', function() {
    loadStateFromStorage();
    initializeEventListeners();
    renderCalendar();
    renderTasks();
    renderEvents();
    updateUIForAuth();
    displayRandomQuote(); // Load quote from API on startup
});

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

function loadStateFromStorage() {
    const stored = localStorage.getItem('plannerAppState');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            appState.currentUser = data.currentUser || null;
            appState.users = data.users || [];
            appState.tasks = data.tasks || [];
            appState.events = data.events || [];
            appState.isDarkMode = data.isDarkMode || false;
            appState.currentTheme = data.currentTheme || 'default';
            appState.customColors = data.customColors || null;

            // Restore dark mode
            if (appState.isDarkMode) {
                document.body.setAttribute('data-theme', 'dark');
                const toggle = document.getElementById('themeToggle');
                if (toggle) toggle.textContent = '☀️ Light Mode';
            }

            // Restore custom colors first if present
            if (appState.currentTheme === 'custom' && appState.customColors) {
                // Apply saved custom colors to CSS variables
                const root = document.documentElement;
                root.style.setProperty('--primary-color', appState.customColors.primary);
                root.style.setProperty('--secondary-color', appState.customColors.secondary || adjustBrightness(appState.customColors.primary, -20));
                root.style.setProperty('--background-color', appState.customColors.background);
                root.style.setProperty('--text-color', appState.customColors.text || getComputedStyle(root).getPropertyValue('--text-color'));
                root.style.setProperty('--surface-color', appState.customColors.surface || getComputedStyle(root).getPropertyValue('--surface-color'));
                // Update pickers UI if present
                try {
                    document.getElementById('primaryColorPicker').value = appState.customColors.primary;
                    document.getElementById('primaryColorText').value = appState.customColors.primary;
                    document.getElementById('bgColorPicker').value = appState.customColors.background;
                    document.getElementById('bgColorText').value = appState.customColors.background;
                    if (appState.customColors.text) {
                        document.getElementById('textColorPicker').value = appState.customColors.text;
                        document.getElementById('textColorText').value = appState.customColors.text;
                    }
                } catch (e) {}
                // Ensure header reflects custom colors on load
                updateHeaderBackground();
            }

            // Restore theme preset if not custom and not default
            if (appState.currentTheme && appState.currentTheme !== 'default' && appState.currentTheme !== 'custom') {
                applyThemePreset(appState.currentTheme);
            }
            
            console.log('Application state loaded from storage');
        } catch (error) {
            console.error('Error loading state from storage:', error);
            console.log('Starting with default state');
        }
    } else {
        console.log('Application state initialized (no previous data)');
    }
}

function saveStateToStorage() {
    try {
        const stateToSave = {
            currentUser: appState.currentUser,
            users: appState.users,
            tasks: appState.tasks,
            events: appState.events,
            isDarkMode: appState.isDarkMode,
            currentTheme: appState.currentTheme
        };
        localStorage.setItem('plannerAppState', JSON.stringify(stateToSave));
        console.log('Application state saved to storage');
    } catch (error) {
        console.error('Error saving state to storage:', error);
    }
}

// ============================================
// EVENT LISTENERS INITIALIZATION
// ============================================

function initializeEventListeners() {
    // Authentication events
    document.getElementById('loginBtn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => openAuthModal('register'));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
    document.getElementById('authForm').addEventListener('submit', handleAuth);

    // Theme events
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    document.querySelectorAll('.theme-preset').forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            applyThemePreset(theme);
        });
    });

    // Custom color pickers
    document.getElementById('primaryColorPicker').addEventListener('input', syncColorInputs);
    document.getElementById('primaryColorText').addEventListener('input', syncColorInputs);
    document.getElementById('bgColorPicker').addEventListener('input', syncColorInputs);
    document.getElementById('bgColorText').addEventListener('input', syncColorInputs);
    document.getElementById('applyCustomTheme').addEventListener('click', applyCustomColors);

    // Task events
    document.getElementById('addTaskBtn').addEventListener('click', addTask);
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addTask();
    });

    // Calendar events
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('todayBtn').addEventListener('click', goToToday);
    document.getElementById('addEventBtn').addEventListener('click', addEvent);
    document.getElementById('cancelEventBtn').addEventListener('click', () => {
        document.getElementById('eventForm').classList.remove('active');
    });

    // Quote events
    document.getElementById('newQuoteBtn').addEventListener('click', displayRandomQuote);

    // Weather events
    document.getElementById('getWeatherBtn').addEventListener('click', getWeather);
    document.getElementById('cityInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') getWeather();
    });

    // Close modal when clicking outside
    document.getElementById('authModal').addEventListener('click', function(e) {
        if (e.target === this) closeAuthModal();
    });
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

function openAuthModal(mode) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const nameGroup = document.getElementById('nameGroup');

    if (mode === 'register') {
        title.textContent = 'Register';
        nameGroup.style.display = 'block';
    } else {
        title.textContent = 'Login';
        nameGroup.style.display = 'none';
    }

    modal.classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
    document.getElementById('authForm').reset();
}

function handleAuth(e) {
    e.preventDefault();

    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    const isRegister = document.getElementById('authTitle').textContent === 'Register';

    if (isRegister) {
        const existingUser = appState.users.find(u => u.email === email);
        if (existingUser) {
            alert('User already exists! Please login.');
            return;
        }

        const newUser = {
            id: Date.now(),
            email: email,
            password: password,
            name: name || email.split('@')[0]
        };

        appState.users.push(newUser);
        appState.currentUser = newUser;

        alert('Registration successful!');
    } else {
        const user = appState.users.find(u => u.email === email && u.password === password);
        if (user) {
            appState.currentUser = user;
            alert('Login successful!');
        } else {
            alert('Invalid credentials!');
            return;
        }
    }

    saveStateToStorage();
    updateUIForAuth();
    closeAuthModal();
}

function handleLogout() {
    appState.currentUser = null;
    saveStateToStorage();
    updateUIForAuth();
    alert('Logged out successfully!');
}

function updateUIForAuth() {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');

    if (appState.currentUser) {
        userProfile.classList.add('active');
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userName.textContent = appState.currentUser.name;
        userAvatar.textContent = appState.currentUser.name.charAt(0).toUpperCase();
    } else {
        userProfile.classList.remove('active');
        loginBtn.style.display = 'inline-flex';
        registerBtn.style.display = 'inline-flex';
    }
}

// ============================================
// THEME MANAGEMENT FUNCTIONS
// ============================================

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙 Dark Mode';
        appState.isDarkMode = false;
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️ Light Mode';
        appState.isDarkMode = true;
    }

    // Re-apply the currently selected theme so the CSS variables switch to the
    // correct light/dark variant immediately when toggling modes.
    if (appState.currentTheme) applyThemePreset(appState.currentTheme);

    saveStateToStorage();
}

function applyThemePreset(themeName) {
    const root = document.documentElement;
    const customPickers = document.getElementById('customColorPickers');

    // Update active button state
    document.querySelectorAll('.theme-preset').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        }
    });

    // Show/hide custom color pickers
    if (themeName === 'custom') {
        if (customPickers) customPickers.style.display = 'grid';
        // If we have saved custom colors, reapply them
        if (appState.customColors) {
            root.style.setProperty('--primary-color', appState.customColors.primary);
            root.style.setProperty('--secondary-color', appState.customColors.secondary || adjustBrightness(appState.customColors.primary, -20));
            root.style.setProperty('--background-color', appState.customColors.background);
            root.style.setProperty('--text-color', appState.customColors.text || getComputedStyle(root).getPropertyValue('--text-color'));
            root.style.setProperty('--surface-color', appState.customColors.surface || getComputedStyle(root).getPropertyValue('--surface-color'));
        }
        // Ensure header and other UI reflect these variables immediately
        updateHeaderBackground();
        return;
    }

    // Hide custom pickers and apply preset theme
    if (customPickers) customPickers.style.display = 'none';

    const themes = {
        default: {
            // Meadow
            light: {
                primary: '#7c9473',
                secondary: '#5f7856',
                background: '#f6f3ea',
                surface: '#fffdf8',
                text: '#3e3a31'
            },
            dark: {
                primary: '#9cb08e',
                secondary: '#7c9473',
                background: '#24261f',
                surface: '#2f3227',
                text: '#ede8da'
            }
        },
        ocean: {
            // Dusty Blue
            light: {
                primary: '#7c9aae',
                secondary: '#5f7c8f',
                background: '#eef2f3',
                surface: '#fbfcfc',
                text: '#33424a'
            },
            dark: {
                primary: '#93aec0',
                secondary: '#7c9aae',
                background: '#1b2529',
                surface: '#263339',
                text: '#d9e3e6'
            }
        },
        sunset: {
            // Terracotta
            light: {
                primary: '#c97b5a',
                secondary: '#a8593b',
                background: '#faf3ea',
                surface: '#fffbf6',
                text: '#4a3428'
            },
            dark: {
                primary: '#d99372',
                secondary: '#c97b5a',
                background: '#2a1e17',
                surface: '#372820',
                text: '#f2e4d8'
            }
        },
        forest: {
            // Sage
            light: {
                primary: '#4f6f52',
                secondary: '#3d5741',
                background: '#eef1e6',
                surface: '#fafbf6',
                text: '#2e3b2a'
            },
            dark: {
                primary: '#7fa283',
                secondary: '#4f6f52',
                background: '#1b231c',
                surface: '#253027',
                text: '#dce5d6'
            }
        },
        purple: {
            // Lavender
            light: {
                primary: '#9c8ab5',
                secondary: '#7c6b99',
                background: '#f5f1f8',
                surface: '#fffdfc',
                text: '#423a52'
            },
            dark: {
                primary: '#b3a3c7',
                secondary: '#9c8ab5',
                background: '#241f2c',
                surface: '#302a3b',
                text: '#e6deef'
            }
        }
    };

    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const mode = isDarkMode ? 'dark' : 'light';
    const selectedTheme = themes[themeName];
    
    if (selectedTheme && selectedTheme[mode]) {
        const colors = selectedTheme[mode];
        root.style.setProperty('--primary-color', colors.primary);
        root.style.setProperty('--secondary-color', colors.secondary);
        root.style.setProperty('--background-color', colors.background);
        root.style.setProperty('--surface-color', colors.surface);
        root.style.setProperty('--text-color', colors.text);
        
        // Save theme preference
        appState.currentTheme = themeName;
        appState.isDarkMode = isDarkMode;
        // Clear any previously saved custom colors since we're on a preset
        // (keep appState.customColors if you want to preserve)
        saveStateToStorage();
        // Update header background to use the newly-applied CSS variables
        updateHeaderBackground();
    }
}

// Update header's inline background using resolved CSS variables to avoid any
// issues where computed background-image isn't updating in some browsers.
function updateHeaderBackground() {
    try {
        const rootStyles = getComputedStyle(document.documentElement);
        const p = rootStyles.getPropertyValue('--primary-color').trim() || '#7c9473';
        const s = rootStyles.getPropertyValue('--secondary-color').trim() || '#5f7856';
        const header = document.querySelector('header');
        if (header) {
            header.style.background = `linear-gradient(90deg, rgba(0,0,0,0.04), rgba(255,255,255,0.02)), linear-gradient(135deg, ${p}, ${s})`;
        }
    } catch (e) {
        // noop
    }
}

function syncColorInputs(e) {
    const input = e.target;
    const isPicker = input.type === 'color';
    const targetId = isPicker ? input.id.replace('Picker', 'Text') : input.id.replace('Text', 'Picker');
    const targetInput = document.getElementById(targetId);

    targetInput.value = input.value;
}

function applyCustomColors() {
    const root = document.documentElement;
    const primaryColor = document.getElementById('primaryColorPicker').value;
    const bgColor = document.getElementById('bgColorPicker').value;
    const textColorEl = document.getElementById('textColorPicker');
    const textColor = textColorEl ? textColorEl.value : null;

    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--secondary-color', adjustBrightness(primaryColor, -20));
    root.style.setProperty('--background-color', bgColor);

    // Adjust surface/text for dark mode so custom colors remain legible
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        // In dark mode, use a darker surface and warm light text
        root.style.setProperty('--surface-color', '#2f3227');
        root.style.setProperty('--text-color', textColor || '#ede8da');
    } else {
        // In light mode, use a soft cream surface and warm dark text
        root.style.setProperty('--surface-color', '#fffdf8');
        root.style.setProperty('--text-color', textColor || '#3e3a31');
    }

    // Save custom theme preference
    appState.currentTheme = 'custom';
    appState.customColors = {
        primary: primaryColor,
        secondary: adjustBrightness(primaryColor, -20),
        background: bgColor,
        text: textColor || null,
        surface: isDark ? '#2f3227' : '#fffdf8'
    };
    saveStateToStorage();

    // Update header/background to reflect custom colors immediately
    updateHeaderBackground();

    alert('Custom theme applied!');
}

function adjustBrightness(color, amount) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// ============================================
// TASK MANAGEMENT FUNCTIONS
// ============================================

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();

    if (!taskText) {
        alert('Please enter a task!');
        return;
    }

    const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date()
    };

    appState.tasks.push(newTask);
    saveStateToStorage();
    renderTasks();
    taskInput.value = '';
}

function toggleTask(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveStateToStorage();
        renderTasks();
    }
}

function deleteTask(taskId) {
    appState.tasks = appState.tasks.filter(t => t.id !== taskId);
    saveStateToStorage();
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';

    if (appState.tasks.length === 0) {
        taskList.innerHTML = '<li style="text-align: center; color: var(--text-secondary); padding: 1rem;">No tasks yet. Add one to get started!</li>';
        return;
    }

    appState.tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.completed ? ' completed' : '');

        li.innerHTML = `
            <span class="task-text" onclick="toggleTask(${task.id})">${escapeHtml(task.text)}</span>
            <div class="task-actions">
                <button class="task-btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        `;

        taskList.appendChild(li);
    });
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

function renderCalendar() {
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, true, year, month - 1);
        calendarDays.appendChild(dayElement);
    }

    // Current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && 
                       month === today.getMonth() && 
                       year === today.getFullYear();
        const dayElement = createDayElement(day, false, year, month, isToday);
        calendarDays.appendChild(dayElement);
    }

    // Next month's leading days
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, true, year, month + 1);
        calendarDays.appendChild(dayElement);
    }
}

function createDayElement(day, otherMonth, year, month, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (otherMonth) dayElement.classList.add('other-month');
    if (isToday) dayElement.classList.add('today');

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasEvent = appState.events.some(e => e.date === dateString);
    if (hasEvent) dayElement.classList.add('has-event');

    dayElement.textContent = day;
    dayElement.addEventListener('click', (e) => selectDate(year, month, day, e));

    return dayElement;
}

function selectDate(year, month, day, event) {
    appState.selectedDate = new Date(year, month, day);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    document.getElementById('eventDate').value = dateString;
    document.getElementById('eventForm').classList.add('active');

    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
    event.target.classList.add('selected');
}

function changeMonth(delta) {
    appState.currentDate.setMonth(appState.currentDate.getMonth() + delta);
    renderCalendar();
}

function goToToday() {
    appState.currentDate = new Date();
    renderCalendar();
}

// ============================================
// EVENT MANAGEMENT FUNCTIONS
// ============================================

function addEvent() {
    const eventTitle = document.getElementById('eventTitle').value.trim();
    const eventDate = document.getElementById('eventDate').value;

    if (!eventTitle || !eventDate) {
        alert('Please enter event title and date!');
        return;
    }

    const newEvent = {
        id: Date.now(),
        title: eventTitle,
        date: eventDate,
        createdAt: new Date()
    };

    appState.events.push(newEvent);
    saveStateToStorage();
    renderCalendar();
    renderEvents();

    document.getElementById('eventTitle').value = '';
    document.getElementById('eventForm').classList.remove('active');
}

function deleteEvent(eventId) {
    appState.events = appState.events.filter(e => e.id !== eventId);
    saveStateToStorage();
    renderCalendar();
    renderEvents();
}

function renderEvents() {
    const eventList = document.getElementById('eventList');
    eventList.innerHTML = '';

    if (appState.events.length === 0) {
        eventList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No events scheduled</p>';
        return;
    }

    const sortedEvents = appState.events.sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedEvents.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';

        const eventDate = new Date(event.date + 'T00:00:00');
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        eventElement.innerHTML = `
            <div class="event-date">${formattedDate}</div>
            <div class="event-title">${escapeHtml(event.title)}</div>
            <button class="btn btn-danger task-btn mt-1" onclick="deleteEvent(${event.id})">Delete</button>
        `;

        eventList.appendChild(eventElement);
    });
}

// ============================================
// QUOTES API INTEGRATION
// ============================================

async function displayRandomQuote() {
    try {
        document.getElementById('quoteText').textContent = 'Loading inspiring quote...';
        document.getElementById('quoteAuthor').textContent = '';

        const response = await fetch('https://api.quotable.io/random');

        if (!response.ok) {
            throw new Error('Failed to fetch quote');
        }

        const data = await response.json();

        document.getElementById('quoteText').textContent = `"${data.content}"`;
        document.getElementById('quoteAuthor').textContent = `- ${data.author}`;

    } catch (error) {
        console.error('Error fetching quote:', error);
        // Fallback quotes if API fails
        const fallbackQuotes = [
            { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
            { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { text: "The future depends on what you do today.", author: "Mahatma Gandhi" }
        ];
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        document.getElementById('quoteText').textContent = `"${randomQuote.text}"`;
        document.getElementById('quoteAuthor').textContent = `- ${randomQuote.author}`;
    }
}

// ============================================
// WEATHER API INTEGRATION
// ============================================

async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();

    if (!city) {
        alert('Please enter a city name!');
        return;
    }

    if (API_KEYS.WEATHER === 'YOUR_OPENWEATHERMAP_API_KEY_HERE') {
        alert('Please add your OpenWeatherMap API key in main.js to use the weather feature!\n\nGet a free API key at: https://openweathermap.org/api');
        return;
    }

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEYS.WEATHER}&units=imperial`;
        console.log('Requesting weather:', url);

        const response = await fetch(url);

        if (!response.ok) {
            // Attempt to read error body for more details
            let details = '';
            try {
                const text = await response.text();
                // Some APIs return JSON error payloads
                try {
                    const json = JSON.parse(text);
                    details = json.message || JSON.stringify(json);
                } catch (e) {
                    details = text;
                }
            } catch (e) {
                details = '(no response body)';
            }

            throw new Error(`Weather API error: HTTP ${response.status} ${response.statusText} - ${details}`);
        }

        const data = await response.json();
        displayWeather(data);

    } catch (error) {
        console.error('Error fetching weather:', error);
        // Show detailed message to help debugging
        alert(`Could not fetch weather data:\n${error.message}`);
    }
}

function displayWeather(data) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    const weatherIcon = document.getElementById('weatherIcon');
    const weatherTemp = document.getElementById('weatherTemp');
    const weatherDesc = document.getElementById('weatherDesc');
    const weatherCity = document.getElementById('weatherCity');

    const weatherEmojis = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌫️'
    };

    const condition = data.weather[0].main;
    const emoji = weatherEmojis[condition] || '🌤️';

    weatherIcon.textContent = emoji;
    weatherTemp.textContent = `${Math.round(data.main.temp)}°F`;
    weatherDesc.textContent = data.weather[0].description;
    weatherCity.textContent = `${data.name}, ${data.sys.country}`;

    weatherDisplay.style.display = 'block';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}