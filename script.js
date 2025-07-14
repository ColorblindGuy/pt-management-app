// =================================================================
// --- Firebase Configuration & Initialization ---
// =================================================================

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-aRNJ_vAWux8y_PHEdgkHumpKUhw-8lU",
  authDomain: "pt-management-system.firebaseapp.com",
  projectId: "pt-management-system",
  storageBucket: "pt-management-system.firebasestorage.app",
  messagingSenderId: "1046090768322",
  appId: "1:1046090768322:web:8e4f4351a58946adc7005b"
};

// Initialize Firebase (using compat SDK)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Reference to your unit's document
const unitDataRef = db.collection("units").doc("73ISRS_Det6");

// =================================================================
// --- Global State & DOM Cache ---
// =================================================================
let members = [];
let workoutHistory = [];
let savedReports = [];
let attendanceRecords = [];

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
    todayRosterBtn: document.getElementById('todayRosterBtn'),
    rosterHistoryBtn: document.getElementById('rosterHistoryBtn'),
    todayRosterContent: document.getElementById('todayRosterContent'),
    rosterHistoryContent: document.getElementById('rosterHistoryContent'),
    attendanceList: document.getElementById('attendanceList'),
    attendanceHistory: document.getElementById('attendanceHistory'),
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
        await unitDataRef.set({
            members: members,
            workoutHistory: workoutHistory,
            savedReports: savedReports,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            attendanceRecords: attendanceRecords
        });
        console.log("Data saved successfully to the live database!");

      
        // Add visual feedback
        showNotification("Data saved successfully!", "success");
    } catch (error) {
        console.error("Error saving data to Firestore: ", error);
        showNotification("Error saving data. Check console for details.", "error");
    }
}

/**
 * Loads the entire application state from the Firestore database.
 */
async function loadData() {
    console.log("Loading data from Firestore...");
    try {
        const doc = await unitDataRef.get();
        if (doc.exists) {
            const data = doc.data();
            members = data.members || [];
            workoutHistory = data.workoutHistory || [];
            savedReports = data.savedReports || [];
            attendanceRecords = data.attendanceRecords || [];
            console.log("Data loaded successfully from the live database!");
            showNotification("Data loaded from server!", "success");
        } else {
            console.log("No data found on server. Initializing new document.");
            // Creates the document if it's the first time running the app
            await saveData();
            showNotification("Initialized new database document!", "info");
        }
    } catch (error) {
        console.error("Error loading data from Firestore: ", error);
        showNotification("Error loading data. Check console for details.", "error");
    }
}

/**
 * Sets up real-time listener for data changes
 */
function setupRealtimeListener() {
    unitDataRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const newMembers = data.members || [];
            const newWorkoutHistory = data.workoutHistory || [];
            const newSavedReports = data.savedReports || [];
            
            // Only update UI if data actually changed
            if (JSON.stringify(members) !== JSON.stringify(newMembers) ||
                JSON.stringify(workoutHistory) !== JSON.stringify(newWorkoutHistory) ||
                JSON.stringify(savedReports) !== JSON.stringify(newSavedReports)) {
                
                members = newMembers;
                workoutHistory = newWorkoutHistory;
                savedReports = newSavedReports;
                
                updateUI();
                updateWorkoutHistoryUI();
                updateReportsUI();
                
                console.log("Data updated from real-time sync!");
            }
        }
    }, (error) => {
        console.error("Error in real-time listener: ", error);
    });
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
    } else if (name && members.some(m => m.name === name)) {
        showNotification("Member already exists!", "error");
    }
}

function removeMember(indexToRemove) {
    if (confirm(`Are you sure you want to remove ${members[indexToRemove].name}?`)) {
        members.splice(indexToRemove, 1);
        saveData(); // Save changes to the backend
        updateUI();
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            const name = line.trim();
            if (name && !members.some(m => m.name === name)) {
                members.push({ name, isPTLeader: false });
            }
        });
        
        saveData();
        updateUI();
        showNotification(`Added ${lines.length} members from file!`, "success");
    };
    reader.readAsText(file);
}

function selectRandomLeader() {
    const ptLeaders = members.filter(m => m.isPTLeader);
    if (ptLeaders.length > 0) {
        const randomLeader = ptLeaders[Math.floor(Math.random() * ptLeaders.length)];
        dom.ptLeaderSelect.value = randomLeader.name;
        showNotification(`Random leader selected: ${randomLeader.name}`, "info");
    } else {
        showNotification("No PT Leaders available!", "error");
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
        showNotification("Please select a PT Leader and generate a workout before creating a report.", "error");
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
    
    showNotification("Report generated and saved!", "success");
}

function copyReportToClipboard() {
    const reportText = dom.reportOutput.textContent;
    navigator.clipboard.writeText(reportText).then(() => {
        showNotification("Report copied to clipboard!", "success");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification("Failed to copy report", "error");
    });
}

function confirmAndUseWorkout(workoutText) {
    dom.workoutContent.textContent = workoutText;
    if (workoutHistory[0] !== workoutText) {
        workoutHistory.unshift(workoutText);
        if (workoutHistory.length > 10) workoutHistory.pop(); // Keep last 10
        saveData(); // Save changes to the backend
        updateWorkoutHistoryUI();
    }
    showNotification("Workout has been set and saved to history!", "success");
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

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// This is a placeholder for the AI call.
async function getAIWorkout(prompt) {
    return new Promise(resolve => 
        setTimeout(() => resolve(
            `**AI Workout Response for:** ${prompt}\n\n` +
            `Warm-up (5 mins):\n- Light jogging in place\n- Arm circles\n- Leg swings\n\n` +
            `Main Workout (20 mins):\n- 3 sets of 15 push-ups\n- 3 sets of 20 squats\n- 3 sets of 30-second plank\n- 3 sets of 10 burpees\n\n` +
            `Cool-down (5 mins):\n- Walking\n- Stretching\n\n` +
            `Note: This is a simulated response. In production, this would connect to a real AI API.`
        ), 1000)
    );
}

// =================================================================
// --- Event Listeners Setup ---
// =================================================================

function setupEventListeners() {
    // Core functionality
    dom.addMemberBtn.addEventListener('click', addMember);
    dom.generateReportBtn.addEventListener('click', generateReport);
    dom.copyReportBtn.addEventListener('click', copyReportToClipboard);
    dom.randomLeaderBtn.addEventListener('click', selectRandomLeader);
    dom.memberFile.addEventListener('change', handleFileUpload);
    dom.todayRosterBtn.addEventListener('click', showTodayRoster);
    dom.rosterHistoryBtn.addEventListener('click', showRosterHistory);
    
    // UI interactions
    dom.ptLocationSelect.addEventListener('change', function () {
        dom.customLocationInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    dom.toggleMembersBtn.addEventListener('click', toggleMembersVisibility);
    
    // Chat functionality
    dom.sendPromptBtn.addEventListener('click', handleSendPrompt);
    dom.aiPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendPrompt();
    });
    
    // Add member with Enter key
    dom.newMemberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMember();
    });
}

// =================================================================
// --- Initialization ---
// =================================================================

async function init() {
    console.log("Initializing PT Management System...");
    
    // Set default date
    dom.ptDate.value = new Date().toISOString().split('T')[0];

    // Setup event listeners
    setupEventListeners();

    // Load data and setup real-time sync
    try {
        await loadData();
        setupRealtimeListener();
        
        // Update UI after data loads
        updateUI();
        updateWorkoutHistoryUI();
        updateReportsUI();
        
        console.log("PT Management System initialized successfully!");
    } catch (error) {
        console.error("Error during initialization:", error);
        showNotification("Error initializing app. Check console for details.", "error");
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function showTodayRoster() {
    dom.todayRosterContent.style.display = 'block';
    dom.rosterHistoryContent.style.display = 'none';
    updateTodayRosterUI();
}

function showRosterHistory() {
    dom.todayRosterContent.style.display = 'none';
    dom.rosterHistoryContent.style.display = 'block';
    updateRosterHistoryUI();
}

function updateTodayRosterUI() {
    const today = new Date().toISOString().split('T')[0];
    // Implementation for showing today's roster
}

function updateRosterHistoryUI() {
    // Implementation for showing roster history
}
