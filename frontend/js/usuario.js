// ==========================================================================
// usuario.js — script real da página "Minha Conta" (usuario.html).
//
// O arquivo anterior continha, por engano, uma cópia do roteador do
// backend (routes/usuarios.js), com "import { Router } from 'express'" etc.
// Isso quebrava a página inteira: o navegador não entende "import" em um
// <script> comum, então o JS nunca chegava a rodar e nenhum dado aparecia.
// ==========================================================================

// API_BASE já é declarado globalmente por inicio.js, que é sempre carregado
// antes desta página (ver <script src="../js/inicio.js"> no <head>). Uma
// segunda declaração "const API_BASE" aqui causava
// "SyntaxError: Identifier 'API_BASE' has already been declared", que
// quebrava a execução deste arquivo inteiro.

// Mapa de status -> (texto exibido, % da barra de progresso)
const STATUS_PEDIDO = {
    aguardandoEnvio:   { texto: 'Aguardando envio',        percentual: 15 },
    recebidoNaEmpresa: { texto: 'Recebido na empresa',     percentual: 40 },
    emAnalise:         { texto: 'Em análise pelo perito',  percentual: 65 },
    concluida:         { texto: 'Perícia concluída',       percentual: 100 },
    devolvida:         { texto: 'Devolvida ao cliente',    percentual: 100 }
};

function mostrarMensagem(texto, tipo = 'info') {
    const msg = document.getElementById('mensagem-status');
    if (!msg) return;
    msg.textContent = texto;
    msg.dataset.tipo = tipo;
}

// ===================== PERFIL =====================
async function carregarPerfil(token) {
    try {
        const resposta = await fetch(`${API_BASE}/auth/usuario/perfil`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(dados.mensagem || 'Não foi possível carregar seu perfil.', 'erro');
            return;
        }

        const nomeEl = document.getElementById('perfil-nome');
        const emailEl = document.getElementById('perfil-email');
        if (nomeEl) nomeEl.textContent = dados.nome || '—';
        if (emailEl) emailEl.textContent = dados.email || '—';

        // Observação: a senha nunca é devolvida pelo backend (nem deveria
        // ser), então não há como — e não é seguro — exibi-la aqui. Se for
        // necessário oferecer troca de senha, isso deve ser um formulário
        // separado (senha atual + nova senha) com uma rota própria no
        // backend, e não um campo somente leitura mostrando a senha salva.
    } catch (erro) {
        console.error('Erro ao carregar perfil:', erro);
        mostrarMensagem('Não foi possível conectar ao servidor para carregar seu perfil.', 'erro');
    }
}

// ===================== MEUS PEDIDOS =====================
async function carregarPedidos(token) {
    const listaVazia = document.getElementById('lista-pedidos-vazia');
    const listaItens = document.getElementById('lista-pedidos-itens');
    const template = document.getElementById('template-pedido');
    if (!listaItens || !template) return;

    listaItens.innerHTML = '';

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/meus-servicos`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (resposta.status === 404) {
            if (listaVazia) listaVazia.style.display = '';
            return;
        }

        const pedidos = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(pedidos.erro || pedidos.mensagem || 'Não foi possível carregar seus pedidos.', 'erro');
            return;
        }

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            if (listaVazia) listaVazia.style.display = '';
            return;
        }

        if (listaVazia) listaVazia.style.display = 'none';

        pedidos.forEach(pedido => {
            const card = template.content.cloneNode(true);

            card.querySelector('.pedido-dispositivo').textContent = pedido.tipoDispositivo || 'Dispositivo';
            card.querySelector('.pedido-modelo').textContent = pedido.modeloDescricao || '—';
            card.querySelector('.pedido-o-que-fazer').textContent = pedido.descricaoServico || pedido.o_que_fazer || '—';
            card.querySelector('.pedido-prazo').textContent = pedido.prazo || '—';
            card.querySelector('.pedido-estado').textContent = pedido.estadoDispositivo || '—';

            const infoStatus = STATUS_PEDIDO[pedido.status] || { texto: pedido.status || 'Status desconhecido', percentual: 0 };
            const barra = card.querySelector('.pedido-progresso-barra-preenchida');
            const textoProgresso = card.querySelector('.pedido-progresso-texto');
            if (barra) barra.style.width = `${infoStatus.percentual}%`;
            if (textoProgresso) textoProgresso.textContent = infoStatus.texto;

            const btnVerLaudo = card.querySelector('.btn-ver-laudo');
            if (btnVerLaudo) {
                if (pedido.status === 'concluida') {
                    btnVerLaudo.style.display = '';
                    btnVerLaudo.addEventListener('click', () => abrirLaudo(pedido.id, token));
                } else {
                    btnVerLaudo.style.display = 'none';
                }
            }

            const btnExcluir = card.querySelector('.btn-excluir-item');
            if (btnExcluir) {
                btnExcluir.dataset.id = pedido.id;
            }

            listaItens.appendChild(card);
        });
    } catch (erro) {
        console.error('Erro ao carregar pedidos:', erro);
        mostrarMensagem('Não foi possível conectar ao servidor para carregar seus pedidos.', 'erro');
    }
}

async function abrirLaudo(dispositivoId, token) {
    const modal = document.getElementById('modal-laudo');
    const conteudo = document.getElementById('conteudo-laudo');
    if (!modal || !conteudo) return;

    conteudo.textContent = 'Carregando laudo...';
    modal.style.display = '';

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/dados-laudo/${dispositivoId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            conteudo.textContent = dados.erro || 'Não foi possível carregar o laudo.';
            return;
        }

        conteudo.innerHTML = `
            <p><strong>Dispositivo:</strong> ${dados.tipoDispositivo || '—'}</p>
            <p><strong>Modelo:</strong> ${dados.modeloDescricao || '—'}</p>
            <p><strong>Data de entrada:</strong> ${dados.data_entrada || '—'}</p>
            <p><strong>Perito responsável:</strong> ${dados.nome_perito || '—'}</p>
            <p><strong>Parecer técnico:</strong><br>${dados.parecer_tecnico || 'Sem parecer registrado.'}</p>
        `;
    } catch (erro) {
        console.error('Erro ao buscar laudo:', erro);
        conteudo.textContent = 'Não foi possível conectar ao servidor para carregar o laudo.';
    }
}

// ===================== MODAL: NOVO PEDIDO =====================
function configurarModalNovoPedido(token) {
    const modal = document.getElementById('modal-novo-pedido');
    const btnAbrir = document.getElementById('btn-abrir-novo-pedido');
    const btnFechar = document.getElementById('btn-fechar-novo-pedido');
    const form = document.getElementById('form-novo-pedido');
    const erroForm = document.getElementById('erro-form-pedido');

    if (btnAbrir && modal) {
        btnAbrir.addEventListener('click', () => { modal.style.display = ''; });
    }
    if (btnFechar && modal) {
        btnFechar.addEventListener('click', () => { modal.style.display = 'none'; });
    }

    if (!form) return;

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (erroForm) { erroForm.style.display = 'none'; erroForm.textContent = ''; }

        const payload = {
            tipoDispositivo: document.getElementById('input-dispositivo').value.trim(),
            modeloDescricao: document.getElementById('input-modelo').value.trim(),
            // ATENÇÃO: o backend (/api/dispositivos/cadastrar) exige também
            // "formaEntrega" ('correios' ou 'balcao'), e se for 'correios'
            // exige um objeto "endereco" completo. O formulário atual em
            // usuario.html não tem esses campos — por ora enviamos 'balcao'
            // fixo (entrega presencial). Se o cliente precisar da opção de
            // envio pelos Correios, o formulário HTML precisa ganhar esses
            // campos antes que essa parte funcione de verdade.
            formaEntrega: 'balcao'
        };

        try {
            const resposta = await fetch(`${API_BASE}/dispositivos/cadastrar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const resultado = await resposta.json();

            if (!resposta.ok) {
                if (erroForm) {
                    erroForm.textContent = resultado.erro || 'Não foi possível registrar o pedido.';
                    erroForm.style.display = '';
                }
                return;
            }

            mostrarMensagem(`Pedido registrado! Protocolo: ${resultado.protocolo}`, 'sucesso');
            form.reset();
            if (modal) modal.style.display = 'none';
            carregarPedidos(token);
        } catch (erro) {
            console.error('Erro ao cadastrar pedido:', erro);
            if (erroForm) {
                erroForm.textContent = 'Não foi possível conectar ao servidor.';
                erroForm.style.display = '';
            }
        }
    });
}

function configurarModalLaudo() {
    const modal = document.getElementById('modal-laudo');
    const btnFechar = document.getElementById('btn-fechar-laudo');
    if (btnFechar && modal) {
        btnFechar.addEventListener('click', () => { modal.style.display = 'none'; });
    }
}

// ===================== INICIALIZAÇÃO =====================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    carregarPerfil(token);
    carregarPedidos(token);
    configurarModalNovoPedido(token);
    configurarModalLaudo();
});