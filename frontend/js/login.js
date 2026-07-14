// ── Injeta CSS de extras automaticamente ────
(function injectCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../css/form-extras.css';
  document.head.appendChild(link);
})();
 
// ── Botão "Voltar ao Início" ────────────────
(function injectBackButton() {
  const leftPanel = document.querySelector('.left-panel');
  if (!leftPanel) return;
  const btn = document.createElement('a');
  btn.href = '../html/inicio.html';
  btn.className = 'btn-voltar';
  leftPanel.insertBefore(btn, leftPanel.firstChild);
})();
 
// ── Utilitários de validação ────────────────
function mostrarErro(inputId, msg) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('input-erro');
  let span = input.parentElement.querySelector('.msg-erro');
  if (!span) {
    span = document.createElement('span');
    span.className = 'msg-erro';
    input.parentElement.appendChild(span);
  }
  span.textContent = msg;
}
 
function limparErro(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.remove('input-erro');
  const span = input.parentElement.querySelector('.msg-erro');
  if (span) span.textContent = '';
}
 
// ── Validar campos do login ─────────────────
function validarFormulario() {
  limparErro('email');
  limparErro('senha');
  let valido = true;
 
  const email = document.getElementById('email').value.trim();
  if (!email) {
    mostrarErro('email', 'E-mail obrigatório.');
    valido = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarErro('email', 'E-mail inválido.');
    valido = false;
  }
 
  const senha = document.getElementById('senha').value;
  if (!senha) {
    mostrarErro('senha', 'Senha obrigatória.');
    valido = false;
  } else if (senha.length < 6) {
    mostrarErro('senha', 'Senha deve ter pelo menos 6 caracteres.');
    valido = false;
  }
 
  return valido;
}
 
// ── Envio do login ao backend ───────────────
const API_BASE = 'https://pericia-backend.up.railway.app/api';

async function enviarLogin() {
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;

  const payload = { email, senha };

  try {
    const resposta = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resultado = await resposta.json();

    if (resposta.ok && resultado.token) {
      localStorage.setItem('token', resultado.token);
      localStorage.setItem('usuarioLogado', JSON.stringify(resultado.usuario));
      alert('Login realizado com sucesso! Redirecionando...');
      window.location.href = '../html/inicio.html';
    } else {
      alert(resultado.mensagem || 'E-mail ou senha incorretos.');
    }
  } catch (erro) {
    console.error('Erro na comunicação com a API de login:', erro);
    alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
  }
}

// ── Evento do botão LOGIN ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.querySelector('.btn-login');
  if (!btnLogin) return;
 
  btnLogin.addEventListener('click', () => {
    if (validarFormulario()) {
      enviarLogin();
    }
  });
 
  // Limpa erro ao digitar
  ['email', 'senha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => limparErro(id));
  });
});
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
        document.documentElement.classList.remove('escuro');
    }

    function alternarTema() {
        const body  = document.body;
        const html  = document.documentElement;
        const ativandoClaro = !body.classList.contains('claro');

        /* Algumas páginas (login/cadastro) usam body.claro E body.escuro
           como pares opostos — é preciso alternar as duas classes juntas,
           senão .escuro (declarada depois no CSS) sobrescreve .claro. */
        body.classList.toggle('claro',  ativandoClaro);
        body.classList.toggle('escuro', !ativandoClaro);
        html.classList.toggle('claro',  ativandoClaro);
        html.classList.toggle('escuro', !ativandoClaro);

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
            document.body.classList.remove('escuro');
            document.documentElement.classList.add('claro');
            document.documentElement.classList.remove('escuro');
        } else {
            document.body.classList.remove('claro');
            document.body.classList.add('escuro');
            document.documentElement.classList.remove('claro');
            document.documentElement.classList.add('escuro');
        }

        document.querySelectorAll('[data-tema-toggle]').forEach(function (btn) {
            btn.addEventListener('click', alternarTema);
        });

        _atualizarBotoes();
    });

    window.alternarTema = alternarTema;
    window.alterar_tema = alternarTema; /* alias legado */
})();