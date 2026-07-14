// usuario-ui.js
// Decorador do #area-usuario — NÃO altera nenhum JS existente.
// Observa quando inicio.js injeta o estado logado e reconstrói a UI
// com avatar estilo Google + dropdown flutuante.

(function () {

    function decorarAreaUsuario() {
        const area = document.getElementById('area-usuario');
        if (!area) return;

        const observer = new MutationObserver(function () {
            // inicio.js injeta <span>Olá, Nome!</span> + <button>Sair</button> quando logado
            const spanEl = area.querySelector('span');
            const btnSair = area.querySelector('button:not(.btn-login)');

            if (spanEl && btnSair && !area.querySelector('.user-avatar-wrapper')) {
                // Extrai o nome do span "Olá, Nome!"
                const textoSpan = spanEl.textContent || '';
                const nome = textoSpan.replace('Olá,', '').replace('!', '').trim();

                // Gera iniciais (até 2 letras)
                const iniciais = nome
                    ? nome.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
                    : '?';

                // Captura o onclick original do botão Sair
                const onclickSair = btnSair.getAttribute('onclick') || 'deslogarUsuario()';

                // Reconstrói a área com avatar + dropdown
                area.innerHTML = `
                    <div class="user-avatar-wrapper" tabindex="0" role="button" aria-haspopup="true" aria-label="Menu do usuário">
                        <div class="user-avatar">
                            <span class="user-avatar-iniciais">${iniciais}</span>
                        </div>
                        <div class="user-dropdown" role="menu">
                            <div class="user-dropdown-header">
                                <span class="user-dropdown-name">${nome}</span>
                                <span class="user-dropdown-label">Minha Conta</span>
                            </div>
                            <a href="meus-dispositivos.html" class="user-dropdown-item" role="menuitem">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2"></rect>
                                    <path d="M8 21h8M12 17v4"></path>
                                </svg>
                                Meus Dispositivos
                            </a>
                            <div class="user-dropdown-separator"></div>
                            <button class="user-dropdown-item danger" onclick="${onclickSair}" role="menuitem">
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

                // Fechar dropdown ao clicar fora
                document.addEventListener('click', function (e) {
                    const wrapper = area.querySelector('.user-avatar-wrapper');
                    if (wrapper && !area.contains(e.target)) {
                        wrapper.blur();
                    }
                });

                // Suporte a teclado: Enter/Space abre, Escape fecha
                const wrapper = area.querySelector('.user-avatar-wrapper');
                if (wrapper) {
                    wrapper.addEventListener('keydown', function (e) {
                        if (e.key === 'Escape') wrapper.blur();
                    });
                }
            }
        });

        observer.observe(area, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', decorarAreaUsuario);
    } else {
        decorarAreaUsuario();
    }

})();