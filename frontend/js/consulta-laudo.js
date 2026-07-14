// ==========================================================================
// consulta-laudo.js
// Envia protocolo + código de acesso para o backend e recebe o laudo já
// pronto em PDF (a rota POST /dados-laudo/:protocolo/verificar-codigo não
// retorna mais JSON — o corpo da resposta já é o arquivo PDF quando o
// código está correto).
// ==========================================================================

// API_BASE já é declarado globalmente por inicio.js, carregado antes desta
// página.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-consultar-laudo');
    form.addEventListener('submit', consultarLaudo);
});

async function consultarLaudo(evento) {
    evento.preventDefault();

    const protocolo = document.getElementById('input-protocolo').value.trim();
    const codigo = document.getElementById('input-codigo-acesso').value.trim();
    const status = document.getElementById('consulta-laudo-status');
    const btn = document.getElementById('btn-consultar-laudo');

    if (!protocolo || !codigo) {
        exibirStatus('Informe o protocolo e o código de acesso.', true);
        return;
    }

    btn.disabled = true;
    exibirStatus('Verificando código e gerando o laudo...', false);

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/dados-laudo/${encodeURIComponent(protocolo)}/verificar-codigo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codigo })
        });

        // Quando o código está errado ou o protocolo não existe, o backend
        // ainda responde em JSON com a mensagem de erro (só responde em PDF
        // quando o código é validado com sucesso).
        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => ({}));
            exibirStatus(dados.erro || 'Não foi possível localizar o laudo com os dados informados.', true);
            return;
        }

        const blobPdf = await resposta.blob();
        const urlPdf = URL.createObjectURL(blobPdf);

        // Abre o PDF em uma nova aba. O navegador libera a memória do blob
        // automaticamente quando a aba é fechada; ainda assim revogamos a
        // URL depois de um tempo para não manter o objeto na memória à toa.
        window.open(urlPdf, '_blank');
        setTimeout(() => URL.revokeObjectURL(urlPdf), 60000);

        exibirStatus('Laudo aberto em uma nova aba.', false);

    } catch (error) {
        console.error('Erro ao consultar laudo:', error);
        exibirStatus('Erro de conexão ao consultar o laudo.', true);
    } finally {
        btn.disabled = false;
    }
}

function exibirStatus(texto, erro) {
    const status = document.getElementById('consulta-laudo-status');
    status.textContent = texto;
    status.style.color = erro ? 'red' : 'green';
    status.style.display = 'block';
}