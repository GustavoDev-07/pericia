/* ============================================================
   tema.js – Perícia Fiducia
   Gerenciamento centralizado de tema claro/escuro.
   Inclua este arquivo em TODAS as páginas do sistema.
   ============================================================ */

(function () {
    'use strict';

    /* Aplica tema salvo imediatamente para evitar flash */
    const temaSalvo = localStorage.getItem('tema') || 'escuro';
    if (temaSalvo === 'claro') {
        document.documentElement.classList.add('claro');
    }

    function alternarTema() {
        const body  = document.body;
        const html  = document.documentElement;
        const ativandoClaro = !body.classList.contains('claro');

        body.classList.toggle('claro',  ativandoClaro);
        html.classList.toggle('claro',  ativandoClaro);
        localStorage.setItem('tema', ativandoClaro ? 'claro' : 'escuro');
        _atualizarBotoes();
    }

    function _atualizarBotoes() {
        const eClaro = document.body.classList.contains('claro');

        document.querySelectorAll('.tema-icon').forEach(function (icon) {
            if (eClaro) {
                icon.innerHTML =
                    '<circle cx="12" cy="12" r="5"></circle>' +
                    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
            } else {
                icon.innerHTML =
                    '<circle cx="12" cy="12" r="5"></circle>' +
                    '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>';
            }
        });

        /* Retrocompatibilidade com ID tema-icon (inicio.html) */
        const legado = document.getElementById('tema-icon');
        if (legado) {
            if (eClaro) {
                legado.innerHTML =
                    '<circle cx="12" cy="12" r="5"></circle>' +
                    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
            } else {
                legado.innerHTML =
                    '<circle cx="12" cy="12" r="5"></circle>' +
                    '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>';
            }
        }

        document.querySelectorAll('[data-tema-toggle]').forEach(function (btn) {
            btn.setAttribute('aria-label',
                eClaro ? 'Alternar para tema escuro' : 'Alternar para tema claro');
            btn.setAttribute('title',
                eClaro ? 'Tema escuro' : 'Tema claro');
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        const tema = localStorage.getItem('tema') || 'escuro';
        if (tema === 'claro') {
            document.body.classList.add('claro');
            document.documentElement.classList.add('claro');
        } else {
            document.body.classList.remove('claro');
            document.documentElement.classList.remove('claro');
        }

        document.querySelectorAll('[data-tema-toggle]').forEach(function (btn) {
            btn.addEventListener('click', alternarTema);
        });

        _atualizarBotoes();
    });

    window.alternarTema = alternarTema;
    window.alterar_tema = alternarTema; /* alias legado */
})();
