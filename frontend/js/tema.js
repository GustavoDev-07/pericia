// ===== CONTROLE DE TEMA =====

// aplica tema salvo ao carregar
(function () {
    const temaSalvo = localStorage.getItem('tema') || 'escuro';
    document.body.classList.remove('claro', 'escuro');
    document.body.classList.add(temaSalvo);
})();

// alternar tema
function alternarTema() {
    const body = document.body;
    const ativandoClaro = !body.classList.contains('claro');

    body.classList.toggle('claro', ativandoClaro);
    body.classList.toggle('escuro', !ativandoClaro);

    localStorage.setItem('tema', ativandoClaro ? 'claro' : 'escuro');

    atualizarIcone();
}

// trocar ícone (opcional mas recomendado)
function atualizarIcone() {
    const icon = document.getElementById('tema-icon');
    if (!icon) return;

    const claro = document.body.classList.contains('claro');

    if (claro) {
        icon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3
            7 7 0 0 0 21 12.79z"></path>
        `; // lua
    } else {
        icon.innerHTML = `
            <circle cx="12" cy="12" r="5"></circle>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42
            M18.36 18.36l1.42 1.42M1 12h2M21 12h2
            M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        `; // sol
    }
}

// ativar botão
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tema-toggle]').forEach(btn => {
        btn.addEventListener('click', alternarTema);
    });

    atualizarIcone();
});