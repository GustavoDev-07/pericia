// // ==========================================================================
// peritos.js
// Lógica da tela "Área do Perito":
//   1) Listar e aceitar dispositivos disponíveis (enviados pelo cliente e já
//      recebidos pela empresa, ainda sem perito responsável).
//   2) Listar os casos que o perito já assumiu e que estão em análise.
//   3) Finalizar a perícia: o perito escolhe o tipo de serviço realizado
//      (Clonagem, Análise ou Recuperação) e escreve, com o máximo de
//      detalhes possível, tudo o que foi feito no dispositivo. Essas
//      informações são enviadas como o laudo técnico (parecer_tecnico).
//
// IMPORTANTE — NENHUMA ALTERAÇÃO DE BACKEND OU CSS FOI FEITA AQUI, conforme
// solicitado. Este arquivo usa apenas rotas que já existem no backend atual
// (backend/js/routes/dispositivos.js):
//
//   GET  /usuario/perfil                              -> dados do usuário logado (mesmo padrão já usado em inicio.js/admin.js/entregas.js), usado aqui só para saber a role de quem está logado.
//   GET  /api/dispositivos/disponiveis                 -> (já existe) dispositivos recebidos na empresa e sem perito.
//   PUT  /api/dispositivos/assumir-dispositivos/:id     -> (já existe) aceita/assume o dispositivo. Aceita multipart/form-data com um campo opcional "foto".
//   GET  /api/dispositivos/meus-casos                   -> (já existe) dispositivos que o perito logado já assumiu e estão em_analise.
//   PUT  /api/dispositivos/finalizar-pericia/:id         -> (já existe) recebe { parecer_tecnico } e marca o dispositivo como concluído.
//
// SOBRE O "TIPO DE SERVIÇO" (Clonagem / Análise / Recuperação):
//   A tabela "dispositivos" no banco atual não tem uma coluna própria para
//   esse campo, e como pedido não alterar o backend, o tipo escolhido pelo
//   perito é incluído como a primeira linha do texto enviado em
//   "parecer_tecnico" (o laudo). Assim, a informação continua sendo
//   registrada no laudo do dispositivo, sem precisar de nenhuma mudança no
//   servidor ou no banco de dados. Se no futuro o backend ganhar uma coluna
//   própria (ex.: "tipo_servico"), basta enviar esse campo separadamente
//   aqui em finalizarPericia().
//
// SOBRE A PERMISSÃO:
//   A verificação de permissão no front (checar o "role" vindo de
//   /usuario/perfil) serve só para decidir o que mostrar na tela — ela é só
//   um atalho de UI. Quem garante a segurança de verdade é o backend: as
//   rotas de assumir/meus-casos/finalizar já ficam protegidas com
//   verificarToken + permitirCargos(['perito']). Este arquivo sempre trata
//   a resposta 401/403 do servidor como a autoridade final, mesmo que a
//   checagem de "role" no front já tenha liberado a tela.
// ==========================================================================

const API_BASE = 'http://127.0.0.1:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        exibirMensagem('Você precisa estar logado como perito para acessar esta página.', true);
        window.location.href = 'login.html';
        return;
    }

    verificarPermissaoPerito(token);
});

// ===================== CONTROLE DE ACESSO =====================

async function verificarPermissaoPerito(token) {
    const verificando = document.getElementById('peritos-verificando-permissao');

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
        const role = dados.role || obterRoleDoToken(token);

        verificando.style.display = 'none';

        // A checagem abaixo é só para decidir o que mostrar na tela. A
        // permissão de verdade é sempre revalidada pelo backend nas rotas
        // de aceitar/finalizar dispositivo (ver comentário no topo do arquivo).
        if (role !== 'perito') {
            document.getElementById('peritos-sem-permissao').style.display = 'block';
            document.getElementById('peritos-conteudo').style.display = 'none';
            return;
        }

        document.getElementById('peritos-sem-permissao').style.display = 'none';
        document.getElementById('peritos-conteudo').style.display = 'block';

        inicializarPagina(token);

    } catch (error) {
        console.error('Erro ao verificar permissão de perito:', error);
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
    configurarListaDisponiveis(token);
    configurarListaMeusCasos(token);
    configurarModalAceitarDispositivo(token);
    configurarModalFinalizarPericia(token);

    carregarDisponiveis(token);
    carregarMeusCasos(token);
}

// ===================== SEÇÃO: DISPOSITIVOS DISPONÍVEIS =====================

function configurarListaDisponiveis(token) {
    document.getElementById('btn-atualizar-disponiveis').addEventListener('click', () => {
        carregarDisponiveis(token);
    });
}

async function carregarDisponiveis(token) {
    const corpo = document.getElementById('corpo-tabela-disponiveis');
    const tabela = document.getElementById('tabela-disponiveis');
    const vazio = document.getElementById('disponiveis-vazio');

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/disponiveis`, {
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
            vazio.textContent = 'Não foi possível carregar os dispositivos disponíveis.';
            return;
        }

        const dispositivos = await resposta.json();

        if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Nenhum dispositivo disponível para perícia no momento.';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';
        corpo.innerHTML = '';

        dispositivos.forEach(dispositivo => {
            corpo.appendChild(criarLinhaDisponivel(dispositivo, token));
        });

    } catch (error) {
        console.error('Erro ao buscar dispositivos disponíveis:', error);
        tabela.style.display = 'none';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar os dispositivos disponíveis.';
    }
}

function criarLinhaDisponivel(dispositivo, token) {
    const linha = document.createElement('tr');

    linha.innerHTML = `
        <td>${dispositivo.id}</td>
        <td>${escapeHtml(dispositivo.tipo_dispositivo || '—')}</td>
        <td>${escapeHtml(dispositivo.modelo_descricao || '—')}</td>
        <td>${escapeHtml(dispositivo.forma_entrega || '—')}</td>
        <td>${escapeHtml(dispositivo.codigo_rastreio || '—')}</td>
        <td>${formatarData(dispositivo.data_entrada)}</td>
        <td></td>
    `;

    const celulaAcoes = linha.lastElementChild;
    const btnAceitar = document.createElement('button');
    btnAceitar.type = 'button';
    btnAceitar.textContent = 'Aceitar Dispositivo';
    btnAceitar.addEventListener('click', () => {
        abrirModalAceitarDispositivo(dispositivo, token);
    });
    celulaAcoes.appendChild(btnAceitar);

    return linha;
}

// ===================== MODAL: ACEITAR DISPOSITIVO =====================

let dispositivoSelecionadoParaAceitar = null;

function configurarModalAceitarDispositivo(token) {
    const modal = document.getElementById('modal-aceitar-dispositivo');
    const btnFechar = document.getElementById('btn-fechar-aceitar');
    const form = document.getElementById('form-aceitar-dispositivo');

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
        dispositivoSelecionadoParaAceitar = null;
    });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!dispositivoSelecionadoParaAceitar) return;

        const inputFoto = document.getElementById('input-foto-evidencia');
        const arquivoFoto = inputFoto.files[0] || null;

        aceitarDispositivo(dispositivoSelecionadoParaAceitar, arquivoFoto, token);
    });
}

function abrirModalAceitarDispositivo(dispositivo, token) {
    dispositivoSelecionadoParaAceitar = dispositivo;

    const modal = document.getElementById('modal-aceitar-dispositivo');
    const descricao = document.getElementById('aceitar-descricao');
    const erro = document.getElementById('erro-aceitar-dispositivo');
    const form = document.getElementById('form-aceitar-dispositivo');

    descricao.textContent = `#${dispositivo.id} — ${dispositivo.tipo_dispositivo || 'dispositivo'} (${dispositivo.modelo_descricao || 'sem descrição'})`;
    erro.style.display = 'none';
    erro.textContent = '';
    form.reset();

    modal.style.display = 'block';
}

async function aceitarDispositivo(dispositivo, arquivoFoto, token) {
    const erro = document.getElementById('erro-aceitar-dispositivo');
    const btnAceitar = document.getElementById('btn-aceitar-definitivo');

    btnAceitar.disabled = true;

    try {
        const formData = new FormData();
        if (arquivoFoto) {
            formData.append('foto', arquivoFoto);
        }

        const resposta = await fetch(`${API_BASE}/dispositivos/assumir-dispositivos/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
                // Não definir Content-Type aqui: o navegador define o boundary do FormData automaticamente
            },
            body: formData
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            // 400/401/403 aqui normalmente significa que o dispositivo já foi
            // assumido por outro perito, ou que o servidor recusou a
            // permissão mesmo que o front tenha liberado o botão.
            erro.textContent = resultado.mensagem || resultado.erro || 'Não foi possível aceitar este dispositivo. Ele pode já ter sido assumido por outro perito.';
            erro.style.display = 'block';
            return;
        }

        document.getElementById('modal-aceitar-dispositivo').style.display = 'none';
        dispositivoSelecionadoParaAceitar = null;

        exibirMensagem(resultado.mensagem || 'Dispositivo aceito com sucesso! Ele já aparece como "Pedido Aceito" no painel do cliente.', false);

        // Atualiza as duas listas: o dispositivo sai de "Disponíveis" e
        // entra em "Meus Casos em Andamento".
        carregarDisponiveis(token);
        carregarMeusCasos(token);

    } catch (error) {
        console.error('Erro ao aceitar dispositivo:', error);
        erro.textContent = 'Erro de conexão ao aceitar o dispositivo.';
        erro.style.display = 'block';
    } finally {
        btnAceitar.disabled = false;
    }
}

// ===================== SEÇÃO: MEUS CASOS EM ANDAMENTO =====================

function configurarListaMeusCasos(token) {
    document.getElementById('btn-atualizar-meus-casos').addEventListener('click', () => {
        carregarMeusCasos(token);
    });
}

async function carregarMeusCasos(token) {
    const corpo = document.getElementById('corpo-tabela-meus-casos');
    const tabela = document.getElementById('tabela-meus-casos');
    const vazio = document.getElementById('meus-casos-vazio');

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/meus-casos`, {
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
            vazio.textContent = 'Não foi possível carregar seus casos em andamento.';
            return;
        }

        const dispositivos = await resposta.json();

        if (!Array.isArray(dispositivos) || dispositivos.length === 0) {
            corpo.innerHTML = '';
            tabela.style.display = 'none';
            vazio.style.display = 'block';
            vazio.textContent = 'Você ainda não assumiu nenhum dispositivo.';
            return;
        }

        vazio.style.display = 'none';
        tabela.style.display = 'table';
        corpo.innerHTML = '';

        dispositivos.forEach(dispositivo => {
            corpo.appendChild(criarLinhaMeuCaso(dispositivo, token));
        });

    } catch (error) {
        console.error('Erro ao buscar meus casos:', error);
        tabela.style.display = 'none';
        vazio.style.display = 'block';
        vazio.textContent = 'Erro de conexão ao buscar seus casos em andamento.';
    }
}

function criarLinhaMeuCaso(dispositivo, token) {
    const linha = document.createElement('tr');

    linha.innerHTML = `
        <td>${dispositivo.id}</td>
        <td>${escapeHtml(dispositivo.tipo_dispositivo || '—')}</td>
        <td>${escapeHtml(dispositivo.modelo_descricao || '—')}</td>
        <td>${formatarData(dispositivo.data_entrada)}</td>
        <td></td>
    `;

    const celulaAcoes = linha.lastElementChild;
    const btnFinalizar = document.createElement('button');
    btnFinalizar.type = 'button';
    btnFinalizar.textContent = 'Finalizar Perícia / Registrar Laudo';
    btnFinalizar.addEventListener('click', () => {
        abrirModalFinalizarPericia(dispositivo, token);
    });
    celulaAcoes.appendChild(btnFinalizar);

    return linha;
}

// ===================== MODAL: FINALIZAR PERÍCIA =====================

let dispositivoSelecionadoParaFinalizar = null;

function configurarModalFinalizarPericia(token) {
    const modal = document.getElementById('modal-finalizar-pericia');
    const btnFechar = document.getElementById('btn-fechar-finalizar');
    const form = document.getElementById('form-finalizar-pericia');

    btnFechar.addEventListener('click', () => {
        modal.style.display = 'none';
        dispositivoSelecionadoParaFinalizar = null;
    });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!dispositivoSelecionadoParaFinalizar) return;

        const tipoServico = document.getElementById('select-tipo-servico').value;
        const descricao = document.getElementById('textarea-parecer-tecnico').value.trim();

        finalizarPericia(dispositivoSelecionadoParaFinalizar, tipoServico, descricao, token);
    });
}

function abrirModalFinalizarPericia(dispositivo, token) {
    dispositivoSelecionadoParaFinalizar = dispositivo;

    const modal = document.getElementById('modal-finalizar-pericia');
    const descricaoEl = document.getElementById('finalizar-descricao');
    const erro = document.getElementById('erro-finalizar-pericia');
    const form = document.getElementById('form-finalizar-pericia');

    descricaoEl.textContent = `#${dispositivo.id} — ${dispositivo.tipo_dispositivo || 'dispositivo'} (${dispositivo.modelo_descricao || 'sem descrição'})`;
    erro.style.display = 'none';
    erro.textContent = '';
    form.reset();

    modal.style.display = 'block';
}

async function finalizarPericia(dispositivo, tipoServico, descricao, token) {
    const erro = document.getElementById('erro-finalizar-pericia');
    const btnFinalizar = document.getElementById('btn-finalizar-definitivo');

    if (!tipoServico) {
        erro.textContent = 'Selecione o tipo de serviço realizado (Clonagem, Análise ou Recuperação).';
        erro.style.display = 'block';
        return;
    }

    if (!descricao) {
        erro.textContent = 'Descreva, com o máximo de detalhes possível, o que foi feito no dispositivo.';
        erro.style.display = 'block';
        return;
    }

    // O tipo de serviço escolhido é incluído no início do laudo, já que o
    // backend ainda não tem uma coluna própria para esse dado (ver
    // comentário no topo do arquivo).
    const parecerTecnico = `Tipo de serviço: ${tipoServico}\n\n${descricao}`;

    btnFinalizar.disabled = true;

    try {
        const resposta = await fetch(`${API_BASE}/dispositivos/finalizar-pericia/${dispositivo.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ parecer_tecnico: parecerTecnico })
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            erro.textContent = resultado.erro || resultado.mensagem || 'Não foi possível finalizar a perícia. Verifique se você é o perito responsável por este dispositivo.';
            erro.style.display = 'block';
            return;
        }

        document.getElementById('modal-finalizar-pericia').style.display = 'none';
        dispositivoSelecionadoParaFinalizar = null;

        exibirMensagem(resultado.mensagem || 'Perícia finalizada com sucesso! O laudo já está disponível para o cliente.', false);

        // O dispositivo concluído sai da lista de "Meus Casos em Andamento".
        carregarMeusCasos(token);

    } catch (error) {
        console.error('Erro ao finalizar perícia:', error);
        erro.textContent = 'Erro de conexão ao finalizar a perícia.';
        erro.style.display = 'block';
    } finally {
        btnFinalizar.disabled = false;
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

function formatarData(valor) {
    if (!valor) return '—';
    const data = new Date(valor);
    if (isNaN(data.getTime())) return String(valor);
    return data.toLocaleDateString('pt-BR');
}

function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}