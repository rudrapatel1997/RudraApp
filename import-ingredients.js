// Import the Firebase configuration and functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCZ7ktAntMff_4nayFGFZd4GEgwlrp1KOg",
  authDomain: "tracker-7237c.firebaseapp.com",
  projectId: "tracker-7237c",
  storageBucket: "tracker-7237c.firebasestorage.app",
  messagingSenderId: "527825889294",
  appId: "1:527825889294:web:c472188af9d70c9c29f45f",
  measurementId: "G-6ZP2Y7Y6SY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// CSV data
const csvData = `Item,servingSize,servingUnit,Calories,Fat (g),Carb (g),Protein (g),Sugar (g),Fibre (g)
Lean Fit Chocolate Protein Powder,1,Scoop,140,4,3,24,2,0
Lean Fit Chocolate Protein Powder,35,g,140,4,3,24,2,0
Optimum Vanilla Protein Powder,1,Scoop,130,2,4,24,1,0
Optimum Vanilla Protein Powder,31,g,130,2,4,24,1,0
Quaker Rolled Oats,0,Cup,150,3,27,5,0,4
Quaker Rolled Oats,40,g,150,3,27,5,0,4
0% Milk,1,Cup,90,0,13,9,13,0
0% Milk,250,ml,90,0,13,9,13,0
Source Yogurt,1,Cup,80,0,9,10,5,0
Source Yogurt,175,g,80,0,9,10,5,0
Cheerios,2,Cup,140,3,29,5,2,4
Cheerios,39,g,140,3,29,5,2,4
Frozen Blueberries,1,Cup,40,1,10,0,7,3
Frozen Blueberries,80,g,40,1,10,0,7,3
Harvest Crunch Granola,1,Cup,450,17,68,10,23,8
Harvest Crunch Granola,100,g,450,17,68,10,23,8
Chip Ahoy Cookies,2,Cookies,140,7,19,1,10,0
Chip Ahoy Cookies,29,g,140,7,19,1,10,0
Soya Chunk,1,Serving,180,1,19,24,13,9
Soya Chunk,50,g,180,1,19,24,13,9
Peanut Butter,1,Tbsp,90,7,3,4,1,1
Peanut Butter,15,g,90,7,3,4,1,1
Bagel,1,Bagel,220,2,44,8,4,2
Bagel,1,Bagel,220,2,44,8,4,2
Country Harvest Bread,2,Slices,210,3,38,10,5,6
Country Harvest Bread,80,g,210,3,38,10,5,6
Chia Seed,15,g,65,4,5,3,0,10
Chia Seed,1,tbsp,65,4,5,3,0,10`;

// Function to parse CSV data
function parseCSV(csv) {
    const rows = csv.split('\n');
    const headers = rows[0].split(',');
    return rows.slice(1).map(row => {
        const values = row.split(',');
        return {
            name: values[0],
            servingSize: parseFloat(values[1]),
            servingUnit: values[2],
            calories: parseFloat(values[3]),
            fat: parseFloat(values[4]),
            carbs: parseFloat(values[5]),
            protein: parseFloat(values[6]),
            sugar: parseFloat(values[7]),
            fiber: parseFloat(values[8]),
            timestamp: new Date().toISOString()
        };
    });
}

// Function to import ingredients
async function importIngredients() {
    const ingredients = parseCSV(csvData);
    let successCount = 0;
    let errorCount = 0;

    console.log('Starting import of', ingredients.length, 'ingredients...');

    for (const ingredient of ingredients) {
        try {
            await addDoc(collection(db, 'ingredients'), ingredient);
            successCount++;
            console.log('Successfully added:', ingredient.name);
        } catch (error) {
            errorCount++;
            console.error('Error adding', ingredient.name, ':', error);
        }
    }

    console.log('Import completed!');
    console.log('Successfully imported:', successCount);
    console.log('Failed to import:', errorCount);
}

// Start the import process
importIngredients(); 