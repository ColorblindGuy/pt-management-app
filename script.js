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
    workoutFile: document.getElementById('workoutFile'),
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
    manualWorkoutInput: document.getElementById('manualWorkoutInput'),
    setManualWorkoutBtn: document.getElementById('setManualWorkoutBtn'),
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
            // CLEAN THE WORKOUT HISTORY
            cleanWorkoutHistory();
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

    // Calculate attendance statistics
    const attendanceStats = calculateAttendanceStats(date);
    
    const reportText = `PT Report - ${name}

Date: ${date}
Time: ${time}
Location: ${loc}

Leader: ${leader}

Attendance Summary:
Total Members: ${attendanceStats.total}
Present: ${attendanceStats.present} (${attendanceStats.presentPercentage}%)
Absent: ${attendanceStats.absent} (${attendanceStats.absentPercentage}%)
Excused: ${attendanceStats.excused} (${attendanceStats.excusedPercentage}%)

${attendanceStats.absentMembers.length > 0 ? `Absent Members:\n${attendanceStats.absentMembers.map(m => `- ${m.name}${m.alibi ? ` (${m.alibi})` : ''}`).join('\n')}\n` : ''}${attendanceStats.excusedMembers.length > 0 ? `Excused Members:\n${attendanceStats.excusedMembers.map(m => `- ${m.name}${m.alibi ? ` (${m.alibi})` : ''}`).join('\n')}\n` : ''}
Workout Plan:
${workout}`;

    dom.reportOutput.textContent = reportText;
    dom.copyReportBtn.style.display = 'inline-block';

    const reportObject = {
        id: new Date().getTime(),
        date: date,
        leader: leader,
        location: loc,
        content: reportText,
        attendanceStats: attendanceStats
    };
    savedReports.unshift(reportObject);
    saveData();
    updateReportsUI();

    showNotification("Report generated with attendance statistics!", "success");
}
function calculateAttendanceStats(date) {
    const record = attendanceRecords.find(r => r.date === date);
    const totalMembers = members.length;
    
    if (!record || totalMembers === 0) {
        return {
            total: totalMembers,
            present: 0,
            absent: 0,
            excused: 0,
            presentPercentage: 0,
            absentPercentage: 0,
            excusedPercentage: 0,
            absentMembers: [],
            excusedMembers: []
        };
    }

    let presentCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    const absentMembers = [];
    const excusedMembers = [];

    members.forEach(member => {
        const attendanceData = record.attendance[member.name];
        const status = typeof attendanceData === 'string' ? attendanceData : (attendanceData ? attendanceData.status : 'unknown');
        const alibi = typeof attendanceData === 'object' ? attendanceData.alibi : '';

        switch (status) {
            case 'present':
                presentCount++;
                break;
            case 'absent':
                absentCount++;
                absentMembers.push({ name: member.name, alibi });
                break;
            case 'excused':
                excusedCount++;
                excusedMembers.push({ name: member.name, alibi });
                break;
        }
    });

    return {
        total: totalMembers,
        present: presentCount,
        absent: absentCount,
        excused: excusedCount,
        presentPercentage: totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0,
        absentPercentage: totalMembers > 0 ? Math.round((absentCount / totalMembers) * 100) : 0,
        excusedPercentage: totalMembers > 0 ? Math.round((excusedCount / totalMembers) * 100) : 0,
        absentMembers,
        excusedMembers
    };
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
    if (confirm('Set this as today\'s workout?')) {
        dom.workoutContent.textContent = workoutText;
        
        // Add to workout history
        const today = new Date().toISOString().split('T')[0];
        workoutHistory.push({
            date: today,
            workout: workoutText,
            source: 'manual'
        });
        
        saveData();
        updateWorkoutHistoryUI();
        showNotification('Workout set for today!', 'success');
    }
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
        // Update attendance roster if it's currently showing
        if (dom.todayRosterContent && dom.todayRosterContent.style.display !== 'none') {
            updateTodayRosterUI();
        }
    });
    dom.toggleMembersBtn.style.display = members.length > 0 ? 'inline-block' : 'none';
}

function updateWorkoutHistoryUI() {
    dom.workoutHistoryList.innerHTML = '';

    if (!Array.isArray(workoutHistory) || workoutHistory.length === 0) {
        dom.workoutHistoryList.innerHTML = '<li>No workout history available.</li>';
        return;
    }

    // Sort by date (newest first)
    const sortedHistory = [...workoutHistory].sort((a, b) => {
        const dateA = typeof a === 'object' && a && a.date ? new Date(a.date) : new Date(0);
        const dateB = typeof b === 'object' && b && b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
    });

    sortedHistory.forEach((workout, index) => {
        if (workout === undefined || workout === null) return;

        const isObj = typeof workout === 'object' && workout !== null;
        const workoutText = isObj ? workout.workout : workout;
        const workoutDate = isObj && workout.date ? workout.date : 'Unknown Date';

        // Skip if workoutText is not a string
        if (typeof workoutText !== 'string') return;

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid #e0e0e0';

        const workoutInfo = document.createElement('div');
        workoutInfo.innerHTML = `<strong>${workoutDate}</strong><br><small>${workoutText.substring(0, 100)}${workoutText.length > 100 ? '...' : ''}</small>`;

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '5px';

        // Use button
        const useBtn = document.createElement('button');
        useBtn.textContent = 'Use';
        useBtn.className = 'btn btn-small';
        useBtn.style.fontSize = '10px';
        useBtn.style.padding = '3px 8px';
        useBtn.onclick = () => confirmAndUseWorkout(workoutText);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.style.fontSize = '10px';
        deleteBtn.style.padding = '3px 6px';
        deleteBtn.onclick = () => deleteWorkout(index);

        actions.appendChild(useBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(workoutInfo);
        li.appendChild(actions);
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
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-proj-your-api-key-here'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: `Create a detailed PT workout plan. ${prompt}`
                }],
                max_tokens: 500
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            const workoutText = data.choices[0].message.content;
            
            // Add to workout history
            const today = new Date().toISOString().split('T')[0];
            workoutHistory.push({
                date: today,
                workout: workoutText,
                source: 'ai'
            });
            
            saveData();
            updateWorkoutHistoryUI();
            
            return workoutText;
        } else {
            throw new Error('No response from AI');
        }
    } catch (error) {
        console.error('Error getting AI workout:', error);
        return 'Sorry, I couldn\'t generate a workout right now. Please try again or enter a workout manually.';
    }
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
    dom.setManualWorkoutBtn.addEventListener('click', setManualWorkout);
    dom.workoutFile.addEventListener('change', handleWorkoutFileUpload);

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
        showTodayRoster(); // Show today's roster by default
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
    dom.todayRosterBtn.classList.add('active');
    dom.rosterHistoryBtn.classList.remove('active');
    updateTodayRosterUI();
}

function showRosterHistory() {
    dom.todayRosterContent.style.display = 'none';
    dom.rosterHistoryContent.style.display = 'block';
    dom.todayRosterBtn.classList.remove('active');
    dom.rosterHistoryBtn.classList.add('active');
    updateRosterHistoryUI();
}

function updateTodayRosterUI() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = attendanceRecords.find(record => record.date === today) || {
        date: today,
        attendance: {}
    };

    dom.attendanceList.innerHTML = '';

    // Create table structure
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '10px';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #ddd; background-color: #f8f9fa;">Member</th>
        <th style="text-align: center; padding: 12px; border-bottom: 2px solid #ddd; background-color: #f8f9fa;">Status</th>
        <th style="text-align: center; padding: 12px; border-bottom: 2px solid #ddd; background-color: #f8f9fa;">Actions</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    members.forEach(member => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';
        
        const currentData = todayRecord.attendance[member.name] || 'unknown';
        const currentStatus = typeof currentData === 'string' ? currentData : currentData.status;
        const currentAlibi = typeof currentData === 'object' ? currentData.alibi : '';

        // Member name cell
        const nameCell = document.createElement('td');
        nameCell.style.padding = '12px';
        nameCell.innerHTML = `<strong>${member.name}</strong>${member.isPTLeader ? ' ⭐' : ''}`;
        
        // Status cell with icon
        const statusCell = document.createElement('td');
        statusCell.style.textAlign = 'center';
        statusCell.style.padding = '12px';
        
        let statusIcon = '';
        let statusColor = '';
        let statusText = '';
        
        switch(currentStatus) {
            case 'present':
                statusIcon = '✅';
                statusColor = '#28a745';
                statusText = 'Present';
                break;
            case 'absent':
                statusIcon = '❌';
                statusColor = '#dc3545';
                statusText = 'Absent';
                break;
            case 'excused':
                statusIcon = '🔵';
                statusColor = '#17a2b8';
                statusText = 'Excused';
                break;
            default:
                statusIcon = '⚪';
                statusColor = '#6c757d';
                statusText = 'Not Marked';
        }
        
        statusCell.innerHTML = `<span style="font-size: 18px;">${statusIcon}</span><br><small style="color: ${statusColor}; font-weight: bold;">${statusText}</small>`;
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.style.textAlign = 'center';
        actionsCell.style.padding = '12px';
        
        const actionButtons = document.createElement('div');
        actionButtons.style.display = 'flex';
        actionButtons.style.gap = '5px';
        actionButtons.style.justifyContent = 'center';
        
        // Present button
        const presentBtn = document.createElement('button');
        presentBtn.className = `status-btn status-present ${currentStatus === 'present' ? 'active' : ''}`;
        presentBtn.textContent = 'Present';
        presentBtn.style.fontSize = '11px';
        presentBtn.style.padding = '4px 8px';
        presentBtn.onclick = () => updateAttendance(member.name, 'present');
        
        // Absent button
        const absentBtn = document.createElement('button');
        absentBtn.className = `status-btn status-absent ${currentStatus === 'absent' ? 'active' : ''}`;
        absentBtn.textContent = 'Absent';
        absentBtn.style.fontSize = '11px';
        absentBtn.style.padding = '4px 8px';
        absentBtn.onclick = () => updateAttendance(member.name, 'absent');
        
        // Excused button
        const excusedBtn = document.createElement('button');
        excusedBtn.className = `status-btn status-excused ${currentStatus === 'excused' ? 'active' : ''}`;
        excusedBtn.textContent = 'Excused';
        excusedBtn.style.fontSize = '11px';
        excusedBtn.style.padding = '4px 8px';
        excusedBtn.onclick = () => updateAttendance(member.name, 'excused');
        
        actionButtons.appendChild(presentBtn);
        actionButtons.appendChild(absentBtn);
        actionButtons.appendChild(excusedBtn);
        actionsCell.appendChild(actionButtons);
        
        row.appendChild(nameCell);
        row.appendChild(statusCell);
        row.appendChild(actionsCell);
        tbody.appendChild(row);
        
        // Add alibi row if needed
        if (currentStatus !== 'present' && currentStatus !== 'unknown' && currentAlibi) {
            const alibiRow = document.createElement('tr');
            alibiRow.style.backgroundColor = '#f8f9fa';
            
            const alibiCell = document.createElement('td');
            alibiCell.colSpan = 3;
            alibiCell.style.padding = '8px 12px';
            alibiCell.style.fontSize = '12px';
            alibiCell.style.color = '#666';
            alibiCell.innerHTML = `<em>Alibi: ${currentAlibi}</em>`;
            
            alibiRow.appendChild(alibiCell);
            tbody.appendChild(alibiRow);
        }
    });

    table.appendChild(tbody);
    dom.attendanceList.appendChild(table);

    if (members.length === 0) {
        dom.attendanceList.innerHTML = '<p>No members added yet. Add members in the Unit Setup section.</p>';
    }
}

function updateAttendance(memberName, status) {
    const today = new Date().toISOString().split('T')[0];
    let todayRecord = attendanceRecords.find(record => record.date === today);

    if (!todayRecord) {
        todayRecord = {
            date: today,
            attendance: {}
        };
        attendanceRecords.push(todayRecord);
    }

    if (status === 'present') {
        todayRecord.attendance[memberName] = 'present';
    } else {
        const currentData = todayRecord.attendance[memberName];
        const currentAlibi = typeof currentData === 'object' ? currentData.alibi : '';
        todayRecord.attendance[memberName] = {
            status: status,
            alibi: currentAlibi
        };
    }

    saveData();
    updateTodayRosterUI();
    showNotification(`${memberName} marked as ${status}`, 'success');
}

function updateAttendanceWithAlibi(memberName, status, alibi) {
    const today = new Date().toISOString().split('T')[0];
    let todayRecord = attendanceRecords.find(record => record.date === today);

    if (todayRecord && todayRecord.attendance[memberName]) {
        todayRecord.attendance[memberName] = {
            status: status,
            alibi: alibi
        };
        saveData();
        showNotification(`Updated alibi for ${memberName}`, 'success');
    }
}

function updateRosterHistoryUI() {
    dom.attendanceHistory.innerHTML = '';
    
    if (attendanceRecords.length === 0) {
        dom.attendanceHistory.innerHTML = '<p>No attendance history available.</p>';
        return;
    }
    
    // Sort records by date (newest first)
    const sortedRecords = [...attendanceRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedRecords.forEach(record => {
        const recordDiv = document.createElement('div');
        recordDiv.className = 'attendance-record';
        recordDiv.style.marginBottom = '20px';
        recordDiv.style.padding = '15px';
        recordDiv.style.border = '1px solid #ddd';
        recordDiv.style.borderRadius = '8px';
        recordDiv.style.backgroundColor = 'white';
        
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        
        const dateHeader = document.createElement('h4');
        dateHeader.textContent = `Date: ${record.date}`;
        dateHeader.style.margin = '0';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.onclick = () => deleteAttendanceRecord(record.date);
        
        header.appendChild(dateHeader);
        header.appendChild(deleteBtn);
        recordDiv.appendChild(header);
        
        // Create table for attendance
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Member</th>
            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Status</th>
            <th style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">Actions</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        members.forEach(member => {
            const row = document.createElement('tr');
            const currentData = record.attendance[member.name];
            const currentStatus = typeof currentData === 'string' ? currentData : (currentData ? currentData.status : 'unknown');
            const currentAlibi = typeof currentData === 'object' ? currentData.alibi : '';
            
            // Member name
            const nameCell = document.createElement('td');
            nameCell.style.padding = '8px';
            nameCell.innerHTML = `<strong>${member.name}</strong>${member.isPTLeader ? ' ⭐' : ''}`;
            
            // Status with icon
            const statusCell = document.createElement('td');
            statusCell.style.textAlign = 'center';
            statusCell.style.padding = '8px';
            
            let statusIcon = '';
            let statusColor = '';
            let statusText = '';
            
            switch(currentStatus) {
                case 'present':
                    statusIcon = '✅';
                    statusColor = '#28a745';
                    statusText = 'Present';
                    break;
                case 'absent':
                    statusIcon = '❌';
                    statusColor = '#dc3545';
                    statusText = 'Absent';
                    break;
                case 'excused':
                    statusIcon = '🔵';
                    statusColor = '#17a2b8';
                    statusText = 'Excused';
                    break;
                default:
                    statusIcon = '⚪';
                    statusColor = '#6c757d';
                    statusText = 'Not Marked';
            }
            
            statusCell.innerHTML = `<span style="font-size: 16px;">${statusIcon}</span><br><small style="color: ${statusColor}; font-weight: bold;">${statusText}</small>`;
            
            // Actions
            const actionsCell = document.createElement('td');
            actionsCell.style.textAlign = 'center';
            actionsCell.style.padding = '8px';
            
            const actionButtons = document.createElement('div');
            actionButtons.style.display = 'flex';
            actionButtons.style.gap = '3px';
            actionButtons.style.justifyContent = 'center';
            
            ['present', 'absent', 'excused'].forEach(status => {
                const btn = document.createElement('button');
                btn.className = `status-btn status-${status} ${currentStatus === status ? 'active' : ''}`;
                btn.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                btn.style.fontSize = '10px';
                btn.style.padding = '3px 6px';
                btn.onclick = () => updateHistoryAttendance(record.date, member.name, status);
                actionButtons.appendChild(btn);
            });
            
            actionsCell.appendChild(actionButtons);
            
            row.appendChild(nameCell);
            row.appendChild(statusCell);
            row.appendChild(actionsCell);
            tbody.appendChild(row);
            
            // Add alibi row if exists
            if (currentStatus !== 'present' && currentStatus !== 'unknown' && currentAlibi) {
                const alibiRow = document.createElement('tr');
                alibiRow.style.backgroundColor = '#f8f9fa';
                
                const alibiCell = document.createElement('td');
                alibiCell.colSpan = 3;
                alibiCell.style.padding = '4px 8px';
                alibiCell.style.fontSize = '11px';
                alibiCell.style.color = '#666';
                alibiCell.innerHTML = `<em>Alibi: ${currentAlibi}</em>`;
                
                alibiRow.appendChild(alibiCell);
                tbody.appendChild(alibiRow);
            }
        });
        
        table.appendChild(tbody);
        recordDiv.appendChild(table);
        dom.attendanceHistory.appendChild(recordDiv);
    });
}

function deleteAttendanceRecord(date) {
    if (confirm(`Are you sure you want to delete the attendance record for ${date}?`)) {
        attendanceRecords = attendanceRecords.filter(record => record.date !== date);
        saveData();
        updateRosterHistoryUI();
        showNotification(`Deleted attendance record for ${date}`, 'success');
    }
}

function setManualWorkout() {
    const workoutText = dom.manualWorkoutInput.value.trim();
    if (!workoutText) {
        showNotification("Please enter a workout plan", "error");
        return;
    }
    
    confirmAndUseWorkout(workoutText);
    dom.manualWorkoutInput.value = '';
}

function updateWorkoutHistoryUI() {
    dom.workoutHistoryList.innerHTML = '';
    
    if (workoutHistory.length === 0) {
        dom.workoutHistoryList.innerHTML = '<li>No workout history available.</li>';
        return;
    }
    
    // Sort by date (newest first)
    const sortedHistory = [...workoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedHistory.forEach((workout, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid #e0e0e0';
        
        const workoutInfo = document.createElement('div');
        workoutInfo.innerHTML = `<strong>${workout.date}</strong><br><small>${workout.workout.substring(0, 100)}${workout.workout.length > 100 ? '...' : ''}</small>`;
        
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '5px';
        
        // Use button
        const useBtn = document.createElement('button');
        useBtn.textContent = 'Use';
        useBtn.className = 'btn btn-small';
        useBtn.style.fontSize = '10px';
        useBtn.style.padding = '3px 8px';
        useBtn.onclick = () => confirmAndUseWorkout(workout.workout);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.style.fontSize = '10px';
        deleteBtn.style.padding = '3px 6px';
        deleteBtn.onclick = () => deleteWorkout(index);
        
        actions.appendChild(useBtn);
        actions.appendChild(deleteBtn);
        
        li.appendChild(workoutInfo);
        li.appendChild(actions);
        dom.workoutHistoryList.appendChild(li);
    });
}

function deleteWorkout(index) {
    if (confirm('Are you sure you want to delete this workout?')) {
        workoutHistory.splice(index, 1);
        saveData();
        updateWorkoutHistoryUI();
        showNotification('Workout deleted successfully!', 'success');
    }
}

function handleWorkoutFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const workoutText = e.target.result;
        const today = new Date().toISOString().split('T')[0];
        
        // Add to workout history
        workoutHistory.push({
            date: today,
            workout: workoutText,
            source: 'file_upload'
        });
        
        // Set as today's workout
        confirmAndUseWorkout(workoutText);
        
        saveData();
        updateWorkoutHistoryUI();
        showNotification('Workout uploaded and set as today\'s workout!', 'success');
    };
    reader.readAsText(file);
}

function cleanWorkoutHistory() {
    if (!Array.isArray(workoutHistory)) return;
    // Only keep valid entries: objects with a string workout, or strings
    workoutHistory = workoutHistory.filter(entry => {
        if (typeof entry === 'string') return true;
        if (typeof entry === 'object' && entry !== null && typeof entry.workout === 'string') return true;
        return false;
    });
    saveData();
}

