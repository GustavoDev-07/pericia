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
 
// ── Evento do botão LOGIN ───────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.querySelector('.btn-login');
  if (!btnLogin) return;
 
  btnLogin.addEventListener('click', () => {
    if (validarFormulario()) {
      // TODO: autenticar via backend (server.js)
      alert('Login realizado com sucesso! Redirecionando...');
      window.location.href = '../html/inicio.html';
    }
  });
 
  // Limpa erro ao digitar
  ['email', 'senha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => limparErro(id));
  });
});