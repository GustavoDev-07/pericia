// ==========================================================================
// admin.js
// Lógica do Painel do Administrador: visão geral (dashboard), aprovação de
// candidaturas a perito, acompanhamento de todos os dispositivos (incluindo
// a confirmação de entrada física do dispositivo na empresa) e o novo
// módulo de Auditoria, que lista os eventos importantes do sistema.
//
// IMPORTANTE — NENHUMA ALTERAÇÃO DE BACKEND OU CSS FOI FEITA AQUI, conforme
// solicitado. Este arquivo assume que o backend expõe as rotas abaixo. As
// que já existem no backend atual estão marcadas com "(já existe)"; as
// demais precisam ser criadas para que esta tela funcione de ponta a ponta.
//
//   GET  /usuario/perfil                              -> (já existe) dados do usuário logado.
//        Precisa passar a incluir também o campo "role" (ex.: "admin",
//        "perito", "cliente") na resposta, pois é isso que esta página usa
//        para decidir se o usuário pode ver o painel e confirmar a entrada
//        de dispositivos na empresa. Hoje o token/rotas de login não
//        devolvem o "role" para o front, então isso precisa ser ajustado.
//
//   GET  /api/auth/admin/dashboard                     -> (já existe) cards +
//        gráfico por tipo de dispositivo.
//
//   PUT  /api/auth/admin/aprovar-perito/:id             -> (já existe)
//   PUT  /api/auth/admin/recusar-perito/:id              -> (já existe)
//
//   GET  /api/auth/admin/candidaturas-pendentes          -> (PRECISA CRIAR)
//        Deve retornar a lista de usuários com status_aprovacao = 'pendente'
//        (id, nome, email) para popular a seção de candidaturas.
//
//   GET  /api/dispositivos/admin/todos                    -> (PRECISA CRIAR)
//        Lista todos os dispositivos do sistema com os dados do cliente e
//        do perito responsável (parecido com o JOIN usado em
//        /dispositivos/meus-servicos), incluindo um novo campo
//        "localizacao" (ex.: 'com_cliente' | 'em_transporte' | 'empresa').
//        Aceita filtro opcional por status via query string (?status=).
//
//   PUT  /api/dispositivos/admin/confirmar-entrada/:id     -> (PRECISA CRIAR)
//        Atualiza a coluna "localizacao" do dispositivo para 'empresa'.
//        Recomenda-se restringir com permitirCargos(['admin']) (mesmo
//        padrão já usado em outras rotas de admin) para garantir que só
//        quem tem essa permissão possa confirmar a entrada — dessa forma
//        não é necessário criar um cargo novo, basta reaproveitar o
//        controle de "role" que já existe em autenticacao.js. Essa rota
//        também deveria gravar um evento na tabela de auditoria (ver
//        abaixo).
//
//   GET  /api/auditoria                                    -> (PRECISA CRIAR)
//        Lista os eventos do sistema para a aba de Auditoria. Sugestão de
//        estrutura (ex.: nova tabela "auditoria" no banco):
//          id, tipo (dispositivo_cadastrado, dispositivo_entrada_empresa,
//          dispositivo_assumido, pericia_finalizada, perito_aprovado,
//          perito_recusado, login, ...), descricao, usuario_id,
//          usuario_nome, dispositivo_id, data_hora.
//        Aceita query string opcional: ?tipo=&busca=&pagina=&limite=
//        Cada rota que gera um evento relevante (cadastrar dispositivo,
//        assumir dispositivo, finalizar perícia, aprovar/recusar perito,
//        confirmar entrada na empresa, login) precisaria inserir uma linha
//        nessa tabela.
// ==========================================================================

// const API_BASE = 'http://127.0.0.1:3000/api';

// let paginaAuditoriaAtual = 1;
// const LIMITE_AUDITORIA_POR_PAGINA = 20;

// document.addEventListener('DOMContentLoaded', () => {
//     const token = localStorage.getItem('token');

//     if (!token) {
//         exibirMensagem('Você precisa estar logado como administrador para acessar esta página.', true);
//         window.location.href = 'login.html';
//         return;
//     }

//     verificarPermissaoAdmin(token);
// });

// ===================== CONTROLE DE ACESSO =====================

async function verificarPermissaoAdmin(token) {
    try {
        const resposta = await fetch('http://127.0.0.1:3000/usuario/perfil', {
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

        // Fallback: caso /usuario/perfil ainda não devolva "role", tenta
        // extrair do payload do token JWT (também precisa ser incluído lá).
        const role = dados.role || obterRoleDoToken(token);

        if (role !== 'admin') {
            document.getElementById('admin-sem-permissao').style.display = 'block';
            document.getElementById('admin-conteudo').style.display = 'none';
            return;
        }

        document.getElementById('admin-sem-permissao').style.display = 'none';
        document.getElementById('admin-conteudo').style.display = 'block';

        inicializarPainel(token);

    } catch (error) {
        console.error('Erro ao verificar permissão de administrador:', error);
        exibirMensagem('Erro de conexão ao verificar suas permissões.', true);
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

function inicializarPainel(token) {
    carregarDashboard(token);
    carregarCandidaturas(token);
    configurarFiltroDispositivos(token);
    carregarDispositivosAdmin(token);
    configurarModalConfirmarEntrada(token);
    configurarFiltroAuditoria(token);
    carregarAuditoria(token, { reiniciar: true });
}

// ===================== DASHBOARD =====================

async function carregarDashboard(token) {
    try {
        const resposta = await fetch(`${API_BASE}/auth/admin/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            console.warn('Não foi possível carregar os dados do dashboard.');
            return;
        }

        const dados = await resposta.json();
        const cards = dados.cards || {};

        document.getElementById('card-total-peritos').textContent = cards.total_peritos ?? '—';
        document.getElementById('card-fila-espera').textContent = cards.fila_espera ?? '—';
        document.getElementById('card-em-analise').textContent = cards.em_analise ?? '—';

        const listaTipos = document.getElementById('lista-grafico-tipos');
        listaTipos.innerHTML = '';

        const grafico = Array.isArray(dados.grafico_tipos) ? dados.grafico_tipos : [];

        if (grafico.length === 0) {
            listaTipos.innerHTML = '<li>Nenhum dispositivo cadastrado ainda.</li>';
            return;
        }

        grafico.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.tipo_dispositivo}: ${item.quantidade}`;
            listaTipos.appendChild(li);
        });

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        exibirMensagem('Erro de conexão ao carregar a visão geral.', true);
    }
}

// ===================== CANDIDATURAS A PERITO =====================

async function carregarCandidaturas(token) {
    const container = document.getElementById('lista-candidaturas');
    const vazio = document.getElementById('candidaturas-vazia');

    try {
        const resposta = await fetch(`${API_BASE}/auth/admin/candidaturas-pendentes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            console.warn('Não foi possível carregar as candidaturas pendentes.');
            container.innerHTML = '';
            vazio.style.display = 'block';
            vazio.textContent = 'Não foi possível carregar as candidaturas no momento.';
            return;
        }

        const candidaturas = await resposta.json();

        if (!Array.isArray(candidaturas) || candidaturas.length === 0) {
            container.innerHTML = '';
            vazio.style.display = 'block';
            vazio.textContent = 'Não há candidaturas pendentes no momento.';
            return;
        }

        vazio.style.display = 'none';
        container.innerHTML = '';

        candidaturas.forEach(candidato => {
            container.appendChild(criarCardCandidatura(candidato, token));
        });

    } catch (error) {
        console.error('Erro ao buscar candidaturas pendentes:', error);
        container.innerHTML = '';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar candidaturas.';
    }
}

function criarCardCandidatura(candidato, token) {
    const card = document.createElement('article');
    card.className = 'candidatura-item';
    card.dataset.id = candidato.id;

    card.innerHTML = `
        <p><strong>Nome:</strong> <span class="candidatura-nome"></span></p>
        <p><strong>E-mail:</strong> <span class="candidatura-email"></span></p>
        <div class="candidatura-acoes">
            <button type="button" class="btn-aprovar-perito">Aprovar</button>
            <button type="button" class="btn-recusar-perito">Recusar</button>
        </div>
    `;

    card.querySelector('.candidatura-nome').textContent = candidato.nome || '—';
    card.querySelector('.candidatura-email').textContent = candidato.email || '—';

    card.querySelector('.btn-aprovar-perito').addEventListener('click', () => {
        decidirCandidatura(candidato.id, 'aprovar', token, card);
    });

    card.querySelector('.btn-recusar-perito').addEventListener('click', () => {
        decidirCandidatura(candidato.id, 'recusar', token, card);
    });

    return card;
}

async function decidirCandidatura(idCandidato, decisao, token, card) {
    const rota = decisao === 'aprovar' ? 'aprovar-perito' : 'recusar-perito';
    const confirmar = confirm(
        decisao === 'aprovar'
            ? 'Confirma a aprovação deste candidato a perito?'
            : 'Confirma a recusa desta candidatura?'
    );
    if (!confirmar) return;

    try {
        const resposta = await fetch(`${API_BASE}/auth/admin/${rota}/${idCandidato}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            exibirMensagem(resultado.mensagem || resultado.erro || 'Não foi possível processar a candidatura.', true);
            return;
        }

        exibirMensagem(resultado.mensagem || 'Candidatura atualizada com sucesso!', false);

        card.style.transition = 'opacity 0.3s ease';
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
            const container = document.getElementById('lista-candidaturas');
            if (!container.children.length) {
                const vazio = document.getElementById('candidaturas-vazia');
                vazio.textContent = 'Não há candidaturas pendentes no momento.';
                vazio.style.display = 'block';
            }
        }, 300);

        // A aprovação/recusa muda o total de peritos e a fila, então
        // atualizamos os cards do dashboard também.
        carregarDashboard(token);

    } catch (error) {
        console.error('Erro ao decidir candidatura:', error);
        exibirMensagem('Erro de conexão ao processar a candidatura.', true);
    }
}

// ===================== DISPOSITIVOS / LOCALIZAÇÃO =====================

function configurarFiltroDispositivos(token) {
    const filtro = document.getElementById('filtro-status-dispositivo');
    filtro.addEventListener('change', () => {
        carregarDispositivosAdmin(token, filtro.value);
    });
}

async function carregarDispositivosAdmin(token, status) {
    const corpo = document.getElementById('corpo-tabela-dispositivos-admin');
    const tabela = document.getElementById('tabela-dispositivos-admin');
    const vazio = document.getElementById('dispositivos-admin-vazio');

    try {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        const resposta = await fetch(`${API_BASE}/dispositivos/admin/todos${query}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Não foi possível carregar a lista de dispositivos.';
            return;
        }

        const dispositivos = await resposta.json();

        if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Nenhum dispositivo encontrado.';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';
        corpo.innerHTML = '';

        dispositivos.forEach(dispositivo => {
            corpo.appendChild(criarLinhaDispositivoAdmin(dispositivo, token));
        });

    } catch (error) {
        console.error('Erro ao buscar dispositivos (admin):', error);
        tabela.style.display = 'none';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar dispositivos.';
    }
}

function criarLinhaDispositivoAdmin(dispositivo, token) {
    const tr = document.createElement('tr');
    tr.dataset.id = dispositivo.id;

    const localizacao = dispositivo.localizacao || 'com_cliente';
    const jaEstaNaEmpresa = localizacao === 'empresa';

    tr.innerHTML = `
        <td class="disp-id"></td>
        <td class="disp-tipo"></td>
        <td class="disp-modelo"></td>
        <td class="disp-cliente"></td>
        <td class="disp-perito"></td>
        <td class="disp-status"></td>
        <td class="disp-localizacao"></td>
        <td class="disp-acoes"></td>
    `;

    tr.querySelector('.disp-id').textContent = dispositivo.id ?? '—';
    tr.querySelector('.disp-tipo').textContent = dispositivo.tipo_dispositivo || '—';
    tr.querySelector('.disp-modelo').textContent = dispositivo.modelo_descricao || '—';
    tr.querySelector('.disp-cliente').textContent = dispositivo.nome_cliente || '—';
    tr.querySelector('.disp-perito').textContent = dispositivo.nome_perito || 'Ainda não atribuído';
    tr.querySelector('.disp-status').textContent = formatarStatusDispositivo(dispositivo.status);
    tr.querySelector('.disp-localizacao').textContent = formatarLocalizacao(localizacao);

    const celulaAcoes = tr.querySelector('.disp-acoes');

    if (jaEstaNaEmpresa) {
        celulaAcoes.textContent = 'Entrada já confirmada';
    } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-confirmar-entrada-dispositivo';
        btn.textContent = 'Confirmar Entrada na Empresa';
        btn.addEventListener('click', () => {
            abrirModalConfirmarEntrada(dispositivo, token);
        });
        celulaAcoes.appendChild(btn);
    }

    return tr;
}

function formatarStatusDispositivo(status) {
    const mapa = {
        aguardando_perito: 'Aguardando Perito',
        em_analise: 'Em Análise',
        concluida: 'Concluída'
    };
    return mapa[status] || status || '—';
}

function formatarLocalizacao(localizacao) {
    const mapa = {
        com_cliente: 'Com o cliente / a caminho',
        em_transporte: 'Em transporte',
        empresa: 'Na empresa'
    };
    return mapa[localizacao] || localizacao || '—';
}

// ===================== MODAL: CONFIRMAR ENTRADA NA EMPRESA =====================

let dispositivoSelecionadoParaEntrada = null;

function configurarModalConfirmarEntrada(token) {
    const modal = document.getElementById('modal-confirmar-entrada');
    const btnFechar = document.getElementById('btn-fechar-confirmar-entrada');
    const btnConfirmar = document.getElementById('btn-confirmar-entrada-definitivo');

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
        dispositivoSelecionadoParaEntrada = null;
    });

    btnConfirmar.addEventListener('click', () => {
        if (dispositivoSelecionadoParaEntrada) {
            confirmarEntradaDispositivo(dispositivoSelecionadoParaEntrada, token);
        }
    });
}

function abrirModalConfirmarEntrada(dispositivo, token) {
    dispositivoSelecionadoParaEntrada = dispositivo;

    const modal = document.getElementById('modal-confirmar-entrada');
    const descricao = document.getElementById('confirmar-entrada-descricao');
    const erro = document.getElementById('erro-confirmar-entrada');

    const nomeDispositivo = `#${dispositivo.id} — ${dispositivo.tipo_dispositivo || 'dispositivo'} (${dispositivo.modelo_descricao || 'sem descrição'})`;
    descricao.textContent = nomeDispositivo;
    erro.style.display = 'none';
    erro.textContent = '';

    modal.style.display = 'block';
}

async function confirmarEntradaDispositivo(dispositivo, token) {
    const erro = document.getElementById('erro-confirmar-entrada');
    const btnConfirmar = document.getElementById('btn-confirmar-entrada-definitivo');
    btnConfirmar.disabled = true;

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/admin/confirmar-entrada/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            erro.textContent = resultado.mensagem || resultado.erro || 'Não foi possível confirmar a entrada. Verifique se você tem permissão para esta ação.';
            erro.style.display = 'block';
            return;
        }

        document.getElementById('modal-confirmar-entrada').style.display = 'none';
        dispositivoSelecionadoParaEntrada = null;

        exibirMensagem(resultado.mensagem || 'Entrada do dispositivo confirmada com sucesso!', false);

        const filtro = document.getElementById('filtro-status-dispositivo');
        carregarDispositivosAdmin(token, filtro.value);

        // A confirmação de entrada é justamente o tipo de evento que deve
        // aparecer na auditoria, então recarregamos a lista também.
        carregarAuditoria(token, { reiniciar: true });

    } catch (error) {
        console.error('Erro ao confirmar entrada do dispositivo:', error);
        erro.textContent = 'Erro de conexão ao confirmar a entrada do dispositivo.';
        erro.style.display = 'block';
    } finally {
        btnConfirmar.disabled = false;
    }
}

// ===================== AUDITORIA =====================

function configurarFiltroAuditoria(token) {
    const btnFiltrar = document.getElementById('btn-filtrar-auditoria');
    const btnCarregarMais = document.getElementById('btn-carregar-mais-auditoria');

    btnFiltrar.addEventListener('click', () => {
        carregarAuditoria(token, { reiniciar: true });
    });

    document.getElementById('filtro-busca-auditoria').addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            carregarAuditoria(token, { reiniciar: true });
        }
    });

    btnCarregarMais.addEventListener('click', () => {
        carregarAuditoria(token, { reiniciar: false });
    });
}

async function carregarAuditoria(token, { reiniciar }) {
    const tipo = document.getElementById('filtro-tipo-evento').value;
    const busca = document.getElementById('filtro-busca-auditoria').value.trim();

    if (reiniciar) {
        paginaAuditoriaAtual = 1;
        document.getElementById('corpo-tabela-auditoria').innerHTML = '';
    }

    const corpo = document.getElementById('corpo-tabela-auditoria');
    const tabela = document.getElementById('tabela-auditoria');
    const vazio = document.getElementById('auditoria-vazia');
    const btnCarregarMais = document.getElementById('btn-carregar-mais-auditoria');

    try {
        const parametros = new URLSearchParams();
        if (tipo) parametros.set('tipo', tipo);
        if (busca) parametros.set('busca', busca);
        parametros.set('pagina', paginaAuditoriaAtual);
        parametros.set('limite', LIMITE_AUDITORIA_POR_PAGINA);

        const resposta = await fetch(`${API_BASE}/auditoria?${parametros.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resposta.ok) {
            tabela.style.display = corpo.children.length ? 'table' : 'none';
            vazio.style.display = corpo.children.length ? 'none' : 'block';
            vazio.textContent = 'Não foi possível carregar a auditoria no momento.';
            btnCarregarMais.style.display = 'none';
            return;
        }

        const dados = await resposta.json();
        // Aceita tanto um array simples quanto um objeto { eventos, temMais }
        const eventos = Array.isArray(dados) ? dados : (dados.eventos || []);
        const temMais = Array.isArray(dados) ? false : Boolean(dados.temMais);

        if (eventos.length === 0 && corpo.children.length === 0) {
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Nenhum evento encontrado para os filtros selecionados.';
            btnCarregarMais.style.display = 'none';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';

        eventos.forEach(evento => {
            corpo.appendChild(criarLinhaAuditoria(evento));
        });

        btnCarregarMais.style.display = temMais ? 'inline-block' : 'none';
        paginaAuditoriaAtual += 1;

    } catch (error) {
        console.error('Erro ao buscar auditoria:', error);
        vazio.style.display = corpo.children.length ? 'none' : 'block';
        vazio.textContent = 'Erro de conexão ao buscar a auditoria.';
        btnCarregarMais.style.display = 'none';
    }
}

function criarLinhaAuditoria(evento) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
        <td class="auditoria-data"></td>
        <td class="auditoria-evento"></td>
        <td class="auditoria-usuario"></td>
        <td class="auditoria-detalhes"></td>
    `;

    tr.querySelector('.auditoria-data').textContent = evento.data_hora || '—';
    tr.querySelector('.auditoria-evento').textContent = formatarTipoEvento(evento.tipo) || 'Evento';
    tr.querySelector('.auditoria-usuario').textContent = evento.usuario_nome || 'Sistema';
    tr.querySelector('.auditoria-detalhes').textContent = evento.descricao || '—';

    return tr;
}

function formatarTipoEvento(tipo) {
    const mapa = {
        dispositivo_cadastrado: 'Dispositivo cadastrado',
        dispositivo_entrada_empresa: 'Entrada confirmada na empresa',
        dispositivo_assumido: 'Dispositivo assumido por perito',
        pericia_finalizada: 'Perícia finalizada',
        perito_aprovado: 'Candidatura a perito aprovada',
        perito_recusado: 'Candidatura a perito recusada',
        login: 'Login no sistema'
    };
    return mapa[tipo] || tipo;
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