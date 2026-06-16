/* ============================================
   cadastro.js – Perícia Fiducia
   Validação + navegação do formulário de cadastro
   ============================================ */

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

function limparTodosErros() {
  ['nome', 'email', 'data', 'cpf', 'senha', 'confirmar'].forEach(limparErro);
}

// ── Validação de CPF ────────────────────────
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

// ── Validação de CNPJ ──────────────────────
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

// ── Validar todos os campos ─────────────────
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
