// ===== TEMA CLARO/ESCURO =====
function alterar_tema() {
    const body = document.body;
    const temaIcon = document.getElementById('tema-icon');
    
    body.classList.toggle('claro');
    
    // Salvar preferência no localStorage
    const temaSalvo = body.classList.contains('claro') ? 'claro' : 'escuro';
    localStorage.setItem('tema', temaSalvo);
    
    // Atualizar ícone
    atualizarIconeTema();
}

function atualizarIconeTema() {
    const body = document.body;
    const temaIcon = document.getElementById('tema-icon');
    
    if (body.classList.contains('claro')) {
        // Ícone da lua (tema claro ativo)
        temaIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        // Ícone do sol (tema escuro ativo)
        temaIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>';
    }
}

// Carregar tema salvo ao iniciar
window.addEventListener('DOMContentLoaded', function() {
    const temaSalvo = localStorage.getItem('tema') || 'escuro';
    if (temaSalvo === 'claro') {
        document.body.classList.add('claro');
    }
    atualizarIconeTema();
});

// ===== NAVEGAÇÃO ATIVA =====
window.addEventListener('scroll', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
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
    
    if (!depoimentosTrack) return;
    
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
    
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    
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

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token')

    if(token){
        carregarDadosUsuario(token);
    }else {
        configurarModoVisitante();
    };
});

async function carregarDadosUsuario(token) {
    try {
        const resposta = await fetch('http://127.0.0.1:3000/usuario/perfil', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ${token}',
                'Content-Type': 'application/json'
            }
        })
        const dados = await resposta.json();

        if (resposta.ok) {
            document.getElementById('area-usuario').innerHTML = `
                <span>Olá, ${dados.nome}!</span>
                <button onclick="deslogarUsuario()">Sair</button>
            `;
        } else{
            console.warn("Token Inválido ou Expirado!");
            localStorage.removeItem('token');
            configurarModoVisitante();
        }
    }catch (error) {
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