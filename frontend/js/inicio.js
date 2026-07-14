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

// GET /api/usuario/perfil -> dados do usuário logado (PRECISA CRIAR no
// backend). Antes era chamada sem o prefixo /api, direto na raiz do domínio.
const API_BASE = 'https://pericia-backend.up.railway.app/api';

async function carregarDadosUsuario(token) {
    try {
        const resposta = await fetch(`${API_BASE}/usuario/perfil`, {
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
            document.getElementById('area-usuario').innerHTML = `
                <span>Olá, ${dados.nome}!</span>
                <button onclick="deslogarUsuario()">Sair</button>
            `;
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

function configurarModoVisitante() {
    document.getElementById('area-usuario').innerHTML = `
        <a href="login.html"><button>Login</button></a>
    `;
}

function deslogarUsuario() {
    localStorage.removeItem('token');
    window.location.reload();
}