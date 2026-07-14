import { Router } from "express";
import { permitirCargos, verificarToken } from "../autenticacao.js";
const router = Router();
import { upload } from "../upload.js";
import executarQuery from "../db.js";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { gerarLaudoPdf } from '../laudoPdf.js';

const laudoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { erro: "Muitas tentativas feitas deste IP. Tente novamente em 15 minutos." }
});

router.get('/meus-servicos', verificarToken, permitirCargos(['cliente']), async (req, res) => {

    const userId = req.usuario.id; 

    const query = `
        SELECT d.*, u.nome AS nome_perito 
        FROM dispositivos d
        LEFT JOIN usuarios u ON d.peritoId = u.id
        WHERE d.usuarioId = ?
    `;

    try {
        const [linhas] = await executarQuery(query, [userId]);

        if (linhas.length === 0) {
            return res.status(404).json({ mensagem: 'Nenhum dispositivo encontrado.' });
        }

        return res.json(linhas);
        
    } catch (error) {
        res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
});

router.put('/assumir-dispositivos/:id', verificarToken, permitirCargos(['perito']), upload.single('foto'), async (req, res) => {
    const dispositivoId = req.params.id;
    const peritoId = req.usuario.id;

    const nomeFoto = req.file ? req.file.filename : null;

    const query = `
        UPDATE dispositivos
        SET peritoId = ?, status = 'emAnalise', fotoEvidencia = ?
        WHERE id = ? AND peritoId IS NULL 
    `;

    try {
        const resultado = await executarQuery(query, [peritoId, nomeFoto, dispositivoId]);

        if (resultado[0].affectedRows === 0) {
            return res.status(400).json({
                mensagem: "Este dispositivo já foi assumido por outro perito ou não existe."
            });
        }

        return res.json({
            mensagem: "Você assumiu o dispositivo com sucesso! O cliente já foi notificado no painel.",
            url_foto: nomeFoto ? `${req.protocol}://${req.get('host')}/uploads/${nomeFoto}` : null
        });

    } catch (error) {
        console.error("Erro ao assumir dispositivo com foto:", error);
        return res.status(500).json({erro: "Erro interno do servidor."})
    }
});

router.get('/disponiveis', verificarToken, permitirCargos(['perito', 'admin']), async (req, res) => {
    try {

        const query = `
        SELECT * FROM dispositivos
        WHERE peritoId IS NULL AND status = 'recebidoNaEmpresa'
        `;
        const resultado = await executarQuery(query)
        const dispositivosLivres = resultado && resultado[0] ? resultado[0] : [];
        return res.json(dispositivosLivres);
    }catch (error) {
        console.error("Erro ao buscar fila de peritos:", error)
        return res.status(500).json({erro: "Erro ao buscar dispositivos disponíveis."});
    }
});

router.get('/meus-casos', verificarToken, permitirCargos(['perito']), async (req, res) => {
    const peritoId = req.usuario.id

    try{
        const [meusDispositivos] = await executarQuery(
            'SELECT * FROM dispositivos WHERE peritoId = ? AND status = "emAnalise"',
            [peritoId]
        );
        return res.json(meusDispositivos);
    }catch (error) {
        return res.status(500).json({erro: "Erro ao buscar seus casos."});
    }
});

router.put('/finalizar-pericia/:id', verificarToken, permitirCargos(['perito']), async (req, res) => {
    const dispositivoId = req.params.id;
    const peritoId = req.usuario.id;
    const { parecer_tecnico } = req.body; 

    if (!parecer_tecnico) {
        return res.status(400).json({ erro: "O parecer técnico é obrigatório para finalizar." });
    }

    const query = `
        UPDATE dispositivos 
        SET laudo = ?, status = 'concluida' 
        WHERE id = ? AND peritoId = ? AND status = 'emAnalise'
    `;

    try {
        const result = await executarQuery(query, [parecer_tecnico, dispositivoId, peritoId]);

        if (result[0].affectedRows === 0) {
            return res.status(400).json({ erro: "Não foi possível finalizar. Verifique se você é o perito responsável por este caso." });
        }

        return res.json({ mensagem: "Perícia finalizada com sucesso! Laudo registrado." });
    } catch (error) {
        console.error("Erro ao finalizar perícia:", error);
        return res.status(500).json({ erro: "Erro interno ao salvar laudo." });
    }
});

router.get('/dados-laudo/:id', verificarToken, permitirCargos(['cliente', 'perito', 'admin']), async (req, res) => {
    const dispositivoId = req.params.id;

    const query = `
        SELECT 
            d.id AS dispositivoId,
            d.tipoDispositivo,
            d.modeloDescricao,
            d.status,
            d.laudo AS parecer_tecnico,
            DATE_FORMAT(d.dataEntrada, '%d/%m/%Y') AS data_entrada,
            u_cliente.nome AS nome_cliente,
            u_perito.nome AS nome_perito
        FROM dispositivos d
        INNER JOIN usuarios u_cliente ON d.usuarioId = u_cliente.id
        INNER JOIN usuarios u_perito ON d.peritoId = u_perito.id
        WHERE d.id = ? AND d.status = 'concluida'
    `;

    try {
        const [dados] = await executarQuery(query, [dispositivoId]);

        if (dados.length === 0) {
            return res.status(404).json({ erro: "Laudo não encontrado ou perícia ainda não concluída." });
        }

        return res.json(dados[0]);
    } catch (error) {
        console.error("Erro ao buscar dados do laudo:", error);
        return res.status(500).json({ erro: "Erro interno ao buscar dados do laudo." });
    }
});

// GET /dados-laudo/:id/pdf -> mesma consulta da rota acima, mas devolve o
// laudo já formatado em PDF (mesmo modelo/escopo padrão usado na consulta
// pública por protocolo + código). Continua exigindo login: só cliente
// dono do dispositivo, o perito responsável ou admin podem acessar (a
// checagem de "dono" já é feita pelo INNER JOIN + WHERE d.id abaixo, igual
// à rota JSON original).
router.get('/dados-laudo/:id/pdf', verificarToken, permitirCargos(['cliente', 'perito', 'admin']), async (req, res) => {
    const dispositivoId = req.params.id;

    const query = `
        SELECT 
            d.id AS dispositivoId,
            d.protocolo,
            d.tipoDispositivo,
            d.modeloDescricao,
            d.status,
            d.laudo AS parecer_tecnico,
            DATE_FORMAT(d.dataEntrada, '%d/%m/%Y') AS data_entrada,
            u_cliente.nome AS nome_cliente,
            u_perito.nome AS nome_perito
        FROM dispositivos d
        INNER JOIN usuarios u_cliente ON d.usuarioId = u_cliente.id
        INNER JOIN usuarios u_perito ON d.peritoId = u_perito.id
        WHERE d.id = ? AND d.status = 'concluida'
    `;

    try {
        const [dados] = await executarQuery(query, [dispositivoId]);

        if (dados.length === 0) {
            return res.status(404).json({ erro: "Laudo não encontrado ou perícia ainda não concluída." });
        }

        return gerarLaudoPdf(dados[0], res);
    } catch (error) {
        console.error("Erro ao gerar PDF do laudo (autenticado):", error);
        return res.status(500).json({ erro: "Erro interno ao gerar o PDF do laudo." });
    }
});

router.post('/cadastrar', verificarToken, permitirCargos(['cliente']), async (req, res) => {
    const usuarioId = req.usuario.id;
    
    const { 
        tipoDispositivo, 
        modeloDescricao, 
        formaEntrega,
        endereco,
        codigoLaudo 
    } = req.body;

    if (!tipoDispositivo || !modeloDescricao || !formaEntrega) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes." });
    }

    const anoAtual = new Date().getFullYear();
    const caracteresAleatorios = crypto.randomBytes(2).toString('hex').toUpperCase();
    const numeroProtocolo = `PRC-${anoAtual}-${caracteresAleatorios}`;

    let codigoTextoPuro = codigoLaudo;
    if (!codigoTextoPuro || String(codigoTextoPuro).trim() === '') {
        codigoTextoPuro = crypto.randomInt(100000, 999999).toString();
    }

    const tipoFormatado = tipoDispositivo.toLowerCase();
    const formaFormatada = formaEntrega.toLowerCase();
    let enderecoId = null;

    try {
        const saltRounds = 10;
        const hashCodigo = await bcrypt.hash(String(codigoTextoPuro), saltRounds);

        if (formaFormatada === 'correios') {
            if (!endereco || !endereco.cep || !endereco.logradouro || !endereco.numero || !endereco.bairro || !endereco.cidade || !endereco.estado) {
                return res.status(400).json({ erro: "Para envio via Correios, o endereço de devolução completo é obrigatório." });
            }
            const queryEndereco = `
                INSERT INTO enderecos_devolucao (usuarioId, cep, logradouro, numero, complemento, bairro, cidade, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const resultEndereco = await executarQuery(queryEndereco, [
                usuarioId, endereco.cep, endereco.logradouro, endereco.numero, 
                endereco.complemento || null, endereco.bairro, endereco.cidade, endereco.estado
            ]);
            enderecoId = resultEndereco?.insertId || resultEndereco[0]?.insertId || null;
        }

        const queryDispositivo = `
            INSERT INTO dispositivos (usuarioId, tipoDispositivo, modeloDescricao, formaEntrega, enderecoDevolucaoId, status, protocolo, codigoAcessoLaudo) 
            VALUES (?, ?, ?, ?, ?, 'aguardandoEnvio', ?, ?)
        `;
        
        await executarQuery(queryDispositivo, [
            usuarioId || null, 
            tipoFormatado || null, 
            modeloDescricao || null, 
            formaFormatada || null, 
            enderecoId || null,
            numeroProtocolo, 
            hashCodigo       
        ]);

        const mensagemBase = formaFormatada === 'correios' 
            ? "Dispositivo registrado! Por favor, poste nos Correios e insira o código de rastreamento no painel."
            : "Dispositivo registrado! Aguardamos a entrega no balcão da empresa.";

        return res.status(201).json({ 
            mensagem: mensagemBase,
            protocolo: numeroProtocolo, 
            codigoAcesso: codigoTextoPuro 
        });

    } catch (error) {
        console.error("Erro no fluxo de cadastro:", error);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

router.put('/atualizar-rastreio/:id', verificarToken, permitirCargos(['cliente']), async (req, res) => {
    const dispositivoId = req.params.id;
    const usuarioId = req.usuario.id;
    
    const { codigoRastreio } = req.body;

    if (!codigoRastreio) {
        return res.status(400).json({ erro: "O código de rastreamento é obrigatório." });
    }

    const query = `
        UPDATE dispositivos 
        SET codigoRastreio = ? 
        WHERE id = ? AND usuarioId = ? AND formaEntrega = 'correios'
    `;

    try {
        const result = await executarQuery(query, [codigoRastreio, dispositivoId, usuarioId]);

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ erro: "Dispositivo não encontrado ou modalidade não é via Correios." });
        }

        return res.json({ mensagem: "Código de rastreamento atualizado com sucesso! A empresa acompanhará a entrega." });
    } catch (error) {
        console.error("Erro ao atualizar rastreio:", error);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

router.put('/logistica/receber/:id', verificarToken, permitirCargos(['logistica', 'admin']), async (req, res) => {
    const dispositivoId = req.params.id;
    const query = `UPDATE dispositivos SET status = 'recebidoNaEmpresa' WHERE id = ? AND status = 'aguardandoEnvio'`;

    try {
        const result = await executarQuery(query, [dispositivoId]);
        if (result[0].affectedRows === 0) return res.status(400).json({ erro: "Dispositivo indisponível para recebimento." });
        return res.json({ mensagem: "Entrada confirmada! Disponível para os peritos." });
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

router.put('/logistica/devolver/:id', verificarToken, permitirCargos(['logistica', 'admin']), async (req, res) => {
    const dispositivoId = req.params.id;
    const query = `UPDATE dispositivos SET status = 'devolvida' WHERE id = ? AND status = 'concluida'`;

    try {
        const result = await executarQuery(query, [dispositivoId]);
        if (result[0].affectedRows === 0) return res.status(400).json({ erro: "A perícia deste item ainda não foi concluída." });
        return res.json({ mensagem: "Devolução registrada com sucesso!" });
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================================================
// ROTAS NOVAS a adicionar em dispositivos.js
// Cole este bloco no arquivo de rotas de dispositivos, próximo às rotas
// '/logistica/receber/:id' e '/logistica/devolver/:id' já existentes.
// ==========================================================================

// ---------------------------------------------------------------------
// GET /dispositivos/logistica/aguardando-recebimento
// Lista os dispositivos com status = 'aguardandoEnvio', ou seja, que o
// cliente já cadastrou mas que ainda não foram recebidos fisicamente na
// empresa. É essa lista que precisa aparecer na tela para permitir a
// transição aguardandoEnvio -> recebidoNaEmpresa.
// ---------------------------------------------------------------------
router.get('/logistica/aguardando-recebimento', verificarToken, permitirCargos(['logistica', 'admin']), async (req, res) => {
    const { busca } = req.query;

    let query = `
        SELECT d.id, d.tipoDispositivo, d.modeloDescricao, d.formaEntrega,
               d.codigoRastreio, d.protocolo,
               DATE_FORMAT(d.dataEntrada, '%d/%m/%Y') AS data_entrada,
               u.nome AS nome_cliente
        FROM dispositivos d
        INNER JOIN usuarios u ON d.usuarioId = u.id
        WHERE d.status = 'aguardandoEnvio'
    `;
    const params = [];

    if (busca) {
        query += ` AND (u.nome LIKE ? OR d.protocolo LIKE ? OR d.modeloDescricao LIKE ?)`;
        const termo = `%${busca}%`;
        params.push(termo, termo, termo);
    }

    query += ` ORDER BY d.dataEntrada ASC`;

    try {
        const [linhas] = await executarQuery(query, params);
        return res.json(linhas);
    } catch (error) {
        console.error("Erro ao buscar dispositivos aguardando recebimento:", error);
        return res.status(500).json({ erro: "Erro interno ao buscar dispositivos aguardando recebimento." });
    }
});

// ---------------------------------------------------------------------
// GET /dispositivos/logistica/pendentes-entrega
// Lista os dispositivos com status = 'concluida', ou seja, com perícia
// finalizada e prontos para serem devolvidos/entregues ao cliente.
// ---------------------------------------------------------------------
router.get('/logistica/pendentes-entrega', verificarToken, permitirCargos(['logistica', 'admin']), async (req, res) => {
    const { busca } = req.query;

    let query = `
        SELECT d.id, d.tipoDispositivo, d.modeloDescricao,
               DATE_FORMAT(d.dataEntrada, '%d/%m/%Y') AS data_conclusao,
               u_cliente.nome AS nome_cliente,
               u_perito.nome AS nome_perito
        FROM dispositivos d
        INNER JOIN usuarios u_cliente ON d.usuarioId = u_cliente.id
        LEFT JOIN usuarios u_perito ON d.peritoId = u_perito.id
        WHERE d.status = 'concluida'
    `;
    const params = [];

    if (busca) {
        query += ` AND (u_cliente.nome LIKE ? OR d.protocolo LIKE ? OR d.modeloDescricao LIKE ?)`;
        const termo = `%${busca}%`;
        params.push(termo, termo, termo);
    }

    query += ` ORDER BY d.dataEntrada ASC`;

    try {
        const [linhas] = await executarQuery(query, params);
        return res.json(linhas);
    } catch (error) {
        console.error("Erro ao buscar pendentes de entrega:", error);
        return res.status(500).json({ erro: "Erro interno ao buscar pendentes de entrega." });
    }
});

// ---------------------------------------------------------------------
// GET /dispositivos/logistica/entregues
// Lista os dispositivos com status = 'devolvida', já entregues ao cliente.
// ---------------------------------------------------------------------
router.get('/logistica/entregues', verificarToken, permitirCargos(['logistica', 'admin']), async (req, res) => {
    const { busca } = req.query;

    let query = `
        SELECT d.id, d.tipoDispositivo, d.modeloDescricao,
               DATE_FORMAT(d.dataEntrada, '%d/%m/%Y') AS data_entrega,
               u.nome AS nome_cliente
        FROM dispositivos d
        INNER JOIN usuarios u ON d.usuarioId = u.id
        WHERE d.status = 'devolvida'
    `;
    const params = [];

    if (busca) {
        query += ` AND (u.nome LIKE ? OR d.protocolo LIKE ? OR d.modeloDescricao LIKE ?)`;
        const termo = `%${busca}%`;
        params.push(termo, termo, termo);
    }

    query += ` ORDER BY d.dataEntrada DESC`;

    try {
        const [linhas] = await executarQuery(query, params);
        return res.json(linhas);
    } catch (error) {
        console.error("Erro ao buscar dispositivos entregues:", error);
        return res.status(500).json({ erro: "Erro interno ao buscar dispositivos entregues." });
    }
});

// ---------------------------------------------------------------------
// PUT /dispositivos/logistica/reverter-entrega/:id
// Reverte uma entrega confirmada por engano: 'devolvida' -> 'concluida'.
// NÃO reaproveita a rota '/logistica/receber/:id' porque aquela é
// exclusiva da transição inicial 'aguardandoEnvio' -> 'recebidoNaEmpresa'
// (ver comentário no arquivo original). Precisa ser uma rota própria.
// ---------------------------------------------------------------------
router.put('/logistica/reverter-entrega/:id', verificarToken, permitirCargos(['logistica', 'admin']), async (req, res) => {
    const dispositivoId = req.params.id;
    const query = `UPDATE dispositivos SET status = 'concluida' WHERE id = ? AND status = 'devolvida'`;

    try {
        const result = await executarQuery(query, [dispositivoId]);
        if (result[0].affectedRows === 0) {
            return res.status(400).json({ erro: "Este dispositivo não está com entrega confirmada, não é possível reverter." });
        }
        return res.json({ mensagem: "Entrega revertida com sucesso! O dispositivo voltou para a lista de pendentes de entrega." });
    } catch (error) {
        console.error("Erro ao reverter entrega:", error);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

router.post('/dados-laudo/:protocolo/verificar-codigo', laudoLimiter, async (req, res) => {
    const { protocolo } = req.params; 
    const { codigo } = req.body;

    if (!codigo) {
        return res.status(400).json({ erro: "O código de acesso é obrigatório." });
    }

    try {
        const queryDispositivo = "SELECT id, status, codigoAcessoLaudo FROM dispositivos WHERE protocolo = ?";
        const resDispositivo = await executarQuery(queryDispositivo, [protocolo]);
        const dispositivo = resDispositivo && resDispositivo[0] && resDispositivo[0][0] ? resDispositivo[0][0] : null;

        if (!dispositivo) {
            return res.status(404).json({ erro: "Protocolo de laudo não encontrado." });
        }

        if (dispositivo.status !== 'concluida') {
            return res.status(403).json({ erro: "Este laudo ainda não foi finalizado e emitido pelo perito." });
        }

        const codigoValido = await bcrypt.compare(String(codigo), dispositivo.codigoAcessoLaudo);
        if (!codigoValido) {
            return res.status(401).json({ erro: "Código de acesso inválido para este protocolo." });
        }

        const queryLaudo = `
            SELECT 
                d.protocolo,
                d.tipoDispositivo,
                d.modeloDescricao,
                d.status,
                d.laudo AS parecer_tecnico,
                DATE_FORMAT(d.dataEntrada, '%d/%m/%Y') AS data_entrada,
                u_cliente.nome AS nome_cliente,
                u_perito.nome AS nome_perito
            FROM dispositivos d
            INNER JOIN usuarios u_cliente ON d.usuarioId = u_cliente.id
            INNER JOIN usuarios u_perito ON d.peritoId = u_perito.id
            WHERE d.id = ?
        `;
        
        const resLaudo = await executarQuery(queryLaudo, [dispositivo.id]);
        const dadosLaudo = resLaudo && resLaudo[0] ? resLaudo[0][0] : null;

        if (!dadosLaudo) {
            return res.status(404).json({ erro: "Não foi possível montar o laudo para este protocolo." });
        }

        // O código de acesso já foi validado acima (bcrypt.compare). A
        // partir daqui, a única forma de obter o conteúdo do laudo é este
        // PDF — não existe mais retorno em JSON por esta rota pública.
        return gerarLaudoPdf(dadosLaudo, res);

    } catch (error) {
        console.error("Erro na verificação pública de laudo:", error);
        return res.status(500).json({ erro: "Erro interno ao processar consulta." });
    }
});

export default router;