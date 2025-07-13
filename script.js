// --- Global State ---
let members = [];
let workoutHistory = []; // New state for workout history

// --- DOM Cache ---
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

// --- LLM Integration (Simulated) ---
// IMPORTANT: For a real application, replace the simulated logic with a `fetch` call to an LLM API.
async function getAIWorkout(prompt) {

    const apiKey = 'AIzaSyBrgbnA3cHcU-8h9hXH_U-McAls8HKMIOQ';
    const apiURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "user",
                content: `Generate a detailed physical training workout plan based on this request: "${prompt}". Format it clearly with sections for warm-up, main workout, and cool-down.`
            }],
            max_tokens: 250
        })
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
    */
    // For now, we simulate the API call with a delay and a sample response.
//     console.log("Simulating AI API call with prompt:", prompt);
//     return new Promise(resolve => {
//         setTimeout(() => {
//             const sampleWorkout = `**Workout Plan: ${prompt}**\n\n` +
//                 `**1. Warm-up (5 minutes):**\n` +
//                 `- Jumping Jacks (60 seconds)\n` +
//                 `- High Knees (60 seconds)\n` +
//                 `- Arm Circles (30 seconds each way)\n\n` +
//                 `**2. Main Circuit (20 minutes):**\n` +
//                 `*Complete 3 rounds, 60s rest between rounds*\n` +
//                 `- 15 Push-ups\n` +
//                 `- 20 Bodyweight Squats\n` +
//                 `- 12 Lunges (each leg)\n\n` +
//                 `**3. Cool-down (5 minutes):**\n` +
//                 `- Quad Stretch (30s each leg)\n` +
//                 `- Hamstring Stretch (30s each leg)`;
//             resolve(sampleWorkout);
//         }, 1500); // Simulate network delay
//     });
// }

// --- Chatbot and Workout Functions ---

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
    dom.chatBox.scrollTop = dom.chatBox.scrollHeight; // Auto-scroll to the bottom
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
        displayMessage("Sorry, I couldn't generate a workout right now. Please try again.", 'ai');
    } finally {
        dom.sendPromptBtn.disabled = false;
        dom.sendPromptBtn.textContent = 'Ask AI';
    }
}

function confirmAndUseWorkout(workoutText) {
    dom.workoutContent.textContent = workoutText;
    // Add to history only if it's not already the most recent one
    if (workoutHistory[0] !== workoutText) {
        workoutHistory.unshift(workoutText); // Add to the beginning of the array
        if (workoutHistory.length > 5) workoutHistory.pop(); // Keep history to a max of 5 items
        saveData();
        updateWorkoutHistoryUI();
    }
    alert("Workout has been set and saved to history!");
}

// --- Core Functions (Members, Report, etc.) ---

function addMember() {
    const name = dom.newMemberInput.value.trim();
    const isPTLeader = dom.isPTLeaderCheckbox.checked;
    if (name && !members.some(m => m.name === name)) {
        members.push({ name, isPTLeader });
        saveData();
        updateUI();
        dom.newMemberInput.value = '';
        dom.isPTLeaderCheckbox.checked = false;
    }
}

function removeMember(indexToRemove) {
    if (confirm(`Are you sure you want to remove ${members[indexToRemove].name}?`)) {
        members.splice(indexToRemove, 1);
        saveData();
        updateUI();
    }
}

function uploadMemberList() {
    const file = dom.memberFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const lines = e.target.result.split('\n');
        lines.forEach(line => {
            const [name, tag] = line.split(',').map(x => x.trim());
            if (name && !members.some(m => m.name === name)) {
                members.push({ name, isPTLeader: tag?.toLowerCase() === 'pt' });
            }
        });
        saveData();
        updateUI();
    };
    reader.readAsText(file);
}

function assignRandomLeader() {
    const leaders = members.filter(m => m.isPTLeader);
    if (leaders.length === 0) {
        alert("No PT Leaders available to assign randomly.");
        return;
    }
    const randomLeader = leaders[Math.floor(Math.random() * leaders.length)];
    dom.ptLeaderSelect.value = randomLeader.name;
}

function generateReport() {
    const name = dom.unitName.value;
    const date = dom.ptDate.value;
    let loc = dom.ptLocationSelect.value === 'custom' ? dom.customLocationInput.value : dom.ptLocationSelect.value;
    const time = dom.ptTime.value;
    const leader = dom.ptLeaderSelect.value;
    const workout = dom.workoutContent.textContent;

    if (!leader || !workout) {
        alert("Please select a PT Leader and generate a workout before creating a report.");
        return;
    }

    const report = `PT Report - ${name}\n\nDate: ${date}\nTime: ${time}\nLocation: ${loc}\n\nLeader: ${leader}\n\nWorkout Plan:\n${workout}`;
    dom.reportOutput.textContent = report;
    dom.copyReportBtn.style.display = 'inline-block';
}

function copyReportToClipboard() {
    navigator.clipboard.writeText(dom.reportOutput.textContent).then(() => {
        alert('Report copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy report: ', err);
    });
}

// --- UI Update Functions ---

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

function toggleMembersVisibility() {
    dom.memberManagementDiv.classList.toggle('members-hidden');
    const isHidden = dom.memberManagementDiv.classList.contains('members-hidden');
    dom.toggleMembersBtn.textContent = isHidden ? 'Show Members' : 'Hide Members';
}

// --- Data Persistence ---

function saveData() {
    localStorage.setItem('ptMembers', JSON.stringify(members));
    localStorage.setItem('ptWorkoutHistory', JSON.stringify(workoutHistory));
}

function loadData() {
    const savedMembers = localStorage.getItem('ptMembers');
    if (savedMembers) {
        members = JSON.parse(savedMembers);
    }
    const savedHistory = localStorage.getItem('ptWorkoutHistory');
    if (savedHistory) {
        workoutHistory = JSON.parse(savedHistory);
    }
}

// --- Initialization ---

function init() {
    dom.ptDate.value = new Date().toISOString().split('T')[0];
    loadData();
    updateUI();
    updateWorkoutHistoryUI();

    // Setup event listeners
    dom.addMemberBtn.addEventListener('click', addMember);
    dom.memberFile.addEventListener('change', uploadMemberList);
    dom.randomLeaderBtn.addEventListener('click', assignRandomLeader);
    dom.generateReportBtn.addEventListener('click', generateReport);
    dom.copyReportBtn.addEventListener('click', copyReportToClipboard);
    dom.ptLocationSelect.addEventListener('change', function () {
        dom.customLocationInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    dom.toggleMembersBtn.addEventListener('click', toggleMembersVisibility);
    dom.sendPromptBtn.addEventListener('click', handleSendPrompt);
    dom.aiPromptInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handleSendPrompt();
        }
    });
}

// Run initialization when the page loads
window.onload = init;
