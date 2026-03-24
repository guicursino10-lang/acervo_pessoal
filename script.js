// Configurações Iniciais
const GITHUB_REPO = 'guicursino10-lang/acervo_pessoal';
const GITHUB_BRANCH = 'main';
const GITHUB_TOKEN = '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';
const STORIES_FILE = 'historias.json';
const PDF_FOLDER = 'pdfs/';
let stories = [];
let themes = ['Ficção', 'Fantasia', 'Romance', 'Suspense', 'Histórico'];
let currentSHA = null;
let currentFilterTheme = null;
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function loadData() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_FILE}?ref=${GITHUB_BRANCH}`);
        if (response.ok) {
            const data = await response.json();
            stories = JSON.parse(atob(data.content));
            currentSHA = data.sha;
        } else {
            stories = [];
            currentSHA = null;
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        stories = [];
    }
    updateThemeFilters();
    renderCards();
}

async function saveData() {
    const content = btoa(JSON.stringify(stories, null, 2));
    const body = {
        message: 'Atualizar histórias',
        content: content,
        branch: GITHUB_BRANCH,
        sha: currentSHA
    };
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_FILE}`, {
            method: 'PUT',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            const data = await response.json();
            currentSHA = data.content.sha;
            showSaveIndicator();
        } else {
            alert('Erro ao salvar no GitHub');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
}

async function uploadPDF(file, filename) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            const content = reader.result.split(',')[1];
            const path = PDF_FOLDER + filename;
            const body = {
                message: 'Adicionar PDF',
                content: content,
                branch: GITHUB_BRANCH
            };
            try {
                const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                if (response.ok) {
                    resolve(path);
                } else {
                    reject('Erro ao upload PDF');
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsDataURL(file);
    });
}

function saveThemes() {
    // Themes are local only
    updateThemeFilters();
    showSaveIndicator();
}

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    indicator.style.display = 'block';
    indicator.style.animation = 'slideIn 0.3s ease';
    setTimeout(() => {
        indicator.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 300);
    }, 2000);
}

function exportData() {
    const backup = {
        stories: stories,
        themes: themes,
        exportDate: new Date().toLocaleString('pt-BR')
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `acervo-backup-${new Date().getTime()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    alert('✅ Backup exportado com sucesso!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if(!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const backup = JSON.parse(event.target.result);
                
                if(!backup.stories || !Array.isArray(backup.stories)) {
                    return alert('❌ Arquivo de backup inválido!');
                }
                
                if(confirm('⚠️ Isso vai sobrescrever todos os dados atuais. Continuar?')) {
                    stories = backup.stories;
                    themes = backup.themes || ['Ficção', 'Fantasia', 'Romance', 'Suspense', 'Histórico'];
                    
                    saveData();
                    
                    alert('✅ Dados restaurados com sucesso!');
                    location.reload();
                }
            } catch(error) {
                alert('❌ Erro ao ler arquivo: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function addTheme() {
    const input = document.getElementById('newThemeInput');
    const theme = input.value.trim();
    if(!theme) return alert("Digite um nome para o tema!");
    if(themes.includes(theme)) return alert("Esse tema já existe!");
    
    themes.push(theme);
    saveThemes();
    input.value = '';
    renderThemeSelector('addModal');
}

function addThemePDF() {
    const input = document.getElementById('newThemeInputPDF');
    const theme = input.value.trim();
    if(!theme) return alert("Digite um nome para o tema!");
    if(themes.includes(theme)) return alert("Esse tema já existe!");
    
    themes.push(theme);
    saveThemes();
    input.value = '';
    renderThemeSelector('pdfModal');
}

function autoFillPDFName() {
    const file = document.getElementById('pdfInput').files[0];
    if(file) {
        const nameWithoutExtension = file.name.replace(/\.pdf$/i, '');
        document.getElementById('pdfName').value = nameWithoutExtension;
    }
}

function selectTheme(theme, modal = 'addModal') {
    const hidden = modal === 'pdfModal' ? 
        document.getElementById('selectedThemePDF') : 
        document.getElementById('selectedTheme');
    hidden.value = theme;
    
    const selector = modal === 'pdfModal' ? 
        document.getElementById('themeSelectorPDF') : 
        document.getElementById('themeSelector');
    
    selector.querySelectorAll('.theme-badge').forEach(badge => {
        badge.classList.remove('active');
    });
    
    Array.from(selector.children).find(child => child.textContent.trim() === theme)?.classList.add('active');
}

function renderThemeSelector(modal) {
    const selector = modal === 'pdfModal' ? 
        document.getElementById('themeSelectorPDF') : 
        document.getElementById('themeSelector');
    
    selector.innerHTML = '';
    themes.forEach(theme => {
        const badge = document.createElement('div');
        badge.className = 'theme-badge';
        badge.textContent = theme;
        badge.onclick = () => selectTheme(theme, modal);
        selector.appendChild(badge);
    });
}

function updateThemeFilters() {
    const container = document.getElementById('themesFilter');
    container.innerHTML = '<div class="theme-badge active" onclick="filterByTheme(null); this.classList.add(\'active\')">Todos os Temas</div>';
    
    themes.forEach(theme => {
        const badge = document.createElement('div');
        badge.className = 'theme-badge';
        badge.textContent = theme;
        badge.onclick = function() {
            document.querySelectorAll('#themesFilter .theme-badge').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterByTheme(theme);
        };
        container.appendChild(badge);
    });
}

function filterByTheme(theme) {
    currentFilterTheme = theme;
    renderCards();
}

function openModal(id) { 
    document.getElementById(id).classList.add('open');
    if(id === 'addModal' || id === 'pdfModal') {
        renderThemeSelector(id);
    }
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('open'); 
    document.getElementById('pdf-viewer-container').innerHTML = '';
}

function saveText() {
    const title = document.getElementById('fTitle').value;
    const body = document.getElementById('fBody').value;
    const theme = document.getElementById('selectedTheme').value;
    
    if(!title || !body) return alert("Campos obrigatórios!");
    if(!theme) return alert("Selecione um tema!");
    
    stories.push({
        titulo: title, body, data: new Date().toISOString().split('T')[0], categoria: theme, type: 'text'
    });
    saveData();
    
    document.getElementById('fTitle').value = '';
    document.getElementById('fBody').value = '';
    document.getElementById('selectedTheme').value = '';
    closeModal('addModal');
    renderCards();
}

async function savePDF() {
    const file = document.getElementById('pdfInput').files[0];
    const theme = document.getElementById('selectedThemePDF').value;
    const customName = document.getElementById('pdfName').value.trim();
    
    if(!file) return alert("Selecione um arquivo!");
    if(!theme) return alert("Selecione um tema!");
    if(!customName) return alert("Digite um nome para o PDF!");

    try {
        const filename = customName + '.pdf';
        const path = await uploadPDF(file, filename);
        stories.push({
            titulo: customName, caminho_pdf: path, data: new Date().toISOString().split('T')[0], categoria: theme, type: 'pdf'
        });
        await saveData();
        
        document.getElementById('pdfInput').value = '';
        document.getElementById('pdfName').value = '';
        document.getElementById('selectedThemePDF').value = '';
        closeModal('pdfModal');
        renderCards();
    } catch (error) {
        alert('Erro ao salvar PDF: ' + error);
    }
}

async function viewStory(index) {
    const s = stories[index];
    document.getElementById('readTitle').innerText = s.titulo + ` [${s.categoria}]`;
    const content = document.getElementById('readContent');
    const pdfContainer = document.getElementById('pdf-viewer-container');

    if(s.type === 'pdf') {
        content.style.display = 'none';
        pdfContainer.style.display = 'flex';
        const pdfUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${s.caminho_pdf}`;
        renderPDF(pdfUrl);
    } else {
        content.style.display = 'block';
        content.innerText = s.body;
        pdfContainer.style.display = 'none';
    }
    openModal('readModal');
}

async function renderPDF(url) {
    const container = document.getElementById('pdf-viewer-container');
    container.innerHTML = '<p style="padding: 20px;">Carregando visualizador...</p>';
    
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    container.innerHTML = '';

    for(let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        container.appendChild(canvas);
    }
}

function deleteStory(index) {
    if(confirm("Remover do acervo?")) {
        stories.splice(index, 1);
        saveData();
        renderCards();
    }
}

function renderCards() {
    const grid = document.getElementById('grid');
    const search = document.getElementById('searchInput').value.toLowerCase();
    grid.innerHTML = '';

    const filtered = stories.filter(s => {
        const matchesSearch = s.titulo.toLowerCase().includes(search);
        const matchesTheme = currentFilterTheme === null || s.categoria === currentFilterTheme;
        return matchesSearch && matchesTheme;
    });

    if(filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #b0b0b0; padding: 40px;">Nenhuma história encontrada</div>';
        return;
    }

    filtered.forEach((s, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <span class="card-tag">${s.type === 'pdf' ? '📄 Documento PDF' : '📝 Texto'}</span>
            <div class="card-title">${s.titulo}</div>
            <div class="card-theme">🏷️ ${s.categoria}</div>
            <div style="color: #b0b0b0; font-size: 0.85rem; margin-top: 8px;">Adicionado em ${s.data}</div>
            <div class="card-actions">
                <button class="action-btn" onclick="viewStory(${index})">👁️ Abrir</button>
                <button class="action-btn btn-del" onclick="deleteStory(${index})">🗑️ Deletar</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('light');
    themeToggle.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
});

// Inicialização
loadData();
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Button interactions
    const allButtons = document.querySelectorAll('.btn-new, .btn-view, .btn-details, .btn-download, .btn-preview');
    
    allButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Add ripple effect
            addRipple(this, e);

            // Action based on button type
            if (this.textContent.includes('Novo') || this.textContent.includes('Adicionar')) {
                showNotification('Funcionalidade em desenvolvimento', 'info');
            } else if (this.textContent.includes('Detalhes')) {
                showNotification('Abrindo detalhes completos...', 'info');
            } else if (this.textContent.includes('Baixar')) {
                showNotification('Download iniciado', 'success');
            } else if (this.textContent.includes('Visualizar')) {
                showNotification('Abrindo visualização...', 'info');
            }
        });
    });

    // Search functionality
    const searchBox = document.querySelector('.search-box input');
    if (searchBox) {
        searchBox.addEventListener('focus', function() {
            this.parentElement.style.borderColor = 'var(--primary-color)';
            this.parentElement.style.boxShadow = '0 0 0 3px rgba(0, 61, 130, 0.1)';
        });

        searchBox.addEventListener('blur', function() {
            this.parentElement.style.borderColor = 'var(--border-color)';
            this.parentElement.style.boxShadow = 'none';
        });

        searchBox.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                performSearch(query);
            }
        });
    }

    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            showNotification('Você tem 3 notificações pendentes', 'info');
        });
    }

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Deseja realmente fazer logout do sistema?')) {
                showNotification('Fazendo logout...', 'info');
                setTimeout(() => {
                    // In a real app, this would redirect to login
                }, 1500);
            }
        });
    }

    // Activity items click
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        item.addEventListener('click', function() {
            this.style.background = 'var(--bg-primary)';
            this.style.cursor = 'pointer';
        });
    });

    // Responsive adjustments
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });

    // Real-time status update simulation
    updateStatusIndicators();
    setInterval(updateStatusIndicators, 30000); // Update every 30 seconds

    // Animate stats on page load
    animateStats();

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark');
            themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
        });
    }
});

// Add ripple effect to buttons
function addRipple(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

// Show notification messages
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styling for notification
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        zIndex: '2000',
        fontSize: '14px',
        fontWeight: '500',
        animation: 'slideIn 0.3s ease',
        maxWidth: '400px'
    });

    if (type === 'success') {
        notification.style.background = '#27ae60';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.background = '#e74c3c';
        notification.style.color = 'white';
    } else {
        notification.style.background = '#003d82';
        notification.style.color = 'white';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Perform search
function performSearch(query) {
    const results = [];
    
    // Search in cases
    const casesTable = document.querySelector('.data-table tbody');
    if (casesTable) {
        const rows = casesTable.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(query)) {
                row.style.highlight = 'true';
            }
        });
    }

    console.log('Searching for:', query);
}

// Update status indicators (simulated real-time updates)
function updateStatusIndicators() {
    const onlineUsers = document.querySelectorAll('.team-status');
    const statuses = ['🟢 Online', '🟡 Ocupado', '🔴 Ausente'];
    
    // In a real app, this would fetch from server
    // For now, it's just visual simulation
}

// Animate stat cards on load
function animateStats() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: rippleAnimation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes rippleAnimation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .notification {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Transitions */
    * {
        transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }

    button {
        transition: all 0.2s ease !important;
    }

    button:active {
        transform: scale(0.98);
    }
`;
document.head.appendChild(style);

// Advanced interactions for data cards
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to alvos cells
    const alvoCells = document.querySelectorAll('.alvo-card');
    alvoCells.forEach(cell => {
        cell.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        cell.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add focus management
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const modal = document.querySelector('.sidebar');
    const firstElement = modal?.querySelector(focusableElements);
    const lastElement = modal?.querySelectorAll(focusableElements);
    const lastFocusableElement = lastElement?.[lastElement.length - 1];

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const sidebar = document.querySelector('.sidebar');
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        }

        // Quick navigation with Alt + number keys
        if (e.altKey) {
            const navMap = {
                '1': 'dashboard',
                '2': 'casos',
                '3': 'alvos',
                '4': 'relatorios',
                '5': 'inteligencia',
                '6': 'pessoal'
            };

            if (navMap[e.key]) {
                const navItem = document.querySelector(`[data-section="${navMap[e.key]}"]`);
                if (navItem) navItem.click();
            }
        }
    });
});

// Performance monitoring
function logPerformance() {
    if (window.performance && window.performance.timing) {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log('Page load time: ' + pageLoadTime + ' ms');
    }
}