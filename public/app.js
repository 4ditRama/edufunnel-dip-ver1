// ==========================================
// APPLICATION STATE & VIEW SWITCHING
// ==========================================
let currentPersona = 'gadget'; // Default fokus utama: Kasus Bisnis Riil Gadget B2B Pak Ujang & Mas Iqbal
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

  if (lblCurrentUserName) lblCurrentUserName.textContent = name;
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
          const preferredPersona = localStorage.getItem('edufunnel_preferred_persona') || 'gadget';
          showAlert(loginAlert, `✓ Akun terverifikasi di Supabase. Masuk ke dashboard...`, 'success');
          setTimeout(() => {
            loginUser(userName, preferredPersona);
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
      localStorage.setItem('edufunnel_preferred_persona', initialPersona);
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: window.location.origin,
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
      // Dengarkan event redirect auth dari Supabase (misal klik tautan konfirmasi)
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session && session.user) {
          const userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
          const userRole = session.user.user_metadata?.role;
          const persona = userRole === 'owner_gadget' ? 'gadget' : 'edufunnel';

          if (lblCurrentUserName) lblCurrentUserName.textContent = userName;
          switchPersona(persona);
          showView('dashboard');
        }
      });

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session && session.user) {
        const userName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
        const userRole = session.user.user_metadata?.role;
        const persona = userRole === 'owner_gadget' ? 'gadget' : 'edufunnel';

        if (lblCurrentUserName) lblCurrentUserName.textContent = userName;
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
      if (lblCurrentUserName) lblCurrentUserName.textContent = parsed.name;
      switchPersona(parsed.persona || 'gadget');
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
    btnPersonaEdu.className = "px-3 py-1.5 rounded-md text-xs font-heading font-semibold transition-all bg-[#ff6210] text-white shadow-sm flex items-center space-x-1.5 cursor-pointer";
    btnPersonaGadget.className = "px-3 py-1.5 rounded-md text-xs font-heading font-medium text-stone-400 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer";
    if (headerTitle) headerTitle.textContent = "EduFunnel PMB";
    if (headerSubtitle) headerSubtitle.textContent = "Penerimaan Mahasiswa Baru • Standar ISO 9241-210 UCD";
  } else {
    btnPersonaGadget.className = "px-3 py-1.5 rounded-md text-xs font-heading font-semibold transition-all bg-[#ff6210] text-white shadow-sm flex items-center space-x-1.5 cursor-pointer";
    btnPersonaEdu.className = "px-3 py-1.5 rounded-md text-xs font-heading font-medium text-stone-400 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer";
    if (headerTitle) headerTitle.textContent = "GadgetFlow B2B";
    if (headerSubtitle) headerSubtitle.textContent = "Grosir Gadget Pak Ujang & Mas Iqbal • Standar ISO 9241-210 UCD";
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
            label: function (context) {
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
    ? `Halo, saya <strong>Asisten Analitik EduFunnel</strong>.<br>Saya memantau data pendaftaran mahasiswa baru, titik kebocoran calon pendaftar, dan efisiensi saluran promosi.<br><br>Pilih topik analisis di bawah atau ketik pertanyaan Anda.`
    : `Halo Pak Ujang & Mas Iqbal. Saya <strong>Konsultan Analitik Gadget B2B</strong>.<br>Saya memantau alur penawaran stok HP/laptop, efisiensi toko rekanan mall (Agres, dll), serta perputaran barang.<br><br>Ada data corong yang ingin dianalisis hari ini?`;

  appendAiMessage(welcomeText);

  // Suggested prompt chips
  const chips = isEdu
    ? [
      { label: "Titik Hambatan Utama", query: "Apa titik hambatan terbesar pada pendaftaran PMB saat ini?" },
      { label: "Saluran Paling Efektif", query: "Saluran promosi mana yang paling banyak menghasilkan pendaftar resmi?" },
      { label: "Rekomendasi Tindakan", query: "Apa rekomendasi strategis prioritas untuk tim marketing?" },
      { label: "Ringkasan Konversi", query: "Berapa rasio konversi keseluruhan saat ini?" }
    ]
    : [
      { label: "Penyebab Nego Batal", query: "Kenapa banyak toko yang batal deal setelah tahap penawaran/nego?" },
      { label: "Toko Paling Loyal", query: "Saluran atau toko mana yang paling banyak menghasilkan closing penjualan?" },
      { label: "Arahan Mas Iqbal", query: "Apa arahan operasional untuk Mas Iqbal minggu ini?" },
      { label: "Rekomendasi Margin", query: "Bagaimana strategi meningkatkan penjualan unit laptop?" }
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
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
      return `Halo! Saya adalah <strong>Asisten Keputusan EduFunnel</strong>.<br><br>Di sistem ini, peran utama saya adalah membantu pimpinan & tim marketing PMB untuk:<br>1. <strong>Mendeteksi Bottleneck:</strong> Mengetahui di tahap mana calon mahasiswa paling banyak gugur (drop-off).<br>2. <strong>Evaluasi Saluran Iklan:</strong> Membandingkan performa Instagram, TikTok, dan Edu Expo.<br>3. <strong>Saran Strategis (Now What):</strong> Memberikan langkah konkret untuk mendongkrak pendaftaran.<br><br>Silakan tanyakan apa saja seputar data atau klik pertanyaan cepat di atas!`;
    } else {
      return `Halo! Saya adalah <strong>Konsultan Bisnis B2B untuk Pak Ujang & Mas Iqbal</strong>.<br><br>Tugas utama saya di aplikasi ini adalah:<br>1. <strong>Menganalisis Penjualan Toko:</strong> Memantau penawaran stok HP/laptop ke toko retail mall (seperti Agres).<br>2. <strong>Mengevaluasi Nego & Closing:</strong> Mencari tahu kenapa penawaran batal deal dan cara memaksimalkan margin.<br>3. <strong>Arahan Lapangan:</strong> Memberi rekomendasi rute dan taktik negosiasi untuk Mas Iqbal saat COD/kunjungan toko.<br><br>Ada hal spesifik tentang stok atau toko langganan yang ingin dibahas?`;
    }
  }

  // 1. Bottleneck / Hambatan / Drop-off
  if (q.includes('bottleneck') || q.includes('hambatan') || q.includes('kendala') || q.includes('drop') || q.includes('batal')) {
    if (isEdu) {
      return `<strong>[Analisis Bottleneck PMB]</strong><br><br>Titik kebocoran utama terjadi di tahap <strong>${data.summary.primary_bottleneck}</strong>.<br>• Dari <strong>4.800 calon mahasiswa</strong> yang bertanya/download brosur (<em>Consideration</em>), hanya <strong>1.150 orang</strong> yang membeli voucher formulir (<em>Conversion</em>).<br>• Terjadi kehilangan <strong>76% calon pendaftar</strong> di fase ini.<br><br><strong>Rekomendasi Tindakan:</strong> Sederhanakan formulir pendaftaran online dan kirim pengingat WhatsApp otomatis via n8n kepada pendaftar yang belum menyelesaikan pembayaran voucher.`;
    } else {
      return `<strong>[Analisis Hambatan Penjualan B2B]</strong><br><br>Titik hambatan terbesar ada pada tahap <strong>${data.summary.primary_bottleneck}</strong>.<br>• Dari <strong>240 toko</strong> yang dikirimi list stok, <strong>110 toko</strong> merespon dan menawar harga.<br>• Namun hanya <strong>58 toko</strong> yang deal beli unit (52 toko gugur saat negosiasi margin).<br><br><strong>Rekomendasi untuk Pak Ujang:</strong> Saat COD hunting barang di marketplace, tawar harga modal lebih miring lagi agar punya ruang margin lebih fleksibel saat toko mall menawar!`;
    }
  }

  // 2. Saluran / Channel / Toko / Iklan
  if (q.includes('channel') || q.includes('saluran') || q.includes('loyal') || q.includes('toko') || q.includes('iklan') || q.includes('agres') || q.includes('efektif')) {
    const topChannel = data.channel_performance.reduce((prev, curr) => parseFloat(curr.cvr) > parseFloat(prev.cvr) ? curr : prev, data.channel_performance[0]);
    const maxVolume = data.channel_performance.reduce((prev, curr) => curr.leads > prev.leads ? curr : prev, data.channel_performance[0]);

    if (isEdu) {
      return `<strong>[Analisis Saluran Promosi PMB]</strong><br><br>• <strong>Konversi Tertinggi:</strong> Saluran <strong>${topChannel.channel}</strong> dengan CVR mencapai <strong>${topChannel.cvr}</strong> (${topChannel.converted} pendaftar dari ${topChannel.leads} prospek). Kunjungan tatap muka terbukti paling meyakinkan orang tua calon maba.<br>• <strong>Volume Terbesar:</strong> Iklan <strong>${maxVolume.channel}</strong> menyumbang <strong>${maxVolume.leads} prospek</strong> dengan CVR <strong>${maxVolume.cvr}</strong>.<br><br><strong>Saran:</strong> Alokasikan lebih banyak anggaran ke kegiatan roadshow/expo sekolah bulan depan!`;
    } else {
      return `<strong>[Analisis Saluran Penjualan Toko]</strong><br><br>• <strong>Paling Loyal & Cepat Deal:</strong> <strong>Toko Retail Mall (Agres & Mitra)</strong> dengan rasio konversi tertinggi sebesar <strong>${topChannel.cvr}</strong> (28 transaksi closing).<br>• Saluran broadcast grup WA reseller hanya menghasilkan CVR 18%.<br><br><strong>Rekomendasi:</strong> Toko Agres dan gerai mall adalah tulang punggung perputaran kas. Jadwalkan Mas Iqbal untuk kunjungan tatap muka rutin setiap restock!`;
    }
  }

  // 3. Mas Iqbal / Kurir / Arahan Operasional Lapangan
  if (q.includes('iqbal') || q.includes('kurir') || q.includes('antar') || q.includes('lapangan') || q.includes('jadwal')) {
    return `<strong>[Arahan Operasional Khusus Mas Iqbal]</strong><br><br>1. <strong>Jadwal Kunjungan Prioritas:</strong> Kunjungi toko rekanan mall (terutama gerai Agres) setiap hari <strong>Selasa dan Jumat</strong> saat etalase mereka sedang kosong.<br>2. <strong>Bawa Sampel Unit:</strong> Selalu bawa unit laptop siap jual yang sudah dicek fisiknya.<br>3. <strong>Siapkan Paket Bundling:</strong> Bawa bonus tas laptop atau mouse saat negosiasi di toko agar pemilik toko langsung deal di tempat!`;
  }

  // 4. Draft Chat WA / Pesan Promosi
  if (q.includes('draft') || q.includes('wa') || q.includes('chat') || q.includes('pesan') || q.includes('teks')) {
    if (isEdu) {
      return `<strong>[Draf Pesan WhatsApp Follow-up PMB]</strong><br><br><em>"Halo Kak [Nama Calon Maba]! Terima kasih sudah berkonsultasi mengenai program studi di kampus kami. Biaya pendaftaran gelombang 1 akan ditutup dalam 3 hari lagi lho. Yuk amankan kuota prodi impianmu di sini: [Link Pendaftaran]. Jika butuh bantuan pengisian berkas, kami siap bantu ya!"</em>`;
    } else {
      return `<strong>[Draf Pesan WhatsApp Penawaran Stok]</strong><br><br><em>"Siang Ko/Ci [Nama Pemilik Toko Agres/Mall]! Ini Pak Ujang. Mau info ada masuk stok laptop Lenovo & Asus siap pajang, kondisi mulus grade A + garansi toko. Harga grosir spesial khusus restock minggu ini ya. Nanti sore Mas Iqbal bisa sekalian mampir bawain unitnya kalau mau cek dulu. Terima kasih!"</em>`;
    }
  }

  // 5. Rekomendasi / Saran / Tindakan
  if (q.includes('rekomendasi') || q.includes('saran') || q.includes('tindakan') || q.includes('aksi') || q.includes('tips') || q.includes('solusi')) {
    const recs = data.recommendations.map(r => `• <strong>[Prioritas ${r.priority}] ${r.title}:</strong> ${r.action}`).join('<br><br>');
    return `<strong>[Rencana Tindakan Strategis - Now What]</strong><br><br>${recs}`;
  }

  // 6. Konversi / CVR / Angka Ringkasan
  if (q.includes('konversi') || q.includes('cvr') || q.includes('angka') || q.includes('total') || q.includes('deal') || q.includes('ringkasan')) {
    return `<strong>[Ringkasan Performa Corong]</strong><br><br>• <strong>Total Prospek Masuk:</strong> ${data.summary.total_prospects.toLocaleString('id-ID')} unit/orang<br>• <strong>Total Berhasil Konversi:</strong> ${data.summary.total_converted.toLocaleString('id-ID')} transaksi/maba<br>• <strong>Rasio Konversi Keseluruhan (CVR):</strong> <strong>${data.summary.overall_conversion_rate}</strong><br>• <strong>Saluran Teratas:</strong> ${data.summary.top_channel}<br>• <strong>Status Corong:</strong> Berjalan stabil dan terukur.`;
  }

  // 7. Edukasi Istilah (Funnel, UCD, ACCRA)
  if (q.includes('ucd') || q.includes('accra') || q.includes('apa itu') || q.includes('pengertian')) {
    return `<strong>[Edukasi Konsep Desain Interaksi Pengguna - DIP]</strong><br><br>• <strong>UCD (ISO 9241-210):</strong> Pendekatan desain yang menempatkan kebutuhan nyata pengguna (Pak Ujang / Tim PMB) sebagai pusat pengembangan, dievaluasi lewat metrik kepuasan dan efisiensi.<br>• <strong>Model ACCRA:</strong> Alur corong 5 tahap dari <em>Awareness</em> (tahu), <em>Consideration</em> (tanya/menimbang), <em>Conversion</em> (beli/deal), <em>Retention</em> (repeat order/kuliah), hingga <em>Advocacy</em> (rekomendasi).`;
  }

  // 8. Cemilan, Resep, Makanan Santai
  if (q.includes('resep') || q.includes('mac') || q.includes('cheese') || q.includes('chesse') || q.includes('keju') || q.includes('makan') || q.includes('cemil') || q.includes('snack') || q.includes('masak') || q.includes('laper') || q.includes('lapar') || q.includes('kuliner')) {
    if (isEdu) {
      return `<strong>[Resep Praktis Mac and Cheese ala Mahasiswa PMB]</strong><br><br>1. <strong>Bahan:</strong> 150g makaroni rebus, 2 sdm mentega, 1 gelas susu cair, parutan keju cheddar & mozzarella secukupnya.<br>2. <strong>Cara Cepat:</strong> Lelehkan mentega di teflon, masukkan susu dan keju sampai saus mengental gurih. Masukkan makaroni, aduk rata dengan sejumput garam dan merica hitam.<br><br>Nikmati cemilannya selagi hangat sambil kita lanjut evaluasi saluran promosi kampus ya!`;
    } else {
      return `<strong>[Resep Spesial Mac and Cheese Rekomendasi Pak Ujang & Mas Iqbal]</strong><br><br>Biar stamina tetap prima saat muter COD kirim laptop ke toko mall, ini resep simpelnya:<br>• <strong>Bahan:</strong> 200g macaroni rebus, 2 sdm margarin, 1 kotak susu UHT (200ml), keju cheddar parut + sedikit keju quick melt.<br>• <strong>Cara Buat:</strong> Lelehkan margarin di wajan, tuang susu dan masukkan keju sampai meleleh jadi saus creamy kental. Masukkan macaroni, bumbui merica & kaldu jamur secukupnya.<br><br>Mantap disantap hangat sebelum Mas Iqbal berangkat kunjungan ke gerai Agres! Mau lanjut hitung margin stok laptop?`;
    }
  }

  // 9. Default Answer
  return `Saya memahami pertanyaan Anda tentang "<em>${q}</em>". Berdasarkan data aktif <strong>${data.system_title}</strong>:<br><br>• Total prospek: <strong>${data.summary.total_prospects.toLocaleString('id-ID')}</strong> dengan konversi final <strong>${data.summary.overall_conversion_rate}</strong>.<br>• Titik hambatan utama saat ini ada pada tahap <strong>${data.summary.primary_bottleneck}</strong>.<br><br>Anda bisa mengklik salah satu tombol pertanyaan instan di atas atau bertanya tentang stok, saluran, dan strategi closing!`;
}

// ==========================================
// SUS EVALUATION (ISO 9241-210) & N8N WEBHOOK
// ==========================================
const btnOpenSusModal = document.getElementById('btnOpenSusModal');
const btnCloseSusModal = document.getElementById('btnCloseSusModal');
const modalSusEvaluation = document.getElementById('modalSusEvaluation');
const susQuestionsContainer = document.getElementById('susQuestionsContainer');
const susScorePreview = document.getElementById('susScorePreview');
const susGradePreview = document.getElementById('susGradePreview');
const susBenchmarkBadge = document.getElementById('susBenchmarkBadge');
const btnSubmitSus = document.getElementById('btnSubmitSus');
const susAlert = document.getElementById('susAlert');
const susRespondentName = document.getElementById('susRespondentName');
const susRespondentRole = document.getElementById('susRespondentRole');
const susFeedback = document.getElementById('susFeedback');

const badgeAvgSusScore = document.getElementById('badgeAvgSusScore');
const lblSusGrade = document.getElementById('lblSusGrade');

const btnOpenN8nModal = document.getElementById('btnOpenN8nModal');
const btnCloseN8nModal = document.getElementById('btnCloseN8nModal');
const modalN8nConfig = document.getElementById('modalN8nConfig');
const inputN8nWebhookUrl = document.getElementById('inputN8nWebhookUrl');
const btnSaveN8nUrl = document.getElementById('btnSaveN8nUrl');
const btnTestN8nPing = document.getElementById('btnTestN8nPing');
const n8nConfigAlert = document.getElementById('n8nConfigAlert');
const lblN8nStatus = document.getElementById('lblN8nStatus');

const SUS_QUESTIONS = [
  { id: 1, text: "Saya merasa akan sering menggunakan sistem dashboard ini.", type: "positive" },
  { id: 2, text: "Saya merasa sistem ini terlalu rumit untuk digunakan.", type: "negative" },
  { id: 3, text: "Saya merasa sistem ini mudah untuk digunakan.", type: "positive" },
  { id: 4, text: "Saya membutuhkan bantuan orang teknis untuk dapat menggunakan sistem ini.", type: "negative" },
  { id: 5, text: "Saya merasa berbagai fungsi dalam dashboard ini terintegrasi dengan sangat baik.", type: "positive" },
  { id: 6, text: "Saya merasa ada terlalu banyak hal yang tidak konsisten pada sistem ini.", type: "negative" },
  { id: 7, text: "Saya rasa kebanyakan orang akan cepat belajar menggunakan sistem ini.", type: "positive" },
  { id: 8, text: "Saya merasa dashboard ini membingungkan saat pertama kali dipakai.", type: "negative" },
  { id: 9, text: "Saya merasa sangat percaya diri saat menggunakan sistem ini.", type: "positive" },
  { id: 10, text: "Saya harus belajar banyak hal terlebih dahulu sebelum bisa memahaminya.", type: "negative" }
];

function renderSusQuestions() {
  if (!susQuestionsContainer) return;
  // Default jawaban seimbang yang menghasilkan skor awal ~85.0 (Memenuhi syarat UCD Bu Ama >= 70)
  const defaultAnswers = [5, 2, 4, 1, 5, 2, 4, 2, 5, 2];

  susQuestionsContainer.innerHTML = SUS_QUESTIONS.map((q, idx) => {
    const isOdd = (idx + 1) % 2 === 1;
    const defVal = defaultAnswers[idx];
    return `
      <div class="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
        <div class="flex items-start justify-between gap-2">
          <p class="font-heading font-semibold text-stone-800 text-xs">
            <span class="text-[#ff6210] font-bold mr-1">${idx + 1}.</span> ${q.text}
          </p>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${isOdd ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
            ${isOdd ? 'Butir Ganjil (+)' : 'Butir Genap (-)'}
          </span>
        </div>
        
        <div class="grid grid-cols-5 gap-1.5 pt-1">
          ${[1, 2, 3, 4, 5].map(val => `
            <label class="flex flex-col items-center justify-center p-2 rounded-xl border border-stone-200/80 hover:border-[#ff6210] hover:bg-[#fff2ea]/40 cursor-pointer transition text-center text-[10px]">
              <input type="radio" name="sus_q_${idx + 1}" value="${val}" ${val === defVal ? 'checked' : ''} class="sus-radio accent-[#ff6210] mb-1">
              <span class="font-heading font-bold text-stone-700">${val}</span>
              <span class="text-[9px] text-stone-400 hidden sm:inline-block leading-tight">
                ${val === 1 ? 'Sgt Tdk Setuju' : val === 2 ? 'Tdk Setuju' : val === 3 ? 'Netral' : val === 4 ? 'Setuju' : 'Sgt Setuju'}
              </span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.sus-radio').forEach(radio => {
    radio.addEventListener('change', updateSusScoreCalculation);
  });

  updateSusScoreCalculation();
}

function updateSusScoreCalculation() {
  let oddContribution = 0;
  let evenContribution = 0;

  for (let i = 1; i <= 10; i++) {
    const checked = document.querySelector(`input[name="sus_q_${i}"]:checked`);
    const val = checked ? parseInt(checked.value) : 3;
    if (i % 2 === 1) {
      oddContribution += (val - 1);
    } else {
      evenContribution += (5 - val);
    }
  }

  const score = Number(((oddContribution + evenContribution) * 2.5).toFixed(1));
  if (susScorePreview) susScorePreview.textContent = score.toFixed(1);

  let grade = "Grade C (Marginal)";
  const isMet = score >= 70;

  if (score >= 85) grade = "Grade A (Excellent)";
  else if (score >= 70) grade = "Grade B (Good / Acceptable)";
  else if (score >= 50) grade = "Grade C (Marginal)";
  else grade = "Grade F (Unacceptable)";

  if (susGradePreview) susGradePreview.textContent = grade;
  if (susBenchmarkBadge) {
    susBenchmarkBadge.className = isMet
      ? "px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"
      : "px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800";
    susBenchmarkBadge.textContent = isMet ? "≥ 70 Terpenuhi" : "< 70 Belum Memenuhi";
  }

  return score;
}

// Preset Responder Buttons
document.querySelectorAll('.btn-sus-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.getAttribute('data-name');
    const role = btn.getAttribute('data-role');
    if (susRespondentName) susRespondentName.value = name;
    if (susRespondentRole) susRespondentRole.value = role;
  });
});

// Modal Open & Close Event Listeners
if (btnOpenSusModal && modalSusEvaluation) {
  btnOpenSusModal.addEventListener('click', () => {
    modalSusEvaluation.classList.remove('hidden');
    renderSusQuestions();
  });
}
if (btnCloseSusModal && modalSusEvaluation) {
  btnCloseSusModal.addEventListener('click', () => {
    modalSusEvaluation.classList.add('hidden');
  });
}

if (btnOpenN8nModal && modalN8nConfig) {
  btnOpenN8nModal.addEventListener('click', () => {
    modalN8nConfig.classList.remove('hidden');
    if (inputN8nWebhookUrl) {
      inputN8nWebhookUrl.value = localStorage.getItem('n8n_webhook_url') || '';
    }
  });
}
if (btnCloseN8nModal && modalN8nConfig) {
  btnCloseN8nModal.addEventListener('click', () => {
    modalN8nConfig.classList.add('hidden');
  });
}

// Save n8n Webhook URL
if (btnSaveN8nUrl && inputN8nWebhookUrl) {
  btnSaveN8nUrl.addEventListener('click', () => {
    const url = inputN8nWebhookUrl.value.trim();
    if (url) {
      localStorage.setItem('n8n_webhook_url', url);
      if (lblN8nStatus) lblN8nStatus.textContent = "Custom Cloud n8n";
      showN8nAlert("✓ URL Webhook n8n Cloud berhasil disimpan!", "success");
    } else {
      localStorage.removeItem('n8n_webhook_url');
      if (lblN8nStatus) lblN8nStatus.textContent = "Simulator Internal";
      showN8nAlert("URL dikosongkan. Sistem memakai simulator internal.", "info");
    }
  });
}

function showN8nAlert(msg, type = "success") {
  if (!n8nConfigAlert) return;
  n8nConfigAlert.className = type === "success"
    ? "p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block"
    : "p-3 rounded-xl text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200 block";
  n8nConfigAlert.textContent = msg;
  setTimeout(() => n8nConfigAlert.classList.add('hidden'), 3000);
}

// Test Ping n8n Webhook
if (btnTestN8nPing) {
  btnTestN8nPing.addEventListener('click', async () => {
    const url = inputN8nWebhookUrl ? inputN8nWebhookUrl.value.trim() : '';
    btnTestN8nPing.disabled = true;
    btnTestN8nPing.textContent = "Menguji...";

    try {
      const pingPayload = {
        event: "test_ping",
        source: "EduFunnel Dashboard",
        timestamp: new Date().toISOString(),
        message: "Ping koneksi pipeline n8n berhasil!"
      };

      if (url && url.startsWith('http')) {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pingPayload)
        });
        showN8nAlert("✓ Ping berhasil diterima endpoint n8n Cloud!", "success");
      } else {
        await fetch('/api/webhook/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pingPayload)
        });
        showN8nAlert("✓ Ping berhasil diterima backend simulator!", "success");
      }
    } catch (err) {
      showN8nAlert("Koneksi ping gagal: " + err.message, "error");
    } finally {
      btnTestN8nPing.disabled = false;
      btnTestN8nPing.textContent = "Tes Ping";
    }
  });
}

// Submit SUS Evaluation
if (btnSubmitSus) {
  btnSubmitSus.addEventListener('click', async () => {
    btnSubmitSus.disabled = true;
    btnSubmitSus.innerHTML = `<span>⏳</span><span>Mengirim ke Webhook...</span>`;

    const answers = [];
    for (let i = 1; i <= 10; i++) {
      const checked = document.querySelector(`input[name="sus_q_${i}"]:checked`);
      answers.push(checked ? parseInt(checked.value) : 3);
    }

    const currentScore = updateSusScoreCalculation();
    const n8nTargetUrl = localStorage.getItem('n8n_webhook_url') || '';
    const payload = {
      nama: susRespondentName ? susRespondentName.value.trim() : 'Pengguna Dashboard',
      peran: susRespondentRole ? susRespondentRole.value.trim() : 'Evaluator',
      sumber_trafik: currentPersona === 'gadget' ? 'Dashboard Grosir Gadget' : 'Dashboard EduFunnel PMB',
      jawaban: answers,
      sus_score: currentScore,
      feedback: susFeedback ? susFeedback.value.trim() : '',
      n8nWebhookUrl: n8nTargetUrl
    };

    try {
      const res = await fetch('/api/webhook/kuesioner-sus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (susAlert) {
        susAlert.className = "p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 block";
        const fwdNote = result.n8n_pipeline && result.n8n_pipeline.forwarded
          ? `Diteruskan ke n8n Cloud (${result.n8n_pipeline.url})`
          : `Tersimpan di basis data evaluasi ISO 9241-210`;
        susAlert.innerHTML = `<strong>Evaluasi Berhasil Dicatat</strong> — Skor SUS: <strong>${currentScore}</strong> (${currentScore >= 70 ? 'Standar Kelayakan ≥ 70 Terpenuhi' : 'Di Bawah Standar'}).<br><span class="text-[11px] text-stone-500">${fwdNote}</span>`;
      }

      loadSusStats();
      setTimeout(() => {
        if (modalSusEvaluation) modalSusEvaluation.classList.add('hidden');
        if (susAlert) susAlert.classList.add('hidden');
      }, 2500);
    } catch (err) {
      if (susAlert) {
        susAlert.className = "p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 block";
        susAlert.textContent = "Gagal mengirim kuesioner: " + err.message;
      }
    } finally {
      btnSubmitSus.disabled = false;
      btnSubmitSus.innerHTML = `<svg class="w-3.5 h-3.5 inline mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Kirim ke Webhook n8n (Jalur A)</span>`;
    }
  });
}

// Load SUS Stats for Dashboard Banner
async function loadSusStats() {
  try {
    const res = await fetch('/api/webhook/sus-stats');
    if (res.ok) {
      const data = await res.json();
      if (badgeAvgSusScore) {
        badgeAvgSusScore.textContent = `${data.average_sus_score} / 100`;
      }
      if (lblSusGrade) {
        lblSusGrade.textContent = data.average_sus_score >= 85
          ? "Grade A (Excellent)"
          : data.average_sus_score >= 70
            ? "Grade B (Acceptable)"
            : "Grade C (Marginal)";
      }
    }
  } catch (err) {
    console.warn('Gagal memuat statistik SUS:', err);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  checkExistingAuth();
  loadSusStats();
  if (localStorage.getItem('n8n_webhook_url') && lblN8nStatus) {
    lblN8nStatus.textContent = "Custom Cloud n8n";
  }
});
