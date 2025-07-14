// =================================================================
// --- Firebase Configuration & Initialization ---
// =================================================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-aRNJ_vAWux8y_PHEdgkHumpKUhw-8lU",
  authDomain: "pt-management-system.firebaseapp.com",
  projectId: "pt-management-system",
  storageBucket: "pt-management-system.firebasestorage.app",
  messagingSenderId: "1046090768322",
  appId: "1:1046090768322:web:8e4f4351a58946adc7005b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// *** THIS BLOCK IS NOW ACTIVE ***
// Initialize Firebase and Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// All data for your unit will be stored in a single document for simplicity.
const unitDataRef = db.collection("units").doc("73ISRS_Det6");


// =================================================================
// --- Global State & DOM Cache ---
// =================================================================
let members = [];
let workoutHistory = [];
let savedReports = [];

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
// --- Data Persistence (Live Backend Communication) ---
// =================================================================

/**
 * Saves the entire application state to the Firestore database.
 */
async function saveData() {
    console.log("Saving data to Firestore...");
    try {
        // *** THIS IS THE REAL, ACTIVE CODE ***
        await unitDataRef.set({
            members: members,
            workoutHistory: workoutHistory,
            savedReports: savedReports
        });
        console.log("Data saved successfully to the live database!");
    } catch (error) {
        console.error("Error saving data to Firestore: ", error);
        alert("Could not save data to the server. Check console for errors.");
    }
}

/**
 * Loads the entire application state from the Firestore database.
 */
async function loadData() {
    console.log("Loading data from Firestore...");
    try {
        // *** THIS IS THE REAL, ACTIVE CODE ***
        const doc = await unitDataRef.get();
        if (doc.exists) {
            const data = doc.data();
            members = data.members || [];
            workoutHistory = data.workoutHistory || [];
            savedReports = data.savedReports || [];
            console.log("Data loaded successfully from the live database!");
        } else {
            console.log("No data found on server. Initializing new document.");
            // Creates the document if it's the first time running the app
            await saveData();
        }
    } catch (error) {
        console.error("Error loading data from Firestore: ", error);
        alert("Could not load data from the server. Check console for errors.");
    }
}

// =================================================================
// --- Core Application Logic ---
// =================================================================

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

    const reportObject = {
        id: new Date().getTime(),
        date: date,
        leader: leader,
        location: loc,
        content: reportText
    };
    savedReports.unshift(reportObject);
    saveData(); // Save the new report to the backend
    updateReportsUI();
}

function confirmAndUseWorkout(workoutText) {
    dom.workoutContent.textContent = workoutText;
    if (workoutHistory[0] !== workoutText) {
        workoutHistory.unshift(workoutText);
        if (workoutHistory.length > 10) workoutHistory.pop(); // Keep last 10
        saveData(); // Save changes to the backend
        updateWorkoutHistoryUI();
    }
    alert("Workout has been set and saved to history!");
}

async function handleSendPrompt() {
    const prompt = dom.aiPromptInput.value.trim();
    if (!prompt) return;

    displayMessage(prompt, 'user');
    dom.aiPromptInput.value = '';
    dom.sendPromptBtn.disabled = true;
    dom.sendPromptBtn.innerHTML = '<div class="spinner"></div>';

    try {
        // In a real app, this would call a secure cloud function
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

// =================================================================
// --- UI Update & Display Functions ---
// =================================================================

function updateUI() {
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
    dom.workoutHistoryList.innerHTML = '';
    workoutHistory.forEach(workout => {
        const li = document.createElement('li');
        li.textContent = workout.substring(0, 50).replace(/\n/g, ' ') + '...';
        li.title = 'Click to use this workout';
        li.onclick = () => confirmAndUseWorkout(workout);
        dom.workoutHistoryList.appendChild(li);
    });
}

function updateReportsUI() {
    // This is a placeholder. You would need a <div> in your HTML
    // to display the list of saved reports.
    console.log("Updating reports UI with:", savedReports);
}

function toggleMembersVisibility() {
    dom.memberManagementDiv.classList.toggle('members-hidden');
    const isHidden = dom.memberManagementDiv.classList.contains('members-hidden');
    dom.toggleMembersBtn.textContent = isHidden ? 'Show Members' : 'Hide Members';
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

// This is a placeholder for the AI call.
async function getAIWorkout(prompt) {
    return new Promise(resolve => setTimeout(() => resolve(`**Simulated AI Response for:** ${prompt}\n\n- 3 sets of 10 push-ups\n- 3 sets of 20 squats`), 1000));
}

// =================================================================
// --- Initialization ---
// =================================================================

async function init() {
    dom.ptDate.value = new Date().toISOString().split('T')[0];

    // Wait for data to load from the server before doing anything else
    await loadData();

    // Now that data is loaded, update all relevant UI sections
    updateUI();
    updateWorkoutHistoryUI();
    updateReportsUI();

    // Setup all event listeners
    dom.addMemberBtn.addEventListener('click', addMember);
    dom.generateReportBtn.addEventListener('click', generateReport);
    dom.ptLocationSelect.addEventListener('change', function () {
        dom.customLocationInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    dom.toggleMembersBtn.addEventListener('click', toggleMembersVisibility);
    dom.sendPromptBtn.addEventListener('click', handleSendPrompt);
    dom.aiPromptInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendPrompt());
}

// Start the application
window.onload = init;
