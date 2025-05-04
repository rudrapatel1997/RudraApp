import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Data Management
class DataManager {
    constructor() {
        this.workouts = [];
        this.meals = [];
        this.measurements = [];
        this.ingredients = [];
        this.recipes = [];
        this.loadData();
    }

    async loadData() {
        try {
            // Load ingredients
            const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
            this.ingredients = ingredientsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Load other data...
            const workoutsSnapshot = await getDocs(collection(db, 'workouts'));
            this.workouts = workoutsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const mealsSnapshot = await getDocs(collection(db, 'meals'));
            this.meals = mealsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const measurementsSnapshot = await getDocs(collection(db, 'measurements'));
            this.measurements = measurementsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const recipesSnapshot = await getDocs(collection(db, 'recipes'));
            this.recipes = recipesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Update UI after loading data
            if (uiManager) {
                const currentSection = localStorage.getItem('currentSection') || 'dashboard';
                uiManager.updateSection(currentSection);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async refreshData() {
        await this.loadData();
    }

    async saveWorkout(workout) {
        try {
            const docRef = await addDoc(collection(db, "workouts"), {
                ...workout,
                date: serverTimestamp()
            });
            this.workouts.push({
                id: docRef.id,
                ...workout,
                date: new Date().toISOString()
            });
            this.updateDashboard();
        } catch (error) {
            console.error("Error saving workout:", error);
        }
    }

    async saveMeal(meal) {
        try {
            const docRef = await addDoc(collection(db, "meals"), {
                ...meal,
                date: serverTimestamp()
            });
            this.meals.push({
                id: docRef.id,
                ...meal,
                date: new Date().toISOString()
            });
            this.updateDashboard();
        } catch (error) {
            console.error("Error saving meal:", error);
        }
    }

    async saveMeasurement(measurement) {
        try {
            const docRef = await addDoc(collection(db, "measurements"), {
                ...measurement,
                date: serverTimestamp()
            });
            this.measurements.push({
                id: docRef.id,
                ...measurement,
                date: new Date().toISOString()
            });
            this.updateDashboard();
        } catch (error) {
            console.error("Error saving measurement:", error);
        }
    }

    async saveIngredient(formData) {
        console.log('Saving ingredient with data:', formData);
        
        const ingredient = {
            name: formData.name,
            calories: Number(formData.calories) || 0,
            protein: Number(formData.protein) || 0,
            carbs: Number(formData.carbs) || 0,
            fat: Number(formData.fat) || 0,
            sugar: Number(formData.sugar) || 0,
            fiber: Number(formData.fiber) || 0,
            servingSize: Number(formData.servingSize) || 0,
            servingUnit: formData.servingUnit,
            timestamp: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'ingredients'), ingredient);
            ingredient.id = docRef.id;
            this.ingredients.push(ingredient);
            console.log('Successfully saved ingredient:', ingredient);
            return true;
        } catch (error) {
            console.error('Error saving ingredient:', error);
            return false;
        }
    }

    async saveRecipe(recipe) {
        try {
            const docRef = await addDoc(collection(db, "recipes"), {
                ...recipe,
                date: serverTimestamp()
            });
            this.recipes.push({
                id: docRef.id,
                ...recipe,
                date: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error saving recipe:", error);
        }
    }

    async deleteItem(type, id) {
        try {
            await deleteDoc(doc(db, type, id));
            this[type] = this[type].filter(item => item.id !== id);
            if (uiManager) {
                uiManager.updateIngredientsList();
                uiManager.updateDashboard();
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
        }
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

    searchIngredients(query) {
        return this.ingredients.filter(ingredient => 
            ingredient.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    calculateRecipeNutrition(ingredients) {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        ingredients.forEach(item => {
            const ingredient = this.ingredients.find(i => i.id === item.id);
            if (ingredient) {
                const ratio = item.amount / ingredient.servingSize;
                totalCalories += ingredient.calories * ratio;
                totalProtein += ingredient.protein * ratio;
                totalCarbs += ingredient.carbs * ratio;
                totalFat += ingredient.fat * ratio;
            }
        });

        return {
            calories: Math.round(totalCalories),
            protein: Math.round(totalProtein * 10) / 10,
            carbs: Math.round(totalCarbs * 10) / 10,
            fat: Math.round(totalFat * 10) / 10
        };
    }
}

// UI Management
class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.initializeEventListeners();
        this.updateDashboard();
        this.currentRecipeIngredients = [];
        this.restoreLastSection();
    }

    initializeEventListeners() {
        console.log('Initializing event listeners...');
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchSection(btn.dataset.section));
        });

        // Refresh buttons
        document.querySelectorAll('.refresh-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const section = e.target.closest('.refresh-btn').dataset.section;
                await this.refreshSection(section);
            });
        });

        // Quick Add Buttons
        document.getElementById('add-workout').addEventListener('click', () => this.switchSection('workouts'));
        document.getElementById('add-measurement').addEventListener('click', () => this.switchSection('measurements'));
        document.getElementById('add-nutrition').addEventListener('click', () => this.switchSection('nutrition'));
        document.getElementById('add-ingredient').addEventListener('click', () => this.switchSection('ingredients'));
        document.getElementById('add-recipe').addEventListener('click', () => this.switchSection('recipes'));

        // Form Submissions
        document.getElementById('workout-form').addEventListener('submit', (e) => this.handleWorkoutSubmit(e));
        document.getElementById('nutrition-form').addEventListener('submit', (e) => this.handleNutritionSubmit(e));
        document.getElementById('measurements-form').addEventListener('submit', (e) => this.handleMeasurementSubmit(e));
        document.getElementById('ingredients-form').addEventListener('submit', (e) => this.handleIngredientSubmit(e));
        document.getElementById('recipes-form').addEventListener('submit', (e) => this.handleRecipeSubmit(e));

        // Recipe Ingredients
        document.getElementById('add-ingredient-to-recipe').addEventListener('click', () => this.addIngredientToRecipe());
        document.getElementById('ingredient-search').addEventListener('input', (e) => this.handleIngredientSearch(e));

        // Import/Export functionality
        const exportButton = document.getElementById('export-ingredients');
        const importInput = document.getElementById('import-ingredients');
        const importLabel = document.querySelector('label[for="import-ingredients"]');
        
        if (exportButton) {
            console.log('Export button found, adding event listener');
            exportButton.addEventListener('click', () => {
                console.log('Export button clicked');
                this.exportIngredientsToCSV();
            });
        } else {
            console.error('Export button not found!');
        }

        if (importInput) {
            console.log('Import input found, adding event listener');
            importInput.addEventListener('change', (event) => {
                console.log('Import file selected');
                this.importIngredientsFromCSV(event);
            });
        } else {
            console.error('Import input not found!');
        }

        if (importLabel) {
            console.log('Import label found');
            importLabel.addEventListener('click', () => {
                console.log('Import label clicked');
                importInput.click();
            });
        } else {
            console.error('Import label not found!');
        }

        // Initialize the current section
        this.restoreLastSection();
    }

    async refreshSection(sectionId) {
        const refreshBtn = document.querySelector(`.refresh-btn[data-section="${sectionId}"]`);
        const icon = refreshBtn.querySelector('i');
        
        try {
            // Add loading state
            refreshBtn.classList.add('loading');
            icon.classList.add('fa-spin');
            
            // Refresh data
            await this.dataManager.refreshData();
            
            // Update the specific section
            this.updateSection(sectionId);
        } catch (error) {
            console.error(`Error refreshing ${sectionId}:`, error);
        } finally {
            // Remove loading state
            refreshBtn.classList.remove('loading');
            icon.classList.remove('fa-spin');
        }
    }

    switchSection(sectionId) {
        // Save the current section to localStorage
        localStorage.setItem('currentSection', sectionId);

        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show the selected section
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.add('active');
        }

        this.updateSection(sectionId);
    }

    restoreLastSection() {
        const lastSection = localStorage.getItem('currentSection') || 'dashboard';
        this.switchSection(lastSection);
    }

    updateSection(sectionId) {
        switch(sectionId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'workouts':
                this.updateWorkoutList();
                break;
            case 'nutrition':
                this.updateMealList();
                break;
            case 'measurements':
                this.updateMeasurementsList();
                break;
            case 'ingredients':
                this.updateIngredientsList();
                break;
            case 'recipes':
                this.updateRecipesList();
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

    handleRecipeSubmit(e) {
        e.preventDefault();
        const recipe = {
            name: document.getElementById('recipe-name').value,
            servings: parseInt(document.getElementById('recipe-servings').value),
            ingredients: this.currentRecipeIngredients,
            nutrition: this.dataManager.calculateRecipeNutrition(this.currentRecipeIngredients),
            date: new Date().toISOString()
        };
        this.dataManager.saveRecipe(recipe);
        e.target.reset();
        this.currentRecipeIngredients = [];
        this.updateRecipeIngredientsList();
        this.updateRecipesList();
    }

    addIngredientToRecipe() {
        const container = document.createElement('div');
        container.className = 'recipe-ingredient';
        
        const select = document.createElement('select');
        select.required = true;
        select.innerHTML = '<option value="">Select ingredient</option>' +
            this.dataManager.ingredients.map(ing => 
                `<option value="${ing.id}" data-unit="${ing.servingUnit}">${ing.name} (${ing.servingUnit})</option>`
            ).join('');
        
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.required = true;
        quantityInput.min = '0.1';
        quantityInput.step = '0.1';
        quantityInput.placeholder = 'Amount';
        
        const unitSpan = document.createElement('span');
        unitSpan.className = 'ingredient-unit';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => {
            container.remove();
            this.updateRecipeNutrition();
        };
        
        select.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const unit = selectedOption.dataset.unit;
            unitSpan.textContent = unit;
            this.updateRecipeNutrition();
        });
        
        quantityInput.addEventListener('input', () => this.updateRecipeNutrition());
        
        container.appendChild(select);
        container.appendChild(quantityInput);
        container.appendChild(unitSpan);
        container.appendChild(deleteBtn);
        
        document.getElementById('recipe-ingredients-list').appendChild(container);
    }

    updateRecipeNutrition() {
        const servings = parseInt(document.getElementById('recipe-servings').value) || 1;
        const ingredients = Array.from(document.querySelectorAll('.recipe-ingredient')).map(el => ({
            id: parseInt(el.querySelector('select').value),
            quantity: parseFloat(el.querySelector('input').value) || 0
        })).filter(ing => ing.id && ing.quantity > 0);
        
        this.currentRecipeIngredients = ingredients;
        
        const nutrition = this.dataManager.calculateRecipeNutrition(ingredients, servings);
        
        document.getElementById('recipe-nutrition-summary').innerHTML = `
            <div class="nutrition-grid">
                <div class="nutrition-item">
                    <div class="value">${nutrition.calories}</div>
                    <div class="label">Calories</div>
                </div>
                <div class="nutrition-item">
                    <div class="value">${nutrition.protein}g</div>
                    <div class="label">Protein</div>
                </div>
                <div class="nutrition-item">
                    <div class="value">${nutrition.carbs}g</div>
                    <div class="label">Carbs</div>
                </div>
                <div class="nutrition-item">
                    <div class="value">${nutrition.fat}g</div>
                    <div class="label">Fat</div>
                </div>
            </div>
        `;
    }

    updateIngredientsList() {
        const ingredientsList = document.getElementById('ingredients-list');
        if (!ingredientsList) return;

        ingredientsList.innerHTML = '';

        // Sort ingredients alphabetically by name
        const sortedIngredients = [...this.dataManager.ingredients].sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        sortedIngredients.forEach(ingredient => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ingredient.name}</td>
                <td>${ingredient.servingSize} ${ingredient.servingUnit}</td>
                <td>${Number(ingredient.calories).toFixed(1)}</td>
                <td>${Number(ingredient.protein).toFixed(1)}</td>
                <td>${Number(ingredient.carbs).toFixed(1)}</td>
                <td>${Number(ingredient.fat).toFixed(1)}</td>
                <td>${Number(ingredient.sugar).toFixed(1)}</td>
                <td>${Number(ingredient.fiber).toFixed(1)}</td>
                <td>
                    <button class="delete-btn" data-id="${ingredient.id}">×</button>
                </td>
            `;
            ingredientsList.appendChild(tr);
        });

        // Add event listeners to delete buttons
        ingredientsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.dataManager.deleteItem('ingredients', id);
            });
        });
    }

    updateRecipesList() {
        const recipesList = document.getElementById('recipes-list');
        const recipes = this.dataManager.recipes.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        recipesList.innerHTML = recipes.map(recipe => `
            <div class="recipe-item">
                <h4>${recipe.name}</h4>
                <div class="servings">Servings: ${recipe.servings}</div>
                <div class="ingredients">
                    <h5>Ingredients:</h5>
                    <ul>
                        ${recipe.ingredients.map(ing => {
                            const ingredient = this.dataManager.ingredients.find(i => i.id === ing.id);
                            return ingredient ? 
                                `<li>${ingredient.name} - ${ing.amount} ${ingredient.servingUnit}</li>` : '';
                        }).join('')}
                    </ul>
                </div>
                <div class="nutrition">
                    <h5>Nutrition per serving:</h5>
                    <div class="nutrition-grid">
                        <div class="nutrition-item">
                            <div class="value">${recipe.nutrition.calories}</div>
                            <div class="label">Calories</div>
                        </div>
                        <div class="nutrition-item">
                            <div class="value">${recipe.nutrition.protein}g</div>
                            <div class="label">Protein</div>
                        </div>
                        <div class="nutrition-item">
                            <div class="value">${recipe.nutrition.carbs}g</div>
                            <div class="label">Carbs</div>
                        </div>
                        <div class="nutrition-item">
                            <div class="value">${recipe.nutrition.fat}g</div>
                            <div class="label">Fat</div>
                        </div>
                    </div>
                </div>
                <button class="delete-btn" onclick="uiManager.dataManager.deleteItem('recipes', '${recipe.id}')">×</button>
            </div>
        `).join('');
    }

    handleIngredientSearch(e) {
        const query = e.target.value;
        const ingredients = this.dataManager.searchIngredients(query);
        const ingredientsList = document.getElementById('ingredients-list');
        
        ingredientsList.innerHTML = ingredients.map(ingredient => `
            <div class="ingredient-item">
                <div class="name">${ingredient.name}</div>
                <div class="serving">Serving: ${ingredient.servingSize}g</div>
                <div class="macros">
                    <div class="macro">
                        <div class="value">${ingredient.calories}</div>
                        <div class="label">Calories</div>
                    </div>
                    <div class="macro">
                        <div class="value">${ingredient.protein}g</div>
                        <div class="label">Protein</div>
                    </div>
                    <div class="macro">
                        <div class="value">${ingredient.carbs}g</div>
                        <div class="label">Carbs</div>
                    </div>
                    <div class="macro">
                        <div class="value">${ingredient.fat}g</div>
                        <div class="label">Fat</div>
                    </div>
                </div>
                <button class="delete-btn" onclick="uiManager.dataManager.deleteItem('ingredients', ${ingredient.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    updateRecipeIngredientsList() {
        document.getElementById('recipe-ingredients-list').innerHTML = '';
    }

    async exportIngredientsToCSV() {
        try {
            console.log('Starting export...');
            const ingredients = this.dataManager.ingredients;
            console.log('Ingredients to export:', ingredients);
            
            const headers = ['Item', 'servingSize', 'servingUnit', 'Calories', 'Fat (g)', 'Carb (g)', 'Protein (g)', 'Sugar (g)', 'Fibre (g)'];
            
            // Convert ingredients to CSV rows
            const csvRows = ingredients.map(ingredient => [
                ingredient.name,
                ingredient.servingSize,
                ingredient.servingUnit,
                ingredient.calories,
                ingredient.fat,
                ingredient.carbs,
                ingredient.protein,
                ingredient.sugar,
                ingredient.fiber
            ]);

            // Add headers
            csvRows.unshift(headers);

            // Convert to CSV string
            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            console.log('CSV content:', csvContent);

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.setAttribute('href', url);
            link.setAttribute('download', `ingredients_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            console.log('Export completed successfully');
        } catch (error) {
            console.error('Error exporting ingredients:', error);
            alert('Error exporting ingredients. Please check the console for details.');
        }
    }

    async importIngredientsFromCSV(event) {
        console.log('Import started');
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }
        console.log('File selected:', file.name);

        // Show loading status
        const statusDiv = document.getElementById('import-status');
        if (statusDiv) {
            statusDiv.textContent = 'Importing ingredients...';
            statusDiv.className = 'status-message info';
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                console.log('Reading file content');
                const csvContent = e.target.result;
                console.log('CSV content:', csvContent.substring(0, 200) + '...');
                
                const rows = csvContent.split('\n').filter(row => row.trim() !== '');
                const headers = rows[0].split(',').map(header => header.trim());
                console.log('Headers found:', headers);
                
                // Validate headers
                const requiredHeaders = ['Item', 'servingSize', 'servingUnit', 'Calories', 'Fat (g)', 'Carb (g)', 'Protein (g)', 'Sugar (g)', 'Fibre (g)'];
                const isValidHeaders = requiredHeaders.every(header => headers.includes(header));
                
                if (!isValidHeaders) {
                    console.error('Invalid headers:', headers);
                    throw new Error('Invalid CSV format. Please check the headers.');
                }

                let successCount = 0;
                let errorCount = 0;

                // Process each row
                for (let i = 1; i < rows.length; i++) {
                    if (!rows[i].trim()) continue;
                    
                    try {
                        const values = rows[i].split(',').map(value => value.trim());
                        console.log('Processing row:', values);
                        
                        // Validate row data
                        if (values.length !== headers.length) {
                            throw new Error(`Invalid number of columns in row ${i + 1}`);
                        }

                        const ingredient = {
                            name: values[0],
                            servingSize: parseFloat(values[1]) || 0,
                            servingUnit: values[2],
                            calories: parseFloat(values[3]) || 0,
                            fat: parseFloat(values[4]) || 0,
                            carbs: parseFloat(values[5]) || 0,
                            protein: parseFloat(values[6]) || 0,
                            sugar: parseFloat(values[7]) || 0,
                            fiber: parseFloat(values[8]) || 0,
                            timestamp: new Date().toISOString()
                        };

                        console.log('Adding ingredient:', ingredient);
                        await this.dataManager.saveIngredient(ingredient);
                        successCount++;
                        
                        // Update status
                        if (statusDiv) {
                            statusDiv.textContent = `Importing... (${successCount} of ${rows.length - 1} ingredients)`;
                        }
                    } catch (rowError) {
                        console.error(`Error processing row ${i + 1}:`, rowError);
                        errorCount++;
                    }
                }

                console.log(`Import completed. Success: ${successCount}, Errors: ${errorCount}`);
                
                // Refresh the ingredients list
                await this.updateIngredientsList();
                
                // Show final status
                if (statusDiv) {
                    statusDiv.textContent = `Import completed. Successfully imported ${successCount} ingredients.`;
                    statusDiv.className = 'status-message success';
                }
                
                alert(`Import completed!\nSuccessfully imported: ${successCount}\nFailed to import: ${errorCount}`);
            } catch (error) {
                console.error('Error importing ingredients:', error);
                if (statusDiv) {
                    statusDiv.textContent = `Error: ${error.message}`;
                    statusDiv.className = 'status-message error';
                }
                alert('Error importing ingredients. Please check the console for details.');
            }
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            if (statusDiv) {
                statusDiv.textContent = 'Error reading the file. Please try again.';
                statusDiv.className = 'status-message error';
            }
            alert('Error reading the file. Please try again.');
        };

        reader.readAsText(file);
    }
}

// Initialize the application
const dataManager = new DataManager();
const uiManager = new UIManager(dataManager); 