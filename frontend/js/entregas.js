// ==========================================================================
// entregas.js
// Lógica da tela "Gestão de Entregas": confirmar a entrega de um dispositivo
// ao cliente após a perícia concluída, e reverter esse processo caso a
// entrega tenha sido confirmada por engano.
//
// IMPORTANTE — NENHUMA ALTERAÇÃO DE BACKEND OU CSS FOI FEITA AQUI, conforme
// solicitado. Este arquivo assume que o backend expõe as rotas abaixo (elas
// ainda precisam ser criadas):
//
//   GET  /api/usuario/perfil                                -> (PRECISA CRIAR
//        no backend; era chamada sem o prefixo /api e sem o campo "role"
//        garantido) usada aqui só para saber quem está logado.
//
//   GET  /api/dispositivos/entregas/pendentes                -> (PRECISA CRIAR)
//        Lista os dispositivos com status = 'concluida' que ainda não foram
//        entregues ao cliente (ex.: campo "entregue" = false/null, ou
//        status !== 'devolvida' se esse status novo tiver sido adotado -
//        confirmar com quem mexe no schema/sql). Aceita ?busca= para
//        filtrar por cliente/tipo/id.
//
//   GET  /api/dispositivos/entregas/entregues                -> (PRECISA CRIAR)
//        Lista os dispositivos já entregues (entregue = true, ou
//        status === 'devolvida'), com data_entrega e o nome de quem
//        confirmou a entrega. Aceita ?busca= para filtrar.
//
//   PUT  /api/dispositivos/logistica/devolver/:id             -> (JÁ EXISTE,
//        rota compartilhada com quem mexe em dispositivos.js) Reaproveitada
//        aqui para "confirmar entrega": o dispositivo concluído sai da
//        empresa e volta para o cliente, o que bate com a semântica de
//        "devolver". Corpo enviado: { responsavel_retirada, observacao }.
//        ATENÇÃO: confirmar com quem mantém essa rota se o corpo aceito e o
//        efeito colateral (status -> 'devolvida'?) são compatíveis com o
//        que esta tela espera.
//
//   PUT  /api/dispositivos/logistica/receber/:id              -> (JÁ EXISTE)
//        Reaproveitada aqui para "reverter entrega": desfazer uma entrega
//        significa que o dispositivo volta a ficar sob custódia da empresa,
//        o que bate com a semântica de "receber". Corpo enviado:
//        { motivo_reversao }. ATENÇÃO: mesma ressalva acima - confirmar se
//        o corpo/efeito colateral batem com o que esta tela espera; se
//        "receber" nesse fluxo for exclusivo do recebimento inicial vindo
//        do cliente (status 'aguardandoEnvio' -> 'recebidoNaEmpresa'), essa
//        rota NÃO deve ser reaproveitada aqui e uma rota nova de reversão
//        precisa ser criada em vez disso.
//
// SOBRE A PERMISSÃO ("sincronizar com o DB para ter permissão"):
//   A verificação de permissão no front (checar o "role" vindo de
//   /usuario/perfil) serve só para decidir o que mostrar na tela — ela é
//   só um atalho de UI. Quem garante a segurança de verdade é o backend: as
//   duas rotas de confirmar/reverter entrega precisam ficar protegidas com
//   verificarToken + permitirCargos(['admin']) (mesmo padrão já usado em
//   outras rotas administrativas do projeto, como
//   /api/auth/admin/aprovar-perito/:id). Assim, mesmo que alguém tente
//   chamar a rota diretamente sem passar pela tela, o servidor consulta o
//   banco/token e barra quem não tem permissão. Este arquivo sempre trata a
//   resposta 401/403 do servidor como a autoridade final, mesmo que a
//   checagem de "role" no front já tenha liberado o botão.
// ==========================================================================

 const API_BASE = 'https://pericia-backend.up.railway.app/api';

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

async function verificarPermissaoEntregas(token) {
    const verificando = document.getElementById('entregas-verificando-permissao');

    try {
        const resposta = await fetch(`${API_BASE}/usuario/perfil`, {
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

        // A checagem abaixo é só para decidir o que mostrar na tela. A
        // permissão de verdade é sempre revalidada pelo backend nas rotas
        // de confirmar/reverter entrega (ver comentário no topo do arquivo).
        if (role !== 'admin') {
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
    configurarFiltrosPendentes(token);
    configurarFiltrosEntregues(token);
    configurarModalConfirmarEntrega(token);
    configurarModalReverterEntrega(token);

    carregarPendentesEntrega(token);
    carregarJaEntregues(token);
}

// ===================== PENDENTES DE ENTREGA =====================

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
        const resposta = await fetch(`${API_BASE}/dispositivos/entregas/pendentes${query}`, {
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
    tr.querySelector('.disp-tipo').textContent = dispositivo.tipo_dispositivo || '—';
    tr.querySelector('.disp-modelo').textContent = dispositivo.modelo_descricao || '—';
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

// ===================== JÁ ENTREGUES (REVERSÃO) =====================

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
        const resposta = await fetch(`${API_BASE}/dispositivos/entregas/entregues${query}`, {
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
        <td class="disp-confirmado-por"></td>
        <td class="disp-acoes"></td>
    `;

    tr.querySelector('.disp-id').textContent = dispositivo.id ?? '—';
    tr.querySelector('.disp-tipo').textContent = dispositivo.tipo_dispositivo || '—';
    tr.querySelector('.disp-modelo').textContent = dispositivo.modelo_descricao || '—';
    tr.querySelector('.disp-cliente').textContent = dispositivo.nome_cliente || '—';
    tr.querySelector('.disp-entregue-em').textContent = dispositivo.data_entrega || '—';
    tr.querySelector('.disp-confirmado-por').textContent = dispositivo.confirmado_por || '—';

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

        const dados = {
            responsavel_retirada: document.getElementById('input-responsavel-retirada').value.trim(),
            observacao: document.getElementById('input-observacao-entrega').value.trim()
        };

        confirmarEntrega(dispositivoSelecionadoParaEntrega, dados, token);
    });
}

function abrirModalConfirmarEntrega(dispositivo, token) {
    dispositivoSelecionadoParaEntrega = dispositivo;

    const modal = document.getElementById('modal-confirmar-entrega');
    const descricao = document.getElementById('confirmar-entrega-descricao');
    const erro = document.getElementById('erro-confirmar-entrega');
    const form = document.getElementById('form-confirmar-entrega');

    descricao.textContent = `#${dispositivo.id} — ${dispositivo.tipo_dispositivo || 'dispositivo'} (${dispositivo.modelo_descricao || 'sem descrição'})`;
    erro.style.display = 'none';
    erro.textContent = '';
    form.reset();

    modal.style.display = 'block';
}

async function confirmarEntrega(dispositivo, dados, token) {
    const erro = document.getElementById('erro-confirmar-entrega');
    const btnConfirmar = document.getElementById('btn-confirmar-entrega-definitivo');

    if (!dados.responsavel_retirada) {
        erro.textContent = 'Informe o nome de quem retirou o dispositivo.';
        erro.style.display = 'block';
        return;
    }

    btnConfirmar.disabled = true;

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/devolver/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            // 401/403 aqui normalmente significa que o servidor recusou a
            // permissão mesmo que o front tenha liberado o botão — é
            // exatamente esse o ponto de sincronizar a permissão com o banco.
            erro.textContent = resultado.mensagem || resultado.erro || 'Não foi possível confirmar a entrega. Verifique se você tem permissão para esta ação.';
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

        const dados = {
            motivo_reversao: document.getElementById('input-motivo-reversao').value.trim()
        };

        reverterEntrega(dispositivoSelecionadoParaReversao, dados, token);
    });
}

function abrirModalReverterEntrega(dispositivo, token) {
    dispositivoSelecionadoParaReversao = dispositivo;

    const modal = document.getElementById('modal-reverter-entrega');
    const descricao = document.getElementById('reverter-entrega-descricao');
    const erro = document.getElementById('erro-reverter-entrega');
    const form = document.getElementById('form-reverter-entrega');

    descricao.textContent = `#${dispositivo.id} — ${dispositivo.tipo_dispositivo || 'dispositivo'} (${dispositivo.modelo_descricao || 'sem descrição'})`;
    erro.style.display = 'none';
    erro.textContent = '';
    form.reset();

    modal.style.display = 'block';
}

async function reverterEntrega(dispositivo, dados, token) {
    const erro = document.getElementById('erro-reverter-entrega');
    const btnReverter = document.getElementById('btn-reverter-entrega-definitivo');

    if (!dados.motivo_reversao) {
        erro.textContent = 'Informe o motivo da reversão.';
        erro.style.display = 'block';
        return;
    }

    btnReverter.disabled = true;

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/logistica/receber/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            erro.textContent = resultado.mensagem || resultado.erro || 'Não foi possível reverter a entrega. Verifique se você tem permissão para esta ação.';
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