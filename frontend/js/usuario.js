// ==========================================================================
// usuario.js
// Lógica da tela "Minha Conta": perfil do usuário (foto, excluir conta) e
// lista de pedidos/dispositivos enviados para perícia (adicionar, excluir
// com confirmação, ver laudo quando concluído, barra de progresso do status).
//
// IMPORTANTE — nenhuma alteração de backend ou de CSS foi feita aqui.
// Rotas usadas (algumas já existem no backend, outras são assumidas seguindo
// exatamente o mesmo padrão já adotado em servicos.js):
//
//   GET    http://127.0.0.1:3000/usuario/perfil     -> dados do usuário logado
//                                                      (já usado em inicio.js)
//   GET    /api/dispositivos/meus-servicos          -> lista os pedidos do cliente (JÁ EXISTE)
//   POST   /api/dispositivos/solicitar              -> cria um novo pedido/dispositivo
//                                                      (mesma rota assumida em servicos.js)
//   DELETE /api/dispositivos/cancelar/:id           -> exclui um pedido
//                                                      (mesma rota assumida em servicos.js)
//   GET    /api/dispositivos/dados-laudo/:id        -> retorna o laudo técnico (JÁ EXISTE,
//                                                      só responde quando status = 'concluida')
//   DELETE /api/auth/conta                          -> exclui a conta do usuário logado
//                                                      (rota nova, precisa ser criada no backend)
//   POST   /api/auth/foto-perfil (multipart "foto") -> atualiza a foto de perfil
//                                                      (rota nova, precisa ser criada no backend)
// ==========================================================================

const API_BASE = 'http://127.0.0.1:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        exibirMensagem('Você precisa estar logado para acessar sua conta.', true);
        window.location.href = 'login.html';
        return;
    }

    carregarPerfil(token);
    carregarPedidos(token);
    configurarModalNovoPedido(token);
    configurarModalLaudo();
    configurarFotoPerfil(token);
    configurarExcluirConta(token);
    configurarLogoutHeader();
});

// ===================== PERFIL DO USUÁRIO =====================

async function carregarPerfil(token) {
    try {
        const resposta = await fetch('http://127.0.0.1:3000/usuario/perfil', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            console.warn('Não foi possível carregar o perfil do usuário.');
            return;
        }

        preencherPerfilNaTela(dados);

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
    }
}

function preencherPerfilNaTela(dados) {
    const nome = dados.nome || 'Usuário';
    const email = dados.email || '—';
    const iniciais = gerarIniciais(nome);

    document.getElementById('perfil-nome').textContent = nome;
    document.getElementById('perfil-email').textContent = email;
    document.getElementById('header-nome-usuario').textContent = nome;

    const imgPerfil = document.getElementById('perfil-foto-img');
    const iniciaisPerfil = document.getElementById('perfil-avatar-iniciais');
    const iniciaisHeader = document.getElementById('header-avatar-iniciais');

    iniciaisHeader.textContent = iniciais;

    if (dados.foto_perfil) {
        imgPerfil.src = `http://127.0.0.1:3000/uploads/${dados.foto_perfil}`;
        imgPerfil.style.display = 'inline-block';
        iniciaisPerfil.style.display = 'none';
    } else {
        imgPerfil.style.display = 'none';
        iniciaisPerfil.style.display = 'inline-block';
        iniciaisPerfil.textContent = iniciais;
    }
}

function gerarIniciais(nome) {
    return nome
        .split(' ')
        .filter(Boolean)
        .map(parte => parte[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';
}

// ===================== MUDAR FOTO DE PERFIL =====================

function configurarFotoPerfil(token) {
    const input = document.getElementById('input-foto-perfil');

    input.addEventListener('change', async () => {
        const arquivo = input.files[0];
        if (!arquivo) return;

        const formData = new FormData();
        formData.append('foto', arquivo);

        try {
            const resposta = await fetch(`${API_BASE}/auth/foto-perfil`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Content-Type não é definido manualmente: o navegador
                    // gera o boundary correto do multipart/form-data.
                },
                body: formData
            });

            if (!resposta.ok) {
                exibirMensagem('Não foi possível atualizar a foto de perfil.', true);
                return;
            }

            exibirMensagem('Foto de perfil atualizada com sucesso!', false);
            carregarPerfil(token);

        } catch (error) {
            console.error('Erro ao enviar foto de perfil:', error);
            exibirMensagem('Erro de conexão ao enviar a foto de perfil.', true);
        } finally {
            input.value = '';
        }
    });
}

// ===================== EXCLUIR CONTA =====================

function configurarExcluirConta(token) {
    const btn = document.getElementById('btn-excluir-conta');

    btn.addEventListener('click', async () => {
        const confirmar = confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.');
        if (!confirmar) return;

        try {
            const resposta = await fetch(`${API_BASE}/auth/conta`, {
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

            alert('Conta excluída com sucesso.');
            localStorage.removeItem('token');
            window.location.href = 'inicio.html';

        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            exibirMensagem('Erro de conexão ao excluir a conta.', true);
        }
    });
}

// ===================== LOGOUT (BARRA DE CIMA) =====================

function configurarLogoutHeader() {
    document.getElementById('btn-sair-header').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'inicio.html';
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

        // Cada card entra na lista com uma pequena animação (feita 100% via JS,
        // usando a Web Animations API — nenhum CSS foi criado ou alterado).
        pedidos.forEach((pedido, indice) => {
            const card = criarCardPedido(pedido, token);
            container.appendChild(card);

            const artigo = container.querySelector(`[data-id="${pedido.id}"]`);
            animarEntradaCard(artigo, indice);
        });

    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        exibirMensagem('Erro de conexão ao buscar seus pedidos.', true);
    }
}

function criarCardPedido(pedido, token) {
    const template = document.getElementById('template-pedido');
    const card = template.content.cloneNode(true);

    const dispositivo = pedido.dispositivo || pedido.nome_dispositivo || pedido.tipo_dispositivo || 'Dispositivo não informado';
    const modelo = pedido.modelo_dispositivo || pedido.modelo_descricao || pedido.modelo || '—';
    const oQueFazer = pedido.o_que_fazer || pedido.servico_solicitado || '—';
    const prazo = pedido.prazo || '—';
    const estado = pedido.estado_dispositivo || '—';

    card.querySelector('.pedido-dispositivo').textContent = dispositivo;
    card.querySelector('.pedido-modelo').textContent = modelo;
    card.querySelector('.pedido-o-que-fazer').textContent = oQueFazer;
    card.querySelector('.pedido-prazo').textContent = prazo;
    card.querySelector('.pedido-estado').textContent = estado;

    const { texto: statusTexto, percent, concluido } = calcularStatusProgresso(pedido);
    card.querySelector('.pedido-status-texto').textContent = statusTexto;

    const artigo = card.querySelector('.pedido-item');
    artigo.dataset.id = pedido.id;

    // Barra de progresso do status do pedido (estrutura/estilo mínimo aplicado
    // via JS, já que nenhum CSS foi criado para este elemento).
    const barraFundo = card.querySelector('.barra-progresso-fundo');
    const barraPreenchimento = card.querySelector('.barra-progresso-preenchimento');
    estilizarBarraProgresso(barraFundo, barraPreenchimento, percent, concluido);

    const btnExcluir = card.querySelector('.btn-excluir-pedido');
    const btnVerLaudo = card.querySelector('.btn-ver-laudo');

    btnExcluir.addEventListener('click', () => {
        excluirPedido(pedido.id, token, artigo);
    });

    // O laudo só aparece quando o serviço foi concluído e atualizado pelo perito.
    if (concluido) {
        btnVerLaudo.style.display = 'inline-block';
        btnVerLaudo.addEventListener('click', () => {
            abrirModalLaudo(pedido.id, token);
        });
    }

    return card;
}

function calcularStatusProgresso(pedido) {
    const statusBruto = (pedido.status || '').toLowerCase();

    if (statusBruto.includes('conclu') || pedido.laudo_tecnico || pedido.laudo) {
        return { texto: '✅ Concluído — laudo disponível', percent: 100, concluido: true };
    }

    if (statusBruto.includes('analise') || statusBruto.includes('análise') || pedido.nome_perito) {
        const nomePerito = pedido.nome_perito ? ` pelo perito ${pedido.nome_perito}` : '';
        return { texto: `🔍 Em análise${nomePerito}`, percent: 65, concluido: false };
    }

    return { texto: '⏳ Aguardando alocação de um perito...', percent: 25, concluido: false };
}

// ===================== EXCLUIR PEDIDO (COM CONFIRMAÇÃO) =====================

function excluirPedido(id, token, elementoCard) {
    const confirmar = confirm('Tem certeza que deseja excluir este dispositivo da lista de pedidos?');
    if (!confirmar) return;

    (async () => {
        try {
            const resposta = await fetch(`${API_BASE}/dispositivos/cancelar/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!resposta.ok) {
                exibirMensagem('Não foi possível excluir o pedido. Tente novamente.', true);
                return;
            }

            exibirMensagem('Pedido excluído com sucesso.', false);

            // Anima a saída do card antes de removê-lo e recarregar a lista.
            animarSaidaCard(elementoCard, () => {
                carregarPedidos(token);
            });

        } catch (error) {
            console.error('Erro ao excluir pedido:', error);
            exibirMensagem('Erro de conexão ao excluir o pedido.', true);
        }
    })();
}

// ===================== MODAL: NOVO PEDIDO / NOVO DISPOSITIVO =====================

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
            modelo_dispositivo: document.getElementById('input-modelo-dispositivo').value.trim(),
            o_que_fazer: document.getElementById('input-o-que-fazer').value.trim(),
            prazo: document.getElementById('input-prazo').value.trim(),
            estado_dispositivo: document.getElementById('input-estado-dispositivo').value
        };

        // Todas as informações são obrigatórias.
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

async function abrirModalLaudo(dispositivoId, token) {
    const modal = document.getElementById('modal-laudo');
    const conteudo = document.getElementById('conteudo-laudo');

    conteudo.innerHTML = '<p>Carregando laudo técnico...</p>';
    modal.style.display = 'block';

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/dados-laudo/${dispositivoId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (resposta.status === 404) {
            conteudo.innerHTML = '<p>O laudo ainda não está disponível. Ele só aparece aqui quando o perito concluir e atualizar o serviço.</p>';
            return;
        }

        if (!resposta.ok) {
            conteudo.innerHTML = '<p>Não foi possível carregar o laudo técnico. Tente novamente mais tarde.</p>';
            return;
        }

        const dados = await resposta.json();

        conteudo.innerHTML = `
            <p><strong>Dispositivo:</strong> ${escapeHtml(dados.tipo_dispositivo || '—')}</p>
            <p><strong>Modelo:</strong> ${escapeHtml(dados.modelo_descricao || '—')}</p>
            <p><strong>Perito responsável:</strong> ${escapeHtml(dados.nome_perito || '—')}</p>
            <p><strong>Data de entrada:</strong> ${escapeHtml(dados.data_entrada || '—')}</p>
            <p><strong>Laudo técnico:</strong></p>
            <p>${escapeHtml(dados.parecer_tecnico || 'Laudo técnico ainda não disponível.')}</p>
        `;

    } catch (error) {
        console.error('Erro ao buscar laudo técnico:', error);
        conteudo.innerHTML = '<p>Erro de conexão ao buscar o laudo técnico.</p>';
    }
}

// ===================== ANIMAÇÕES (100% via JS — Web Animations API) =====================
// Segue a mesma ideia de pedidos entrando na lista como em servicos.html,
// mas implementada aqui inteiramente via JavaScript (sem tocar em nenhum CSS).

function animarEntradaCard(elemento, indice) {
    if (!elemento || !elemento.animate) return;

    elemento.animate(
        [
            { opacity: 0, transform: 'translateY(18px) scale(0.98)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ],
        {
            duration: 420,
            delay: Math.min(indice, 6) * 60,
            easing: 'cubic-bezier(.21,1.02,.73,1)',
            fill: 'backwards'
        }
    );
}

function animarSaidaCard(elemento, aoFinalizar) {
    if (!elemento || !elemento.animate) {
        if (aoFinalizar) aoFinalizar();
        return;
    }

    const animacao = elemento.animate(
        [
            { opacity: 1, transform: 'translateX(0)', maxHeight: `${elemento.offsetHeight}px` },
            { opacity: 0, transform: 'translateX(24px)', maxHeight: '0px' }
        ],
        {
            duration: 320,
            easing: 'ease-in',
            fill: 'forwards'
        }
    );

    animacao.onfinish = () => {
        if (aoFinalizar) aoFinalizar();
    };
}

// Barra de progresso: como nenhum CSS existe para esse componente ainda,
// aplicamos o mínimo de estilo em linha via JS só para o preenchimento
// (a cor/altura) ficar visível, e animamos a largura com a Web Animations API.
function estilizarBarraProgresso(fundoEl, preenchimentoEl, percent, concluido) {
    if (!fundoEl || !preenchimentoEl) return;

    fundoEl.style.width = '100%';
    fundoEl.style.height = '10px';
    fundoEl.style.borderRadius = '999px';
    fundoEl.style.background = 'rgba(0,0,0,0.12)';
    fundoEl.style.overflow = 'hidden';

    preenchimentoEl.style.height = '100%';
    preenchimentoEl.style.borderRadius = '999px';
    preenchimentoEl.style.background = concluido ? '#2e9e4f' : '#c0392b';
    preenchimentoEl.style.width = '0%';

    if (preenchimentoEl.animate) {
        const animacao = preenchimentoEl.animate(
            [
                { width: '0%' },
                { width: `${percent}%` }
            ],
            {
                duration: 700,
                easing: 'ease-out',
                fill: 'forwards'
            }
        );
        animacao.onfinish = () => {
            preenchimentoEl.style.width = `${percent}%`;
        };
    } else {
        preenchimentoEl.style.width = `${percent}%`;
    }
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