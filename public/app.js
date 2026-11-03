// Application State
let currentPersona = 'edufunnel';
let funnelChartInstance = null;
let channelChartInstance = null;

// DOM Elements
const btnPersonaEdu = document.getElementById('btnPersonaEdu');
const btnPersonaGadget = document.getElementById('btnPersonaGadget');
const btnSyncWebhook = document.getElementById('btnSyncWebhook');

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

const formSimulateLead = document.getElementById('formSimulateLead');
const simLogBox = document.getElementById('simLogBox');

// Event Listeners for Persona Switching
btnPersonaEdu.addEventListener('click', () => switchPersona('edufunnel'));
btnPersonaGadget.addEventListener('click', () => switchPersona('gadget'));

function switchPersona(persona) {
  currentPersona = persona;
  
  if (persona === 'edufunnel') {
    btnPersonaEdu.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-indigo-600 text-white shadow";
    btnPersonaGadget.className = "px-3.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white transition-all duration-200";
    headerTitle.textContent = "EduFunnel PMB Decision Support";
    headerSubtitle.textContent = "Desain Interaksi Pengguna • Model UCD ISO 9241-210";
  } else {
    btnPersonaGadget.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 bg-emerald-600 text-white shadow";
    btnPersonaEdu.className = "px-3.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white transition-all duration-200";
    headerTitle.textContent = "B2B Gadget Wholesale Funnel";
    headerSubtitle.textContent = "Operasional Usaha Pak Ujang & Mas Iqbal (Supply Toko Mall)";
  }

  loadFunnelData(persona);
}

// Fetch Funnel Data (via API with fallback to static JSON)
async function loadFunnelData(persona) {
  try {
    // Try backend API first, fallback to static file if running in static mode
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
  // 1. Info Banner
  infoTargetAudience.textContent = `${data.system_title} — Target: ${data.target_audience}`;
  infoPeriod.textContent = `Periode Evaluasi: ${data.period}`;

  // 2. Layer 1: KPI Cards
  kpiTotalProspects.textContent = data.summary.total_prospects.toLocaleString('id-ID');
  kpiTotalConverted.textContent = data.summary.total_converted.toLocaleString('id-ID');
  kpiConversionRate.textContent = data.summary.overall_conversion_rate;
  kpiBottleneck.textContent = data.summary.primary_bottleneck;
  badgeTopChannel.textContent = `Top: ${data.summary.top_channel}`;

  // 3. Layer 2: Render Funnel Stage Chart
  renderFunnelChart(data.funnel_stages);

  // Render Funnel Stage Cards
  funnelStagesList.innerHTML = data.funnel_stages.map((stage, idx) => `
    <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-800">${idx + 1}. ${stage.stage}</span>
        <span class="font-mono font-semibold text-indigo-600">${stage.count.toLocaleString('id-ID')} (${stage.percentage}%)</span>
      </div>
      <p class="text-[11px] text-slate-500 mt-1 line-clamp-1">${stage.description}</p>
    </div>
  `).join('');

  // 4. Render Channel Performance Chart & Table
  renderChannelChart(data.channel_performance);

  tableChannelBody.innerHTML = data.channel_performance.map(ch => `
    <tr class="hover:bg-slate-50/80 transition">
      <td class="py-2 font-medium text-slate-800">${ch.channel}</td>
      <td class="py-2 text-right font-mono">${ch.leads.toLocaleString('id-ID')}</td>
      <td class="py-2 text-right font-mono font-semibold text-emerald-600">${ch.converted.toLocaleString('id-ID')}</td>
      <td class="py-2 text-right font-mono text-indigo-600 font-bold">${ch.cvr}</td>
    </tr>
  `).join('');

  // 5. Layer 3: Recommendations
  recommendationsList.innerHTML = data.recommendations.map(rec => `
    <div class="p-3.5 rounded-xl border ${rec.priority === 'Tinggi' ? 'border-rose-200 bg-rose-50/40' : 'border-indigo-100 bg-indigo-50/30'} flex items-start space-x-3">
      <div class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${rec.priority === 'Tinggi' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}">
        Prioritas ${rec.priority}
      </div>
      <div class="space-y-0.5">
        <h5 class="text-xs font-bold text-slate-900">${rec.title}</h5>
        <p class="text-xs text-slate-600 leading-relaxed">${rec.action}</p>
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

  funnelChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Prospek',
        data: counts,
        backgroundColor: [
          'rgba(79, 70, 229, 0.85)',
          'rgba(99, 102, 241, 0.75)',
          'rgba(129, 140, 248, 0.70)',
          'rgba(16, 185, 129, 0.80)',
          'rgba(5, 150, 105, 0.90)'
        ],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffffff'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = percentages[context.dataIndex];
              return ` Volume: ${val.toLocaleString('id-ID')} (${pct}% dari awal)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11, weight: 'bold' } }
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
          backgroundColor: 'rgba(148, 163, 184, 0.5)',
          borderRadius: 6
        },
        {
          label: 'Berhasil Konversi',
          data: channels.map(c => c.converted),
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
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
          labels: { font: { size: 10 } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}

// Form Simulation & n8n Webhook Trigger
formSimulateLead.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const leadName = document.getElementById('simLeadName').value;
  const leadChannel = document.getElementById('simLeadChannel').value;
  const leadStage = document.getElementById('simLeadStage').value;

  const payload = {
    timestamp: new Date().toISOString(),
    persona: currentPersona,
    lead: {
      name: leadName,
      channel: leadChannel,
      stage: leadStage,
      status: 'active'
    },
    source: 'EduFunnel-Dashboard-UI'
  };

  simLogBox.classList.remove('hidden');
  simLogBox.innerHTML = `Mengirim webhook ke server & n8n...<br><span class="text-slate-400 font-mono text-[10px]">${JSON.stringify(payload)}</span>`;

  try {
    const res = await fetch('/api/webhook/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    simLogBox.innerHTML = `
      <span class="text-emerald-400 font-bold">✓ Webhook Berhasil Diproses!</span><br>
      Status: ${result.status} | Respon n8n: ${result.message}<br>
      <span class="text-slate-400 text-[10px]">Payload tercatat pada execution log.</span>
    `;
  } catch (err) {
    // Client-side simulation fallback if backend isn't active
    simLogBox.innerHTML = `
      <span class="text-emerald-400 font-bold">✓ Simulasi Payload Siap Dikirim!</span><br>
      Payload: ${JSON.stringify(payload, null, 2)}<br>
      <span class="text-amber-300 text-[10px]">Catatan: Hubungkan n8n Webhook URL pada server.js untuk integrasi live real-time.</span>
    `;
  }
});

// Sync Webhook Button
btnSyncWebhook.addEventListener('click', () => {
  formSimulateLead.scrollIntoView({ behavior: 'smooth' });
  simLogBox.classList.remove('hidden');
  simLogBox.innerHTML = `
    <span class="text-indigo-300 font-semibold">ℹ️ Siap Menjalankan Trigger:</span><br>
    Webhook siap mengirim event pembaruan berkala data funnel ke n8n sesuai alur di modul TUTOR D-1-1 & D-1-3.
  `;
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFunnelData('edufunnel');
});

