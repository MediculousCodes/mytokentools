// Enhanced upload UX: multi-file queue, drag/drop, progress, per-file stats, chart rendering

const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const dropzone = document.getElementById('dropzone');
const fileNameEl = document.getElementById('fileName');
const fileHint = document.getElementById('fileHint');
const calculateBtn = document.getElementById('calculateBtn');
const resultEl = document.getElementById('result');
const processingEl = document.getElementById('processing');
const errorEl = document.getElementById('error');
const tokenCountEl = document.getElementById('tokenCount');
const estimateEl = document.getElementById('estimate');
const tokenChartEl = document.getElementById('tokenChart');
const uploadProgress = document.getElementById('uploadProgress');
const uploadBar = document.getElementById('uploadBar');
const uploadStatus = document.getElementById('uploadStatus');
const queueInfo = document.getElementById('queueInfo');
const clearAllBtn = document.getElementById('clearAllBtn');
const copyBtn = document.getElementById('copyBtn');
const themeToggle = document.getElementById('themeToggle');

let queue = []; // array of File
let chart = null;

const TXT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}

function updateQueueUI() {
  if (!queue.length) {
    queueInfo.textContent = 'No files queued';
    clearAllBtn.classList.add('hidden');
    calculateBtn.disabled = true;
    return;
  }

  const totalBytes = queue.reduce((s,f)=>s+f.size,0);
  queueInfo.textContent = `${queue.length} file(s) — total ${formatBytes(totalBytes)}`;
  clearAllBtn.classList.remove('hidden');
  calculateBtn.disabled = false;
}

function resetUploadUI() {
  uploadBar.style.width = '0%';
  uploadProgress.classList.add('hidden');
  uploadStatus.textContent = 'Waiting…';
}

browseBtn.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files || []);
  handleIncomingFiles(files);
});

['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('border-indigo-400','bg-indigo-50'); }));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('border-indigo-400','bg-indigo-50'); }));

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  if (!dt || !dt.files || !dt.files.length) return;
  const files = Array.from(dt.files);
  handleIncomingFiles(files);
});

function handleIncomingFiles(files) {
  errorEl.classList.add('hidden');
  for (const f of files) {
    const name = f.name.toLowerCase();
    const isZip = name.endsWith('.zip');
    const isTxt = name.endsWith('.txt') || name.endsWith('.md');
    if (!isZip && !isTxt) {
      errorEl.textContent = 'Unsupported file type: ' + f.name;
      errorEl.classList.remove('hidden');
      continue;
    }
    if (isTxt && f.size > TXT_MAX_BYTES) {
      errorEl.textContent = `File too large: ${f.name} (max ${TXT_MAX_BYTES/(1024*1024)} MB for .txt/.md)`;
      errorEl.classList.remove('hidden');
      continue;
    }
    queue.push(f);
  }
  updateQueueUI();
}

clearAllBtn.addEventListener('click', () => { queue = []; updateQueueUI(); });

calculateBtn.addEventListener('click', () => {
  if (!queue.length) return;
  uploadProgress.classList.remove('hidden');
  uploadBar.style.width = '0%';
  uploadStatus.textContent = 'Uploading…';
  calculateBtn.disabled = true;
  processingEl.classList.remove('hidden');
  processingEl.setAttribute('aria-busy','true');
  processingEl.setAttribute('aria-hidden','false');
  resultEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  const form = new FormData();
  // support multiple files and notify server which are zip
  queue.forEach((f,i)=>{
    form.append('file'+i, f, f.name);
  });
  form.append('file_count', String(queue.length));

  const xhr = new XMLHttpRequest();
  xhr.open('POST','/api/count-tokens',true);

  xhr.upload.addEventListener('progress',(evt)=>{
    if (evt.lengthComputable) {
      const pct = Math.round((evt.loaded/evt.total)*100);
      uploadBar.style.width = pct + '%';
      uploadStatus.textContent = `Uploading — ${pct}%`;
    }
  });

  xhr.onreadystatechange = ()=>{
    if (xhr.readyState !== 4) return;
    uploadStatus.textContent = 'Processing…';
    calculateBtn.disabled = false;
    processingEl.classList.add('hidden');
    processingEl.removeAttribute('aria-busy');
    processingEl.setAttribute('aria-hidden','true');
    if (xhr.status >=200 && xhr.status < 300) {
      try {
        const data = JSON.parse(xhr.responseText);
        // data expected: { files: [{name, token_count, words, chars}], total_tokens }
        const files = data.files || [];
        const total = data.total_tokens || files.reduce((s,f)=>s+(f.token_count||0),0);

        tokenCountEl.textContent = total;
        estimateEl.textContent = '$' + (total * 0.000002).toFixed(4);

        // show per-file list in a simple chart / table
        const labels = files.map(f=>f.name);
        const values = files.map(f=>f.token_count||0);

        if (chart) chart.destroy();
        chart = new Chart(tokenChartEl.getContext('2d'),{
          type: 'bar', data: { labels, datasets:[{ label:'Tokens', data: values, backgroundColor:'#6366F1' }]}, options:{responsive:true,maintainAspectRatio:false}
        });

        // show detailed results below chart
        const details = files.map(f=>`${f.name}: ${f.token_count} tokens, ${f.words} words, ${f.chars} chars`).join('\n');
        resultEl.querySelector('#tokenCount').textContent = total;
        resultEl.querySelector('#estimate').textContent = '$' + (total * 0.000002).toFixed(4);
        resultEl.dataset.summary = `Total: ${total} tokens\n` + details;

        resultEl.classList.remove('hidden');
        uploadStatus.textContent = 'Complete';
        // clear queue after successful upload
        queue = [];
        updateQueueUI();
      } catch (err) {
        errorEl.textContent = 'Invalid server response';
        errorEl.classList.remove('hidden');
        resetUploadUI();
      }
    } else {
      const msg = xhr.responseText || `Upload failed (${xhr.status})`;
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      resetUploadUI();
    }
  };

  xhr.onerror = ()=>{
    errorEl.textContent = 'Network error during upload';
    errorEl.classList.remove('hidden');
    resetUploadUI();
    processingEl.classList.add('hidden');
    processingEl.removeAttribute('aria-busy');
    processingEl.setAttribute('aria-hidden','true');
  };

  xhr.send(form);
});

copyBtn?.addEventListener('click', ()=>{
  const txt = resultEl.dataset.summary || `Total: ${tokenCountEl.textContent} tokens`;
  navigator.clipboard.writeText(txt).then(()=>{
    copyBtn.textContent = 'Copied!';
    setTimeout(()=> copyBtn.textContent = 'Copy Summary',1500);
  });
});

// dark mode toggle
function setTheme(dark){
  if(dark){ document.documentElement.classList.add('dark'); themeToggle.setAttribute('aria-pressed','true'); themeToggle.textContent='Light'; localStorage.setItem('theme','dark'); }
  else { document.documentElement.classList.remove('dark'); themeToggle.setAttribute('aria-pressed','false'); themeToggle.textContent='Dark'; localStorage.setItem('theme','light'); }
}
themeToggle?.addEventListener('click', ()=> setTheme(localStorage.getItem('theme')!=='dark'));
// init theme
setTheme(localStorage.getItem('theme')==='dark');

// initialize
resetUploadUI();
