// ==========================================================================
// entregas.js
// Lógica da tela "Gestão de Entregas / Logística":
//   1) Receber dispositivos que chegaram na empresa (aguardandoEnvio -> recebidoNaEmpresa)
//   2) Confirmar a entrega de dispositivos com perícia concluída ao cliente (concluida -> devolvida)
//   3) Reverter uma entrega confirmada por engano (devolvida -> concluida)
//
// Rotas usadas (todas já existem no backend depois do patch de rotas):
//   GET /api/dispositivos/logistica/aguardando-recebimento  ?busca=
//   GET /api/dispositivos/logistica/pendentes-entrega       ?busca=
//   GET /api/dispositivos/logistica/entregues                ?busca=
//   PUT /api/dispositivos/logistica/receber/:id               (já existia)
//   PUT /api/dispositivos/logistica/devolver/:id               (já existia)
//   PUT /api/dispositivos/logistica/reverter-entrega/:id       (nova)
//
// PERMISSÃO: o backend libera essas rotas para os cargos 'logistica' e
// 'admin' (permitirCargos(['logistica', 'admin'])). A checagem abaixo no
// front foi alinhada com isso — antes só liberava para 'admin', e por
// isso usuários com o cargo 'logistica' recebiam a mensagem de "sem
// permissão" mesmo tendo acesso liberado no servidor. A checagem no front
// é só um atalho de UI; a segurança real está nas rotas do backend.
// ==========================================================================

// API_BASE já é declarado globalmente por inicio.js, carregado antes desta
// página.

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        exibirMensagem('Você precisa estar logado para acessar a gestão de entregas.', true);
        window.location.href = 'login.html';
        return;
    }

    verificarPermissaoEntregas(token);
});

// ===================== CONTROLE DE ACESSO =====================

const CARGOS_PERMITIDOS = ['logistica', 'admin'];

async function verificarPermissaoEntregas(token) {
    const verificando = document.getElementById('entregas-verificando-permissao');

    try {
        const resposta = await fetch(`${API_BASE}/auth/usuario/perfil`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            exibirMensagem('Sessão inválida ou expirada. Faça login novamente.', true);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        const dados = await resposta.json();
        const role = dados.role || obterRoleDoToken(token);

        verificando.style.display = 'none';

        // Checagem só para decidir o que mostrar na tela. A permissão de
        // verdade é sempre revalidada pelo backend nas rotas de
        // receber/devolver/reverter (ver comentário no topo do arquivo).
        if (!CARGOS_PERMITIDOS.includes(role)) {
            document.getElementById('entregas-sem-permissao').style.display = 'block';
            document.getElementById('entregas-conteudo').style.display = 'none';
            return;
        }

        document.getElementById('entregas-sem-permissao').style.display = 'none';
        document.getElementById('entregas-conteudo').style.display = 'block';

        inicializarPagina(token);

    } catch (error) {
        console.error('Erro ao verificar permissão para gestão de entregas:', error);
        verificando.textContent = 'Erro de conexão ao verificar suas permissões.';
    }
}

// Lê o payload do JWT (sem validar assinatura — só para leitura no front)
// para tentar encontrar um campo "role", caso o backend já o inclua no
// token mesmo sem devolvê-lo em /usuario/perfil.
function obterRoleDoToken(token) {
    try {
        const partes = token.split('.');
        if (partes.length !== 3) return null;
        const payload = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.role || null;
    } catch (error) {
        return null;
    }
}

function inicializarPagina(token) {
    configurarFiltrosAguardandoRecebimento(token);
    configurarFiltrosPendentes(token);
    configurarFiltrosEntregues(token);
    configurarModalConfirmarEntrega(token);
    configurarModalReverterEntrega(token);

    carregarAguardandoRecebimento(token);
    carregarPendentesEntrega(token);
    carregarJaEntregues(token);
}

// ===================== AGUARDANDO RECEBIMENTO (aguardandoEnvio -> recebidoNaEmpresa) =====================

function configurarFiltrosAguardandoRecebimento(token) {
    const busca = document.getElementById('filtro-busca-aguardando');

    document.getElementById('btn-buscar-aguardando').addEventListener('click', () => {
        carregarAguardandoRecebimento(token, busca.value.trim());
    });

    document.getElementById('btn-atualizar-aguardando').addEventListener('click', () => {
        carregarAguardandoRecebimento(token, busca.value.trim());
    });

    busca.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            carregarAguardandoRecebimento(token, busca.value.trim());
        }
    });
}

async function carregarAguardandoRecebimento(token, busca) {
    const corpo = document.getElementById('corpo-tabela-aguardando');
    const tabela = document.getElementById('tabela-aguardando');
    const vazio = document.getElementById('aguardando-vazio');

    try {
        const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/aguardando-recebimento${query}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Não foi possível carregar os dispositivos aguardando recebimento.';
            return;
        }

        const dispositivos = await resposta.json();

        if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Nenhum dispositivo aguardando recebimento no momento.';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';
        corpo.innerHTML = '';

        dispositivos.forEach(dispositivo => {
            corpo.appendChild(criarLinhaAguardandoRecebimento(dispositivo, token));
        });

    } catch (error) {
        console.error('Erro ao buscar dispositivos aguardando recebimento:', error);
        tabela.style.display = 'none';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar os dispositivos aguardando recebimento.';
    }
}

function criarLinhaAguardandoRecebimento(dispositivo, token) {
    const tr = document.createElement('tr');
    tr.dataset.id = dispositivo.id;

    tr.innerHTML = `
        <td class="disp-id"></td>
        <td class="disp-tipo"></td>
        <td class="disp-modelo"></td>
        <td class="disp-cliente"></td>
        <td class="disp-forma-entrega"></td>
        <td class="disp-rastreio"></td>
        <td class="disp-entrada"></td>
        <td class="disp-acoes"></td>
    `;

    tr.querySelector('.disp-id').textContent = dispositivo.id ?? '—';
    tr.querySelector('.disp-tipo').textContent = dispositivo.tipoDispositivo || '—';
    tr.querySelector('.disp-modelo').textContent = dispositivo.modeloDescricao || '—';
    tr.querySelector('.disp-cliente').textContent = dispositivo.nome_cliente || '—';
    tr.querySelector('.disp-forma-entrega').textContent = dispositivo.formaEntrega || '—';
    tr.querySelector('.disp-rastreio').textContent = dispositivo.codigoRastreio || '—';
    tr.querySelector('.disp-entrada').textContent = dispositivo.data_entrada || '—';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-confirmar-recebimento';
    btn.textContent = 'Confirmar Recebimento';
    btn.addEventListener('click', () => {
        confirmarRecebimento(dispositivo, token, btn);
    });
    tr.querySelector('.disp-acoes').appendChild(btn);

    return tr;
}

async function confirmarRecebimento(dispositivo, token, btn) {
    btn.disabled = true;

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/receber/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            exibirMensagem(resultado.erro || resultado.mensagem || 'Não foi possível confirmar o recebimento. Verifique se você tem permissão para esta ação.', true);
            return;
        }

        exibirMensagem(resultado.mensagem || 'Recebimento confirmado com sucesso!', false);

        const buscaAguardando = document.getElementById('filtro-busca-aguardando').value.trim();
        carregarAguardandoRecebimento(token, buscaAguardando);

    } catch (error) {
        console.error('Erro ao confirmar recebimento:', error);
        exibirMensagem('Erro de conexão ao confirmar o recebimento.', true);
    } finally {
        btn.disabled = false;
    }
}

// ===================== PENDENTES DE ENTREGA (concluida -> devolvida) =====================

function configurarFiltrosPendentes(token) {
    const busca = document.getElementById('filtro-busca-pendentes');

    document.getElementById('btn-buscar-pendentes').addEventListener('click', () => {
        carregarPendentesEntrega(token, busca.value.trim());
    });

    document.getElementById('btn-atualizar-pendentes').addEventListener('click', () => {
        carregarPendentesEntrega(token, busca.value.trim());
    });

    busca.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            carregarPendentesEntrega(token, busca.value.trim());
        }
    });
}

async function carregarPendentesEntrega(token, busca) {
    const corpo = document.getElementById('corpo-tabela-pendentes-entrega');
    const tabela = document.getElementById('tabela-pendentes-entrega');
    const vazio = document.getElementById('pendentes-entrega-vazio');

    try {
        const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/pendentes-entrega${query}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Não foi possível carregar os pedidos pendentes de entrega.';
            return;
        }

        const dispositivos = await resposta.json();

        if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Nenhum dispositivo aguardando entrega no momento.';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';
        corpo.innerHTML = '';

        dispositivos.forEach(dispositivo => {
            corpo.appendChild(criarLinhaPendenteEntrega(dispositivo, token));
        });

    } catch (error) {
        console.error('Erro ao buscar pendentes de entrega:', error);
        tabela.style.display = 'none';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar os pedidos pendentes de entrega.';
    }
}

function criarLinhaPendenteEntrega(dispositivo, token) {
    const tr = document.createElement('tr');
    tr.dataset.id = dispositivo.id;

    tr.innerHTML = `
        <td class="disp-id"></td>
        <td class="disp-tipo"></td>
        <td class="disp-modelo"></td>
        <td class="disp-cliente"></td>
        <td class="disp-perito"></td>
        <td class="disp-concluida-em"></td>
        <td class="disp-acoes"></td>
    `;

    tr.querySelector('.disp-id').textContent = dispositivo.id ?? '—';
    tr.querySelector('.disp-tipo').textContent = dispositivo.tipoDispositivo || '—';
    tr.querySelector('.disp-modelo').textContent = dispositivo.modeloDescricao || '—';
    tr.querySelector('.disp-cliente').textContent = dispositivo.nome_cliente || '—';
    tr.querySelector('.disp-perito').textContent = dispositivo.nome_perito || '—';
    tr.querySelector('.disp-concluida-em').textContent = dispositivo.data_conclusao || '—';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-confirmar-entrega';
    btn.textContent = 'Confirmar Entrega';
    btn.addEventListener('click', () => {
        abrirModalConfirmarEntrega(dispositivo, token);
    });
    tr.querySelector('.disp-acoes').appendChild(btn);

    return tr;
}

// ===================== JÁ ENTREGUES (devolvida) — REVERSÃO =====================

function configurarFiltrosEntregues(token) {
    const busca = document.getElementById('filtro-busca-entregues');

    document.getElementById('btn-buscar-entregues').addEventListener('click', () => {
        carregarJaEntregues(token, busca.value.trim());
    });

    document.getElementById('btn-atualizar-entregues').addEventListener('click', () => {
        carregarJaEntregues(token, busca.value.trim());
    });

    busca.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            carregarJaEntregues(token, busca.value.trim());
        }
    });
}

async function carregarJaEntregues(token, busca) {
    const corpo = document.getElementById('corpo-tabela-ja-entregues');
    const tabela = document.getElementById('tabela-ja-entregues');
    const vazio = document.getElementById('ja-entregues-vazio');

    try {
        const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/entregues${query}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Não foi possível carregar os dispositivos já entregues.';
            return;
        }

        const dispositivos = await resposta.json();

        if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Nenhum dispositivo entregue até o momento.';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';
        corpo.innerHTML = '';

        dispositivos.forEach(dispositivo => {
            corpo.appendChild(criarLinhaJaEntregue(dispositivo, token));
        });

    } catch (error) {
        console.error('Erro ao buscar dispositivos já entregues:', error);
        tabela.style.display = 'none';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar os dispositivos já entregues.';
    }
}

function criarLinhaJaEntregue(dispositivo, token) {
    const tr = document.createElement('tr');
    tr.dataset.id = dispositivo.id;

    tr.innerHTML = `
        <td class="disp-id"></td>
        <td class="disp-tipo"></td>
        <td class="disp-modelo"></td>
        <td class="disp-cliente"></td>
        <td class="disp-entregue-em"></td>
        <td class="disp-acoes"></td>
    `;

    tr.querySelector('.disp-id').textContent = dispositivo.id ?? '—';
    tr.querySelector('.disp-tipo').textContent = dispositivo.tipoDispositivo || '—';
    tr.querySelector('.disp-modelo').textContent = dispositivo.modeloDescricao || '—';
    tr.querySelector('.disp-cliente').textContent = dispositivo.nome_cliente || '—';
    tr.querySelector('.disp-entregue-em').textContent = dispositivo.data_entrega || '—';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-reverter-entrega';
    btn.textContent = 'Reverter Entrega';
    btn.addEventListener('click', () => {
        abrirModalReverterEntrega(dispositivo, token);
    });
    tr.querySelector('.disp-acoes').appendChild(btn);

    return tr;
}

// ===================== MODAL: CONFIRMAR ENTREGA =====================

let dispositivoSelecionadoParaEntrega = null;

function configurarModalConfirmarEntrega(token) {
    const modal = document.getElementById('modal-confirmar-entrega');
    const btnFechar = document.getElementById('btn-fechar-confirmar-entrega');
    const form = document.getElementById('form-confirmar-entrega');

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
        dispositivoSelecionadoParaEntrega = null;
    });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!dispositivoSelecionadoParaEntrega) return;

        confirmarEntrega(dispositivoSelecionadoParaEntrega, token);
    });
}

function abrirModalConfirmarEntrega(dispositivo, token) {
    dispositivoSelecionadoParaEntrega = dispositivo;

    const modal = document.getElementById('modal-confirmar-entrega');
    const descricao = document.getElementById('confirmar-entrega-descricao');
    const erro = document.getElementById('erro-confirmar-entrega');
    const form = document.getElementById('form-confirmar-entrega');

    descricao.textContent = `#${dispositivo.id} — ${dispositivo.tipoDispositivo || 'dispositivo'} (${dispositivo.modeloDescricao || 'sem descrição'})`;
    erro.style.display = 'none';
    erro.textContent = '';
    form.reset();

    modal.style.display = 'block';
}

async function confirmarEntrega(dispositivo, token) {
    const erro = document.getElementById('erro-confirmar-entrega');
    const btnConfirmar = document.getElementById('btn-confirmar-entrega-definitivo');

    btnConfirmar.disabled = true;

    try {
        // A rota /logistica/devolver/:id não recebe corpo hoje (só atualiza
        // status 'concluida' -> 'devolvida'). Se você quiser registrar
        // responsavel_retirada/observacao, é preciso adicionar essas colunas
        // e alterar a query dessa rota no backend — o front já está pronto
        // para enviar esses dados quando o backend passar a aceitá-los.
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/devolver/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            erro.textContent = resultado.erro || resultado.mensagem || 'Não foi possível confirmar a entrega. Verifique se você tem permissão para esta ação.';
            erro.style.display = 'block';
            return;
        }

        document.getElementById('modal-confirmar-entrega').style.display = 'none';
        dispositivoSelecionadoParaEntrega = null;

        exibirMensagem(resultado.mensagem || 'Entrega confirmada com sucesso!', false);

        const buscaPendentes = document.getElementById('filtro-busca-pendentes').value.trim();
        const buscaEntregues = document.getElementById('filtro-busca-entregues').value.trim();
        carregarPendentesEntrega(token, buscaPendentes);
        carregarJaEntregues(token, buscaEntregues);

    } catch (error) {
        console.error('Erro ao confirmar entrega:', error);
        erro.textContent = 'Erro de conexão ao confirmar a entrega.';
        erro.style.display = 'block';
    } finally {
        btnConfirmar.disabled = false;
    }
}

// ===================== MODAL: REVERTER ENTREGA =====================

let dispositivoSelecionadoParaReversao = null;

function configurarModalReverterEntrega(token) {
    const modal = document.getElementById('modal-reverter-entrega');
    const btnFechar = document.getElementById('btn-fechar-reverter-entrega');
    const form = document.getElementById('form-reverter-entrega');

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
        dispositivoSelecionadoParaReversao = null;
    });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!dispositivoSelecionadoParaReversao) return;

        reverterEntrega(dispositivoSelecionadoParaReversao, token);
    });
}

function abrirModalReverterEntrega(dispositivo, token) {
    dispositivoSelecionadoParaReversao = dispositivo;

    const modal = document.getElementById('modal-reverter-entrega');
    const descricao = document.getElementById('reverter-entrega-descricao');
    const erro = document.getElementById('erro-reverter-entrega');
    const form = document.getElementById('form-reverter-entrega');

    descricao.textContent = `#${dispositivo.id} — ${dispositivo.tipoDispositivo || 'dispositivo'} (${dispositivo.modeloDescricao || 'sem descrição'})`;
    erro.style.display = 'none';
    erro.textContent = '';
    form.reset();

    modal.style.display = 'block';
}

async function reverterEntrega(dispositivo, token) {
    const erro = document.getElementById('erro-reverter-entrega');
    const btnReverter = document.getElementById('btn-reverter-entrega-definitivo');

    btnReverter.disabled = true;

    try {
        // Rota nova e exclusiva para reversão — não reaproveita mais
        // /logistica/receber/:id, que é só para aguardandoEnvio -> recebidoNaEmpresa.
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/reverter-entrega/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            erro.textContent = resultado.erro || resultado.mensagem || 'Não foi possível reverter a entrega. Verifique se você tem permissão para esta ação.';
            erro.style.display = 'block';
            return;
        }

        document.getElementById('modal-reverter-entrega').style.display = 'none';
        dispositivoSelecionadoParaReversao = null;

        exibirMensagem(resultado.mensagem || 'Entrega revertida com sucesso!', false);

        const buscaPendentes = document.getElementById('filtro-busca-pendentes').value.trim();
        const buscaEntregues = document.getElementById('filtro-busca-entregues').value.trim();
        carregarPendentesEntrega(token, buscaPendentes);
        carregarJaEntregues(token, buscaEntregues);

    } catch (error) {
        console.error('Erro ao reverter entrega:', error);
        erro.textContent = 'Erro de conexão ao reverter a entrega.';
        erro.style.display = 'block';
    } finally {
        btnReverter.disabled = false;
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