// Global state
let members = [];

// Cache DOM elements for performance and readability
const dom = {
    unitName: document.getElementById('unitName'),
    memberFile: document.getElementById('memberFile'),
    newMemberInput: document.getElementById('newMember'),
    isPTLeaderCheckbox: document.getElementById('isPTLeader'),
    addMemberBtn: document.getElementById('addMemberBtn'),
    memberManagementDiv: document.getElementById('memberManagement'),
    ptDate: document.getElementById('ptDate'),
    ptLeaderSelect: document.getElementById('ptLeader'),
    randomLeaderBtn: document.getElementById('randomLeaderBtn'),
    ptLocationSelect: document.getElementById('ptLocation'),
    customLocationInput: document.getElementById('customLocation'),
    ptTime: document.getElementById('ptTime'),
    workoutType: document.getElementById('workoutType'),
    workoutIntensity: document.getElementById('workoutIntensity'),
    workoutDuration: document.getElementById('workoutDuration'),
    generateWorkoutBtn: document.getElementById('generateWorkoutBtn'),
    workoutContent: document.getElementById('workoutContent'),
    generateReportBtn: document.getElementById('generateReportBtn'),
    copyReportBtn: document.getElementById('copyReportBtn'),
    reportOutput: document.getElementById('reportOutput'),
};

// --- Core Functions ---

function addMember() {
    const name = dom.newMemberInput.value.trim();
    const isPTLeader = dom.isPTLeaderCheckbox.checked;
    if (name && !members.some(m => m.name === name)) {
        members.push({ name, isPTLeader });
        saveData();
        updateUI();
        // Clear inputs after adding
        dom.newMemberInput.value = '';
        dom.isPTLeaderCheckbox.checked = false;
    }
}

function removeMember(indexToRemove) {
    const memberName = members[indexToRemove].name;
    if (confirm(`Are you sure you want to remove ${memberName}?`)) {
        members.splice(indexToRemove, 1); // Remove the member from the array
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

function generateWorkout() {
    const type = dom.workoutType.value;
    const intensity = dom.workoutIntensity.value;
    const workouts = {
        cardio: {
            light: 'Light jog and dynamic stretching for 30 minutes.',
            moderate: 'Interval running: 5 mins warm-up, 8x400m sprints with 200m jog recovery, 5 mins cool-down.',
            intense: 'HIIT session: 30s burpees, 30s rest, 30s high knees, 30s rest. Repeat 10 times. Followed by a 2-mile run.'
        },
        strength: {
            light: 'Bodyweight circuit: 3 rounds of 15 push-ups, 20 squats, 30s plank.',
            moderate: 'Push/Pull workout: 4 sets of pull-ups, push-ups, rows, and overhead press. Focus on core engagement.',
            intense: 'Heavy strength circuit: 5x5 deadlifts, 5x5 bench press, 5x5 squats.'
        },
        mixed: {
            light: '20-minute brisk walk followed by light core exercises (crunches, leg raises).',
            moderate: '1-mile run followed by a full-body strength circuit (kettlebell swings, lunges, push-ups).',
            intense: 'Team-based competition: Sprints, buddy carries, and circuit stations.'
        }
    };
    dom.workoutContent.textContent = workouts[type][intensity];
}

function generateReport() {
    const name = dom.unitName.value;
    const date = dom.ptDate.value;
    let loc = dom.ptLocationSelect.value;
    if (loc === 'custom') loc = dom.customLocationInput.value;
    const time = dom.ptTime.value;
    const leader = dom.ptLeaderSelect.value;
    const workout = dom.workoutContent.textContent;

    if (!leader) {
        alert("Please select a PT Leader before generating the report.");
        return;
    }

    const report = `PT Report - ${name}\n\nDate: ${date}\nTime: ${time}\nLocation: ${loc}\n\nLeader: ${leader}\n\nWorkout:\n${workout}`;
    dom.reportOutput.textContent = report;
    dom.copyReportBtn.style.display = 'inline-block';
}

function copyReportToClipboard() {
    const reportText = dom.reportOutput.textContent;
    navigator.clipboard.writeText(reportText).then(() => {
        alert('Report copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy report: ', err);
        alert('Failed to copy report.');
    });
}

// --- UI & Data Functions ---

function updateUI() {
    // Clear current lists to prevent duplication
    dom.memberManagementDiv.innerHTML = '';
    dom.ptLeaderSelect.innerHTML = '<option value="">Select PT Leader</option>';

    members.forEach(({ name, isPTLeader }, index) => {
        // Create list item for the member management section
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

        // Populate the PT Leader dropdown
        if (isPTLeader) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dom.ptLeaderSelect.appendChild(option);
        }
    });
}

function saveData() {
    localStorage.setItem('ptMembers', JSON.stringify(members));
}

function loadData() {
    const savedData = localStorage.getItem('ptMembers');
    if (savedData) {
        members = JSON.parse(savedData);
    }
}

// --- Initialization ---

function init() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    dom.ptDate.value = today;

    // Load data from localStorage
    loadData();
    updateUI();

    // Setup event listeners
    dom.addMemberBtn.addEventListener('click', addMember);
    dom.memberFile.addEventListener('change', uploadMemberList);
    dom.randomLeaderBtn.addEventListener('click', assignRandomLeader);
    dom.generateWorkoutBtn.addEventListener('click', generateWorkout);
    dom.generateReportBtn.addEventListener('click', generateReport);
    dom.copyReportBtn.addEventListener('click', copyReportToClipboard);
    dom.ptLocationSelect.addEventListener('change', function () {
        dom.customLocationInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });
}

// Run initialization when the page loads
window.onload = init;