// // ── Injeta CSS de extras automaticamente ────
(function injectCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // link.href = '../css/form-extras.css';
  document.head.appendChild(link);
})();

// // ── Botão "Voltar ao Início" ────────────────
(function injectBackButton() {
  const leftPanel = document.querySelector('.left-panel');
  if (!leftPanel) return;
  const btn = document.createElement('a');
  btn.href = '../html/inicio.html';
  btn.className = 'btn-voltar';
  leftPanel.insertBefore(btn, leftPanel.firstChild);
})();

// // ── Utilitários de validação ────────────────
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

function limparTodosErros() {
  ['nome', 'email', 'data', 'cpf', 'senha', 'confirmar'].forEach(limparErro);
}

// // ── Validação de CPF ────────────────────────
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

// // ── Validação de CNPJ ──────────────────────
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0, pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho++;
  numeros = cnpj.substring(0, tamanho);
  soma = 0; pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

// // ── Validar todos os campos ─────────────────
function validarFormulario() {
  limparTodosErros();
  let valido = true;

  const nome = document.getElementById('nome').value.trim();
  if (!nome) {
    mostrarErro('nome', 'Nome obrigatório.');
    valido = false;
  } else if (nome.split(' ').filter(p => p).length < 2) {
    mostrarErro('nome', 'Informe nome e sobrenome.');
    valido = false;
  }

  const email = document.getElementById('email').value.trim();
  if (!email) {
    mostrarErro('email', 'E-mail obrigatório.');
    valido = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mostrarErro('email', 'E-mail inválido.');
    valido = false;
  }

  const data = document.getElementById('data').value;
  if (!data) {
    mostrarErro('data', 'Data de nascimento obrigatória.');
    valido = false;
  } else {
    const nascimento = new Date(data);
    const hoje = new Date();
    const idade = hoje.getFullYear() - nascimento.getFullYear() -
      (hoje < new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate()) ? 1 : 0);
    if (idade < 18) {
      mostrarErro('data', 'Você deve ter pelo menos 18 anos.');
      valido = false;
    }
  }

  const cpf = document.getElementById('cpf').value.trim();
  const cpfNumeros = cpf.replace(/\D/g, '');
  if (!cpf) {
    mostrarErro('cpf', 'CPF/CNPJ obrigatório.');
    valido = false;
  } else if (cpfNumeros.length === 11 && !validarCPF(cpf)) {
    mostrarErro('cpf', 'CPF inválido.');
    valido = false;
  } else if (cpfNumeros.length === 14 && !validarCNPJ(cpf)) {
    mostrarErro('cpf', 'CNPJ inválido.');
    valido = false;
  } else if (cpfNumeros.length !== 11 && cpfNumeros.length !== 14) {
    mostrarErro('cpf', 'Digite um CPF (11 dígitos) ou CNPJ (14 dígitos).');
    valido = false;
  }

  const senha = document.getElementById('senha').value;
  if (!senha) {
    mostrarErro('senha', 'Senha obrigatória.');
    valido = false;
  } else if (senha.length < 6) {
    mostrarErro('senha', 'A senha deve ter pelo menos 6 caracteres.');
    valido = false;
  }

  const confirmar = document.getElementById('confirmar').value;
  if (!confirmar) {
    mostrarErro('confirmar', 'Confirmação de senha obrigatória.');
    valido = false;
  } else if (confirmar !== senha) {
    mostrarErro('confirmar', 'As senhas não coincidem.');
    valido = false;
  }

  return valido;
}

// ── Evento do botão REGISTRAR ───────────────
document.addEventListener('DOMContentLoaded', () => {
  const btnRegistrar = document.getElementById('registrar');
  if (!btnRegistrar) return;

  btnRegistrar.addEventListener('click', () => {
    if (validarFormulario()) {
      // TODO: enviar dados ao backend (server.js)
      alert('Cadastro realizado com sucesso! Redirecionando para o login...');
      window.location.href = '../html/login.html';
    }
  });

  // Limpa erro ao digitar
  ['nome', 'email', 'data', 'cpf', 'senha', 'confirmar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => limparErro(id));
  });
});


// ══════════════════════════════════════════════════════════
// TELEFONE: máscara (parênteses + traço), limpeza e código de país
// ══════════════════════════════════════════════════════════

// Aplica a máscara (DD) DDDDD-DDDD (ou (DD) DDDD-DDDD para fixo)
// enquanto o usuário digita, adaptando o formato conforme a quantidade
// de dígitos já informados.
function aplicarMascaraTelefone(valor) {
    valor = valor.replace(/\D/g, ''); // remove tudo que não é número
    valor = valor.slice(0, 11);       // limita a DDD + 9 dígitos (celular)

    if (valor.length > 10) {
        // Celular: (99) 99999-9999
        valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    } else if (valor.length > 6) {
        // Fixo: (99) 9999-9999
        valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (valor.length > 2) {
        // Ainda digitando o número, já fechando o DDD
        valor = valor.replace(/^(\d{2})(\d*)/, '($1) $2');
    } else if (valor.length > 0) {
        // Só o início do DDD
        valor = valor.replace(/^(\d*)/, '($1');
    }

    return valor;
}

// Remove parênteses, espaços, traços e qualquer caractere que não seja
// número, garantindo que o valor salvo no banco fique só com dígitos.
function limparTelefone(valor) {
    return (valor || '').replace(/\D/g, '');
}

// Retorna o código do país (DDI) atualmente selecionado no <select id="pais">
function obterCodigoPais() {
    const selectPais = document.getElementById('pais');
    return selectPais ? selectPais.value : '';
}

// Ajusta o placeholder do campo telefone de acordo com o país escolhido
// (função responsável por alterar o comportamento do campo conforme o
// código do país selecionado).
function alterarCodigoPais() {
    const selectPais = document.getElementById('pais');
    const inputTelefone = document.getElementById('telefone');
    if (!selectPais || !inputTelefone) return;

    const opcaoSelecionada = selectPais.selectedOptions[0];
    const sigla = opcaoSelecionada ? opcaoSelecionada.dataset.sigla : null;

    if (sigla === 'BR') {
        inputTelefone.placeholder = '(00) 00000-0000';
    } else {
        inputTelefone.placeholder = '(00) 0000-0000';
    }

    // Reaplica a máscara em cima do que já foi digitado
    inputTelefone.value = aplicarMascaraTelefone(inputTelefone.value);
}

// Monta o telefone completo (código do país + número já limpo), pronto
// para ser enviado/salvo. Ex.: "5511999999999"
function montarTelefoneCompleto() {
    const inputTelefone = document.getElementById('telefone');
    if (!inputTelefone) return '';

    const ddi = obterCodigoPais();
    const numeroLimpo = limparTelefone(inputTelefone.value);

    return numeroLimpo ? `${ddi}${numeroLimpo}` : '';
}

document.addEventListener('DOMContentLoaded', () => {
    const inputTelefone = document.getElementById('telefone');
    const selectPais = document.getElementById('pais');

    if (inputTelefone) {
        inputTelefone.addEventListener('input', (evento) => {
            evento.target.value = aplicarMascaraTelefone(evento.target.value);
        });
    }

    if (selectPais) {
        selectPais.addEventListener('change', alterarCodigoPais);
    }
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
