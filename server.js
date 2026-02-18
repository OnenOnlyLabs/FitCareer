// ===== FitCareer — API Server =====
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 3001;

// ===== AI API Call (supports OpenAI + OpenRouter) =====
const ENDPOINTS = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
};

async function callAI(messages, apiKey, provider = 'openrouter', model = 'openai/gpt-4o-mini', maxTokens = 4096) {
    const url = ENDPOINTS[provider] || ENDPOINTS.openrouter;

    // OpenAI direct API uses model names without prefix
    let modelName = model;
    if (provider === 'openai') {
        modelName = model.replace('openai/', '');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    // OpenRouter requires extra headers
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://fitcareer.app';
        headers['X-Title'] = 'FitCareer';
    }

    console.log(`[AI] ${provider} / ${modelName} / ${maxTokens}tok`);

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: modelName,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API 오류 (${res.status})`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// ===== Build Profile Description =====
function buildProfileDesc(profile) {
    let desc = '';
    desc += `이름: ${profile.name}\n`;

    if (profile.email) desc += `이메일: ${profile.email}\n`;
    if (profile.phone) desc += `연락처: ${profile.phone}\n`;
    if (profile.address) desc += `주소: ${profile.address}\n`;

    // Support both old (education: {}) and new (educations: []) format
    if (profile.educations?.length > 0) {
        desc += '\n학력:\n';
        profile.educations.forEach(edu => {
            desc += `- ${edu.school || '(학교명 미입력)'}${edu.major ? ' ' + edu.major : ''}${edu.period ? ' (' + edu.period + ')' : ''}\n`;
        });
    } else if (profile.education?.school) {
        desc += `학력: ${profile.education.school}`;
        if (profile.education.major) desc += ` ${profile.education.major}`;
        desc += '\n';
    }

    if (profile.experiences?.length > 0) {
        desc += '\n경력:\n';
        profile.experiences.forEach((exp, i) => {
            desc += `- ${exp.company || '(회사명 미입력)'} / ${exp.role || '(직무 미입력)'}\n`;
        });
    }

    if (profile.skills?.length > 0) {
        desc += `\n보유 스킬: ${profile.skills.join(', ')}\n`;
    }

    if (profile.certifications) {
        desc += `\n자격증/수상: ${profile.certifications}\n`;
    }

    if (profile.freeDescription) {
        desc += `\n강점/자유기술:\n${profile.freeDescription}\n`;
    }

    return desc;
}

// ===== Build Company Description =====
function buildCompanyDesc(company) {
    let desc = `기업명: ${company.name}\n`;
    if (company.jobPosition) desc += `지원 직무: ${company.jobPosition}\n`;
    if (company.url) desc += `홈페이지/SNS: ${company.url}\n`;
    if (company.jobPostingUrl) desc += `채용공고 URL: ${company.jobPostingUrl}\n`;
    if (company.additionalInfo) desc += `추가 정보: ${company.additionalInfo}\n`;
    return desc;
}

// ===== Deep Crawl — Multi-page company info extraction =====
async function fetchPage(url, timeout = 8000) {
    try {
        if (!url.startsWith('http')) url = 'https://' + url;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(timeout),
            redirect: 'follow'
        });
        if (!res.ok) return '';
        return await res.text();
    } catch (e) {
        console.log(`[Crawl] Failed: ${url} - ${e.message}`);
        return '';
    }
}

function extractText(html, maxLen = 5000) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, maxLen);
}

function extractLinks(html, baseUrl) {
    const links = new Set();
    const hrefRegex = /href=["']([^"'#]+)["']/gi;
    let match;
    let base;
    try { base = new URL(baseUrl); } catch { return []; }

    while ((match = hrefRegex.exec(html)) !== null) {
        try {
            const resolved = new URL(match[1], baseUrl);
            if (resolved.hostname === base.hostname && resolved.pathname !== base.pathname) {
                links.add(resolved.href);
            }
        } catch { /* skip invalid URLs */ }
    }
    return [...links];
}

const PRIORITY_KEYWORDS = [
    '회사소개', 'about', 'company', '소개',
    '제품', 'product', '서비스', 'service', '솔루션', 'solution',
    '채용', 'career', 'recruit', 'job', '인재', 'talent',
    '사업', 'business', '브랜드', 'brand',
    '연혁', 'history', '비전', 'vision', 'mission'
];

async function deepCrawl(mainUrl, jobPostingUrl) {
    const result = { mainPage: '', subPages: [], jobPosting: '' };

    let url = mainUrl || jobPostingUrl;
    if (!url) return result;
    if (!url.startsWith('http')) url = 'https://' + url;

    // 1) Crawl main page
    const mainHtml = await fetchPage(url);
    if (!mainHtml) return result;

    result.mainPage = extractText(mainHtml, 5000);
    console.log(`[DeepCrawl] Main: ${url} -> ${result.mainPage.length} chars`);

    // 2) Extract and prioritize internal links
    const allLinks = extractLinks(mainHtml, url);
    const prioritized = allLinks
        .map(link => {
            const lowerLink = link.toLowerCase();
            const score = PRIORITY_KEYWORDS.reduce((s, kw) => s + (lowerLink.includes(kw) ? 1 : 0), 0);
            return { link, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    // 3) Crawl prioritized sub-pages in parallel
    if (prioritized.length > 0) {
        const subResults = await Promise.allSettled(
            prioritized.map(async ({ link }) => {
                const html = await fetchPage(link, 6000);
                if (!html) return null;
                const text = extractText(html, 4000);
                console.log(`[DeepCrawl] Sub: ${link} -> ${text.length} chars`);
                return { url: link, content: text };
            })
        );
        result.subPages = subResults
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value);
    }

    // 4) Crawl job posting URL separately if different from main
    if (jobPostingUrl && jobPostingUrl !== mainUrl) {
        let jpUrl = jobPostingUrl;
        if (!jpUrl.startsWith('http')) jpUrl = 'https://' + jpUrl;
        const jpHtml = await fetchPage(jpUrl, 8000);
        if (jpHtml) {
            result.jobPosting = extractText(jpHtml, 5000);
            console.log(`[DeepCrawl] JobPosting: ${jpUrl} -> ${result.jobPosting.length} chars`);
        }
    }

    return result;
}

// ===== Validate resume data against profile (anti-hallucination) =====
function validateResumeData(resumeData, profile) {
    // Remove skills not mentioned in profile
    if (resumeData.skills && profile.skills?.length > 0) {
        const profileSkillsLower = profile.skills.map(s => s.toLowerCase());
        const profileText = (profile.freeDescription || '').toLowerCase() + ' ' +
            (profile.certifications || '').toLowerCase() + ' ' +
            profileSkillsLower.join(' ');
        resumeData.skills = resumeData.skills.filter(skill => {
            const skillLower = skill.toLowerCase();
            return profileSkillsLower.some(ps => ps.includes(skillLower) || skillLower.includes(ps)) ||
                profileText.includes(skillLower);
        });
    } else if (resumeData.skills && (!profile.skills || profile.skills.length === 0)) {
        // If no skills in profile, keep only from freeDescription
        const freeText = (profile.freeDescription || '').toLowerCase();
        if (freeText.length > 0) {
            resumeData.skills = resumeData.skills.filter(skill =>
                freeText.includes(skill.toLowerCase())
            );
        } else {
            resumeData.skills = [];
        }
    }

    // Remove certifications not mentioned in profile
    if (resumeData.certifications) {
        const certText = (profile.certifications || '').toLowerCase() + ' ' +
            (profile.freeDescription || '').toLowerCase();
        if (certText.trim().length > 0) {
            resumeData.certifications = resumeData.certifications.filter(cert =>
                certText.includes(cert.toLowerCase()) || cert.length < 3
            );
        } else {
            resumeData.certifications = [];
        }
    }

    return resumeData;
}

// ================================================================
// Main Generation Endpoint
// ================================================================
app.post('/api/generate', async (req, res) => {
    try {
        const { company, profile, format, apiKey, provider, model } = req.body;

        if (!apiKey) return res.json({ error: 'API Key가 필요합니다.' });
        if (!company.name) return res.json({ error: '기업명을 입력해주세요.' });
        if (!profile.name) return res.json({ error: '이름을 입력해주세요.' });

        const companyDesc = buildCompanyDesc(company);
        const profileDesc = buildProfileDesc(profile);

        console.log('\n[Generate] Start —', company.name, '/', company.jobPosition);

        // ===== STEP 1: Deep Crawl + 기업 분석 =====
        const crawlData = await deepCrawl(company.url, company.jobPostingUrl);

        let webContent = '';
        let crawlQualityLow = true; // assume low quality until proven otherwise

        if (crawlData.mainPage) {
            webContent += `\n=== 홈페이지 메인 ===\n${crawlData.mainPage}\n`;
        }
        if (crawlData.subPages.length > 0) {
            crawlData.subPages.forEach(sp => {
                const lowerUrl = sp.url.toLowerCase();
                const label = (lowerUrl.includes('about') || lowerUrl.includes('소개')) ? '회사소개' :
                    (lowerUrl.includes('product') || lowerUrl.includes('제품') || lowerUrl.includes('서비스')) ? '제품/서비스' :
                        (lowerUrl.includes('career') || lowerUrl.includes('채용') || lowerUrl.includes('recruit')) ? '채용정보' :
                            (lowerUrl.includes('brand') || lowerUrl.includes('브랜드')) ? '브랜드' : '하위페이지';
                webContent += `\n=== ${label} (${sp.url}) ===\n${sp.content}\n`;
            });
        }
        if (crawlData.jobPosting) {
            webContent += `\n=== 채용공고 상세 ===\n${crawlData.jobPosting}\n`;
        }

        // Check crawl quality — JS-rendered SPAs return mostly gibberish
        if (webContent.length > 0) {
            // Count meaningful Korean characters + words (not JS noise)
            const koreanChars = (webContent.match(/[가-힣]/g) || []).length;
            const jsNoise = (webContent.match(/function|var |const |let |=\s*>|React|angular|vue|webpack|__/gi) || []).length;
            crawlQualityLow = koreanChars < 100 && webContent.length < 500 || jsNoise > 10;
            console.log(`[CrawlQuality] Korean: ${koreanChars}, JSNoise: ${jsNoise}, Low: ${crawlQualityLow}`);
        }

        let analysisPrompt;
        if (crawlQualityLow) {
            analysisPrompt = `당신은 기업 분석 전문가입니다.

${companyDesc}

⚠️ 중요: 이 기업의 홈페이지 크롤링에 실패했거나 충분한 데이터를 수집하지 못했습니다.
따라서 아래 규칙을 반드시 따르세요:

=== 절대 규칙 ===
1. 확인되지 않은 제품명, 서비스명, 브랜드명을 절대 만들어내지 마세요
2. 기업의 실제 제품/서비스를 모르면 "구체적 제품/서비스 정보 확인 필요"라고 쓰세요
3. 기업명과 사용자가 입력한 추가 정보만으로 분석하세요
4. 추측으로 구체적 정보(제품명, 매출, 직원 수 등)를 만들어내면 절대 안됩니다
5. 모르는 항목은 반드시 "확인 필요"로 표시하세요

다음 항목을 분석해주세요 (아는 정보만):
1. 기업 개요 — 확인된 정보만
2. 핵심 가치 / 비전 / 미션 — 확인 가능한 정보만
3. 인재상 — 확인 가능한 정보만
4. 기업 문화 — 확인 가능한 정보만
5. 최근 이슈 — 확인 가능한 정보만
6. 주요 제품 / 서비스 — 확인된 것만 (모르면 "확인 필요")
7. 경쟁사 대비 차별화 — 확인 가능한 정보만
8. 채용 요구 역량 — 확인 가능한 정보만
9. 직무 업무 내용 — 확인 가능한 정보만

JSON 형식이 아닌 자연어로 작성해주세요.`;
        } else {
            analysisPrompt = `당신은 기업 분석 전문가입니다.
아래 기업에 대해 깊이 있게 분석해주세요.

${companyDesc}
${webContent}

다음 항목을 최대한 구체적으로 분석해주세요:
1. 기업 개요 (업종, 규모, 설립연도, 주요 사업 영역)
2. 핵심 가치 / 비전 / 미션 (구체적 문구 포함)
3. 인재상 (어떤 역량/성격의 인재를 원하는지)
4. 기업 문화 (워라밸, 분위기, 복리후생 등)
5. 최근 이슈 / 뉴스 (성장세, 신사업, 투자, 수상 등)
6. 주요 제품 / 서비스 (제품명, 특징, 타겟 고객 포함)
7. 경쟁사 대비 차별화 포인트
8. 채용 공고에서 요구하는 핵심 역량/자격요건
9. 해당 직무에서 실제 수행하는 업무 내용

⚠️ 반드시 크롤링된 데이터에서 확인된 실제 정보만 사용하세요.
⚠️ 크롤링 데이터에 없는 구체적 제품명/서비스명을 만들어내지 마세요.
확인되지 않은 정보는 "확인 필요"라고 표시하세요.
JSON 형식이 아닌 자연어로 작성해주세요.`;
        }

        const analysisSystemMsg = crawlQualityLow
            ? '기업 분석 전문가입니다. 홈페이지 크롤링 데이터가 부족할 때는 절대 추측하지 않으며, 확인된 정보만 제공합니다. 존재하지 않는 제품명이나 서비스명을 만들어내는 것은 가장 큰 실수입니다.'
            : '기업 분석 전문가입니다. 크롤링된 실제 데이터를 기반으로 구체적이고 정확한 분석을 제공합니다. 크롤링 데이터에 없는 구체적 제품명을 만들어내지 않습니다.';

        const companyAnalysis = await callAI(
            [{ role: 'system', content: analysisSystemMsg },
            { role: 'user', content: analysisPrompt }],
            apiKey, provider, model, 3000
        );

        // ===== STEP 2: 자기소개서 생성 =====
        const jobPos = company.jobPosition || '지원 직무';
        let coverLetterSystemPrompt = `당신은 대한민국 최고의 자기소개서 전문 컨설턴트입니다.
10년 이상 경력으로 수천 명의 합격 자소서를 작성한 전문가입니다.

=== 🚫 할루시네이션 금지 (가장 중요한 규칙) ===
1. 지원자 프로필에 없는 경험, 프로젝트, 수치, 자격증을 절대 만들어내지 마세요
2. "~한 경험이 있습니다"라고 쓰려면 프로필에 그 경험이 반드시 있어야 합니다
3. 프로필에 없는 내용은 절대 추론하거나 꾸며내지 마세요
4. 프로필 정보가 부족하면: 없는 경험을 만들지 말고, 있는 정보를 더 깊이 있게 풀어쓰세요
5. 지원자의 의지, 배우고자 하는 자세, 성장 가능성으로 부족한 경험을 보완하세요

=== 기업 맞춤 규칙 ===
1. 반드시 "${company.name}"의 "${jobPos}" 직무에 맞춰 작성
2. ${crawlQualityLow ? '기업 분석에서 "확인 필요"로 표시된 제품/서비스명은 절대 자소서에 사용하지 마세요. 기업의 일반적 방향성만 언급하세요.' : '기업 분석에서 나온 구체적 제품명/서비스명/사업 영역을 지원동기에 직접 언급'}
3. 기업의 인재상과 지원자의 실제 역량 사이의 교차점을 찾아 강조
4. "귀사"가 아닌 "${company.name}"으로 기업명을 직접 사용
5. ${crawlQualityLow ? '기업에 대해 모르는 정보는 추측하지 말고, 지원자의 경험과 역량 중심으로 작성' : '기업의 최근 이슈나 성장 방향과 연결하여 지원동기를 구체화'}

=== 문체 규칙 ===
1. 진정성 있고 자연스러운 한국어 (과도한 미사여구 금지)
2. 구체적인 사례와 에피소드 활용 (단, 프로필에 있는 것만)
3. 마크다운 문법 사용하지 않기 (순수 텍스트)

=== 줄바꿈 규칙 ===
- 각 섹션 내에서 문단을 2개로 나누되, 반드시 문장이 끝나는 위치(마침표 뒤)에서만 줄바꿈
- 문장 중간에 절대 줄바꿈 금지
- 문단 사이에는 빈 줄 하나 (\\n\\n)

=== 출력 형식 ===
1. 지원동기
(기업의 구체적 제품/서비스/비전에 공감하는 이유 + 내 경험과의 연결 - 200~400자)

2. 관련 경험/역량
(프로필에 명시된 경험만 활용, 직무 연관성 중심 - 300~500자)

3. 기여할 수 있는 부분
(기업의 현재 과제/사업에 내가 기여할 구체적 방법 - 200~400자)

4. 입사 후 포부
(기업의 미래 방향과 나의 성장 비전 연결 - 150~300자)

각 섹션 제목은 번호와 함께 독립 줄에 작성하세요.`;

        let coverLetterUserPrompt = '';

        // Extract format from uploaded file if present
        let resolvedFormat = format.customFormat || '';
        if (format.file && format.type === 'custom') {
            if (format.file.type === 'image') {
                // Use GPT-4o Vision to extract format structure from image
                const visionRes = await callAI(
                    [{ role: 'system', content: '이미지에서 자기소개서/지원서 양식의 항목과 글자 수 제한을 정확히 추출하는 전문가입니다.' },
                    {
                        role: 'user', content: [
                            { type: 'text', text: '이 이미지는 기업의 지원서/자기소개서 양식입니다. 항목 제목, 각 항목의 글자 수 제한, 작성 요구사항을 정확히 추출해주세요. 예시: "1. 지원동기 (800자 이내)" 형식으로 정리해주세요.' },
                            { type: 'image_url', image_url: { url: format.file.data } }
                        ]
                    }],
                    apiKey, provider, model, 1500
                );
                resolvedFormat = visionRes;
                console.log('[Format] Extracted from image:', resolvedFormat.substring(0, 200) + '...');
            } else if (format.file.type === 'text') {
                resolvedFormat = format.file.data;
            }
        }

        if (format.type === 'custom' && resolvedFormat) {
            coverLetterSystemPrompt += `\n\n=== 양식 규칙 ===
지원자가 제공한 양식에 정확히 맞춰서 작성해야 합니다.
각 항목별 글자 수 제한이 있으면 반드시 지키세요.
양식의 항목 제목은 그대로 유지하고, 내용만 작성하세요.`;

            coverLetterUserPrompt = `=== 기업 분석 결과 ===
${companyAnalysis}

=== 지원자 프로필 (이 정보만 사용하세요 - 없는 내용을 만들지 마세요) ===
${profileDesc}

=== 기업 지정 양식 ===
${resolvedFormat}

위 양식의 각 항목에 맞춰 자기소개서를 작성해주세요.
글자 수 제한이 있으면 정확히 맞춰주세요.
중요: 지원자 프로필에 명시된 정보만 사용하고, 없는 경험/자격을 만들지 마세요.`;
        } else {
            coverLetterUserPrompt = `=== 기업 분석 결과 ===
${companyAnalysis}

=== 지원자 프로필 (이 정보만 사용하세요 - 없는 내용을 만들지 마세요) ===
${profileDesc}

위 정보를 바탕으로 ${company.name}의 ${jobPos} 직무에 맞춤화된 자기소개서를 작성해주세요.

핵심 지시:
1. 지원자 프로필에 있는 경험/스킬만 활용하세요 (없는 경험을 꾸며내면 안 됩니다)
2. ${company.name}의 구체적 제품/서비스명을 지원동기에 직접 언급하세요
3. 기업의 인재상과 지원자의 실제 역량의 교차점을 찾아 강조하세요
4. 구성: 1. 지원동기 → 2. 관련 경험/역량 → 3. 기여할 수 있는 부분 → 4. 입사 후 포부
5. 총 800~1200자 분량으로 작성해주세요.`;
        }

        const coverLetter = await callAI(
            [{ role: 'system', content: coverLetterSystemPrompt },
            { role: 'user', content: coverLetterUserPrompt }],
            apiKey, provider, model, 3000
        );

        // ===== STEP 3: 이력서 생성 (JSON 구조화 반환) =====
        const resumePrompt = `=== 기업 분석 결과 ===
${companyAnalysis}

=== 지원자 프로필 (이 정보만 사용 - 없는 내용 추가 금지) ===
${profileDesc}

위 정보를 바탕으로 ${company.name}의 ${jobPos} 직무에 맞춤화된 이력서 데이터를 JSON 형식으로 반환해주세요.

=== 🚫 할루시네이션 금지 (가장 중요) ===
1. 프로필에 없는 경력을 절대 추가하지 마세요
2. 프로필에 없는 자격증/수상을 절대 추가하지 마세요
3. 프로필에 없는 스킬을 절대 추가하지 마세요
4. 프로필에 언급되지 않은 학력을 추가하지 마세요
5. 비어있으면 빈 배열([])이나 빈 문자열("")로 반환하세요

=== 이력서 작성 규칙 ===
1. ${jobPos} 직무에 맞는 경험/스킬을 강조 (있는 것 중에서만)
2. 관련성 높은 경험을 먼저, 덜 관련된 것은 뒤로
3. 각 경력에 성과/업무 설명은 프로필 내용을 기반으로만 작성
4. summary(한줄소개)는 프로필 기반으로 30~50자 이내로 작성

=== JSON 출력 형식 ===
아래 JSON 형식으로만 응답. 다른 텍스트 절대 추가 금지:
{
  "name": "이름",
  "jobPosition": "지원 직무",
  "company": "지원 기업",
  "contact": {
    "email": "이메일 (프로필에 없으면 빈 문자열)",
    "phone": "전화번호 (프로필에 없으면 빈 문자열)",
    "address": "주소 (프로필에 없으면 빈 문자열)"
  },
  "summary": "한 줄 자기소개 (50자 이내, 프로필 기반)",
  "education": [{"school": "학교명", "major": "전공", "period": "기간"}],
  "experiences": [{"company": "회사명", "role": "직책/직무", "period": "기간", "details": ["- 업무 설명"]}],
  "skills": ["프로필에 있는 스킬만"],
  "certifications": ["프로필에 있는 자격증만"],
  "strengths": ["프로필에서 언급된 강점만"]
}`;

        let resumeRaw = await callAI(
            [{ role: 'system', content: '이력서 데이터 전문가입니다. 주어진 프로필을 기반으로 구조화된 JSON 이력서 데이터를 반환합니다. 프로필에 없는 정보는 절대 추가하지 않습니다. 절대 JSON만 출력하세요. 마크다운이나 코드블록 사용 금지.' },
            { role: 'user', content: resumePrompt }],
            apiKey, provider, model, 2000
        );

        // Clean markdown code blocks if AI still adds them
        resumeRaw = resumeRaw.replace(/^```json?\s*/i, '').replace(/\s*```$/m, '').trim();

        let resumeData;
        try {
            resumeData = JSON.parse(resumeRaw);
            // Anti-hallucination: validate against original profile
            resumeData = validateResumeData(resumeData, profile);
        } catch (e) {
            console.error('[Resume] JSON parse error, using raw text as fallback');
            resumeData = { name: profile.name, raw: resumeRaw };
        }

        // ===== STEP 4: 면접 예상질문 =====
        const interviewPrompt = `=== 기업 분석 결과 ===
${companyAnalysis}

=== 지원자 프로필 ===
${profileDesc}

=== 지원자의 자기소개서 ===
${coverLetter}

위 정보를 바탕으로 ${company.name}의 ${jobPos} 직무 면접에서 나올 수 있는 예상 질문 5개와 모범답변을 작성해주세요.

=== 질문 작성 핵심 규칙 ===
1. 두루뭉실한 일반 질문 절대 금지 (예: "비전에 대해 어떻게 생각하시나요?" → 이런 질문 사용 금지)
2. 반드시 ${company.name}의 실제 제품/서비스/사업 내용을 질문에 직접 언급해야 함
3. 기업 분석에서 나온 구체적 정보(제품명, 서비스명, 사업 영역, 최근 이슈)를 질문에 포함할 것
4. 지원자의 자소서에서 언급한 경험에 대한 구체적 꼬리질문 포함
5. ${jobPos} 직무에서 실제로 마주칠 상황을 시뮬레이션하는 실전형 질문
6. 채용공고에서 요구하는 역량과 연결된 질문 포함

=== 좋은 질문 예시 (참고만) ===
- "${company.name}의 OOO 제품/서비스에서 고객 이탈을 줄이기 위해 어떤 전략을 제안하시겠습니까?"
- "지원자님이 경험한 OOO 프로젝트에서 가장 큰 어려움은 무엇이었고, 어떻게 해결했나요?"
- "${company.name}이 최근 진출한 OOO 시장에서 경쟁 우위를 확보하려면 어떤 전략이 필요하다고 보시나요?"

=== 답변 규칙 ===
1. 각 모범답변은 100~200자 (간결하고 핵심만)
2. 한 문단으로 작성 (불필요한 문단 나눔 금지)
3. 지원자의 실제 프로필 경험만 활용 (없는 경험 꾸며내기 금지)
4. 기업의 구체적 정보를 답변에도 반영

=== 출력 형식 (HTML) ===
각 질문-답변을 아래 형식으로 작성하세요:
<div class="qa-block">
  <div class="qa-question">Q1. 질문 내용</div>
  <div class="qa-answer">답변 내용 (한 문단, <p> 태그 없이 직접 텍스트)</div>
</div>

순수 HTML만 출력하세요. 마크다운이나 코드블록 사용 금지.`;

        let interview = await callAI(
            [{ role: 'system', content: `${company.name}의 실제 면접관 역할입니다. 기업의 제품/서비스/문화를 깊이 이해하고 있으며, 지원자의 자소서를 꼼꼼히 읽은 뒤 날카롭고 구체적인 질문을 합니다. 두루뭉실한 질문은 절대 하지 않습니다. 반드시 ${company.name}의 구체적 사업/제품을 질문에 포함합니다. 순수 HTML만 출력하세요.` },
            { role: 'user', content: interviewPrompt }],
            apiKey, provider, model, 2000
        );

        interview = interview.replace(/^```html?\s*/i, '').replace(/\s*```$/m, '').trim();

        res.json({
            coverLetter,
            resumeData,
            interview,
            companyAnalysis
        });

    } catch (err) {
        console.error('Generation error:', err);
        res.json({ error: err.message });
    }
});

// ===== Health =====
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0', product: 'FitCareer' });
});

// ===== SPA Fallback — serve index.html for all non-API routes =====
app.get('{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n\u2728 FitCareer Server v2.0`);
    console.log(`   Running on http://localhost:${PORT}`);
    console.log(`   POST /api/generate — AI 맞춤 자소서/이력서/면접질문 생성`);
    console.log(`   Deep Crawl + Anti-Hallucination 활성화\n`);
});
