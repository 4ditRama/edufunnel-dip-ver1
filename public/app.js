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

// View Switching Function
function showView(viewName) {
  viewLanding.classList.toggle('hidden', viewName !== 'landing');
  viewLogin.classList.toggle('hidden', viewName !== 'login');
  viewRegister.classList.toggle('hidden', viewName !== 'register');
  viewDashboard.classList.toggle('hidden', viewName !== 'dashboard');
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
    renderDashboard(data);
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  checkExistingAuth();
});
