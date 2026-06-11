
// ── FALE CONOSCO – JS ─────────────────────────────────────
 
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('fale_conosco');
    const nome = document.getElementById('nome_completo');
    const email = document.getElementById('email');
    const mensagem = document.getElementById('mensagem');
 
    btn.addEventListener('click', () => {
        const fields = [
            { el: nome, label: 'Nome Completo' },
            { el: email, label: 'Email' },
            { el: mensagem, label: 'Mensagem' },
        ];
 
        let valid = true;
 
        fields.forEach(({ el, label }) => {
            el.style.borderColor = '';
            if (!el.value.trim()) {
                el.style.borderColor = '#c0392b';
                valid = false;
            }
        });
 
        if (!valid) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
 
        // Simula envio
        btn.textContent = 'Enviando…';
        btn.disabled = true;
 
        setTimeout(() => {
            alert('Mensagem enviada com sucesso! Em breve entraremos em contato.');
            nome.value = '';
            email.value = '';
            mensagem.value = '';
            btn.textContent = 'Enviar';
            btn.disabled = false;
        }, 1200);
    });
});