// ===== NAVEGAÇÃO ATIVA =====
window.addEventListener('scroll', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});

// ===== DEPOIMENTOS CARROSSEL =====
document.addEventListener('DOMContentLoaded', function() {
    const depoimentosTrack = document.querySelector('.depoimentos-track');
    const depoimentoCards = document.querySelectorAll('.depoimento-card');
    const prevBtn = document.querySelector('.dep-btn.prev');
    const nextBtn = document.querySelector('.dep-btn.next');
    const depoimentosDots = document.querySelector('.depoimentos-dots');

    if (!depoimentosTrack || depoimentoCards.length === 0) return;

    let currentIndex = 0;
    const cardWidth = depoimentoCards[0].offsetWidth;
    const gap = 20;

    // Criar dots
    depoimentoCards.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = `dot-item ${index === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Ir para depoimento ${index + 1}`);
        dot.addEventListener('click', () => goToSlide(index));
        depoimentosDots.appendChild(dot);
    });

    function updateCarousel() {
        const offset = -(currentIndex * (cardWidth + gap));
        depoimentosTrack.style.transform = `translateX(${offset}px)`;

        // Atualizar dots
        document.querySelectorAll('.dot-item').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    function goToSlide(index) {
        currentIndex = index;
        updateCarousel();
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % depoimentoCards.length;
        updateCarousel();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + depoimentoCards.length) % depoimentoCards.length;
        updateCarousel();
    }

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Auto-scroll a cada 8 segundos
    setInterval(nextSlide, 8000);
});

// ===== SCROLL SUAVE PARA LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ===== ANIMAÇÕES AO SCROLL =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-up').forEach(el => {
    observer.observe(el);
});

// ===== BOTÕES DE AÇÃO =====
document.querySelectorAll('.btn-entendo').forEach(btn => {
    btn.addEventListener('click', function() {
        alert('Clique em "Contato" para mais informações sobre este serviço!');
    });
});

// ===== RESPONSIVO - MENU MOBILE =====
function setupMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const navBrand = document.querySelector('.nav-brand');
    if (!navLinks || !navBrand) return;

    // Criar botão de menu se não existir
    if (!document.querySelector('.menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.setAttribute('aria-label', 'Menu');

        // Inserir após nav-brand
        navBrand.parentNode.insertBefore(menuToggle, navBrand.nextSibling);

        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }

    // Fechar menu ao clicar em um link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
        });
    });
}

// Chamar setup mobile ao carregar
window.addEventListener('load', setupMobileMenu);

// ===== CONSOLE LOG DE INICIALIZAÇÃO =====
console.log('✓ Perícia Fiducia - Website carregado com sucesso!');
console.log('✓ Tema: ' + (localStorage.getItem('tema') || 'escuro'));
console.log('✓ Versão: 1.0.0');

// ===== ÁREA DO USUÁRIO (login/logout) =====
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (token) {
        carregarDadosUsuario(token);
    } else {
        configurarModoVisitante();
    }
});

// GET /api/auth/usuario/perfil -> dados do usuário logado (agora existe no
// backend). Corrigido: faltava o prefixo /auth (o router de usuários está
// montado em app.use('/api/auth', ...) no app.js).
const API_BASE = 'https://pericia-backend.up.railway.app/api';

// Mapeia cada role para a página e o rótulo exibidos no menu do usuário
const PAGINAS_POR_ROLE = {
    cliente:   { href: 'usuario.html',  label: 'Meus Serviços' },
    perito:    { href: 'peritos.html',  label: 'Área do Perito' },
    logistica: { href: 'entregas.html', label: 'Entregas' },
    admin:     { href: 'admin.html',    label: 'Painel Admin' }
};

const ROTULO_ROLE = {
    cliente: 'Cliente',
    perito: 'Perito',
    logistica: 'Logística',
    admin: 'Administrador'
};

function obterIniciais(nome) {
    const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

async function carregarDadosUsuario(token) {
    try {
        const resposta = await fetch(`${API_BASE}/auth/usuario/perfil`, {
            method: 'GET',
            headers: {
                // BUG CORRIGIDO: estava com aspas simples ('...') em vez de
                // crase (`...`), então o token nunca era interpolado e o
                // backend recebia literalmente "Bearer ${token}".
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const dados = await resposta.json();

        if (resposta.ok) {
            const paginaRole = PAGINAS_POR_ROLE[dados.role];
            const itemPagina = paginaRole ? `
                <a href="${paginaRole.href}" class="user-dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    ${paginaRole.label}
                </a>
                <div class="user-dropdown-separator"></div>
            ` : '';

            document.getElementById('area-usuario').innerHTML = `
                <div class="user-avatar-wrapper" tabindex="0">
                    <div class="user-avatar">
                        <span class="user-avatar-iniciais">${obterIniciais(dados.nome)}</span>
                    </div>
                    <div class="user-dropdown">
                        <div class="user-dropdown-header">
                            <span class="user-dropdown-name">${dados.nome}</span>
                            <span class="user-dropdown-label">${ROTULO_ROLE[dados.role] || dados.role}</span>
                        </div>
                        ${itemPagina}
                        <button class="user-dropdown-item danger" onclick="deslogarUsuario()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sair
                        </button>
                    </div>
                </div>
            `;
            configurarAbasPorPermissao(dados.role);
        } else {
            console.warn("Token Inválido ou Expirado!");
            localStorage.removeItem('token');
            configurarModoVisitante();
        }
    } catch (error) {
        console.error("Erro ao buscar dados do perfil:", error);
        configurarModoVisitante();
    }
}

// Mostra apenas as abas do menu correspondentes ao nível (role) do usuário
// logado. As abas ficam ocultas por padrão (style="display:none" no HTML)
// e cada uma tem um atributo data-roles indicando a quem pertence.
function configurarAbasPorPermissao(role) {
    document.querySelectorAll('.nav-link-role').forEach(item => {
        const rolesPermitidos = (item.dataset.roles || '').split(',').map(r => r.trim());
        item.style.display = rolesPermitidos.includes(role) ? '' : 'none';
    });
}

function configurarModoVisitante() {
    document.getElementById('area-usuario').innerHTML = `
        <a href="login.html"><button class="btn-login">Login</button></a>
    `;
    // Garante que nenhuma aba restrita fique visível para visitantes
    document.querySelectorAll('.nav-link-role').forEach(item => {
        item.style.display = 'none';
    });
}

function deslogarUsuario() {
    localStorage.removeItem('token');
    window.location.reload();
}