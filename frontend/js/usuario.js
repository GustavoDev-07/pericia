// ==========================================================================
// usuario.js
// Lógica da tela "Minha Conta": dados do perfil, troca de foto, exclusão de
// conta, listagem dos pedidos do cliente com barra de progresso, exclusão
// de item da lista e visualização do laudo técnico quando concluído.
//
// IMPORTANTE: este arquivo assume que o backend expõe as seguintes rotas
// (conforme a documentação de integração da API recebida + rotas de
// dispositivos já usadas em servicos.js):
//   GET    /api/dispositivos/meus-servicos     -> lista os pedidos do cliente logado
//   POST   /api/dispositivos/solicitar          -> cria um novo pedido/dispositivo
//   DELETE /api/dispositivos/cancelar/:id        -> exclui um pedido
//   GET    /usuario/perfil                       -> dados do usuário logado (já usada em inicio.js)
//   POST   /api/usuarios/foto-perfil             -> atualiza a foto de perfil
//   DELETE /api/usuarios/excluir-conta           -> exclui a conta do usuário
// As rotas de foto de perfil, exclusão de conta, criação e exclusão de
// pedido não constavam na documentação recebida e precisam existir no
// backend para que este arquivo funcione. Nenhuma alteração de backend foi
// feita aqui, conforme solicitado.
// ==========================================================================

// const API_BASE = 'http://127.0.0.1:3000/api';

// document.addEventListener('DOMContentLoaded', () => {
//     const token = localStorage.getItem('token');

//     if (!token) {
//         exibirMensagem('Você precisa estar logado para acessar sua conta.', true);
//         window.location.href = 'login.html';
//         return;
//     }

//     carregarPerfil(token);
//     carregarPedidos(token);
//     configurarFotoPerfil(token);
//     configurarExclusaoConta(token);
//     configurarModalNovoPedido(token);
//     configurarModalLaudo();
// });

// ===================== PERFIL =====================

async function carregarPerfil(token) {
    try {
        const resposta = await fetch('http://127.0.0.1:3000/usuario/perfil', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            console.warn('Não foi possível carregar o perfil do usuário.');
            return;
        }

        const dados = await resposta.json();

        document.getElementById('perfil-nome').textContent = dados.nome || '—';
        document.getElementById('perfil-email').textContent = dados.email || '—';

        if (dados.foto_perfil) {
            document.getElementById('perfil-foto').src = dados.foto_perfil;
        }

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
    }
}

function configurarFotoPerfil(token) {
    const btnMudarFoto = document.getElementById('btn-mudar-foto');
    const inputFoto = document.getElementById('input-foto-perfil');
    const imgFoto = document.getElementById('perfil-foto');

    btnMudarFoto.addEventListener('click', () => {
        inputFoto.click();
    });

    inputFoto.addEventListener('change', async () => {
        const arquivo = inputFoto.files[0];
        if (!arquivo) return;

        // Prévia imediata da imagem escolhida
        const leitor = new FileReader();
        leitor.onload = (evento) => {
            imgFoto.src = evento.target.result;
        };
        leitor.readAsDataURL(arquivo);

        const formData = new FormData();
        formData.append('foto', arquivo);

        try {
            const resposta = await fetch(`${API_BASE}/usuarios/foto-perfil`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Não definir Content-Type aqui: o navegador define o boundary do FormData automaticamente
                },
                body: formData
            });

            if (!resposta.ok) {
                exibirMensagem('Não foi possível atualizar a foto de perfil.', true);
                return;
            }

            exibirMensagem('Foto de perfil atualizada com sucesso!', false);

        } catch (error) {
            console.error('Erro ao atualizar foto de perfil:', error);
            exibirMensagem('Erro de conexão ao atualizar a foto de perfil.', true);
        }
    });
}

function configurarExclusaoConta(token) {
    const btnExcluir = document.getElementById('btn-excluir-conta');

    btnExcluir.addEventListener('click', async () => {
        const confirmar1 = confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.');
        if (!confirmar1) return;

        const confirmar2 = confirm('Confirmando: TODOS os seus dados e pedidos serão apagados permanentemente. Deseja continuar?');
        if (!confirmar2) return;

        try {
            const resposta = await fetch(`${API_BASE}/usuarios/excluir-conta`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!resposta.ok) {
                exibirMensagem('Não foi possível excluir sua conta. Tente novamente.', true);
                return;
            }

            localStorage.removeItem('token');
            alert('Sua conta foi excluída com sucesso.');
            window.location.href = 'inicio.html';

        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            exibirMensagem('Erro de conexão ao excluir a conta.', true);
        }
    });
}

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

        // Anima a entrada de cada card em sequência, um pouco depois do outro
        pedidos.forEach((pedido, indice) => {
            const card = criarCardPedido(pedido, token);
            animarEntradaCard(card, container, indice);
        });

    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        exibirMensagem('Erro de conexão ao buscar seus pedidos.', true);
    }
}

function criarCardPedido(pedido, token) {
    const template = document.getElementById('template-pedido');
    const card = template.content.firstElementChild.cloneNode(true);

    const dispositivo = pedido.dispositivo || pedido.nome_dispositivo || 'Dispositivo não informado';
    const modelo = pedido.modelo || '—';
    const oQueFazer = pedido.o_que_fazer || pedido.servico_solicitado || '—';
    const prazo = pedido.prazo || '—';
    const estado = pedido.estado_dispositivo || '—';

    card.querySelector('.pedido-dispositivo').textContent = dispositivo;
    card.querySelector('.pedido-modelo').textContent = modelo;
    card.querySelector('.pedido-o-que-fazer').textContent = oQueFazer;
    card.querySelector('.pedido-prazo').textContent = prazo;
    card.querySelector('.pedido-estado').textContent = estado;

    card.dataset.id = pedido.id;

    const { percentual, texto, concluido } = calcularProgresso(pedido);
    const barraPreenchida = card.querySelector('.pedido-progresso-barra-preenchida');
    barraPreenchida.style.width = '0%';
    // A barra também anima até o percentual real, depois que o card entra na tela
    requestAnimationFrame(() => {
        setTimeout(() => {
            barraPreenchida.style.transition = 'width 0.8s ease';
            barraPreenchida.style.width = `${percentual}%`;
        }, 300);
    });
    card.querySelector('.pedido-progresso-texto').textContent = texto;

    const btnExcluir = card.querySelector('.btn-excluir-item');
    btnExcluir.addEventListener('click', () => {
        excluirItem(pedido.id, token, card);
    });

    const btnVerLaudo = card.querySelector('.btn-ver-laudo');
    if (concluido) {
        btnVerLaudo.style.display = 'inline-block';
        btnVerLaudo.addEventListener('click', () => {
            abrirModalLaudo(pedido);
        });
    }

    return card;
}

// Calcula o percentual da barra de progresso e o texto do estado atual
function calcularProgresso(pedido) {
    const statusBruto = (pedido.status || '').toLowerCase();
    const concluido = statusBruto.includes('conclu') || Boolean(pedido.laudo_tecnico);

    if (concluido) {
        return { percentual: 100, texto: '✅ Concluído', concluido: true };
    }

    if (statusBruto.includes('analise') || statusBruto.includes('análise') || pedido.nome_perito) {
        const nomePerito = pedido.nome_perito ? ` — Perito: ${pedido.nome_perito}` : '';
        return { percentual: 65, texto: `🔍 Em análise${nomePerito}`, concluido: false };
    }

    return { percentual: 25, texto: '⏳ Pedido enviado — aguardando alocação de um técnico', concluido: false };
}

// ===================== ANIMAÇÃO DE ENTRADA DOS CARDS =====================

function animarEntradaCard(card, container, indice) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

    container.appendChild(card);

    // Pequeno atraso entre cada item para dar efeito de "surgindo em sequência"
    setTimeout(() => {
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    }, indice * 120);
}

// ===================== EXCLUIR ITEM DA LISTA =====================

async function excluirItem(id, token, card) {
    const confirmar = confirm('Tem certeza que deseja excluir este item enviado?');
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
            exibirMensagem('Não foi possível excluir o item. Tente novamente.', true);
            return;
        }

        // Anima a saída do card antes de removê-lo do DOM
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(24px)';
        setTimeout(() => {
            card.remove();
            const container = document.getElementById('lista-pedidos-itens');
            if (!container.children.length) {
                document.getElementById('lista-pedidos-vazia').style.display = 'block';
            }
        }, 300);

        exibirMensagem('Item excluído com sucesso.', false);

    } catch (error) {
        console.error('Erro ao excluir item:', error);
        exibirMensagem('Erro de conexão ao excluir o item.', true);
    }
}

// ===================== MODAL: NOVO DISPOSITIVO =====================

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
            modelo: document.getElementById('input-modelo').value.trim(),
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

            const pedidoCriado = await resposta.json().catch(() => dados);

            modal.style.display = 'none';
            exibirMensagem('Pedido enviado com sucesso!', false);

            // Adiciona o novo card já com animação de entrada, sem precisar recarregar tudo
            const vazio = document.getElementById('lista-pedidos-vazia');
            vazio.style.display = 'none';
            const container = document.getElementById('lista-pedidos-itens');
            const card = criarCardPedido(pedidoCriado, token);
            animarEntradaCard(card, container, 0);

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