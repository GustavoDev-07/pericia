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

    const query = "UPDATE usuarios SET statusAprovacao = 'pendente' WHERE id = ? AND role = 'cliente'";

    try {
        await executarQuery(query, [idUsuario]);
        return res.json({ mensagem: "Sua candidatura a perito foi enviada! Aguarde o retorno."});
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
            "SELECT tipoDispositivo, COUNT(*) AS quantidade FROM dispositivos GROUP BY tipoDispositivo"
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

router.get('/admin/auditoria/logs', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const query = `
            SELECT id, usuarioId AS usuarioId, usuarioNome AS usuarioNome, acao, detalhes, 
                   DATE_FORMAT(criadoEm, '%d/%m/%Y %H:%i') AS criadoEm 
            FROM logsAuditoria ORDER BY id DESC LIMIT 100
        `;
        const [logs] = await executarQuery(query);
        return res.json(logs);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao buscar logs de auditoria." });
    }
});

router.get('/admin/auditoria/candidaturas', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const query = "SELECT id, nome, email, role AS cargoAtual, statusAprovacao AS statusAprovacao FROM usuarios WHERE statusAprovacao = 'pendente'";
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