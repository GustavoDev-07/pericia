// ==========================================================================
// servicos.js
// Lógica da tela "Meus Serviços": listar pedidos do cliente, cancelar pedido,
// visualizar laudo técnico de pedidos concluídos e abrir formulário de
// novo pedido / novo dispositivo.
//
// IMPORTANTE: este arquivo assume que o backend expõe as seguintes rotas
// (conforme a documentação de integração da API recebida):
//   GET    /api/dispositivos/meus-servicos        -> lista os pedidos do cliente logado
//   POST   /api/dispositivos/solicitar             -> cria um novo pedido/dispositivo
//   DELETE /api/dispositivos/cancelar/:id           -> cancela/exclui um pedido
// As duas últimas (POST e DELETE) não constavam na documentação recebida e
// precisam existir no backend para que este arquivo funcione. Nenhuma
// alteração de backend foi feita aqui, conforme solicitado.
// ==========================================================================

const API_BASE = 'http://127.0.0.1:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        exibirMensagem('Você precisa estar logado para ver seus pedidos.', true);
        window.location.href = 'login.html';
        return;
    }

    carregarPedidos(token);
    configurarModalNovoPedido(token);
    configurarModalLaudo();
});

// ===================== CARREGAR / RENDERIZAR PEDIDOS =====================

async function carregarPedidos(token) {
    const container = document.getElementById('lista-pedidos-itens');
    const vazio = document.getElementById('lista-pedidos-vazia');

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/meus-servicos`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (resposta.status === 404) {
            container.innerHTML = '';
            vazio.style.display = 'block';
            return;
        }

        if (!resposta.ok) {
            exibirMensagem('Não foi possível carregar seus pedidos. Tente novamente mais tarde.', true);
            return;
        }

        const pedidos = await resposta.json();

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            container.innerHTML = '';
            vazio.style.display = 'block';
            return;
        }

        vazio.style.display = 'none';
        container.innerHTML = '';
        pedidos.forEach(pedido => container.appendChild(criarCardPedido(pedido, token)));

    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        exibirMensagem('Erro de conexão ao buscar seus pedidos.', true);
    }
}

function criarCardPedido(pedido, token) {
    const template = document.getElementById('template-pedido');
    const card = template.content.cloneNode(true);

    const dispositivo = pedido.dispositivo || pedido.nome_dispositivo || 'Dispositivo não informado';
    const descricao = pedido.descricao_item || pedido.descricao || '—';
    const oQueFazer = pedido.o_que_fazer || pedido.servico_solicitado || '—';
    const prazo = pedido.prazo || '—';
    const estado = pedido.estado_dispositivo || '—';

    card.querySelector('.pedido-dispositivo').textContent = dispositivo;
    card.querySelector('.pedido-descricao').textContent = descricao;
    card.querySelector('.pedido-o-que-fazer').textContent = oQueFazer;
    card.querySelector('.pedido-prazo').textContent = prazo;
    card.querySelector('.pedido-estado').textContent = estado;

    const { texto: statusTexto, concluido } = calcularStatus(pedido);
    card.querySelector('.pedido-status').textContent = statusTexto;

    const artigo = card.querySelector('.pedido-item');
    artigo.dataset.id = pedido.id;

    const btnCancelar = card.querySelector('.btn-cancelar-pedido');
    const btnVerLaudo = card.querySelector('.btn-ver-laudo');

    if (concluido) {
        // Serviço concluído: mostra o botão de laudo e esconde o de cancelar
        btnVerLaudo.style.display = 'inline-block';
        btnCancelar.style.display = 'none';
        btnVerLaudo.addEventListener('click', () => {
            abrirModalLaudo(pedido);
        });
    } else {
        btnCancelar.addEventListener('click', () => {
            cancelarPedido(pedido.id, token);
        });
    }

    return card;
}

function calcularStatus(pedido) {
    // Status explícito vindo do backend tem prioridade
    const statusBruto = (pedido.status || '').toLowerCase();

    if (statusBruto.includes('conclu') || pedido.laudo_tecnico) {
        return { texto: '✅ Concluído', concluido: true };
    }

    if (statusBruto.includes('analise') || statusBruto.includes('análise')) {
        const nomePerito = pedido.nome_perito ? ` pelo Perito: ${pedido.nome_perito}` : '';
        return { texto: `🔍 Em análise${nomePerito}`, concluido: false };
    }

    // Sem status explícito: usa a regra de nome_perito (igual ao comportamento
    // já definido para a tela de acompanhamento do cliente)
    if (!pedido.nome_perito) {
        return { texto: '⏳ Em andamento — aguardando alocação de um técnico...', concluido: false };
    }

    return { texto: `🔍 Em análise pelo Perito: ${pedido.nome_perito}`, concluido: false };
}

// ===================== CANCELAR PEDIDO =====================

async function cancelarPedido(id, token) {
    const confirmar = confirm('Tem certeza que deseja cancelar/excluir este pedido?');
    if (!confirmar) return;

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/cancelar/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            exibirMensagem('Não foi possível cancelar o pedido. Tente novamente.', true);
            return;
        }

        exibirMensagem('Pedido cancelado com sucesso.', false);
        carregarPedidos(token);

    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        exibirMensagem('Erro de conexão ao cancelar o pedido.', true);
    }
}

// ===================== MODAL: NOVO PEDIDO =====================

function configurarModalNovoPedido(token) {
    const modal = document.getElementById('modal-novo-pedido');
    const btnAbrir = document.getElementById('btn-abrir-novo-pedido');
    const btnFechar = document.getElementById('btn-fechar-novo-pedido');
    const form = document.getElementById('form-novo-pedido');
    const erroForm = document.getElementById('erro-form-pedido');

    btnAbrir.addEventListener('click', () => {
        form.reset();
        erroForm.style.display = 'none';
        modal.style.display = 'block';
    });

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        erroForm.style.display = 'none';

        const dados = {
            dispositivo: document.getElementById('input-dispositivo').value.trim(),
            descricao_item: document.getElementById('input-descricao-item').value.trim(),
            o_que_fazer: document.getElementById('input-o-que-fazer').value.trim(),
            prazo: document.getElementById('input-prazo').value.trim(),
            estado_dispositivo: document.getElementById('input-estado-dispositivo').value
        };

        // Todas as informações são obrigatórias
        const campoFaltando = Object.values(dados).some(valor => !valor);
        if (campoFaltando) {
            erroForm.textContent = 'Todos os campos são obrigatórios. Preencha as informações do dispositivo.';
            erroForm.style.display = 'block';
            return;
        }

        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        try {
            const resposta = await fetch(`${API_BASE}/dispositivos/solicitar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });

            if (!resposta.ok) {
                const erro = await resposta.json().catch(() => ({}));
                erroForm.textContent = erro.mensagem || 'Não foi possível enviar o pedido. Tente novamente.';
                erroForm.style.display = 'block';
                return;
            }

            modal.style.display = 'none';
            exibirMensagem('Pedido enviado com sucesso!', false);
            carregarPedidos(token);

        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            erroForm.textContent = 'Erro de conexão ao enviar o pedido.';
            erroForm.style.display = 'block';
        } finally {
            btnSubmit.disabled = false;
        }
    });
}

// ===================== MODAL: LAUDO TÉCNICO =====================

function configurarModalLaudo() {
    const modal = document.getElementById('modal-laudo');
    const btnFechar = document.getElementById('btn-fechar-laudo');

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

function abrirModalLaudo(pedido) {
    const modal = document.getElementById('modal-laudo');
    const conteudo = document.getElementById('conteudo-laudo');

    const dispositivo = pedido.dispositivo || pedido.nome_dispositivo || 'Dispositivo';
    const laudo = pedido.laudo_tecnico || 'Laudo técnico ainda não disponível.';

    conteudo.innerHTML = `
        <p><strong>Dispositivo:</strong> ${escapeHtml(dispositivo)}</p>
        <p><strong>Laudo técnico:</strong></p>
        <p>${escapeHtml(laudo)}</p>
    `;

    modal.style.display = 'block';
}

// ===================== UTILITÁRIOS =====================

function exibirMensagem(texto, erro) {
    const el = document.getElementById('mensagem-status');
    el.textContent = texto;
    el.style.color = erro ? 'red' : 'green';

    setTimeout(() => {
        if (el.textContent === texto) {
            el.textContent = '';
        }
    }, 5000);
}

function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}