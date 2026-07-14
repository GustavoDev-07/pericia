import { Router } from 'express';
import db from '../db.js'
import { verificarToken, permitirCargos } from '../autenticacao.js';
const router = Router();
import { registrarLog } from "../log.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import executarQuery from '../db.js';
// 
// import express, { raw, Router } from 'express'
// import cors from 'cors'
// import jwt from 'jsonwebtoken'
// import executarQuery from './db.js';
// import bcrypt from 'bcrypt'

// const app = express();

// app.use(cors())
// app.use(express.json());

router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios!' });
    }

    const query = 'SELECT id, nome, email, senha, role FROM usuarios WHERE email = ?';

    try {
        const resultado = await executarQuery(query, [email]);

        const usuarios = resultado ? resultado[0] : [];

        if (!usuarios || usuarios.length === 0) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const usuarioEncontrado = usuarios[0];

        const senhaCorreta = await bcrypt.compare(senha, usuarioEncontrado.senha);
        console.log(senhaCorreta)

        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const token = jwt.sign(
            {
                id: usuarioEncontrado.id,
                email: usuarioEncontrado.email,
                role: usuarioEncontrado.role
            },
            'SEGREDO_SUPER_SECRETO',
            { expiresIn: '1h' }
        );

        await registrarLog(usuarioEncontrado.id, usuarioEncontrado.nome, "Login", "Usuário realizou login com sucesso.");

        return res.json({
            auth: true,
            token,
            usuario: { nome: usuarioEncontrado.nome, email: usuarioEncontrado.email }
        });

    } catch (erro) {
        console.error('Erro ao verificar login no banco:', erro);
        return res.status(500).json({ mensagem: 'Erro interno no servidor ao tentar logar.' });
    }
});

// GET /api/auth/usuario/perfil -> retorna os dados do usuário logado
// (nome, email, role, statusAprovacao), usados pelo frontend para exibir
// o menu do usuário e liberar as abas correspondentes ao seu nível de acesso.
router.get('/usuario/perfil', verificarToken, async (req, res) => {
    const idUsuario = req.usuario.id;

    const query = 'SELECT id, nome, email, role, statusAprovacao FROM usuarios WHERE id = ?';

    try {
        const [usuarios] = await executarQuery(query, [idUsuario]);

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        const usuario = usuarios[0];

        return res.json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            statusAprovacao: usuario.statusAprovacao
        });
    } catch (erro) {
        console.error('Erro ao buscar perfil do usuário:', erro);
        return res.status(500).json({ mensagem: 'Erro interno ao buscar perfil.' });
    }
});

router.post('/cadastro', async (req, res) => {
    // const{nome, email, data_nascimento, cpf_cnpj, senha, confirmacao_senha} = req.body;

    var query = `
        INSERT INTO usuarios(
            nome,
            email,
            dataNascimento,
            cpfCnpj,
            senha
        )VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
        )
    `


    try {
        const senhaOriginal = req.body.senha;

        const senhaCriptografada = await bcrypt.hash(senhaOriginal, 12);

        var usuario = [
            req.body.nome,
            req.body.email,
            req.body.dataNascimento,
            req.body.cpfCnpj,
            senhaCriptografada
        ];

        let resultado = await executarQuery(query, usuario);
        res.send({
            insertId: resultado.insertId || (resultado[0] && resultado[0].insertId),
            usuario: {
                id: resultado.insertId,
                nome: req.body.nome,
                email: req.body.email
            }
        })
    }
    catch (erro) {
        console.error("Erro ao cadastrar:", erro);
        res.status(500).send({
            insertId: null,
            mensagem: "Erro ao salvar no banco de dados."
        });
    }
});

// DELETE /api/auth/usuario/excluir-conta -> exclui a conta do usuário logado.
// Observação: a tabela "dispositivos" tem FOREIGN KEY apontando para
// "usuarios" com ON DELETE CASCADE (ver sql/cliente.sql), então excluir o
// usuário também apaga em cascata os dispositivos/pedidos associados a ele.
// Isso é irreversível — o frontend deve pedir confirmação explícita antes
// de chamar esta rota.
router.delete('/usuario/excluir-conta', verificarToken, async (req, res) => {
    const idUsuario = req.usuario.id;

    try {
        const resultado = await executarQuery('DELETE FROM usuarios WHERE id = ?', [idUsuario]);
        const linhasAfetadas = resultado?.affectedRows ?? (resultado[0] && resultado[0].affectedRows);

        if (!linhasAfetadas) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        return res.json({ mensagem: 'Conta excluída com sucesso.' });
    } catch (erro) {
        console.error('Erro ao excluir conta:', erro);
        return res.status(500).json({ mensagem: 'Erro interno ao excluir a conta.' });
    }
});

router.put('/candidatar-perito', verificarToken, async (req, res) => {
    const idUsuario = req.usuario.id;
    const { cargoDesejado } = req.body;

    const cargosValidos = ['perito', 'logistica'];
    if (!cargoDesejado || !cargosValidos.includes(cargoDesejado)) {
        return res.status(400).json({ erro: "Informe o cargo desejado: 'perito' ou 'logistica'." });
    }

    const query = `
        UPDATE usuarios 
        SET statusAprovacao = 'pendente', cargoDesejado = ? 
        WHERE id = ? AND role = 'cliente'
    `;

    try {
        const resultado = await executarQuery(query, [cargoDesejado, idUsuario]);

        if (resultado[0].affectedRows === 0) {
            return res.status(400).json({ erro: "Não foi possível enviar a candidatura. Verifique se sua conta já não é perito/logística/admin." });
        }

        return res.json({ mensagem: `Sua candidatura a ${cargoDesejado} foi enviada! Aguarde o retorno.` });
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao enviar candidatura." });
    }
});

router.get('/admin/dashboard', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const [peritos] = await executarQuery(
            "SELECT COUNT(*) AS total FROM usuarios WHERE role = 'perito'"
        );

        const [aguardando] = await executarQuery(
            "SELECT COUNT(*) AS total FROM dispositivos WHERE status = 'aguardandoPerito'"
        );

        const [emAnalise] = await executarQuery(
            "SELECT COUNT(*) AS total FROM dispositivos WHERE status = 'emAnalise'"
        );

        const [porTipo] = await executarQuery(
            "SELECT tipoDispositivo AS tipo_dispositivo, COUNT(*) AS quantidade FROM dispositivos GROUP BY tipoDispositivo"
        );

        return res.json({
            cards: {
                total_peritos: peritos[0].total,
                fila_espera: aguardando[0].total,
                em_analise: emAnalise[0].total
            },
            grafico_tipos: porTipo
        });

    } catch (error) {
        console.error("Erro ao gerar dashboard:", error);
        return res.status(500).json({ erro: "Erro interno ao gerar dados do painel." });
    }
});

// GET /api/auth/admin/dispositivos -> lista todos os dispositivos do sistema
// para o painel admin, com filtro opcional por status (?status=emAnalise etc.).
// A coluna "localizacao" não existe na tabela dispositivos hoje — é derivada
// aqui a partir do "status" como aproximação (ver PENDÊNCIA no admin.js: para
// um valor real de localização física seria necessário adicionar essa coluna
// no schema).
router.get('/admin/dispositivos', verificarToken, permitirCargos(['admin']), async (req, res) => {
    const { status } = req.query;

    let query = `
        SELECT 
            d.id,
            d.tipoDispositivo AS tipo_dispositivo,
            d.modeloDescricao AS modelo_descricao,
            d.status,
            u_cliente.nome AS nome_cliente,
            u_perito.nome AS nome_perito
        FROM dispositivos d
        INNER JOIN usuarios u_cliente ON d.usuarioId = u_cliente.id
        LEFT JOIN usuarios u_perito ON d.peritoId = u_perito.id
    `;
    const params = [];

    if (status) {
        query += ' WHERE d.status = ?';
        params.push(status);
    }

    query += ' ORDER BY d.dataEntrada DESC';

    try {
        const [dispositivos] = await executarQuery(query, params);

        const comLocalizacao = dispositivos.map(d => ({
            ...d,
            localizacao: derivarLocalizacao(d.status)
        }));

        return res.json(comLocalizacao);
    } catch (error) {
        console.error("Erro ao buscar dispositivos (admin):", error);
        return res.status(500).json({ erro: "Erro interno ao buscar dispositivos." });
    }
});

// Aproximação de localização física a partir do status do dispositivo.
function derivarLocalizacao(status) {
    if (status === 'aguardandoEnvio') return 'com_cliente';
    if (status === 'devolvida') return 'com_cliente';
    return 'empresa'; // recebidoNaEmpresa, aguardandoPerito, emAnalise, concluida
}

router.put('/admin/receber-dispositivo/:id', verificarToken, permitirCargos(['admin']), async (req, res) => {
    const dispositivoId = req.params.id;

    const query = `
        UPDATE dispositivos 
        SET status = 'recebidoNaEmpresa' 
        WHERE id = ? AND status = 'aguardandoEnvio'
    `;

    try {
        const result = await executarQuery(query, [dispositivoId]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ erro: "Dispositivo não encontrado ou já recebido." });
        }

        return res.json({ mensagem: "Dispositivo bipado e recebido com sucesso! Já está na fila dos peritos." });
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// GET /api/auth/admin/auditoria/logs?tipo=&busca=&pagina=&limite=
// PENDÊNCIA (documentada, fora do escopo deste fix): a coluna "acao" da
// tabela logsAuditoria só recebe hoje os textos "Login", "Promoção de
// Cargo" e "Candidatura Recusada" (ver registrarLog() em usuarios.js). As
// rotas de dispositivos.js (cadastro, entrada na empresa, perito assumindo
// caso, perícia finalizada) ainda não chamam registrarLog() nenhuma vez —
// então os filtros "dispositivo_cadastrado", "dispositivo_entrada_empresa",
// "dispositivo_assumido" e "pericia_finalizada" do dropdown do admin.js não
// vão retornar nada até essas chamadas serem adicionadas em dispositivos.js.
router.get('/admin/auditoria/logs', verificarToken, permitirCargos(['admin']), async (req, res) => {
    const MAPA_TIPO_PARA_ACAO = {
        login: 'Login',
        perito_aprovado: 'Promoção de Cargo',
        perito_recusado: 'Candidatura Recusada'
        // dispositivo_cadastrado, dispositivo_entrada_empresa,
        // dispositivo_assumido, pericia_finalizada: sem correspondência
        // ainda (ver PENDÊNCIA acima).
    };

    const tipo = req.query.tipo || '';
    const busca = (req.query.busca || '').trim();
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 20));
    const offset = (pagina - 1) * limite;

    let where = [];
    let params = [];

    if (tipo && MAPA_TIPO_PARA_ACAO[tipo]) {
        where.push('acao = ?');
        params.push(MAPA_TIPO_PARA_ACAO[tipo]);
    }

    if (busca) {
        where.push('(usuarioNome LIKE ? OR detalhes LIKE ?)');
        params.push(`%${busca}%`, `%${busca}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    try {
        // Busca limite+1 registros para saber se existe próxima página, sem
        // precisar de um segundo SELECT COUNT(*) separado.
        // OBS: limite/offset são interpolados direto na string (não como
        // parâmetro preparado) porque o driver mysql2, ao usar .execute(),
        // não aceita placeholders "?" em LIMIT/OFFSET — mesmo passando
        // números. Isso é seguro aqui porque ambos já foram validados como
        // inteiros acima (parseInt + Math.max/Math.min), nunca são a string
        // crua vinda de req.query.
        const query = `
            SELECT id, usuarioId, usuarioNome AS usuario_nome, acao, detalhes AS descricao,
                   DATE_FORMAT(criadoEm, '%d/%m/%Y %H:%i') AS data_hora
            FROM logsAuditoria
            ${whereSql}
            ORDER BY id DESC
            LIMIT ${limite + 1} OFFSET ${offset}
        `;
        const [linhas] = await executarQuery(query, params);

        const temMais = linhas.length > limite;
        const eventos = linhas.slice(0, limite).map(linha => ({
            ...linha,
            tipo: acaoParaTipo(linha.acao)
        }));

        return res.json({ eventos, temMais });
    } catch (error) {
        console.error("Erro ao buscar logs de auditoria:", error);
        return res.status(500).json({ erro: "Erro ao buscar logs de auditoria." });
    }
});

// Caminho inverso do MAPA_TIPO_PARA_ACAO, usado só para preencher o campo
// "tipo" de cada evento na resposta (o admin.js usa isso para reformatar o
// rótulo exibido via formatarTipoEvento()).
function acaoParaTipo(acao) {
    const mapa = {
        'Login': 'login',
        'Promoção de Cargo': 'perito_aprovado',
        'Candidatura Recusada': 'perito_recusado'
    };
    return mapa[acao] || null;
}
router.get('/admin/auditoria/candidaturas', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const query = "SELECT id, nome, email, role AS cargoAtual, statusAprovacao AS statusAprovacao, cargoDesejado FROM usuarios WHERE statusAprovacao = 'pendente'";
        const [candidaturas] = await executarQuery(query);
        return res.json(candidaturas);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao buscar candidaturas." });
    }
});

router.put('/admin/auditoria/decidir-candidatura/:id', verificarToken, permitirCargos(['admin']), async (req, res) => {
    const usuarioAlvoId = req.params.id;
    const adminNome = req.usuario.nome;
    const adminId = req.usuario.id;
    const { acao, cargoDesejado } = req.body;

    if (!acao || !cargoDesejado) return res.status(400).json({ erro: "Campos obrigatórios ausentes." });

    try {
        const [usuario] = await executarQuery("SELECT nome FROM usuarios WHERE id = ?", [usuarioAlvoId]);
        if (!usuario || usuario.length === 0) return res.status(404).json({ erro: "Usuário não encontrado." });

        const nomeUsuarioAlvo = usuario[0].nome;

        if (acao.toLowerCase() === 'aprovar') {
            await executarQuery("UPDATE usuarios SET role = ?, statusAprovacao = 'aprovado' WHERE id = ?", [cargoDesejado.toLowerCase(), usuarioAlvoId]);
            await registrarLog(adminId, adminNome, "Promoção de Cargo", `Aprovou ${nomeUsuarioAlvo} como ${cargoDesejado}.`);
            return res.json({ mensagem: `Usuário promovido a ${cargoDesejado} com sucesso!` });
        } else {
            await executarQuery("UPDATE usuarios SET statusAprovacao = 'recusado' WHERE id = ?", [usuarioAlvoId]);
            await registrarLog(adminId, adminNome, "Candidatura Recusada", `Recusou o pedido de ${nomeUsuarioAlvo} para ${cargoDesejado}.`);
            return res.json({ mensagem: "Candidatura recusada com sucesso." });
        }
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

export default router;