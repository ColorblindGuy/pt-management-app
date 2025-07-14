// =================================================================
// --- Firebase Configuration & Initialization ---
// =================================================================
// PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE
const firebaseConfig = {
  apiKey: "AIzaSyB-aRNJ_vAWux8y_PHEdgkHumpKUhw-8lU",
  authDomain: "pt-management-system.firebaseapp.com",
  projectId: "pt-management-system",
  storageBucket: "pt-management-system.firebasestorage.app",
  messagingSenderId: "1046090768322",
  appId: "1:1046090768322:web:8e4f4351a58946adc7005b"
};

// Initialize Firebase and Firestore
// This code will activate once you add the Firebase SDKs to your HTML and uncomment it.
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const unitDataRef = db.collection("units").doc("73ISRS_Det6"); // Using a single document for all unit data


// =================================================================
// --- Global State & DOM Cache ---
// =================================================================
let members = [];
let workoutHistory = [];
let savedReports = []; // For storing generated reports

const dom = {
    unitName: document.getElementById('unitName'),
    memberFile: document.getElementById('memberFile'),
    newMemberInput: document.getElementById('newMember'),
    isPTLeaderCheckbox: document.getElementById('isPTLeader'),
    addMemberBtn: document.getElementById('addMemberBtn'),
    memberManagementDiv: document.getElementById('memberManagement'),
    toggleMembersBtn: document.getElementById('toggleMembersBtn'),
    ptDate: document.getElementById('ptDate'),
    ptLeaderSelect: document.getElementById('ptLeader'),
    randomLeaderBtn: document.getElementById('randomLeaderBtn'),
    ptLocationSelect: document.getElementById('ptLocation'),
    customLocationInput: document.getElementById('customLocation'),
    ptTime: document.getElementById('ptTime'),
    workoutHistoryList: document.getElementById('workoutHistoryList'),
    aiPromptInput: document.getElementById('aiPromptInput'),
    sendPromptBtn: document.getElementById('sendPromptBtn'),
    chatBox: document.getElementById('chatBox'),
    workoutContent: document.getElementById('workoutContent'),
    generateReportBtn: document.getElementById('generateReportBtn'),
    copyReportBtn: document.getElementById('copyReportBtn'),
    reportOutput: document.getElementById('reportOutput'),
};


// =================================================================
// --- Data Persistence (Backend Communication) ---
// =================================================================

/**
 * Saves the entire application state to the Firestore database.
 * This function will be called whenever data changes.
 */
async function saveData() {
    console.log("Attempting to save data to the backend...");
    try {
        // This is where you'd use the Firestore reference to save data.
        // await unitDataRef.set({
        //   members: members,
        //   workoutHistory: workoutHistory,
        //   savedReports: savedReports
        // });
        console.log("Data saved successfully! (Simulated)");
    } catch (error) {
        console.error("Error saving data: ", error);
        alert("Could not save data to the server. Please check your connection and configuration.");
    }
}

/**
 * Loads the entire application state from the Firestore database.
 * This function is called once when the application starts.
 */
async function loadData() {
    console.log("Attempting to load data from the backend...");
    try {
        // This is where you'd get the data from Firestore.
        // const doc = await unitDataRef.get();
        // if (doc.exists) {
        //   const data = doc.data();
        //   members = data.members || [];
        //   workoutHistory = data.workoutHistory || [];
        //   savedReports = data.savedReports || [];
        //   console.log("Data loaded successfully!");
        // } else {
        //   console.log("No data found on the server. Initializing a new document.");
        //   await saveData(); // Create the document if it doesn't exist
        // }
        console.log("Data loaded successfully! (Simulated)");
    } catch (error) {
        console.error("Error loading data: ", error);
        alert("Could not load data from the server. Please check your connection and configuration.");
    }
}


// =================================================================
// --- Core Application Logic ---
// =================================================================

async function getAIWorkout(prompt) {
    // This function remains the same, simulating an LLM call.
    // In a real app, you'd call a cloud function or a secure API endpoint here.
    console.log("Simulating AI API call with prompt:", prompt);
    return new Promise(resolve => {
        setTimeout(() => {
            const sampleWorkout = `**Workout Plan: ${prompt}**\n\n` +
                `**1. Warm-up (5 minutes):**\n` +
                `- Jumping Jacks (60 seconds)\n` +
                `- High Knees (60 seconds)\n\n` +
                `**2. Main Circuit (20 minutes):**\n` +
                `*Complete 3 rounds, 60s rest between rounds*\n` +
                `- 15 Push-ups\n` +
                `- 20 Bodyweight Squats\n\n` +
                `**3. Cool-down (5 minutes):**\n` +
                `- Quad Stretch (30s each leg)`;
            resolve(sampleWorkout);
        }, 1500);
    });
}

function addMember() {
    const name = dom.newMemberInput.value.trim();
    const isPTLeader = dom.isPTLeaderCheckbox.checked;
    if (name && !members.some(m => m.name === name)) {
        members.push({ name, isPTLeader });
        saveData(); // Save changes to the backend
        updateUI();
        dom.newMemberInput.value = '';
        dom.isPTLeaderCheckbox.checked = false;
    }
}

function removeMember(indexToRemove) {
    if (confirm(`Are you sure you want to remove ${members[indexToRemove].name}?`)) {
        members.splice(indexToRemove, 1);
        saveData(); // Save changes to the backend
        updateUI();
    }
}

function generateReport() {
    const name = dom.unitName.value;
    const date = dom.ptDate.value;
    const loc = dom.ptLocationSelect.value === 'custom' ? dom.customLocationInput.value : dom.ptLocationSelect.value;
    const time = dom.ptTime.value;
    const leader = dom.ptLeaderSelect.value;
    const workout = dom.workoutContent.textContent;

    if (!leader || !workout) {
        alert("Please select a PT Leader and generate a workout before creating a report.");
        return;
    }

    const reportText = `PT Report - ${name}\n\nDate: ${date}\nTime: ${time}\nLocation: ${loc}\n\nLeader: ${leader}\n\nWorkout Plan:\n${workout}`;
    dom.reportOutput.textContent = reportText;
    dom.copyReportBtn.style.display = 'inline-block';

    // Create a structured report object and save it
    const reportObject = {
        id: new Date().getTime(), // Unique ID
        date: date,
        leader: leader,
        location: loc,
        content: reportText
    };
    savedReports.unshift(reportObject); // Add to the start of the array
    saveData(); // Save the new report to the backend
    updateReportsUI(); // Update the UI to show the new saved report
}

function confirmAndUseWorkout(workoutText) {
    dom.workoutContent.textContent = workoutText;
    if (workoutHistory[0] !== workoutText) {
        workoutHistory.unshift(workoutText);
        if (workoutHistory.length > 5) workoutHistory.pop();
        saveData(); // Save changes to the backend
        updateWorkoutHistoryUI();
    }
    alert("Workout has been set and saved to history!");
}


// =================================================================
// --- UI Update & Display Functions ---
// =================================================================

function updateUI() {
    // This function updates the member list and PT leader dropdown
    dom.memberManagementDiv.innerHTML = '';
    dom.ptLeaderSelect.innerHTML = '<option value="">Select PT Leader</option>';

    members.forEach(({ name, isPTLeader }, index) => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        const memberNameSpan = document.createElement('span');
        memberNameSpan.textContent = `${name}${isPTLeader ? ' ⭐' : ''}`;
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '❌';
        deleteBtn.title = `Remove ${name}`;
        deleteBtn.onclick = () => removeMember(index);
        memberItem.appendChild(memberNameSpan);
        memberItem.appendChild(deleteBtn);
        dom.memberManagementDiv.appendChild(memberItem);

        if (isPTLeader) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dom.ptLeaderSelect.appendChild(option);
        }
    });

    dom.toggleMembersBtn.style.display = members.length > 0 ? 'inline-block' : 'none';
}

function updateWorkoutHistoryUI() {
    // This function updates the workout history list
    dom.workoutHistoryList.innerHTML = '';
    workoutHistory.forEach(workout => {
        const li = document.createElement('li');
        li.textContent = workout.substring(0, 50).replace(/\n/g, ' ') + '...';
        li.title = 'Click to use this workout';
        li.onclick = () => confirmAndUseWorkout(workout);
        dom.workoutHistoryList.appendChild(li);
    });
}

/**
 * A new function to display saved reports.
 * You will need to add a corresponding <div> in your HTML to show this list.
 */
function updateReportsUI() {
    console.log("Updating reports UI with:", savedReports);
    // Example: Find a <div id="savedReportsList"></div> in your HTML
    // and populate it with the list of saved reports.
}

function toggleMembersVisibility() {
    dom.memberManagementDiv.classList.toggle('members-hidden');
    const isHidden = dom.memberManagementDiv.classList.contains('members-hidden');
    dom.toggleMembersBtn.textContent = isHidden ? 'Show Members' : 'Hide Members';
}

async function handleSendPrompt() {
    const prompt = dom.aiPromptInput.value.trim();
    if (!prompt) return;

    displayMessage(prompt, 'user');
    dom.aiPromptInput.value = '';
    dom.sendPromptBtn.disabled = true;
    dom.sendPromptBtn.innerHTML = '<div class="spinner"></div>';

    try {
        const aiResponse = await getAIWorkout(prompt);
        displayMessage(aiResponse, 'ai');
    } catch (error) {
        console.error("Error fetching AI workout:", error);
        displayMessage("Sorry, I couldn't generate a workout right now.", 'ai');
    } finally {
        dom.sendPromptBtn.disabled = false;
        dom.sendPromptBtn.textContent = 'Ask AI';
    }
}

function displayMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;

    if (type === 'ai') {
        const workoutText = document.createElement('p');
        workoutText.style.whiteSpace = 'pre-wrap';
        workoutText.textContent = content;
        messageDiv.appendChild(workoutText);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn';
        confirmBtn.textContent = 'Confirm & Use this Workout';
        confirmBtn.onclick = () => confirmAndUseWorkout(content);
        messageDiv.appendChild(confirmBtn);
    } else {
        messageDiv.textContent = content;
    }

    dom.chatBox.appendChild(messageDiv);
    dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
}


// =================================================================
// --- Initialization ---
// =================================================================

/**
 * The main initialization function for the application.
 * It's now `async` to wait for the initial data load from the server.
 */
async function init() {
    dom.ptDate.value = new Date().toISOString().split('T')[0];

    await loadData(); // Wait for data to load before doing anything else

    // Now that data is loaded, update all relevant UI sections
    updateUI();
    updateWorkoutHistoryUI();
    updateReportsUI();

    // Setup all event listeners
    dom.addMemberBtn.addEventListener('click', addMember);
    dom.randomLeaderBtn.addEventListener('click', () => { /* assignRandomLeader logic can be added here */ });
    dom.generateReportBtn.addEventListener('click', generateReport);
    dom.copyReportBtn.addEventListener('click', () => { /* copyReportToClipboard logic */ });
    dom.ptLocationSelect.addEventListener('change', function () {
        dom.customLocationInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    dom.toggleMembersBtn.addEventListener('click', toggleMembersVisibility);
    dom.sendPromptBtn.addEventListener('click', handleSendPrompt);
    dom.aiPromptInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendPrompt());
}

// Start the application when the window loads
window.onload = init;
