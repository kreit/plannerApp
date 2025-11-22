
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
    console.log('Application state loaded');
}

function saveStateToStorage() {
    console.log('Application state updated');
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
        appState.currentTheme = 'light';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️ Light Mode';
        appState.currentTheme = 'dark';
    }

    saveStateToStorage();
}

function applyThemePreset(themeName) {
    const root = document.documentElement;
    const customPickers = document.getElementById('customColorPickers');

    document.querySelectorAll('.theme-preset').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        }
    });

    if (themeName === 'custom') {
        customPickers.style.display = 'grid';
        return;
    } else {
        customPickers.style.display = 'none';
    }

    const themes = {
        default: {
            primary: '#2ecc71',
            secondary: '#27ae60',
            background: '#f8f9fa',
            surface: '#ffffff',
            text: '#2c3e50'
        },
        ocean: {
            primary: '#3498db',
            secondary: '#2980b9',
            background: '#ecf0f1',
            surface: '#ffffff',
            text: '#2c3e50'
        },
        sunset: {
            primary: '#e67e22',
            secondary: '#d35400',
            background: '#fdf6e3',
            surface: '#ffffff',
            text: '#2c3e50'
        },
        forest: {
            primary: '#27ae60',
            secondary: '#229954',
            background: '#e8f5e9',
            surface: '#ffffff',
            text: '#1b5e20'
        },
        purple: {
            primary: '#9b59b6',
            secondary: '#8e44ad',
            background: '#f3e5f5',
            surface: '#ffffff',
            text: '#4a148c'
        }
    };

    const selectedTheme = themes[themeName];
    if (selectedTheme) {
        root.style.setProperty('--primary-color', selectedTheme.primary);
        root.style.setProperty('--secondary-color', selectedTheme.secondary);
        root.style.setProperty('--background-color', selectedTheme.background);
        root.style.setProperty('--surface-color', selectedTheme.surface);
        root.style.setProperty('--text-color', selectedTheme.text);
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

    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--secondary-color', adjustBrightness(primaryColor, -20));
    root.style.setProperty('--background-color', bgColor);

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
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}