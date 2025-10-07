// Proteções iniciais
if (typeof window === 'undefined') {
    throw new Error('Este script deve ser executado em um navegador');
}

// Evitar múltiplas execuções
if (window.monitorInicializado) {
    throw new Error('O monitor já foi inicializado');
}
window.monitorInicializado = true;

// Elementos DOM
const grid = document.getElementById('grid');
const resetBtn = document.getElementById('resetBtn');
const columnIndicator = document.getElementById('columnIndicator');
const toast = document.getElementById('toast');
const statusInfo = document.getElementById('statusInfo');

// Validação de elementos necessários
if (!grid || !resetBtn || !columnIndicator || !toast || !statusInfo) {
    throw new Error('Elementos DOM necessários não encontrados');
}

// Configurações
const MAX = 20;
let currentColumns = 5;
let maximizedScreen = null;
let scrollTimeout;
let computers = [];
const computerMap = new Map();

// Funções de proteção
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function validateComputerData(computer) {
    if (!computer || typeof computer !== 'object') return false;
    
    const { nome, imagem } = computer;
    
    // Validar nome
    if (typeof nome !== 'string' || nome.trim().length === 0) return false;
    
    // Validar imagem (se presente)
    if (imagem && typeof imagem !== 'string') return false;
    
    return true;
}

function validateImageSrc(src) {
    if (!src || typeof src !== 'string') return false;
    
    // Permitir diversos formatos de imagem
    const allowedPatterns = [
        'data:image/',
        'https://',
        'http://',
        '/' 
    ];
    
    return allowedPatterns.some(pattern => src.startsWith(pattern));
}

// Funções principais
function initializeGrid() {
    updateGridColumns();
    updateStatusInfo();
}

function renderComputers() {
    if (!Array.isArray(computers)) {
        console.error('Computers não é um array válido');
        return;
    }

    const activeComputers = computers.filter(comp => validateComputerData(comp) && comp.nome && comp.imagem);

    // Atualiza ou cria elementos
    activeComputers.forEach((computer) => {
        let screenEl = computerMap.get(computer.nome);
        
        if (!screenEl) {
            screenEl = document.createElement('div');
            screenEl.className = 'screen';
            screenEl.setAttribute('data-computer-name', sanitizeHTML(computer.nome));
            
            const safeImageSrc = validateImageSrc(computer.imagem) ? 
                `data:image/jpeg;base64,${computer.imagem}` : '';
                
            screenEl.innerHTML = `
                <img src="${safeImageSrc}" alt="${sanitizeHTML(computer.nome)}" 
                     onerror="this.style.display='none'">
                <div class="label">${sanitizeHTML(computer.nome)}</div>
            `;
            
            screenEl.addEventListener('click', () => toggleMaximize(screenEl));
            computerMap.set(computer.nome, screenEl);
            grid.appendChild(screenEl);
        } else {
            // Atualiza apenas a imagem se necessário
            const img = screenEl.querySelector('img');
            const safeImageSrc = validateImageSrc(computer.imagem) ? 
                `data:image/jpeg;base64,${computer.imagem}` : '';
                
            if (img.src !== safeImageSrc) {
                img.src = safeImageSrc;
                img.style.display = safeImageSrc ? 'block' : 'none';
            }
        }
    });

    // Remove computadores que não estão mais ativos
    for (const [name, el] of computerMap.entries()) {
        if (!activeComputers.some(comp => comp.nome === name)) {
            el.remove();
            computerMap.delete(name);
        }
    }

    updateStatusInfo();
}

function toggleMaximize(screen) {
    if (!screen || !(screen instanceof Element)) return;
    
    if (screen === maximizedScreen) {
        screen.classList.remove('maximized');
        maximizedScreen = null;
    } else {
        if (maximizedScreen) {
            maximizedScreen.classList.remove('maximized');
        }
        screen.classList.add('maximized');
        maximizedScreen = screen;
    }
}

function updateGridColumns() {
    if (typeof currentColumns !== 'number' || currentColumns < 1 || currentColumns > 10) {
        currentColumns = 5; // Valor padrão seguro
    }
    
    document.documentElement.style.setProperty('--columns', currentColumns);
    columnIndicator.textContent = `Colunas: ${currentColumns}`;
}

function updateStatusInfo() {
    const activeCount = Array.isArray(computers) ? 
        computers.filter(comp => validateComputerData(comp) && comp.nome && comp.imagem).length : 0;
        
    statusInfo.textContent = `Mostrando ${activeCount} computador(es) ativo(s)`;
}

function showToast(message) {
    if (typeof message !== 'string') return;
    
    toast.textContent = sanitizeHTML(message);
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Event Listeners com proteção
function setupEventListeners() {
    // Wheel event para mudar colunas
    grid.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        clearTimeout(scrollTimeout);
        
        if (e.deltaY < 0 && currentColumns < 10) {
            currentColumns++;
        } else if (e.deltaY > 0 && currentColumns > 1) {
            currentColumns--;
        } else {
            return;
        }
        
        updateGridColumns();
        showToast(`Colunas: ${currentColumns}`);
        
        scrollTimeout = setTimeout(() => {}, 100);
    });

    // Botão de reset
    resetBtn.addEventListener('click', function() {
        computerMap.forEach(el => {
            if (el.classList.contains('maximized')) {
                el.classList.remove('maximized');
            }
        });
        maximizedScreen = null;
        showToast('Todos os computadores restaurados');
    });

    // Prevenir ações de contexto (botão direito) em imagens maximizadas
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.screen.maximized')) {
            e.preventDefault();
        }
    });
}

// Inicialização
function init() {
    try {
        initializeGrid();
        setupEventListeners();
        
        // Simular dados iniciais (remover em produção)
        setTimeout(() => {
            computers = [
                { nome: "PC-ALPHA", imagem: "" },
                { nome: "PC-BETA", imagem: "" },
                { nome: "PC-GAMMA", imagem: "" },
                { nome: "PC-DELTA", imagem: "" }
            ];
            renderComputers();
        }, 100);

        // Conexão SSE real com tratamento de erro
        if (typeof EventSource !== 'undefined') {
            const eventSource = new EventSource('/stream');
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (!Array.isArray(data)) {
                        throw new Error('Dados recebidos não são um array');
                    }
                    
                    computers = [];
                    for (let i = 0; i < MAX; i++) {
                        if (data[i] && validateComputerData(data[i])) {
                            computers.push(data[i]);
                        }
                    }
                    
                    renderComputers();
                } catch (error) {
                    console.error('Erro ao processar dados SSE:', error);
                    showToast('Erro ao receber dados dos computadores');
                }
            };

            eventSource.onerror = function() {
                console.error("Erro na conexão SSE");
                showToast('Erro de conexão com o servidor');
                
                // Tentar reconectar após 5 segundos
                setTimeout(() => {
                    if (eventSource.readyState === EventSource.CLOSED) {
                        window.location.reload();
                    }
                }, 5000);
            };
            
            // Fechar conexão quando a página for fechada
            window.addEventListener('beforeunload', function() {
                eventSource.close();
            });
        } else {
            console.warn('Seu navegador não suporta EventSource');
            showToast('Seu navegador não suporta atualizações em tempo real');
        }
    } catch (error) {
        console.error('Erro na inicialização do monitor:', error);
        showToast('Erro ao inicializar o monitor');
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}