// ==========================================
// APPLICATION STATE & VIEW SWITCHING
// ==========================================
let currentPersona = 'edufunnel';
let funnelChartInstance = null;
let channelChartInstance = null;

// Views
const viewLanding = document.getElementById('viewLanding');
const viewLogin = document.getElementById('viewLogin');
const viewRegister = document.getElementById('viewRegister');
const viewDashboard = document.getElementById('viewDashboard');
const aiFloatingContainer = document.getElementById('aiFloatingContainer');

// View Switching Function
function showView(viewName) {
  viewLanding.classList.toggle('hidden', viewName !== 'landing');
  viewLogin.classList.toggle('hidden', viewName !== 'login');
  viewRegister.classList.toggle('hidden', viewName !== 'register');
  viewDashboard.classList.toggle('hidden', viewName !== 'dashboard');
  if (aiFloatingContainer) {
    aiFloatingContainer.classList.toggle('hidden', viewName !== 'dashboard');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigation Buttons
document.getElementById('btnGoToLogin').addEventListener('click', () => showView('login'));
document.getElementById('btnGoToRegister').addEventListener('click', () => showView('register'));
document.getElementById('btnHeroRegister').addEventListener('click', () => showView('register'));
document.getElementById('btnHeroQuickDemo').addEventListener('click', () => showView('login'));

document.getElementById('btnSwitchToRegister').addEventListener('click', () => showView('register'));
document.getElementById('btnSwitchToLogin').addEventListener('click', () => showView('login'));
document.getElementById('btnBackToLandingFromLogin').addEventListener('click', () => showView('landing'));
document.getElementById('btnBackToLandingFromReg').addEventListener('click', () => showView('landing'));

// ==========================================
// SUPABASE CLIENT & AUTHENTICATION LOGIC
// ==========================================
const SUPABASE_URL = "https://kprrkitfkgsgufobfsat.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__PdQEQY0JyGThf4BtHfWHg_I4xBrVaI";

let supabaseClient = null;
try {
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (err) {
  console.warn('Inisialisasi Supabase SDK gagal, beralih ke mode fallback:', err);
}

const lblCurrentUserName = document.getElementById('lblCurrentUserName');
const btnLogout = document.getElementById('btnLogout');
const loginAlert = document.getElementById('loginAlert');
const registerAlert = document.getElementById('registerAlert');

// Helper to show alert messages
function showAlert(element, message, type = 'error') {
  element.className = type === 'success' 
    ? "p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
    : "p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200";
  element.innerHTML = message;
  element.classList.remove('hidden');
}

function clearAlert(element) {
  element.classList.add('hidden');
  element.innerHTML = '';
}

// Handle Successful Login
function loginUser(name, persona = 'gadget') {
  const user = { name, persona, loggedInAt: new Date().toISOString() };
  localStorage.setItem('edufunnel_user', JSON.stringify(user));
  
  lblCurrentUserName.textContent = `👤 ${name}`;
  switchPersona(persona);
  showView('dashboard');
}

// Logout
btnLogout.addEventListener('click', async () => {
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error('Logout Supabase error:', err);
    }
  }
  localStorage.removeItem('edufunnel_user');
  showView('landing');
});

// Quick Demo Login (Special for Lecturer / Evaluator)
document.getElementById('btnQuickLoginPakUjang').addEventListener('click', () => {
  loginUser('Pak Ujang (Owner)', 'gadget');
});

document.getElementById('btnQuickLoginBuRina').addEventListener('click', () => {
  loginUser('Bu Rina (Admisi PMB)', 'edufunnel');
});

// Form Login Manual (Real Supabase Auth)
document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(loginAlert);

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = "Memverifikasi...";

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        // Jika akun terdaftar di Supabase tapi belum verifikasi email
        if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
          const userName = email.split('@')[0];
          showAlert(loginAlert, `✓ Akun terdaftar di Supabase (Konfirmasi Pending). Masuk ke dashboard...`, 'success');
          setTimeout(() => {
            loginUser(userName, 'edufunnel');
          }, 700);
          return;
        }
        throw error;
      }

      const userName = data.user.user_metadata?.full_name || email.split('@')[0];
      const userRole = data.user.user_metadata?.role;
      const initialPersona = userRole === 'owner_gadget' ? 'gadget' : 'edufunnel';

      loginUser(userName, initialPersona);
      return;
    } catch (err) {
      console.warn('Supabase signIn error, checking fallback:', err.message);
      showAlert(loginAlert, `Gagal masuk: ${err.message || 'Email atau password salah'}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }
  }

  // Fallback demo login
  const derivedName = email.split('@')[0] || 'User';
  loginUser(derivedName, 'edufunnel');
  submitBtn.disabled = false;
  submitBtn.textContent = originalBtnText;
});

// Form Register Manual (Real Supabase Auth)
document.getElementById('formRegister').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(registerAlert);

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const initialPersona = role === 'owner_gadget' ? 'gadget' : 'edufunnel';

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = "Mendaftarkan ke Cloud...";

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name,
            role: role
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        showAlert(registerAlert, `✓ Akun berhasil tersimpan di database Supabase! Mengalihkan...`, 'success');
        setTimeout(() => {
          loginUser(name, initialPersona);
        }, 1000);
        return;
      }
    } catch (err) {
      console.error('Supabase signUp error:', err);
      showAlert(registerAlert, `Gagal mendaftar: ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }
  }

  // Fallback if client isn't loaded
  loginUser(name, initialPersona);
  submitBtn.disabled = false;
  submitBtn.textContent = originalBtnText;
});

// Check Existing Auth on Load (from Supabase or LocalStorage)
async function checkExistingAuth() {
  if (supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session && session.user) {
        const userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
        const userRole = session.user.user_metadata?.role;
        const persona = userRole === 'owner_gadget' ? 'gadget' : 'edufunnel';

        lblCurrentUserName.textContent = `👤 ${userName}`;
        switchPersona(persona);
        showView('dashboard');
        return;
      }
    } catch (err) {
      console.warn('Error reading Supabase session:', err);
    }
  }

  const savedUser = localStorage.getItem('edufunnel_user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      lblCurrentUserName.textContent = `👤 ${parsed.name}`;
      switchPersona(parsed.persona || 'edufunnel');
      showView('dashboard');
      return;
    } catch (err) {
      localStorage.removeItem('edufunnel_user');
    }
  }

  showView('landing');
}

// ==========================================
// DASHBOARD LOGIC & DUAL PERSONA
// ==========================================
const btnPersonaEdu = document.getElementById('btnPersonaEdu');
const btnPersonaGadget = document.getElementById('btnPersonaGadget');

const headerTitle = document.getElementById('headerTitle');
const headerSubtitle = document.getElementById('headerSubtitle');
const infoTargetAudience = document.getElementById('infoTargetAudience');
const infoPeriod = document.getElementById('infoPeriod');

const kpiTotalProspects = document.getElementById('kpiTotalProspects');
const kpiTotalConverted = document.getElementById('kpiTotalConverted');
const kpiConversionRate = document.getElementById('kpiConversionRate');
const kpiBottleneck = document.getElementById('kpiBottleneck');
const badgeTopChannel = document.getElementById('badgeTopChannel');

const funnelStagesList = document.getElementById('funnelStagesList');
const tableChannelBody = document.getElementById('tableChannelBody');
const recommendationsList = document.getElementById('recommendationsList');

btnPersonaEdu.addEventListener('click', () => switchPersona('edufunnel'));
btnPersonaGadget.addEventListener('click', () => switchPersona('gadget'));

function switchPersona(persona) {
  currentPersona = persona;
  
  if (persona === 'edufunnel') {
    btnPersonaEdu.className = "px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 bg-[#ff6210] text-white shadow-md";
    btnPersonaGadget.className = "px-3.5 py-1.5 rounded-lg text-xs font-heading font-medium text-stone-400 hover:text-white transition-all duration-200";
    headerTitle.textContent = "EduFunnel PMB Decision Support";
    headerSubtitle.textContent = "Desain Interaksi Pengguna • Standar ISO 9241-210 UCD";
  } else {
    btnPersonaGadget.className = "px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all duration-200 bg-[#ff6210] text-white shadow-md";
    btnPersonaEdu.className = "px-3.5 py-1.5 rounded-lg text-xs font-heading font-medium text-stone-400 hover:text-white transition-all duration-200";
    headerTitle.textContent = "B2B Gadget Wholesale Funnel";
    headerSubtitle.textContent = "Operasional Usaha Pak Ujang & Mas Iqbal (Supply Toko Mall)";
  }

  loadFunnelData(persona);
}

let currentFunnelData = null;

// Fetch Funnel Data (via backend API with fallback to static JSON)
async function loadFunnelData(persona) {
  try {
    let response;
    try {
      response = await fetch(`/api/funnel-data?persona=${persona}`);
      if (!response.ok) throw new Error('API route unavailable');
    } catch (err) {
      const fallbackUrl = persona === 'edufunnel' ? './data/edufunnel_data.json' : './data/gadget_data.json';
      response = await fetch(fallbackUrl);
    }
    
    const data = await response.json();
    currentFunnelData = data;
    renderDashboard(data);
    initAiAssistantForPersona(persona);
  } catch (error) {
    console.error('Gagal memuat data funnel:', error);
  }
}

// Render Dashboard Elements
function renderDashboard(data) {
  infoTargetAudience.textContent = `${data.system_title} — ${data.target_audience}`;
  infoPeriod.textContent = `Periode Evaluasi: ${data.period}`;

  kpiTotalProspects.textContent = data.summary.total_prospects.toLocaleString('id-ID');
  kpiTotalConverted.textContent = data.summary.total_converted.toLocaleString('id-ID');
  kpiConversionRate.textContent = data.summary.overall_conversion_rate;
  kpiBottleneck.textContent = data.summary.primary_bottleneck;
  badgeTopChannel.textContent = `Top: ${data.summary.top_channel}`;

  renderFunnelChart(data.funnel_stages);

  funnelStagesList.innerHTML = data.funnel_stages.map((stage, idx) => `
    <div class="p-2.5 rounded-xl border border-stone-200/70 bg-[#faf9f6] hover:border-[#fbe0c1] transition">
      <div class="flex items-center justify-between text-xs">
        <span class="font-heading font-bold text-stone-800">${idx + 1}. ${stage.stage}</span>
        <span class="font-mono font-semibold text-[#ff6210]">${stage.count.toLocaleString('id-ID')} (${stage.percentage}%)</span>
      </div>
      <p class="text-[11px] text-stone-500 mt-1 line-clamp-1">${stage.description}</p>
    </div>
  `).join('');

  renderChannelChart(data.channel_performance);

  tableChannelBody.innerHTML = data.channel_performance.map(ch => `
    <tr class="hover:bg-[#fff2ea]/50 transition">
      <td class="py-2.5 font-medium text-stone-800">${ch.channel}</td>
      <td class="py-2.5 text-right font-mono text-stone-600">${ch.leads.toLocaleString('id-ID')}</td>
      <td class="py-2.5 text-right font-mono font-bold text-[#ff6210]">${ch.converted.toLocaleString('id-ID')}</td>
      <td class="py-2.5 text-right font-mono font-semibold text-emerald-600">${ch.cvr}</td>
    </tr>
  `).join('');

  recommendationsList.innerHTML = data.recommendations.map(rec => `
    <div class="p-4 rounded-xl border ${rec.priority === 'Tinggi' ? 'border-rose-200 bg-rose-50/40' : 'border-[#fbe0c1] bg-[#fff2ea]/40'} flex items-start space-x-3.5">
      <div class="px-2.5 py-1 rounded-md text-[10px] font-heading font-bold uppercase tracking-wider ${rec.priority === 'Tinggi' ? 'bg-rose-100 text-rose-700' : 'bg-[#fff2ea] text-[#ff6210] border border-[#fbe0c1]'}">
        Prioritas ${rec.priority}
      </div>
      <div class="space-y-0.5">
        <h5 class="text-xs font-heading font-bold text-[#140b06]">${rec.title}</h5>
        <p class="text-xs text-stone-600 leading-relaxed">${rec.action}</p>
      </div>
    </div>
  `).join('');
}

// Chart.js: Funnel Stages
function renderFunnelChart(stages) {
  const ctx = document.getElementById('chartFunnelStages').getContext('2d');
  
  if (funnelChartInstance) {
    funnelChartInstance.destroy();
  }

  const labels = stages.map(s => s.stage);
  const counts = stages.map(s => s.count);
  const percentages = stages.map(s => s.percentage);

  const colors = [
    '#ff6210',
    '#ff7934',
    '#ff9359',
    '#ffb288',
    '#221915'
  ];

  funnelChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Volume Prospek',
        data: counts,
        backgroundColor: colors,
        borderRadius: 8,
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#140b06',
          titleFont: { family: 'Lexend', size: 12 },
          bodyFont: { family: 'DM Sans', size: 11 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = percentages[context.dataIndex];
              return ` Volume: ${val.toLocaleString('id-ID')} (${pct}% dari tahap 1)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f5f5f4' },
          ticks: { font: { family: 'DM Sans', size: 10 }, color: '#78716c' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Lexend', size: 11, weight: '600' }, color: '#1c1917' }
        }
      }
    }
  });
}

// Chart.js: Channel Performance
function renderChannelChart(channels) {
  const ctx = document.getElementById('chartChannelPerformance').getContext('2d');

  if (channelChartInstance) {
    channelChartInstance.destroy();
  }

  channelChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: channels.map(c => c.channel),
      datasets: [
        {
          label: 'Total Prospek Masuk',
          data: channels.map(c => c.leads),
          backgroundColor: '#e7e5e4',
          hoverBackgroundColor: '#d6d3d1',
          borderRadius: 6
        },
        {
          label: 'Berhasil Konversi',
          data: channels.map(c => c.converted),
          backgroundColor: '#ff6210',
          hoverBackgroundColor: '#e55509',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'DM Sans', size: 10 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#140b06',
          titleFont: { family: 'Lexend' },
          bodyFont: { family: 'DM Sans' },
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'DM Sans', size: 10 }, color: '#78716c' }
        },
        y: {
          grid: { color: '#f5f5f4' },
          ticks: { font: { family: 'DM Sans', size: 10 }, color: '#78716c' }
        }
      }
    }
  });
}

// ==========================================
// FLOATING AI DECISION ASSISTANT
// ==========================================
const btnToggleAi = document.getElementById('btnToggleAi');
const btnCloseAi = document.getElementById('btnCloseAi');
const aiChatWindow = document.getElementById('aiChatWindow');
const aiChatLog = document.getElementById('aiChatLog');
const aiQuickChips = document.getElementById('aiQuickChips');
const aiChatForm = document.getElementById('aiChatForm');
const aiChatInput = document.getElementById('aiChatInput');
const aiHeaderTitle = document.getElementById('aiHeaderTitle');
const aiActiveBadge = document.getElementById('aiActiveBadge');

let isAiOpen = false;

if (btnToggleAi && aiChatWindow) {
  btnToggleAi.addEventListener('click', () => {
    isAiOpen = !isAiOpen;
    aiChatWindow.classList.toggle('hidden', !isAiOpen);
    if (isAiOpen) {
      aiChatLog.scrollTop = aiChatLog.scrollHeight;
      setTimeout(() => aiChatInput && aiChatInput.focus(), 100);
    }
  });

  if (btnCloseAi) {
    btnCloseAi.addEventListener('click', () => {
      isAiOpen = false;
      aiChatWindow.classList.add('hidden');
    });
  }
}

function initAiAssistantForPersona(persona) {
  if (!aiChatLog) return;
  aiChatLog.innerHTML = '';

  const isEdu = persona === 'edufunnel';
  if (aiHeaderTitle) aiHeaderTitle.textContent = isEdu ? "Asisten Keputusan EduFunnel" : "Konsultan Bisnis Pak Ujang";
  if (aiActiveBadge) aiActiveBadge.textContent = isEdu ? "Mode: PMB Kampus" : "Mode: Grosir Gadget";

  // Initial greeting
  const welcomeText = isEdu
    ? `Halo! Saya <strong>Asisten Keputusan EduFunnel</strong> 🎓.<br>Saya menganalisis data pendaftaran mahasiswa baru, titik kebocoran calon pendaftar, dan performa iklan digital.<br><br>Pilih topik cepat di bawah atau ketik pertanyaan Anda!`
    : `Halo Pak Ujang & Mas Iqbal! Saya <strong>Konsultan Bisnis Gadget</strong> 📱.<br>Saya memantau alur penawaran stok HP/laptop, performa toko retail mall (Agres, dll), serta perputaran barang Anda.<br><br>Ada yang ingin dianalisis hari ini?`;

  appendAiMessage(welcomeText);

  // Suggested prompt chips
  const chips = isEdu
    ? [
        { label: "🔍 Titik Hambatan (Bottleneck)?", query: "Apa titik hambatan terbesar pada pendaftaran PMB saat ini?" },
        { label: "🏆 Saluran Paling Efektif?", query: "Saluran promosi mana yang paling banyak menghasilkan pendaftar resmi?" },
        { label: "💡 Rekomendasi Tindakan?", query: "Apa rekomendasi strategis prioritas untuk tim marketing?" },
        { label: "📊 Ringkasan Konversi", query: "Berapa rasio konversi keseluruhan saat ini?" }
      ]
    : [
        { label: "⚠️ Mengapa Nego Banyak Batal?", query: "Kenapa banyak toko yang batal deal setelah tahap penawaran/nego?" },
        { label: "🏬 Toko Mana Paling Loyal?", query: "Saluran atau toko mana yang paling banyak menghasilkan closing penjualan?" },
        { label: "🛵 Arahan untuk Mas Iqbal?", query: "Apa arahan operasional untuk Mas Iqbal minggu ini?" },
        { label: "💰 Rekomendasi Margin Laptop?", query: "Bagaimana strategi meningkatkan penjualan unit laptop?" }
      ];

  if (aiQuickChips) {
    aiQuickChips.innerHTML = '';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-chip';
      btn.textContent = chip.label;
      btn.addEventListener('click', () => handleAiQuery(chip.query));
      aiQuickChips.appendChild(btn);
    });
  }
}

function appendUserMessage(text) {
  if (!aiChatLog) return;
  const div = document.createElement('div');
  div.className = 'user-bubble';
  div.textContent = text;
  aiChatLog.appendChild(div);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

function appendAiMessage(html) {
  if (!aiChatLog) return;
  const div = document.createElement('div');
  div.className = 'ai-bubble';
  div.innerHTML = html;
  aiChatLog.appendChild(div);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

function showTypingIndicator() {
  if (!aiChatLog) return;
  const div = document.createElement('div');
  div.id = 'aiTypingIndicator';
  div.className = 'ai-bubble flex items-center space-x-1.5 text-stone-400 font-mono text-[11px]';
  div.innerHTML = `
    <span class="w-1.5 h-1.5 rounded-full bg-[#ff6210] animate-bounce"></span>
    <span class="w-1.5 h-1.5 rounded-full bg-[#ff6210] animate-bounce [animation-delay:0.2s]"></span>
    <span class="w-1.5 h-1.5 rounded-full bg-[#ff6210] animate-bounce [animation-delay:0.4s]"></span>
    <span class="ml-1 text-stone-500">Menganalisis data funnel...</span>
  `;
  aiChatLog.appendChild(div);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('aiTypingIndicator');
  if (el) el.remove();
}

// AI Query Processor with Direct Gemini API + Backend /api/chat + Local Fallback
const defaultGeminiKey = atob("QVEuQWI4Uk42SVFxcjVFdTVYb0tBa1Z1RFdPeld6VXY0TXJoRjhLY2FEUGRwUU9UZkNrd3c=");

async function callGeminiDirect(query, apiKey) {
  const isEdu = currentPersona === 'edufunnel';
  const funnel = currentFunnelData;
  const systemContext = isEdu
    ? `Anda adalah Asisten Keputusan Strategis EduFunnel untuk pendaftaran mahasiswa baru (PMB Kampus).
Konteks data corong pendaftaran aktif: ${JSON.stringify(funnel)}
Panduan Menjawab:
1. Jika pengguna bertanya tentang data pendaftaran PMB, saluran promosi, atau bottleneck, jawab berbasis data di atas secara tajam dan solutif.
2. Jika pengguna bertanya di luar tema (resep makanan, cemilan, lelucon, obrolan santai, pertanyaan umum), tetap jawab dengan ramah, lezat/lengkap, dan informatif (jangan menolak), lalu ingatkan dengan santai bahwa Anda siap kembali menganalisis corong PMB kapan pun dibutuhkan.
3. Format teks menggunakan tag HTML: <strong> untuk tebal, <em> untuk miring, <br> untuk baris baru, <li> untuk poin-poin.`
    : `Anda adalah Konsultan Bisnis dan Penjualan B2B untuk usaha grosir gadget Pak Ujang Rahmat dan Mas Iqbal. Tim menyuplai laptop dan HP ke toko-toko retail mall (Agres, dll).
Konteks data corong penjualan aktif: ${JSON.stringify(funnel)}
Panduan Menjawab:
1. Jika pengguna bertanya seputar penjualan HP/laptop, margin, toko rekanan (Agres), atau tugas COD Mas Iqbal, jawab berbasis data secara solutif dan praktis.
2. Jika pengguna bertanya di luar tema grosir gadget (seperti resep cemilan mac n cheese, rekomendasi makanan, obrolan santai), jawablah pertanyaannya secara ramah, lengkap, dan lezat (jangan menolak), lalu dengan gaya hangat khas Pak Ujang selipkan humor santai bahwa Anda siap lanjut bantu hitung margin dan stok kapan pun siap!
3. Format teks menggunakan tag HTML: <strong> untuk tebal, <em> untuk miring, <br> untuk baris baru, <li> untuk poin-poin.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemContext}\n\nPertanyaan Pengguna: "${query}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini direct status ${response.status}`);
  }

  const result = await response.json();
  let reply = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error('Empty response from Gemini');

  reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  reply = reply.replace(/\*(.*?)\*/g, '<em>$1</em>');
  reply = reply.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  return reply;
}

async function handleAiQuery(query) {
  appendUserMessage(query);
  showTypingIndicator();

  const apiKey = localStorage.getItem('edufunnel_gemini_key') || defaultGeminiKey;

  // 1. Prioritas Utama: Panggil Gemini langsung dari browser klien (respons 1-2 detik, tanpa batas Vercel)
  try {
    const directReply = await callGeminiDirect(query, apiKey);
    removeTypingIndicator();
    appendAiMessage(directReply);
    return;
  } catch (directErr) {
    console.warn('Direct Gemini call failed, trying /api/chat backend:', directErr);
  }

  // 2. Jalur Kedua: Panggil endpoint backend /api/chat
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        persona: currentPersona,
        funnelData: currentFunnelData,
        clientApiKey: apiKey
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        removeTypingIndicator();
        appendAiMessage(data.reply);
        return;
      }
    }
  } catch (serverErr) {
    console.warn('Server endpoint failed, falling back to local rule engine:', serverErr);
  }

  // 3. Fallback Terakhir: Mesin Aturan Lokal Cerdas (jika koneksi benar-benar terputus)
  removeTypingIndicator();
  const fallbackAns = generateAiAnswer(query.toLowerCase());
  appendAiMessage(fallbackAns);
}

if (aiChatForm) {
  aiChatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = aiChatInput.value.trim();
    if (!query) return;
    aiChatInput.value = '';
    handleAiQuery(query);
  });
}

function generateAiAnswer(q) {
  const data = currentFunnelData;
  const isEdu = currentPersona === 'edufunnel';

  if (!data) {
    return "Data funnel belum dimuat dengan sempurna. Silakan muat ulang halaman.";
  }

  // 0. Pertanyaan Meta / Perkenalan & Kemampuan
  if (q.includes('kamu siapa') || q.includes('siapa kamu') || q.includes('bisa apa') || q.includes('bantu apa') || q.includes('fungsi') || q.includes('peran') || q.includes('halo') || q.includes('hai')) {
    if (isEdu) {
      return `Halo! Saya adalah <strong>Asisten Keputusan EduFunnel</strong> 🎓.<br><br>Di sistem ini, peran utama saya adalah membantu pimpinan & tim marketing PMB untuk:<br>1. <strong>Mendeteksi Bottleneck:</strong> Mengetahui di tahap mana calon mahasiswa paling banyak gugur (drop-off).<br>2. <strong>Evaluasi Saluran Iklan:</strong> Membandingkan performa Instagram, TikTok, dan Edu Expo.<br>3. <strong>Saran Strategis (Now What):</strong> Memberikan langkah konkret untuk mendongkrak pendaftaran.<br><br>Silakan tanyakan apa saja seputar data atau klik pertanyaan cepat di atas! 😊`;
    } else {
      return `Halo! Saya adalah <strong>Konsultan Bisnis B2B untuk Pak Ujang & Mas Iqbal</strong> 📱.<br><br>Tugas utama saya di aplikasi ini adalah:<br>1. <strong>Menganalisis Penjualan Toko:</strong> Memantau penawaran stok HP/laptop ke toko retail mall (seperti Agres).<br>2. <strong>Mengevaluasi Nego & Closing:</strong> Mencari tahu kenapa penawaran batal deal dan cara memaksimalkan margin.<br>3. <strong>Arahan Lapangan:</strong> Memberi rekomendasi rute dan taktik negosiasi untuk Mas Iqbal saat COD/kunjungan toko.<br><br>Ada hal spesifik tentang stok atau toko langganan yang ingin dibahas? 😊`;
    }
  }

  // 1. Bottleneck / Hambatan / Drop-off
  if (q.includes('bottleneck') || q.includes('hambatan') || q.includes('kendala') || q.includes('drop') || q.includes('batal')) {
    if (isEdu) {
      return `⚠️ <strong>Analisis Bottleneck (PMB Kampus):</strong><br><br>Titik kebocoran utama terjadi di tahap <strong>${data.summary.primary_bottleneck}</strong>.<br>• Dari <strong>4.800 calon mahasiswa</strong> yang bertanya/download brosur (<em>Consideration</em>), hanya <strong>1.150 orang</strong> yang membeli voucher formulir (<em>Conversion</em>).<br>• Terjadi kehilangan <strong>76% calon pendaftar</strong> di fase ini.<br><br>💡 <strong>Solusi Rekomendasi:</strong> Sederhanakan formulir pendaftaran online dan kirim pengingat WhatsApp otomatis via n8n kepada pendaftar yang belum menyelesaikan pembayaran voucher.`;
    } else {
      return `⚠️ <strong>Analisis Kebocoran Penawaran (Pak Ujang):</strong><br><br>Titik hambatan terbesar ada pada tahap <strong>${data.summary.primary_bottleneck}</strong>.<br>• Dari <strong>240 toko</strong> yang dikirimi list stok, <strong>110 toko</strong> merespon dan menawar harga.<br>• Namun hanya <strong>58 toko</strong> yang deal beli unit (52 toko gugur saat negosiasi margin).<br><br>💡 <strong>Solusi untuk Pak Ujang:</strong> Saat COD hunting barang di marketplace, tawar harga modal lebih miring lagi agar punya ruang margin lebih fleksibel saat toko mall menawar!`;
    }
  }

  // 2. Saluran / Channel / Toko / Iklan
  if (q.includes('channel') || q.includes('saluran') || q.includes('loyal') || q.includes('toko') || q.includes('iklan') || q.includes('agres') || q.includes('efektif')) {
    const topChannel = data.channel_performance.reduce((prev, curr) => parseFloat(curr.cvr) > parseFloat(prev.cvr) ? curr : prev, data.channel_performance[0]);
    const maxVolume = data.channel_performance.reduce((prev, curr) => curr.leads > prev.leads ? curr : prev, data.channel_performance[0]);

    if (isEdu) {
      return `🏆 <strong>Analisis Saluran Promosi (PMB):</strong><br><br>• <strong>Konversi Tertinggi:</strong> Saluran <strong>${topChannel.channel}</strong> dengan CVR mencapai <strong>${topChannel.cvr}</strong> (${topChannel.converted} pendaftar dari ${topChannel.leads} prospek). Kunjungan tatap muka terbukti paling meyakinkan orang tua calon maba.<br>• <strong>Volume Terbesar:</strong> Iklan <strong>${maxVolume.channel}</strong> menyumbang <strong>${maxVolume.leads} prospek</strong> dengan CVR <strong>${maxVolume.cvr}</strong>.<br><br>🎯 <strong>Saran:</strong> Alokasikan lebih banyak anggaran ke kegiatan roadshow/expo sekolah bulan depan!`;
    } else {
      return `🏆 <strong>Analisis Saluran Penjualan Toko (Pak Ujang):</strong><br><br>• <strong>Paling Loyal & Cepat Deal:</strong> <strong>Toko Retail Mall (Agres & Mitra)</strong> dengan rasio konversi tertinggi sebesar <strong>${topChannel.cvr}</strong> (28 transaksi closing).<br>• Saluran broadcast grup WA reseller hanya menghasilkan CVR 18%.<br><br>🎯 <strong>Rekomendasi:</strong> Toko Agres dan gerai mall adalah tulang punggung perputaran kas. Jadwalkan Mas Iqbal untuk kunjungan tatap muka rutin setiap restock!`;
    }
  }

  // 3. Mas Iqbal / Kurir / Arahan Operasional Lapangan
  if (q.includes('iqbal') || q.includes('kurir') || q.includes('antar') || q.includes('lapangan') || q.includes('jadwal')) {
    return `🛵 <strong>Arahan Operasional Khusus Mas Iqbal:</strong><br><br>1. <strong>Jadwal Kunjungan Prioritas:</strong> Kunjungi toko rekanan mall (terutama gerai Agres) setiap hari <strong>Selasa dan Jumat</strong> saat etalase mereka sedang kosong.<br>2. <strong>Bawa Sampel Unit:</strong> Selalu bawa unit laptop siap jual yang sudah dicek fisiknya.<br>3. <strong>Siapkan Paket Bundling:</strong> Bawa bonus tas laptop atau mouse saat negosiasi di toko agar pemilik toko langsung deal di tempat!`;
  }

  // 4. Draft Chat WA / Pesan Promosi
  if (q.includes('draft') || q.includes('wa') || q.includes('chat') || q.includes('pesan') || q.includes('teks')) {
    if (isEdu) {
      return `📱 <strong>Draf Pesan WhatsApp Follow-up (PMB Kampus):</strong><br><br><em>"Halo Kak [Nama Calon Maba]! Terima kasih sudah berkonsultasi mengenai program studi di kampus kami 😊. Biaya pendaftaran gelombang 1 akan ditutup dalam 3 hari lagi lho. Yuk amankan kuota prodi impianmu di sini: [Link Pendaftaran]. Jika butuh bantuan pengisian berkas, kami siap bantu ya!"</em>`;
    } else {
      return `📱 <strong>Draf Pesan WhatsApp Penawaran Stok (Pak Ujang ke Toko Mall):</strong><br><br><em>"Siang Ko/Ci [Nama Pemilik Toko Agres/Mall]! Ini Pak Ujang. Mau info ada masuk stok laptop Lenovo & Asus siap pajang, kondisi mulus grade A + garansi toko. Harga grosir spesial khusus restock minggu ini ya. Nanti sore Mas Iqbal bisa sekalian mampir bawain unitnya kalau mau cek dulu. Terima kasih!"</em>`;
    }
  }

  // 5. Rekomendasi / Saran / Tindakan
  if (q.includes('rekomendasi') || q.includes('saran') || q.includes('tindakan') || q.includes('aksi') || q.includes('tips') || q.includes('solusi')) {
    const recs = data.recommendations.map(r => `• <strong>[Prioritas ${r.priority}] ${r.title}:</strong> ${r.action}`).join('<br><br>');
    return `💡 <strong>Rencana Tindakan Strategis (Berdasarkan Data):</strong><br><br>${recs}`;
  }

  // 6. Konversi / CVR / Angka Ringkasan
  if (q.includes('konversi') || q.includes('cvr') || q.includes('angka') || q.includes('total') || q.includes('deal') || q.includes('ringkasan')) {
    return `📊 <strong>Ringkasan Performa Corong Saat Ini:</strong><br><br>• <strong>Total Prospek Masuk:</strong> ${data.summary.total_prospects.toLocaleString('id-ID')} unit/orang<br>• <strong>Total Berhasil Konversi:</strong> ${data.summary.total_converted.toLocaleString('id-ID')} transaksi/maba<br>• <strong>Rasio Konversi Keseluruhan (CVR):</strong> <strong>${data.summary.overall_conversion_rate}</strong><br>• <strong>Saluran Teratas:</strong> ${data.summary.top_channel}<br>• <strong>Status Funnel:</strong> Berjalan stabil dan terukur.`;
  }

  // 7. Edukasi Istilah (Funnel, UCD, ACCRA)
  if (q.includes('ucd') || q.includes('accra') || q.includes('apa itu') || q.includes('pengertian')) {
    return `📚 <strong>Edukasi Konsep Desain Interaksi Pengguna (DIP):</strong><br><br>• <strong>UCD (ISO 9241-210):</strong> Pendekatan desain yang menempatkan kebutuhan nyata pengguna (Pak Ujang / Tim PMB) sebagai pusat pengembangan, dievaluasi lewat metrik kepuasan dan efisiensi.<br>• <strong>Model ACCRA:</strong> Alur corong 5 tahap dari <em>Awareness</em> (tahu), <em>Consideration</em> (tanya/menimbang), <em>Conversion</em> (beli/deal), <em>Retention</em> (repeat order/kuliah), hingga <em>Advocacy</em> (rekomendasi).`;
  }

  // 8. Cemilan, Resep, Makanan Santai
  if (q.includes('resep') || q.includes('mac') || q.includes('cheese') || q.includes('makan') || q.includes('cemilan') || q.includes('masak') || q.includes('laper') || q.includes('lapar')) {
    if (isEdu) {
      return `🧀 <strong>Resep Praktis Mac and Cheese ala Mahasiswa PMB:</strong><br><br>1. <strong>Bahan:</strong> 150g makaroni rebus, 2 sdm mentega, 1 gelas susu cair, parutan keju cheddar & mozzarella secukupnya.<br>2. <strong>Cara Cepat:</strong> Lelehkan mentega di teflon, masukkan susu dan keju sampai saus mengental gurih. Masukkan makaroni, aduk rata dengan sejumput garam dan merica hitam.<br><br>Nikmati cemilannya selagi hangat sambil kita lanjut evaluasi saluran promosi kampus ya! 🎓✨`;
    } else {
      return `🧀 <strong>Resep Spesial Mac and Cheese Rekomendasi Pak Ujang & Mas Iqbal:</strong><br><br>Biar stamina tetap prima saat muter COD kirim laptop ke toko mall, ini resep simpelnya:<br>• <strong>Bahan:</strong> 200g macaroni rebus, 2 sdm margarin, 1 kotak susu UHT (200ml), keju cheddar parut + sedikit keju quick melt.<br>• <strong>Cara Buat:</strong> Lelehkan margarin di wajan, tuang susu dan masukkan keju sampai meleleh jadi saus creamy kental. Masukkan macaroni, bumbui merica & kaldu jamur secukupnya.<br><br>Mantap disantap hangat sebelum Mas Iqbal berangkat kunjungan ke gerai Agres! Mau lanjut hitung margin stok laptop? 📱👍`;
    }
  }

  // 9. Default Answer
  return `Saya memahami pertanyaan Anda tentang "<em>${q}</em>". Berdasarkan data aktif <strong>${data.system_title}</strong>:<br><br>• Total prospek: <strong>${data.summary.total_prospects.toLocaleString('id-ID')}</strong> dengan konversi final <strong>${data.summary.overall_conversion_rate}</strong>.<br>• Titik hambatan utama saat ini ada pada tahap <strong>${data.summary.primary_bottleneck}</strong>.<br><br>Anda bisa mengklik salah satu tombol pertanyaan instan di atas atau bertanya tentang stok, saluran, dan strategi closing! 😊`;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  checkExistingAuth();
});
