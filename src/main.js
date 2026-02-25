// ===== FitCareer — AI 맞춤 자소서/이력서 생성기 =====

const API_BASE = '';  // relative path — works for both localhost and production

// ===== DOM Helpers =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== State =====
let skills = [];
let experienceCount = 0;
let uploadedFormatFile = null;
let profilePhoto = null; // base64 data URL
let currentResumeData = null; // stored for theme re-rendering

// ===== SVG Icons (Lucide-style, hand-picked) =====
const ICONS = {
    briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    building: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
    filePen: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 0 0-3 3L12 21l4 1-1-4Z"/></svg>',
    fileBadge: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="12" cy="14" r="3"/></svg>',
    messageQuestion: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    copy: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    download: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
    upload: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
    paperclip: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    camera: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
};

// ===== Initialize Icons =====
function initIcons() {
    const map = {
        logoIcon: 'briefcase',
        toggleKeyVisibility: 'eyeOff',
        iconCompany: 'building',
        iconProfile: 'user',
        iconFormat: 'fileText',
        iconGenerate: 'sparkles',
        iconTabCover: 'filePen',
        iconTabResume: 'fileBadge',
        iconTabInterview: 'messageQuestion',
        iconEmpty: 'inbox',
        iconEmpty2: 'inbox',
        iconEmpty3: 'inbox',
        iconCopy1: 'copy',
        iconCopy2: 'copy',
        iconCopy3: 'copy',
        iconPdf1: 'download',
        iconPdf2: 'download',
        iconUpload: 'upload',
        iconFilePreview: 'paperclip',
        iconPhoto: 'camera',
    };
    Object.entries(map).forEach(([id, icon]) => {
        const el = $(`#${id}`);
        if (el && ICONS[icon]) el.innerHTML = ICONS[icon];
    });
}

// ===== API Key =====
function initApiKey() {
    const saved = localStorage.getItem('fc_api_key');
    if (saved) {
        $('#apiKeyInput').value = saved;
        $('#saveApiKey').checked = true;
    }
}

function saveApiKey() {
    if ($('#saveApiKey').checked) {
        localStorage.setItem('fc_api_key', $('#apiKeyInput').value.trim());
    } else {
        localStorage.removeItem('fc_api_key');
    }
}

$('#toggleKeyVisibility').addEventListener('click', () => {
    const inp = $('#apiKeyInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
});

$('#apiKeyInput').addEventListener('change', saveApiKey);

// ===== Skills Tags =====
function renderSkills() {
    const container = $('#skillTags');
    container.innerHTML = skills.map((s, i) => `
    <span class="skill-tag">
      ${s}
      <button class="tag-remove" data-index="${i}">&times;</button>
    </span>
  `).join('');
    container.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            skills.splice(parseInt(btn.dataset.index), 1);
            renderSkills();
        });
    });
}

$('#skillInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.isComposing) return; // Korean IME still composing
        const val = e.target.value.trim();
        if (val && !skills.includes(val)) {
            skills.push(val);
            renderSkills();
        }
        e.target.value = '';
    }
});

// ===== Certifications Tags =====
let certifications = [];

function renderCerts() {
    const container = $('#certTags');
    container.innerHTML = certifications.map((c, i) => `
    <span class="skill-tag" style="background:#f0f7f0;color:#2a5a2a;border-color:#c6e6c6;">
      ${c}
      <button class="tag-remove" data-index="${i}">&times;</button>
    </span>
  `).join('');
    container.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            certifications.splice(parseInt(btn.dataset.index), 1);
            renderCerts();
        });
    });
}

$('#certInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.isComposing) return;
        const val = e.target.value.trim();
        if (val && !certifications.includes(val)) {
            certifications.push(val);
            renderCerts();
        }
        e.target.value = '';
    }
});

$('#certInput').addEventListener('compositionend', (e) => {
    const val = e.target.value.trim();
    if (val && !certifications.includes(val) && e.data && e.data.includes('\n')) {
        certifications.push(val);
        renderCerts();
        e.target.value = '';
    }
});

// Handle Korean IME: when composition ends, check if Enter was intended
$('#skillInput').addEventListener('compositionend', (e) => {
    // After IME finalizes, if user pressed Enter during composition,
    // the value is now complete. We use a small delay to let the value update.
    setTimeout(() => {
        const input = e.target;
        // Only auto-add if the input still has a value (Enter during composition)
        // This is handled by the keydown above after compositionend fires
    }, 0);
});

$('.tags-input-wrap').addEventListener('click', () => {
    $('#skillInput').focus();
});

// ===== Experience Items =====
function addExperience(company = '', role = '', period = '') {
    const idx = experienceCount++;
    const list = $('#experienceList');
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.dataset.index = idx;
    item.innerHTML = `
    <input type="text" class="input input-sm exp-company" placeholder="회사명" value="${company}" />
    <input type="text" class="input input-sm exp-role" placeholder="직무/역할" value="${role}" />
    <input type="text" class="input input-sm exp-period" placeholder="기간 (예: 2020.03~2023.06)" value="${period}" />
    <button class="btn-remove-exp" data-index="${idx}">&times;</button>
  `;
    list.appendChild(item);
    item.querySelector('.btn-remove-exp').addEventListener('click', () => item.remove());
}

$('#btnAddExperience').addEventListener('click', () => addExperience());

// ===== Education Items (Multi-add) =====
let educationCount = 0;
function addEducation(school = '', major = '', period = '') {
    const idx = educationCount++;
    const list = $('#educationList');
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.dataset.index = idx;
    item.innerHTML = `
    <input type="text" class="input input-sm edu-school" placeholder="학교명" value="${school}" />
    <input type="text" class="input input-sm edu-major" placeholder="전공" value="${major}" />
    <input type="text" class="input input-sm edu-period" placeholder="기간 (예: 2015.03~2019.02)" value="${period}" />
    <button class="btn-remove-exp" data-index="${idx}">&times;</button>
  `;
    list.appendChild(item);
    item.querySelector('.btn-remove-exp').addEventListener('click', () => item.remove());
}

$('#btnAddEducation').addEventListener('click', () => addEducation());

// ===== Save / Load Profile =====
function saveProfile() {
    const profile = {
        name: $('#userName').value,
        email: $('#userEmail').value,
        phone: $('#userPhone').value,
        address: $('#userAddress').value,
        gender: $('#userGender').value,
        age: $('#userAge').value,
        isManAge: $('#isManAge').checked,
        skills: skills,
        certifications: certifications,
        freeDescription: $('#freeDescription').value,
        photo: profilePhoto || null,
        experiences: Array.from($('#experienceList').querySelectorAll('.experience-item')).map(item => ({
            company: item.querySelector('.exp-company').value,
            role: item.querySelector('.exp-role').value,
            period: item.querySelector('.exp-period').value
        })),
        educations: Array.from($('#educationList').querySelectorAll('.experience-item')).map(item => ({
            school: item.querySelector('.edu-school').value,
            major: item.querySelector('.edu-major').value,
            period: item.querySelector('.edu-period').value
        }))
    };
    localStorage.setItem('fc_profile', JSON.stringify(profile));
    showToast('프로필이 저장되었습니다');
}

function loadProfile() {
    const saved = localStorage.getItem('fc_profile');
    if (!saved) return;
    const p = JSON.parse(saved);
    if (p.name) $('#userName').value = p.name;
    if (p.email) $('#userEmail').value = p.email;
    if (p.phone) $('#userPhone').value = p.phone;
    if (p.address) $('#userAddress').value = p.address;
    if (p.gender) $('#userGender').value = p.gender;
    if (p.age) $('#userAge').value = p.age;
    if (p.isManAge) $('#isManAge').checked = p.isManAge;
    if (p.photo) {
        profilePhoto = p.photo;
        $('#photoImg').src = profilePhoto;
        $('#photoImg').style.display = 'block';
        $('#photoPlaceholder').style.display = 'none';
        $('#btnRemovePhoto').style.display = 'flex';
    }
    if (p.skills) { skills = p.skills; renderSkills(); }
    if (p.certifications) {
        // Handle both array (new) and string (legacy) formats
        if (Array.isArray(p.certifications)) {
            certifications = p.certifications;
        } else {
            certifications = p.certifications.split(/[,，]/).map(c => c.trim()).filter(c => c);
        }
        renderCerts();
    }
    if (p.freeDescription) $('#freeDescription').value = p.freeDescription;
    if (p.experiences) {
        p.experiences.forEach(exp => addExperience(exp.company, exp.role, exp.period || ''));
    }
    if (p.educations) {
        p.educations.forEach(edu => addEducation(edu.school, edu.major, edu.period));
    }
}

$('#btnSaveProfile').addEventListener('click', saveProfile);

// ===== Tabs =====
$$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.tab-pane').forEach(p => p.classList.remove('active'));
        const tabName = btn.dataset.tab;
        const tabId = `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
        $(`#${tabId}`).classList.add('active');
        // Re-scale resume preview when tab becomes visible
        if (tabName === 'resume') {
            setTimeout(() => scaleResumePreview(), 50);
        }
    });
});

// ===== Format Toggle =====
$('#outputFormat').addEventListener('change', (e) => {
    $('#customFormatGroup').style.display = e.target.value === 'custom' ? 'block' : 'none';
});

// ===== Toast =====
function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== Copy to Clipboard =====
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('클립보드에 복사되었습니다');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('클립보드에 복사되었습니다');
    }
}

// ===== Progress =====
function setProgress(percent, text) {
    const bar = $('#progressBar');
    bar.style.display = 'block';
    $('#progressFill').style.width = `${percent}%`;
    $('#progressText').textContent = text;
}

// ===== Validate =====
function validate() {
    if (!$('#companyName').value.trim()) {
        showToast('기업명을 입력해주세요');
        $('#companyName').focus();
        return false;
    }
    if (!$('#jobPosition').value.trim()) {
        showToast('지원 직무를 입력해주세요');
        $('#jobPosition').focus();
        return false;
    }
    if (!$('#userName').value.trim()) {
        showToast('이름을 입력해주세요');
        $('#userName').focus();
        return false;
    }
    if (!$('#apiKeyInput').value.trim()) {
        showToast('API Key를 입력해주세요');
        $('#apiKeyInput').focus();
        return false;
    }
    return true;
}

// ===== Collect Form Data =====
function collectData() {
    return {
        company: {
            name: $('#companyName').value.trim(),
            jobPosition: $('#jobPosition').value.trim(),
            url: $('#companyUrl').value.trim(),
            jobPostingUrl: $('#jobPostingUrl').value.trim(),
            additionalInfo: $('#additionalInfo').value.trim()
        },
        profile: {
            name: $('#userName').value.trim(),
            email: $('#userEmail').value.trim(),
            phone: $('#userPhone').value.trim(),
            address: $('#userAddress').value.trim(),
            photo: profilePhoto,
            educations: Array.from($('#educationList').querySelectorAll('.experience-item')).map(item => ({
                school: item.querySelector('.edu-school').value.trim(),
                major: item.querySelector('.edu-major').value.trim(),
                period: item.querySelector('.edu-period').value.trim()
            })).filter(e => e.school || e.major),
            experiences: Array.from($('#experienceList').querySelectorAll('.experience-item')).map(item => ({
                company: item.querySelector('.exp-company').value.trim(),
                role: item.querySelector('.exp-role').value.trim(),
                period: item.querySelector('.exp-period').value.trim()
            })).filter(e => e.company || e.role),
            skills: skills,
            certifications: certifications,
            freeDescription: $('#freeDescription').value.trim(),
            gender: $('#userGender').value,
            age: $('#userAge').value.trim(),
            isManAge: $('#isManAge').checked
        },
        format: {
            type: $('#outputFormat').value,
            customFormat: $('#customFormat')?.value.trim() || '',
            file: uploadedFormatFile
        },
        apiKey: $('#apiKeyInput').value.trim(),
        provider: $('#providerSelect').value,
        model: $('#modelSelect').value
    };
}

// ===== PDF Download (browser print fallback) =====
function downloadPdf(elementId, filename) {
    const element = $(`#${elementId}`);
    if (!element || !element.textContent.trim()) {
        showToast('다운로드할 내용이 없습니다');
        return;
    }
    const isResume = elementId === 'resumeText';
    let content = element.innerHTML;

    // For resume: extract just the .resume-a4-page content
    if (isResume) {
        const temp = document.createElement('div');
        temp.innerHTML = content;
        const page = temp.querySelector('.resume-a4-page');
        if (page) {
            page.style.transform = 'none';
            page.style.width = '210mm';
            page.style.height = '297mm';
            page.style.boxShadow = 'none';
            content = page.outerHTML;
        }
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<title>${filename}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: ${isResume ? '0' : '15mm'}; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Noto Sans KR', 'Inter', sans-serif;
    margin: 0; padding: ${isResume ? '0' : '30px'};
    color: #1A1D26;
    line-height: ${isResume ? '1.5' : '1.85'};
    font-size: ${isResume ? '12px' : '14px'};
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
}
/* A4 Page */
.resume-a4-page {
    width: 210mm; height: 297mm;
    box-shadow: none; overflow: hidden;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
}
/* Table styles */
.resume-a4-page table { border-collapse: collapse; width: 100%; }
.resume-a4-page th, .resume-a4-page td {
    border: 1px solid #333 !important; border-style: solid !important;
    padding: 6px 10px; font-size: 12px; vertical-align: middle; line-height: 1.5;
}
.resume-a4-page th {
    font-weight: 700 !important; text-align: center;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
}
/* Lists */
.resume-a4-page ul { list-style: disc; padding-left: 18px; margin: 0; }
.resume-a4-page h1, .resume-a4-page h2, .resume-a4-page h3, .resume-a4-page p { margin: 0; padding: 0; }
/* Force background colors in print */
[style*="background"] {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
}
/* Cover letter styles for print */
.cl-section { margin-bottom: 10px; }
.cl-title { font-size: 13px; padding: 5px 10px; margin-bottom: 6px; border-left: 3px solid #0d9488; }
.cl-text { font-size: 13px; line-height: 1.6; }
.cl-text p { margin-bottom: 3px; }
/* Interview Q&A */
.qa-block { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
.qa-question { font-weight: 700; color: #115E59; margin-bottom: 4px; font-size: 13px; }
.qa-answer { color: #374151; font-size: 12px; }
/* Modern resume multi-page safety */
.resume-a4-page { overflow: visible !important; height: auto !important; min-height: 297mm; }
</style>
</head><body>${content}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
}

// ===== Inspirational Quotes for Loading =====
const QUOTES = [
    { text: '"실패는 성공의 어머니다"', author: '토마스 에디슨' },
    { text: '"천 리 길도 한 걸음부터"', author: '노자' },
    { text: '"꿈을 이루고자 하는 용기만 있다면,\n모든 꿈은 이루어진다"', author: '월트 디즈니' },
    { text: '"오늘 할 수 있는 일에\n최선을 다하라"', author: '에이브러햄 링컨' },
    { text: '"당신이 할 수 있다고 믿든,\n할 수 없다고 믿든, 당신이 옳다"', author: '헨리 포드' },
    { text: '"위대한 일은 작은 일들이\n모여 이루어진다"', author: '빈센트 반 고흐' },
    { text: '"성공은 매일 반복한\n작은 노력의 합이다"', author: '로버트 콜리어' },
    { text: '"지금 이 순간이\n가장 빠른 시작이다"', author: '중국 속담' },
    { text: '"원숭이도 나무에서 떨어질 때가 있다.\n하지만 다시 올라간다 💪"', author: '한국 속담 (개량)' },
    { text: '"준비된 자에게\n기회는 찾아온다"', author: '루이 파스퇴르' },
    { text: '"오퍼스도 div에서\n떨어질 때가 있다 🤖"', author: 'One&Only Labs' },
    { text: '"행동이 말보다\n크게 말한다"', author: '벤자민 프랭클린' },
    { text: '"노력 없이 얻어지는 것은\n아무것도 없다"', author: '호레이스' },
    { text: '"자신감은 성공의\n첫 번째 비밀이다"', author: '랄프 왈도 에머슨' },
    { text: '"인생에서 가장 큰 영광은\n넘어지지 않는 것이 아니라,\n넘어질 때마다 일어서는 것이다"', author: '넬슨 만델라' },
];

let quoteInterval = null;
function showLoadingOverlay() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="max-width:500px;text-align:center;padding:40px;">
                    <div style="width:50px;height:50px;border:3px solid rgba(255,255,255,0.15);border-top-color:#2dd4bf;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 32px;"></div>
                    <div id="quoteText" style="font-size:22px;font-weight:700;color:#fff;line-height:1.6;margin-bottom:12px;transition:opacity 0.5s;white-space:pre-line;"></div>
                    <div id="quoteAuthor" style="font-size:13px;color:rgba(255,255,255,0.5);transition:opacity 0.5s;"></div>
                    <div style="margin-top:32px;font-size:12px;color:rgba(255,255,255,0.3);">AI가 기업을 분석하고 맞춤 콘텐츠를 생성하고 있습니다...</div>
                </div>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
    function rotateQuote() {
        const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        const qt = document.getElementById('quoteText');
        const qa = document.getElementById('quoteAuthor');
        if (qt && qa) {
            qt.style.opacity = '0'; qa.style.opacity = '0';
            setTimeout(() => {
                qt.textContent = q.text; qa.textContent = `— ${q.author}`;
                qt.style.opacity = '1'; qa.style.opacity = '1';
            }, 400);
        }
    }
    rotateQuote();
    quoteInterval = setInterval(rotateQuote, 5000);
}
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
    if (quoteInterval) { clearInterval(quoteInterval); quoteInterval = null; }
}

// ===== GENERATE =====
$('#btnGenerate').addEventListener('click', async () => {
    if (!validate()) return;

    const data = collectData();
    saveApiKey();

    const btn = $('#btnGenerate');
    btn.disabled = true;
    $('.btn-generate-text').style.display = 'none';
    $('.btn-generate-loading').style.display = 'inline-flex';
    showLoadingOverlay();

    try {
        setProgress(10, '기업 정보 분석 중...');

        const res = await fetch(`${API_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        setProgress(50, 'AI가 맞춤 자소서 생성 중...');

        const result = await res.json();
        if (result.error) {
            showToast(`오류: ${result.error}`);
            return;
        }

        setProgress(85, '결과물 렌더링 중...');

        // Cover Letter — render as structured HTML
        if (result.coverLetter) {
            $('#coverLetterEmpty').style.display = 'none';
            $('#coverLetterContent').style.display = 'block';
            $('#coverLetterTitle').textContent = `${data.company.name} ${data.company.jobPosition} 맞춤 자기소개서`;
            const clEl = $('#coverLetterText');
            clEl.innerHTML = formatCoverLetter(result.coverLetter);
        }

        // Resume — render JSON data into themed HTML template
        if (result.resumeData) {
            try {
                currentResumeData = result.resumeData;
                console.log('[Resume] Received resumeData:', JSON.stringify(currentResumeData).substring(0, 200));

                // Client-side fallback: if server sent raw string, try parsing it here
                if (currentResumeData.raw && typeof currentResumeData.raw === 'string') {
                    try {
                        let rawStr = currentResumeData.raw;
                        rawStr = rawStr.replace(/^```json?\s*/i, '').replace(/\s*```$/m, '').trim();
                        const firstBrace = rawStr.indexOf('{');
                        const lastBrace = rawStr.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace > firstBrace) {
                            rawStr = rawStr.substring(firstBrace, lastBrace + 1);
                        }
                        rawStr = rawStr.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                        const parsed = JSON.parse(rawStr);
                        if (parsed.name || parsed.contact) {
                            currentResumeData = parsed;
                            console.log('[Resume] Client-side JSON parse succeeded');
                        }
                    } catch (e) {
                        console.warn('[Resume] Client-side JSON parse also failed:', e.message);
                    }
                }

                // === MERGE: User input data takes priority over AI-generated data ===
                const userProfile = data.profile;
                if (userProfile.name) currentResumeData.name = userProfile.name;
                if (userProfile.gender) currentResumeData.gender = userProfile.gender;
                if (userProfile.age) currentResumeData.age = userProfile.age;
                if (userProfile.email || userProfile.phone || userProfile.address) {
                    currentResumeData.contact = currentResumeData.contact || {};
                    if (userProfile.email) currentResumeData.contact.email = userProfile.email;
                    if (userProfile.phone) currentResumeData.contact.phone = userProfile.phone;
                    if (userProfile.address) currentResumeData.contact.address = userProfile.address;
                }
                if (userProfile.age) {
                    const ageLabel = userProfile.isManAge ? `만 ${userProfile.age}세` : `${userProfile.age}세`;
                    currentResumeData.genderAge = `${userProfile.gender || ''} / ${ageLabel}`;
                } else if (userProfile.gender) {
                    currentResumeData.genderAge = userProfile.gender;
                }
                if (userProfile.educations?.length > 0) {
                    currentResumeData.education = userProfile.educations;
                }
                if (data.company?.jobPosition) {
                    currentResumeData.jobPosition = data.company.jobPosition;
                }
                // === END MERGE ===

                $('#resumeEmpty').style.setProperty('display', 'none', 'important');
                $('#resumeContent').style.setProperty('display', 'block', 'important');
                $('#resumeContent').classList.remove('hidden');
                const theme = $('#resumeTheme').value;
                console.log('[Resume] Before renderResume, resumeContent computed display:', window.getComputedStyle($('#resumeContent')).display);
                $('#resumeText').innerHTML = renderResume(currentResumeData, theme, profilePhoto);
                setTimeout(() => autoFitA4Content(), 0);
                setTimeout(() => scaleResumePreview(), 300);
                console.log('[Resume] Render complete, resumeContent display =', window.getComputedStyle($('#resumeContent')).display,
                    'resumeText innerHTML length =', $('#resumeText').innerHTML.length);
            } catch (resumeErr) {
                console.error('[Resume] Render error:', resumeErr);
                showToast('이력서 렌더링 오류: ' + resumeErr.message);
            }
        } else {
            console.warn('[Resume] No resumeData in response');
        }

        // Interview — with formatting
        if (result.interview) {
            try {
                $('#interviewEmpty').style.setProperty('display', 'none', 'important');
                $('#interviewContent').style.setProperty('display', 'block', 'important');
                $('#interviewContent').classList.remove('hidden');
                let interviewHtml = result.interview;
                interviewHtml = interviewHtml.replace(/<div class="qa-answer">((?:(?!<\/div>).)+)<\/div>/gs, (match, content) => {
                    if (!content.includes('<p>')) {
                        const paragraphs = content.trim().split(/\n{2,}|\.\s+(?=[가-힣A-Z])/);
                        const formatted = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
                        return `<div class="qa-answer">${formatted}</div>`;
                    }
                    return match;
                });
                $('#interviewText').innerHTML = interviewHtml;
                console.log('[Interview] Render complete');
            } catch (interviewErr) {
                console.error('[Interview] Render error:', interviewErr);
                showToast('면접질문 렌더링 오류: ' + interviewErr.message);
            }
        } else {
            console.warn('[Interview] No interview data in response');
        }

        setProgress(100, '생성 완료!');
        hideLoadingOverlay();
        setTimeout(() => { $('#progressBar').style.display = 'none'; }, 2000);

        $$('.tab-btn')[0].click();
        showToast('맞춤 자소서가 생성되었습니다');
        $('.btn-generate-text').textContent = '다시 생성하기';

    } catch (err) {
        showToast(`서버 연결 오류: ${err.message}`);
        $('#progressBar').style.display = 'none';
        hideLoadingOverlay();
    } finally {
        btn.disabled = false;
        $('.btn-generate-text').style.display = 'inline';
        $('.btn-generate-loading').style.display = 'none';
        hideLoadingOverlay();
    }
});

// ===== Action Buttons =====
$('#btnCopyCover').addEventListener('click', () => {
    const text = $('#coverLetterText').textContent;
    if (text) copyToClipboard(text);
});
$('#btnCopyResume').addEventListener('click', () => {
    const text = $('#resumeText').innerText;
    if (text) copyToClipboard(text);
});
$('#btnCopyInterview').addEventListener('click', () => {
    const text = $('#interviewText').innerText;
    if (text) copyToClipboard(text);
});

// ===== Regenerate Buttons (Cover Letter & Interview) =====
async function regenerateContent(type) {
    if (!validate()) return;
    const data = collectData();
    const btn = type === 'coverLetter' ? $('#btnRegenCover') : $('#btnRegenInterview');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> 생성 중...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/regenerate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, regenerateType: type })
        });
        const result = await res.json();
        if (result.error) { showToast(result.error); return; }

        if (type === 'coverLetter' && result.coverLetter) {
            $('#coverLetterText').innerHTML = formatCoverLetter(result.coverLetter);
            showToast('자기소개서가 재생성되었습니다');
        } else if (type === 'interview' && result.interview) {
            // Interview HTML comes ready from server (qa-block divs)
            $('#interviewText').innerHTML = result.interview;
            showToast('면접 예상질문이 재생성되었습니다');
        }
    } catch (e) {
        showToast('재생성 실패: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

$('#btnRegenCover').addEventListener('click', () => regenerateContent('coverLetter'));
$('#btnRegenInterview').addEventListener('click', () => regenerateContent('interview'));

// ===== Multi-Content Print/PDF =====
$('#btnMultiPrint').addEventListener('click', () => {
    $('#multiPrintModal').style.display = 'block';
});
$('#btnMultiPrintCancel').addEventListener('click', () => {
    $('#multiPrintModal').style.display = 'none';
});
$('#multiPrintModal').addEventListener('click', (e) => {
    if (e.target === $('#multiPrintModal')) {
        $('#multiPrintModal').style.display = 'none';
    }
});
$('#btnMultiPrintConfirm').addEventListener('click', () => {
    const includeCover = $('#printCoverLetter').checked;
    const includeResume = $('#printResume').checked;
    const includeInterview = $('#printInterview').checked;

    if (!includeCover && !includeResume && !includeInterview) {
        showToast('최소 하나 이상 선택해주세요');
        return;
    }

    downloadMultiPdf({ includeCover, includeResume, includeInterview });
    $('#multiPrintModal').style.display = 'none';
});

function downloadMultiPdf({ includeCover, includeResume, includeInterview }) {
    const sections = [];

    if (includeCover) {
        const el = $('#coverLetterText');
        if (el && el.textContent.trim()) {
            // Get the full styled cover letter container (card with shadow)
            const container = el.closest('.bg-white');
            const content = container ? container.innerHTML : el.innerHTML;
            sections.push({ title: '자기소개서', content, type: 'coverLetter' });
        }
    }

    if (includeResume) {
        const el = $('#resumeText');
        if (el && el.textContent.trim()) {
            let content = el.innerHTML;
            const temp = document.createElement('div');
            temp.innerHTML = content;
            const page = temp.querySelector('.resume-a4-page');
            if (page) {
                page.style.transform = 'none';
                page.style.width = '210mm';
                page.style.minHeight = '297mm';
                page.style.boxShadow = 'none';
                page.style.margin = '0';
                page.style.padding = page.style.padding || '20px 25px';
                content = page.outerHTML;
            }
            sections.push({ title: '이력서', content, type: 'resume' });
        }
    }

    if (includeInterview) {
        const el = $('#interviewText');
        if (el && el.textContent.trim()) {
            sections.push({ title: '면접 예상질문', content: el.innerHTML, type: 'interview' });
        }
    }

    if (sections.length === 0) {
        showToast('출력할 내용이 없습니다. 먼저 생성해주세요.');
        return;
    }

    const combinedContent = sections.map((sec, i) => {
        if (sec.type === 'resume') {
            // Resume: ALWAYS starts on a new page, exactly 1 A4, NEVER breaks
            return `<div style="page-break-before: always; page-break-after: always; page-break-inside: avoid; padding:0; width:210mm; height:297mm; overflow:hidden;">${sec.content}</div>`;
        } else if (sec.type === 'coverLetter') {
            // Cover letter: flows naturally, can span multiple pages
            const needsBreakAfter = i < sections.length - 1;
            return `<div style="${needsBreakAfter ? 'page-break-after: always;' : ''} padding:20mm;">
                <div style="border-bottom:3px solid #14B8A6; padding-bottom:12px; margin-bottom:24px;">
                    <h1 style="font-size:22px; font-weight:800; color:#115E59; margin:0;">자기소개서</h1>
                </div>
                <div style="font-size:14px; line-height:1.85; color:#1A1D26;">
                    ${$('#coverLetterText').innerHTML}
                </div>
            </div>`;
        } else if (sec.type === 'interview') {
            // Interview: flows naturally, can span multiple pages
            return `<div style="padding:20mm;">
                <div style="border-bottom:3px solid #14B8A6; padding-bottom:12px; margin-bottom:24px;">
                    <h1 style="font-size:22px; font-weight:800; color:#115E59; margin:0;">${sec.title}</h1>
                </div>
                <div style="font-size:14px; line-height:1.7; color:#1A1D26;">
                    ${$('#interviewText').innerHTML}
                </div>
            </div>`;
        } else {
            return `<div style="padding:20mm;">
                <div style="border-bottom:3px solid #14B8A6; padding-bottom:12px; margin-bottom:24px;">
                    <h1 style="font-size:22px; font-weight:800; color:#115E59; margin:0;">${sec.title}</h1>
                </div>
                ${sec.content}
            </div>`;
        }
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<title>FitCareer</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Noto Sans KR', 'Inter', sans-serif;
    margin: 0; color: #1A1D26;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
}
/* Cover letter section styling */
.cl-section { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0; }
.cl-section:last-child { border-bottom: none; }
.cl-title { font-weight: 700; color: #115E59; font-size: 15px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #E2E8F0; }
.cl-text { font-size: 14px; line-height: 1.85; color: #1A1D26; }
.cl-text p { margin-bottom: 12px; }
/* Resume A4 page */
.resume-a4-page {
    width: 210mm !important; height: 297mm !important;
    box-shadow: none !important; overflow: hidden !important;
    transform: none !important; margin: 0 !important;
    page-break-inside: avoid !important;
    page-break-before: always !important;
    print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
}
.resume-a4-inner {
    display: flex !important; flex-direction: column !important;
    height: 297mm !important; overflow: hidden !important;
}
.resume-a4-page table { border-collapse: collapse; width: 100%; }
.resume-a4-page th, .resume-a4-page td {
    border: 1px solid #333 !important; border-style: solid !important;
    padding: 6px 10px; font-size: 12px; vertical-align: middle; line-height: 1.5;
}
.resume-a4-page th {
    font-weight: 700 !important; text-align: center;
    print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
}
.resume-a4-page ul { list-style: disc; padding-left: 18px; margin: 0; }
.resume-a4-page h1, .resume-a4-page h2, .resume-a4-page h3, .resume-a4-page p { margin: 0; padding: 0; }
[style*="background"] {
    print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
}
/* Interview Q&A */
.qa-block { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #E5E7EB; }
.qa-block:last-child { border-bottom: none; }
.qa-question { font-weight: 700; color: #115E59; margin-bottom: 8px; font-size: 14px; }
.qa-answer { color: #374151; font-size: 13px; line-height: 1.7; }
.qa-answer p { margin-bottom: 6px; }
/* Output header — hide in print */
.output-header, .output-actions, .edit-hint, .btn-action { display: none !important; }
</style>
</head><body>${combinedContent}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
}
const uploadArea = $('#formatUploadArea');
const fileInput = $('#formatFileInput');

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFormatFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFormatFile(e.target.files[0]);
    }
});

$('#btnRemoveFile').addEventListener('click', (e) => {
    e.stopPropagation();
    uploadedFormatFile = null;
    $('#uploadPlaceholder').style.display = 'block';
    $('#uploadPreview').style.display = 'none';
    fileInput.value = '';
});

function handleFormatFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showToast('파일 크기가 10MB를 초과합니다');
        return;
    }

    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');

    if (isImage) {
        reader.readAsDataURL(file);
        reader.onload = () => {
            uploadedFormatFile = { name: file.name, type: 'image', data: reader.result };
            showFilePreview(file.name);
        };
    } else if (isText) {
        reader.readAsText(file);
        reader.onload = () => {
            uploadedFormatFile = { name: file.name, type: 'text', data: reader.result };
            showFilePreview(file.name);
            // Also fill the textarea with the text content
            $('#customFormat').value = reader.result;
        };
    } else {
        // PDF, DOCX, HWP — read as base64
        reader.readAsDataURL(file);
        reader.onload = () => {
            uploadedFormatFile = { name: file.name, type: 'file', data: reader.result };
            showFilePreview(file.name);
        };
    }
}

function showFilePreview(name) {
    $('#uploadPlaceholder').style.display = 'none';
    $('#uploadPreview').style.display = 'block';
    $('#previewFileName').textContent = name;
    showToast('파일이 업로드되었습니다');
}

// ===== Format Cover Letter into Structured HTML =====
function formatCoverLetter(text) {
    // Split by common section patterns: numbered titles, named sections, or double newlines
    const lines = text.split('\n');
    let html = '';
    let currentSection = null;
    let currentText = [];

    const sectionPattern = /^(?:(\d+)\.\s*)?([가-힣a-zA-Z\s/·]+(?:\([^)]*\))?\s*)$/;
    const knownSections = ['지원동기', '지원 동기', '관련 경험', '역량', '기여', '입사 후 포부', '포부', '성장과정', '성장 과정', '성격의 장단점', '장단점', '경험', '직무 역량', '기여할 수 있는 부분', '관련 경험/역량'];

    // Break text into readable lines: one sentence per line, long sentences split at space
    function formatSentences(rawText) {
        // Split by sentence endings (다. 요. 습니다. 습니까. etc.)
        const sentences = rawText.split(/(?<=[다요죠음됨함임까]\.)\s*/g).filter(s => s.trim());
        let result = [];
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (!trimmed) continue;
            // If sentence is long (over 60 chars), break at a space near the middle
            if (trimmed.length > 60) {
                const mid = Math.floor(trimmed.length / 2);
                // Find nearest space to the middle
                let breakIdx = -1;
                for (let i = mid; i >= mid - 15 && i >= 0; i--) {
                    if (trimmed[i] === ' ' || trimmed[i] === ',') { breakIdx = i; break; }
                }
                if (breakIdx === -1) {
                    for (let i = mid; i <= mid + 15 && i < trimmed.length; i++) {
                        if (trimmed[i] === ' ' || trimmed[i] === ',') { breakIdx = i; break; }
                    }
                }
                if (breakIdx > 0 && breakIdx < trimmed.length - 5) {
                    result.push(trimmed.substring(0, breakIdx + 1).trim());
                    result.push(trimmed.substring(breakIdx + 1).trim());
                } else {
                    result.push(trimmed);
                }
            } else {
                result.push(trimmed);
            }
        }
        return result.join('<br>');
    }

    function flushSection() {
        if (currentSection || currentText.length > 0) {
            html += '<div class="cl-section">';
            if (currentSection) {
                html += `<h4 class="cl-title">${currentSection}</h4>`;
            }
            const body = currentText.join('\n').trim();
            if (body) {
                const paragraphs = body.split(/\n{2,}/);
                html += '<div class="cl-text">';
                paragraphs.forEach(p => {
                    html += `<p>${formatSentences(p.replace(/\n/g, ' '))}</p>`;
                });
                html += '</div>';
            }
            html += '</div>';
        }
        currentSection = null;
        currentText = [];
    }

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            currentText.push('');
            continue;
        }

        // Check if this line is a section header
        const match = trimmed.match(sectionPattern);
        const isKnown = match && knownSections.some(s => trimmed.includes(s));
        const isNumbered = match && match[1]; // Has a number prefix

        if (isKnown || isNumbered) {
            flushSection();
            currentSection = trimmed.replace(/^\d+\.\s*/, '');
        } else {
            currentText.push(trimmed);
        }
    }
    flushSection();

    // If no sections were detected, use the whole text with paragraph formatting
    if (!html.includes('cl-section')) {
        const paragraphs = text.split(/\n{2,}/);
        html = '<div class="cl-section"><div class="cl-text">';
        paragraphs.forEach(p => {
            html += `<p>${formatSentences(p.replace(/\n/g, ' '))}</p>`;
        });
        html += '</div></div>';
    }

    return html;
}

// ===== Photo Upload =====
$('#photoUploadArea').addEventListener('click', (e) => {
    // Prevent re-triggering when clicking the input itself or the remove button
    if (e.target.id === 'photoFileInput' || e.target.id === 'btnRemovePhoto') return;
    $('#photoFileInput').click();
});

$('#photoFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handlePhotoUpload(file);
});

$('#btnRemovePhoto').addEventListener('click', (e) => {
    e.stopPropagation();
    profilePhoto = null;
    $('#photoImg').style.display = 'none';
    $('#photoPlaceholder').style.display = 'flex';
    $('#btnRemovePhoto').style.display = 'none';
    showToast('사진이 제거되었습니다');
});

function handlePhotoUpload(file) {
    if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드 가능합니다');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('사진 크기가 5MB를 초과합니다');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        // Resize to passport photo ratio (3:4, 300x400px max)
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const targetW = 300, targetH = 400;
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');

            // Center crop to 3:4 ratio
            const srcRatio = img.width / img.height;
            const targetRatio = targetW / targetH;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            if (srcRatio > targetRatio) {
                sw = img.height * targetRatio;
                sx = (img.width - sw) / 2;
            } else {
                sh = img.width / targetRatio;
                sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
            profilePhoto = canvas.toDataURL('image/jpeg', 0.85);

            // Show preview
            $('#photoImg').src = profilePhoto;
            $('#photoImg').style.display = 'block';
            $('#photoPlaceholder').style.display = 'none';
            $('#btnRemovePhoto').style.display = 'flex';
            showToast('증명사진이 업로드되었습니다');
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

// ===== Double-click Editing on Output =====
$$('.output-body').forEach(el => {
    el.addEventListener('dblclick', () => {
        el.contentEditable = 'true';
        el.focus();
        showToast('편집 모드 활성화 — 내용을 수정할 수 있습니다');
    });
    el.addEventListener('blur', () => {
        el.contentEditable = 'false';
    });
});


// ===== Resume Theme Change =====
let currentResumeZoom = null; // null = auto fit

$('#resumeTheme').addEventListener('change', () => {
    const theme = $('#resumeTheme').value;
    // Show/hide color picker for Modern theme
    $('#resumeColor').style.display = theme === 'modern' ? '' : 'none';
    if (currentResumeData) {
        $('#resumeText').innerHTML = renderResume(currentResumeData, theme, profilePhoto);
        setTimeout(() => autoFitA4Content(), 0);
    }
});

// ===== Resume Color Change (Modern only) =====
$('#resumeColor').addEventListener('change', () => {
    if (currentResumeData && $('#resumeTheme').value === 'modern') {
        $('#resumeText').innerHTML = renderResume(currentResumeData, 'modern', profilePhoto);
        setTimeout(() => autoFitA4Content(), 0);
    }
});

// ===== Zoom Controls =====
$('#btnZoomIn').addEventListener('click', () => {
    const page = document.querySelector('.resume-a4-page');
    if (!page) return;
    if (currentResumeZoom === null) {
        const m = page.style.transform.match(/scale\(([\d.]+)\)/);
        currentResumeZoom = m ? parseFloat(m[1]) : 0.5;
    }
    currentResumeZoom = Math.min(currentResumeZoom + 0.1, 1.5);
    applyZoom(currentResumeZoom);
});

$('#btnZoomOut').addEventListener('click', () => {
    const page = document.querySelector('.resume-a4-page');
    if (!page) return;
    if (currentResumeZoom === null) {
        const m = page.style.transform.match(/scale\(([\d.]+)\)/);
        currentResumeZoom = m ? parseFloat(m[1]) : 0.5;
    }
    currentResumeZoom = Math.max(currentResumeZoom - 0.1, 0.2);
    applyZoom(currentResumeZoom);
});

$('#btnZoomReset').addEventListener('click', () => {
    currentResumeZoom = null;
    scaleResumePreview();
});

function applyZoom(scale) {
    const page = document.querySelector('.resume-a4-page');
    const wrap = document.querySelector('.resume-a4-wrap');
    if (!page || !wrap) return;
    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';
    wrap.style.height = `${1123 * scale}px`;
    $('#zoomLevel').textContent = `${Math.round(scale * 100)}%`;
}


// ===== Render Resume from JSON Data (Korean A4 Form) =====
function renderResume(data, theme = 'classic', photo = null) {
    if (data.raw) {
        return `<div class="resume-a4-wrap"><div class="resume-a4-page" style="padding:24px;white-space:pre-wrap;line-height:1.6;font-size:13px;">${data.raw}</div></div>`;
    }

    const d = data;
    const contact = d.contact || {};
    const hasExp = d.experiences?.length > 0;
    const hasSkills = d.skills?.length > 0;
    const hasCerts = (d.certifications || []).filter(c => c).length > 0;
    const hasStrengths = (d.strengths || []).filter(s => s).length > 0;

    const photoHtml = photo
        ? `<img src="${photo}" style="width:100px;height:130px;object-fit:cover;border:1px solid #bbb;" />`
        : `<div style="width:100px;height:130px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;background:#f9f9f9;color:#bbb;font-size:11px;">사진</div>`;

    const eduList = (d.education || []);
    const eduSlots = Math.max(eduList.length, 1);
    const expList = d.experiences || [];
    const expSlots = Math.max(expList.length, 1);
    const skillText = hasSkills ? d.skills.join(', ') : '-';
    const certText = hasCerts ? d.certifications.filter(c => c).join(', ') : '-';

    let expDetailHtml = '';
    if (hasExp) {
        expDetailHtml = d.experiences.map(e => {
            const details = (e.details || []).map(dt => `<li style="margin-bottom:2px;">${dt.replace(/^[-·]\s*/, '')}</li>`).join('');
            return `<div style="margin-bottom:6px;"><strong>${e.company || ''}</strong> — ${e.role || ''}<ul style="margin:2px 0 0 0;padding-left:18px;list-style:disc;">${details}</ul></div>`;
        }).join('');
    }

    const strengthsHtml = hasStrengths
        ? `<ul style="margin:0;padding-left:18px;list-style:disc;line-height:1.8;">${d.strengths.filter(s => s).map(s => `<li>${s}</li>`).join('')}</ul>`
        : (d.summary && hasExp ? d.summary : '-');

    let html = '';

    if (theme === 'classic') {
        // ━━━━ CLASSIC: 한국식 이력서 — A4 풀페이지, 전 정보 포함 ━━━━
        const bc = '#b0b0b0';
        const bc2 = '#444';
        const thBg = '#f0f2f8'; const thColor = '#2e3d6b';
        const thStyle = `background:${thBg};color:${thColor};border:1px solid ${bc};font-size:12px;font-weight:700;text-align:center;padding:8px 6px;white-space:nowrap;`;
        const tdStyle = `border:1px solid ${bc};font-size:12px;padding:7px 10px;line-height:1.6;color:#222;`;

        // --- 학력사항 rows ---
        let eduRows = '';
        for (let i = 0; i < eduSlots; i++) {
            const e = eduList[i];
            eduRows += `<tr>
                ${i === 0 ? `<th rowspan="${eduSlots}" style="${thStyle}width:80px;">학력사항</th>` : ''}
                <td style="${tdStyle}">${e ? (e.school || '') : ''}</td>
                <td style="${tdStyle}">${e ? (e.major || '') : ''}</td>
                <td style="${tdStyle}text-align:center;width:140px;">${e ? (e.period || '') : ''}</td>
            </tr>`;
        }

        // --- 경력사항 rows (회사 / 직무 / 기간) ---
        let expRows = '';
        for (let i = 0; i < expSlots; i++) {
            const e = expList[i];
            expRows += `<tr>
                ${i === 0 ? `<th rowspan="${expSlots}" style="${thStyle}width:80px;">경력사항</th>` : ''}
                <td style="${tdStyle}">${e ? (e.company || '') : ''}</td>
                <td style="${tdStyle}">${e ? (e.role || '') : ''}</td>
                <td style="${tdStyle}text-align:center;width:140px;">${e ? (e.period || '') : ''}</td>
            </tr>`;
        }

        // --- 경력 상세 HTML (경력이 있을 때만) ---
        let expDetailBlock = '';
        if (hasExp) {
            expDetailBlock = d.experiences.map(e => {
                const details = (e.details || []).map(dt =>
                    `<li style="margin-bottom:3px;">${dt.replace(/^[-·]\s*/, '')}</li>`
                ).join('');
                return `<div style="margin-bottom:8px;">
                    <strong style="font-size:12.5px;color:#1a1a2e;">${e.company || ''}</strong>
                    <span style="color:#555;font-size:11.5px;"> — ${e.role || ''}</span>
                    ${e.period ? `<span style="color:#888;font-size:11px;margin-left:6px;">(${e.period})</span>` : ''}
                    ${details ? `<ul style="margin:4px 0 0 0;padding-left:18px;list-style:disc;font-size:11.5px;line-height:1.7;color:#333;">${details}</ul>` : ''}
                </div>`;
            }).join('');
        }

        // --- 강점/특기사항 HTML ---
        const strengthsBlock = hasStrengths
            ? `<ul style="margin:0;padding-left:18px;list-style:disc;line-height:1.8;font-size:11.5px;color:#333;">${d.strengths.filter(s => s).map(s => `<li style="margin-bottom:2px;">${s}</li>`).join('')}</ul>`
            : (d.summary && !hasExp ? `<p style="margin:0;font-size:12px;line-height:1.7;color:#333;">${d.summary}</p>` : '<span style="color:#aaa;font-size:11px;">-</span>');

        // --- 스킬 HTML (태그 스타일) ---
        const skillBlock = hasSkills
            ? d.skills.map(s => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;font-size:11px;background:#e8edf5;color:#2e3d6b;border-radius:4px;">${s}</span>`).join('')
            : '<span style="color:#aaa;font-size:11px;">-</span>';

        // --- 자격/면허 HTML ---
        const certBlock = hasCerts
            ? d.certifications.filter(c => c).map(c => `<span style="display:inline-block;padding:3px 10px;margin:2px 4px 2px 0;font-size:11px;background:#f0f7f0;color:#2a5a2a;border-radius:4px;">${c}</span>`).join('')
            : '<span style="color:#aaa;font-size:11px;">-</span>';

        html = `<div class="resume-a4-wrap">
<div class="resume-a4-page">
<div class="resume-a4-inner">
    <!-- 상단 인적사항 영역 -->
    <div style="padding:36px 36px 0 36px;flex-shrink:0;">
        <!-- 인적사항 테이블 -->
        <table style="width:100%;border-collapse:collapse;border:2px solid ${bc2};table-layout:auto;margin-bottom:0;">
            <tr>
                <td rowspan="4" style="border:1px solid ${bc};width:100px;text-align:center;vertical-align:middle;padding:6px;background:#fafbfc;">
                    ${photo
                ? `<img src="${photo}" style="width:82px;height:108px;object-fit:cover;border:1px solid #ccc;" />`
                : `<div style="width:82px;height:108px;border:1px solid #ddd;margin:0 auto;display:flex;align-items:center;justify-content:center;background:#f5f5f5;color:#bbb;font-size:10px;">사진</div>`}
                </td>
                <th style="${thStyle}width:80px;">성 명</th>
                <td style="${tdStyle}font-size:15px;font-weight:700;">${d.name || ''}</td>
                <td style="${tdStyle}text-align:center;width:140px;">${d.gender ? `${d.gender}${d.age ? ` / ${d.age}세` : ''}` : (d.age ? `${d.age}세` : '')}</td>
            </tr>
            <tr>
                <th style="${thStyle}">이메일</th>
                <td style="${tdStyle}" colspan="2">${contact.email || ''}</td>
            </tr>
            <tr>
                <th style="${thStyle}">연락처</th>
                <td style="${tdStyle}" colspan="2">${contact.phone || ''}</td>
            </tr>
            <tr>
                <th style="${thStyle}">주 소</th>
                <td style="${tdStyle}" colspan="2">${contact.address || ''}</td>
            </tr>
        </table>

        <!-- 학력/경력 테이블 -->
        <table style="width:100%;border-collapse:collapse;border:2px solid ${bc2};border-top:none;table-layout:auto;">
            ${eduRows}
            ${expRows}
        </table>
    </div>

    <!-- 중간 유동 영역 (나머지 공간 채움) -->
    <div style="padding:0 36px 36px 36px;flex:1;display:flex;flex-direction:column;">
        <table style="width:100%;border-collapse:collapse;border:2px solid ${bc2};border-top:none;table-layout:auto;flex:1;">
            <!-- 보유 스킬 -->
            <tr>
                <th style="${thStyle}width:80px;vertical-align:top;padding-top:10px;">보유스킬</th>
                <td style="${tdStyle}vertical-align:top;padding:8px 10px;">${skillBlock}</td>
            </tr>
            <!-- 자격/면허 -->
            <tr>
                <th style="${thStyle}width:80px;vertical-align:top;padding-top:10px;">자격/면허</th>
                <td style="${tdStyle}vertical-align:top;padding:8px 10px;">${certBlock}</td>
            </tr>
            <!-- 경력상세 또는 자기소개 -->
            <tr style="height:1px;">
                <th style="${thStyle}width:80px;vertical-align:top;padding-top:10px;">${hasExp ? '경력상세' : '자기소개'}</th>
                <td style="${tdStyle}vertical-align:top;line-height:1.7;padding:8px 10px;">${hasExp ? expDetailBlock : (d.summary || '<span style="color:#aaa;font-size:11px;">-</span>')}</td>
            </tr>
            <!-- 특기사항/강점 -->
            <tr style="flex:1;">
                <th style="${thStyle}width:80px;vertical-align:top;padding-top:10px;">특기사항</th>
                <td style="${tdStyle}vertical-align:top;line-height:1.7;padding:8px 10px;">${strengthsBlock}</td>
            </tr>
        </table>
    </div>
    </div>
</div>
</div>`;

    } else if (theme === 'modern') {
        // ━━━━ MODERN: Sidebar — A4 fixed height, content stays within bounds ━━━━
        const accent = $('#resumeColor')?.value || '#1565c0';

        const eduHtml = eduList.length > 0
            ? eduList.map(e => `<div style="margin-bottom:6px;"><span style="font-size:11px;font-weight:600;">${e.school || ''}</span><br><span style="font-size:10px;opacity:0.8;">${e.major || ''}</span><br><span style="font-size:9.5px;opacity:0.55;">${e.period || ''}</span></div>`).join('')
            : '<div style="font-size:10px;opacity:0.5;">-</div>';
        const expHtml = expList.length > 0
            ? expList.map(e => `<div style="margin-bottom:8px;"><strong style="font-size:12.5px;">${e.company || ''}</strong><br><span style="font-size:11px;color:#555;">${e.role || ''}</span><br><span style="color:#888;font-size:10.5px;">${e.period || ''}</span></div>`).join('')
            : '<div style="color:#aaa;font-size:12px;">-</div>';

        const sideSection = (label, content) => `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.15);">
            <div style="font-size:8px;font-weight:700;letter-spacing:2px;margin-bottom:6px;opacity:0.5;text-transform:uppercase;">${label}</div>
            ${content}
        </div>`;

        const mainSection = (title, content) => `<div style="flex:1;min-height:0;">
            <div style="font-size:12.5px;font-weight:700;color:${accent};border-bottom:2px solid ${accent};padding-bottom:4px;margin-bottom:8px;">${title}</div>
            <div style="font-size:11.5px;line-height:1.7;">${content}</div>
        </div>`;

        html = `<div class="resume-a4-wrap">
<div class="resume-a4-page" style="width:794px;height:1123px;padding:0;box-sizing:border-box;overflow:hidden;">
<div class="resume-a4-inner" style="display:flex;flex-direction:row;width:100%;height:100%;">
    <!-- Sidebar -->
    <div style="width:210px;min-width:210px;background:${accent};color:#fff;padding:28px 16px 24px;box-sizing:border-box;display:flex;flex-direction:column;print-color-adjust:exact;-webkit-print-color-adjust:exact;overflow:hidden;">
        <div style="text-align:center;margin-bottom:12px;">${photo ? `<img src="${photo}" style="width:100px;height:130px;object-fit:cover;border:3px solid rgba(255,255,255,0.3);border-radius:6px;display:block;margin:0 auto;" />` : `<div style="width:100px;height:130px;border:2px dashed rgba(255,255,255,0.2);border-radius:6px;margin:0 auto;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.25);font-size:11px;">사진</div>`}</div>
        <div style="font-size:18px;font-weight:800;text-align:center;margin:0 0 2px 0;color:#fff;">${d.name || ''}</div>
        <div style="text-align:center;font-size:10px;opacity:0.7;margin-bottom:2px;">${d.jobPosition || ''}</div>
        ${d.genderAge ? `<div style="text-align:center;font-size:9.5px;opacity:0.55;margin-bottom:6px;">${d.genderAge}</div>` : '<div style="margin-bottom:6px;"></div>'}
        ${sideSection('CONTACT', `
            ${contact.email ? `<div style="font-size:10px;margin:0;padding:0;line-height:1.4;">✉ ${contact.email}</div>` : ''}
            ${contact.phone ? `<div style="font-size:10px;margin:0;padding:0;line-height:1.4;">☎ ${contact.phone}</div>` : ''}
            ${contact.address ? `<div style="font-size:10px;margin:0;padding:0;line-height:1.4;">◎ ${contact.address}</div>` : ''}
        `)}
        ${sideSection('학력사항', eduHtml)}
        ${hasSkills ? sideSection('SKILLS', d.skills.map(s => `<div style="font-size:10px;margin:0;padding:0;line-height:1.4;">▸ ${s}</div>`).join('')) : ''}
        ${hasCerts ? sideSection('자격/면허', d.certifications.filter(c => c).map(c => `<div style="font-size:10px;margin:0;padding:0;line-height:1.4;">▸ ${c}</div>`).join('')) : ''}
        ${hasStrengths ? sideSection('특기사항', d.strengths.filter(s => s).map(s => `<div style="font-size:10px;margin:0;padding:0;line-height:1.4;">▸ ${s}</div>`).join('')) : ''}
        <div style="flex:1;"></div>
    </div>
    <!-- Main Content -->
    <div style="flex:1;padding:28px 24px;display:flex;flex-direction:column;gap:0;overflow:hidden;">
        ${mainSection('경력사항', expHtml)}
        ${hasExp ? mainSection('경력상세', expDetailHtml) : ''}
        ${d.summary ? mainSection('자기소개', d.summary) : ''}
        ${hasStrengths ? mainSection('특기사항', strengthsHtml) : ''}
    </div>
</div>
</div>
</div>`;

    } else {
        // ━━━━ SIMPLE: Minimal — A4 fixed height, even content distribution ━━━━
        const eduHtml = eduList.length > 0
            ? eduList.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:12.5px;">${e.school || ''} · ${e.major || ''}</span><span style="color:#888;font-size:11px;">${e.period || ''}</span></div>`).join('')
            : '<div style="color:#aaa;font-size:12px;">-</div>';
        const expHtml = expList.length > 0
            ? expList.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-size:12.5px;">${e.company || ''} · ${e.role || ''}</span><span style="color:#888;font-size:11px;">${e.period || ''}</span></div>`).join('')
            : '<div style="color:#aaa;font-size:12px;">-</div>';

        const sectionTitle = (title) => `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#333;margin-bottom:10px;border-bottom:1px solid #ddd;padding-bottom:6px;">${title}</div>`;

        html = `<div class="resume-a4-wrap">
<div class="resume-a4-page" style="width:794px;height:1123px;padding:0;box-sizing:border-box;overflow:hidden;">
<div class="resume-a4-inner" style="display:flex;flex-direction:column;height:100%;padding:36px 40px;box-sizing:border-box;">
    <div style="text-align:center;border-bottom:2px solid #222;padding-bottom:18px;margin-bottom:0;">
        ${photo ? `<div style="margin-bottom:10px;"><img src="${photo}" style="width:90px;height:115px;object-fit:cover;border:1px solid #ddd;display:block;margin:0 auto;" /></div>` : ''}
        <h1 style="font-size:26px;font-weight:800;margin:0 0 4px 0;color:#111;letter-spacing:4px;">${d.name || ''}</h1>
        ${d.genderAge ? `<div style="font-size:11px;color:#666;margin-bottom:2px;">${d.genderAge}</div>` : ''}
        <div style="font-size:12.5px;color:#555;margin-bottom:4px;">${d.jobPosition || ''}</div>
        <div style="font-size:11px;color:#888;">${[contact.email, contact.phone, contact.address].filter(Boolean).join(' ∣ ')}</div>
    </div>
    <div style="flex:1;padding-top:16px;min-height:0;">${sectionTitle('학력사항')}${eduHtml}</div>
    <div style="flex:1;min-height:0;">${sectionTitle('경력사항')}${expHtml}</div>
    <div style="flex:1;min-height:0;">${sectionTitle('보유스킬')}<div style="font-size:12.5px;line-height:1.7;">${skillText}</div></div>
    <div style="flex:1;min-height:0;">${sectionTitle('자격/면허')}<div style="font-size:12.5px;line-height:1.7;">${certText}</div></div>
    ${hasExp ? `<div style="flex:1;min-height:0;">${sectionTitle('경력상세')}<div style="font-size:12.5px;line-height:1.7;">${expDetailHtml}</div></div>` : ''}
    ${d.summary ? `<div style="flex:1;min-height:0;">${sectionTitle('자기소개')}<div style="font-size:12.5px;line-height:1.7;">${d.summary}</div></div>` : ''}
    <div style="flex:1;min-height:0;">${sectionTitle('특기사항')}<div style="font-size:12.5px;line-height:1.7;">${strengthsHtml}</div></div>
</div>
</div>
</div>`;
    }

    requestAnimationFrame(() => {
        if (currentResumeZoom !== null) {
            applyZoom(currentResumeZoom);
        } else {
            scaleResumePreview();
        }
    });

    return html;
}

// ===== Auto-fit resume content to A4 page =====
function autoFitA4Content() {
    const page = document.querySelector('.resume-a4-page');
    const inner = document.querySelector('.resume-a4-inner');
    if (!page || !inner) return;

    const pageH = 1123; // A4 height in px
    const pageW = 794;  // A4 width in px

    // For Modern/Simple themes that use fixed A4 dimensions,
    // just ensure the page is properly sized and let CSS flex handle distribution
    page.style.width = `${pageW}px`;
    page.style.height = `${pageH}px`;
    inner.style.height = '100%';
    inner.style.transform = 'none';
}

// ===== Scale A4 page to fit preview panel =====
function scaleResumePreview() {
    const wrap = document.querySelector('.resume-a4-wrap');
    const page = document.querySelector('.resume-a4-page');
    if (!wrap || !page) return;

    let container = document.getElementById('resumeText');
    if (!container) container = wrap.parentElement;
    if (!container) return;

    let panelWidth = container.clientWidth;
    if (panelWidth < 100) {
        setTimeout(() => scaleResumePreview(), 200);
        return;
    }

    panelWidth -= 32;
    const rect = container.getBoundingClientRect();
    const panelHeight = window.innerHeight - rect.top - 40;
    const pageWidth = 794;
    const pageHeight = 1123;
    const scaleW = panelWidth / pageWidth;
    const scaleH = panelHeight / pageHeight;
    const scale = Math.max(Math.min(scaleW, scaleH, 1), 0.25);

    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';
    wrap.style.height = `${pageHeight * scale}px`;
    $('#zoomLevel').textContent = `${Math.round(scale * 100)}%`;
}

window.addEventListener('resize', () => {
    if (document.querySelector('.resume-a4-page')) {
        if (currentResumeZoom !== null) {
            applyZoom(currentResumeZoom);
        } else {
            scaleResumePreview();
        }
    }
});

// ===== Init =====
initIcons();
initApiKey();
loadProfile();
