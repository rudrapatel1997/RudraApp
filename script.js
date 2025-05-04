// Data Management
class DataManager {
    constructor() {
        this.workouts = JSON.parse(localStorage.getItem('workouts')) || [];
        this.meals = JSON.parse(localStorage.getItem('meals')) || [];
        this.measurements = JSON.parse(localStorage.getItem('measurements')) || [];
    }

    saveWorkout(workout) {
        this.workouts.push({
            ...workout,
            id: Date.now(),
            date: new Date().toISOString()
        });
        this.saveToStorage('workouts');
        this.updateDashboard();
    }

    saveMeal(meal) {
        this.meals.push({
            ...meal,
            id: Date.now(),
            date: new Date().toISOString()
        });
        this.saveToStorage('meals');
        this.updateDashboard();
    }

    saveMeasurement(measurement) {
        this.measurements.push({
            ...measurement,
            id: Date.now(),
            date: new Date().toISOString()
        });
        this.saveToStorage('measurements');
        this.updateDashboard();
    }

    deleteItem(type, id) {
        this[type] = this[type].filter(item => item.id !== id);
        this.saveToStorage(type);
        this.updateDashboard();
    }

    saveToStorage(key) {
        localStorage.setItem(key, JSON.stringify(this[key]));
    }

    getTodayItems(type) {
        const today = new Date().toISOString().split('T')[0];
        return this[type].filter(item => item.date.startsWith(today));
    }

    getLatestMeasurement(type) {
        return this.measurements
            .filter(m => m.type === type)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    }
}

// UI Management
class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.initializeEventListeners();
        this.updateDashboard();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchSection(btn.dataset.section));
        });

        // Quick Add Buttons
        document.getElementById('add-workout').addEventListener('click', () => this.switchSection('workouts'));
        document.getElementById('add-measurement').addEventListener('click', () => this.switchSection('measurements'));
        document.getElementById('add-nutrition').addEventListener('click', () => this.switchSection('nutrition'));

        // Form Submissions
        document.getElementById('workout-form').addEventListener('submit', (e) => this.handleWorkoutSubmit(e));
        document.getElementById('nutrition-form').addEventListener('submit', (e) => this.handleNutritionSubmit(e));
        document.getElementById('measurements-form').addEventListener('submit', (e) => this.handleMeasurementSubmit(e));
    }

    switchSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

        this.updateSection(sectionId);
    }

    updateSection(sectionId) {
        switch(sectionId) {
            case 'workouts':
                this.updateWorkoutList();
                break;
            case 'nutrition':
                this.updateMealList();
                break;
            case 'measurements':
                this.updateMeasurementsList();
                break;
        }
    }

    updateDashboard() {
        const todayWorkouts = this.dataManager.getTodayItems('workouts');
        const todayMeals = this.dataManager.getTodayItems('meals');
        const latestWeight = this.dataManager.getLatestMeasurement('weight');

        document.getElementById('workouts-count').textContent = todayWorkouts.length;
        document.getElementById('calories-burned').textContent = 
            todayWorkouts.reduce((sum, workout) => sum + (workout.duration * 5), 0);
        document.getElementById('current-weight').textContent = 
            latestWeight ? `${latestWeight.value} kg` : '--';
    }

    updateWorkoutList() {
        const workoutList = document.getElementById('workout-list');
        const workouts = this.dataManager.workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        workoutList.innerHTML = workouts.map(workout => `
            <div class="list-item">
                <div>
                    <strong>${workout.type}</strong> - ${workout.duration} minutes
                    ${workout.notes ? `<br><small>${workout.notes}</small>` : ''}
                </div>
                <button class="delete-btn" onclick="uiManager.dataManager.deleteItem('workouts', ${workout.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    updateMealList() {
        const mealList = document.getElementById('meal-list');
        const meals = this.dataManager.meals.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        mealList.innerHTML = meals.map(meal => `
            <div class="list-item">
                <div>
                    <strong>${meal.type}</strong> - ${meal.calories} calories
                    ${meal.notes ? `<br><small>${meal.notes}</small>` : ''}
                </div>
                <button class="delete-btn" onclick="uiManager.dataManager.deleteItem('meals', ${meal.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    updateMeasurementsList() {
        const measurementsList = document.getElementById('measurements-list');
        const measurements = this.dataManager.measurements.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        measurementsList.innerHTML = measurements.map(measurement => `
            <div class="list-item">
                <div>
                    <strong>${measurement.type}</strong> - ${measurement.value}
                </div>
                <button class="delete-btn" onclick="uiManager.dataManager.deleteItem('measurements', ${measurement.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    handleWorkoutSubmit(e) {
        e.preventDefault();
        const workout = {
            type: document.getElementById('workout-type').value,
            duration: parseInt(document.getElementById('workout-duration').value),
            notes: document.getElementById('workout-notes').value
        };
        this.dataManager.saveWorkout(workout);
        e.target.reset();
        this.updateWorkoutList();
    }

    handleNutritionSubmit(e) {
        e.preventDefault();
        const meal = {
            type: document.getElementById('meal-type').value,
            calories: parseInt(document.getElementById('calories').value),
            notes: document.getElementById('meal-notes').value
        };
        this.dataManager.saveMeal(meal);
        e.target.reset();
        this.updateMealList();
    }

    handleMeasurementSubmit(e) {
        e.preventDefault();
        const measurement = {
            type: document.getElementById('measurement-type').value,
            value: parseFloat(document.getElementById('measurement-value').value)
        };
        this.dataManager.saveMeasurement(measurement);
        e.target.reset();
        this.updateMeasurementsList();
    }
}

// Initialize the application
const dataManager = new DataManager();
const uiManager = new UIManager(dataManager); 