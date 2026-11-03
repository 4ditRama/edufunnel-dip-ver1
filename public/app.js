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
  // 1. Info Banner
  infoTargetAudience.textContent = `${data.system_title} — ${data.target_audience}`;
  infoPeriod.textContent = `Periode Evaluasi: ${data.period}`;

  // 2. Layer 1: KPI Cards
  kpiTotalProspects.textContent = data.summary.total_prospects.toLocaleString('id-ID');
  kpiTotalConverted.textContent = data.summary.total_converted.toLocaleString('id-ID');
  kpiConversionRate.textContent = data.summary.overall_conversion_rate;
  kpiBottleneck.textContent = data.summary.primary_bottleneck;
  badgeTopChannel.textContent = `Top: ${data.summary.top_channel}`;

  // 3. Layer 2: Render Funnel Stage Chart
  renderFunnelChart(data.funnel_stages);

  // Render Funnel Stage Pills
  funnelStagesList.innerHTML = data.funnel_stages.map((stage, idx) => `
    <div class="p-2.5 rounded-xl border border-stone-200/70 bg-[#faf9f6] hover:border-[#fbe0c1] transition">
      <div class="flex items-center justify-between text-xs">
        <span class="font-heading font-bold text-stone-800">${idx + 1}. ${stage.stage}</span>
        <span class="font-mono font-semibold text-[#ff6210]">${stage.count.toLocaleString('id-ID')} (${stage.percentage}%)</span>
      </div>
      <p class="text-[11px] text-stone-500 mt-1 line-clamp-1">${stage.description}</p>
    </div>
  `).join('');

  // 4. Render Channel Performance Chart & Table
  renderChannelChart(data.channel_performance);

  tableChannelBody.innerHTML = data.channel_performance.map(ch => `
    <tr class="hover:bg-[#fff2ea]/50 transition">
      <td class="py-2.5 font-medium text-stone-800">${ch.channel}</td>
      <td class="py-2.5 text-right font-mono text-stone-600">${ch.leads.toLocaleString('id-ID')}</td>
      <td class="py-2.5 text-right font-mono font-bold text-[#ff6210]">${ch.converted.toLocaleString('id-ID')}</td>
      <td class="py-2.5 text-right font-mono font-semibold text-emerald-600">${ch.cvr}</td>
    </tr>
  `).join('');

  // 5. Layer 3: Recommendations
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

// Chart.js: Funnel Stages with vibrant jasaanimasi palette
function renderFunnelChart(stages) {
  const ctx = document.getElementById('chartFunnelStages').getContext('2d');
  
  if (funnelChartInstance) {
    funnelChartInstance.destroy();
  }

  const labels = stages.map(s => s.stage);
  const counts = stages.map(s => s.count);
  const percentages = stages.map(s => s.percentage);

  // Gradient sunset orange to espresso
  const colors = [
    '#ff6210', // vibrant orange
    '#ff7934',
    '#ff9359',
    '#ffb288',
    '#221915'  // final stage accent
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
          backgroundColor: '#e7e5e4', // soft warm stone
          hoverBackgroundColor: '#d6d3d1',
          borderRadius: 6
        },
        {
          label: 'Berhasil Konversi',
          data: channels.map(c => c.converted),
          backgroundColor: '#ff6210', // jasaanimasi vibrant orange
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
  simLogBox.innerHTML = `Mengirimkan data ke backend & pipeline...<br><span class="text-stone-400 font-mono text-[10px]">${JSON.stringify(payload)}</span>`;

  try {
    const res = await fetch('/api/webhook/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    simLogBox.innerHTML = `
      <span class="text-emerald-400 font-bold">✓ Webhook Berhasil Dikirim!</span><br>
      Status: ${result.status} | Respon Pipeline: ${result.message}<br>
      <span class="text-stone-400 text-[10px]">Tercatat pada execution pipeline.</span>
    `;
  } catch (err) {
    simLogBox.innerHTML = `
      <span class="text-emerald-400 font-bold">✓ Simulasi Payload Siap!</span><br>
      Payload: ${JSON.stringify(payload, null, 2)}<br>
      <span class="text-[#ff8544] text-[10px]">Pipeline webhook siap diteruskan ke n8n.</span>
    `;
  }
});

// Trigger Webhook Button helper
btnSyncWebhook.addEventListener('click', () => {
  formSimulateLead.scrollIntoView({ behavior: 'smooth' });
  simLogBox.classList.remove('hidden');
  simLogBox.innerHTML = `
    <span class="text-[#ff8544] font-semibold">ℹ️ Status Integrasi n8n:</span><br>
    Pipeline webhook disiapkan untuk memproses update otomatis data funnel ke Telegram/Email.
  `;
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFunnelData('edufunnel');
});
