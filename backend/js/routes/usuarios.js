import { Router } from 'express';
import db from '../db.js'
import { verificarToken, permitirCargos } from '../autenticacao.js';
const router = Router();
import { registrarLog } from "../log.js"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
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

    const query = 'SELECT id, nome, email, senha FROM usuarios WHERE email = ?';

    try {
        const resultado = await executarQuery(query, [email]);

        const usuarios = await resultado[0]; 

        if (!usuarios || usuarios.length === 0) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const usuarioEncontrado = usuarios[0];

        const senhaCorreta = await bcrypt.compare(senha, usuarioEncontrado.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const token = jwt.sign(
            { id: usuarioEncontrado.id, email: usuarioEncontrado.email }, 
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

router.put('/candidatar-perito', verificarToken, (req, res) => {
    const idUsuario = req.usuario.id;

    const query = "UPDATE usuarios SET status_aprovacao = 'pendente' WHERE id = ? AND role = 'cliente'";

   try {
        const result = await executarQuery(query, [idUsuario]);
        return res.json({ mensagem: "Sua candidatura a perito foi enviada! Aguarde o retorno."});
    } catch (error) {
        return res.status(500).json({erro: "Erro ao enviar candidatura."});
    }
});

router.put('/admin/aprovar-perito/:id', verificarToken, permitirCargos(['admin']), (req, res) => {
    const idCandidato = req.params.id;
    const adminId = req.usuario.id;
    const adminNome = req.usuario.nome;

    const query =`
        UPDATE usuarios
        SET role = 'perito', status_aprovacao = 'aprovado'
        WHERE id = ? AND status_aprovacao = 'pendente'
    `;

    try {
        const result = await executarQuery(query, [idCandidato]);
        if (result.affectedRows === 0) return res.status(404).json({mensagem: "Candidatura não encontrada."});

        await registrarLog(adminId, adminNome, "Promoção", `Aprovado perito ID ${idCandidato}`);
        return res.json({ mensagem: "Usuário promovido a Perito com sucesso!" });
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao promover usuário."});
    }
});

router.put('/admin/recusar-perito/:id', verificarToken, permitirCargos(['admin']), async (req, res) => {
    const idCandidato = req.params.id;

    const query = `
        UPDATE usuarios 
        SET status_aprovacao = 'recusado' 
        WHERE id = ? AND status_aprovacao = 'pendente'
    `;

    try {
        const result = await executarQuery(query, [idCandidato]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: "Candidatura não encontrada ou já processada." });
        }
        
        return res.json({ mensagem: "Candidatura recusada com sucesso. O usuário permanece como cliente." });
        
    } catch (error) {
        console.error("Erro ao recusar perito:", error);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

router.get('/admin/dashboard', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const [peritos] = await executarQuery(
            "SELECT COUNT(*) AS total FROM usuarios WHERE role = 'perito'"
        );

        const [aguardando] = await executarQuery(
            "SELECT COUNT(*) AS total FROM dispositivos WHERE status = 'aguardando_perito'"
        );

        const [emAnalise] = await executarQuery(
            "SELECT COUNT(*) AS total FROM dispositivos WHERE status = 'em_analise'"
        );

        const [porTipo] = await executarQuery(
            "SELECT tipo_dispositivo, COUNT(*) AS quantidade FROM dispositivos GROUP BY tipo_dispositivo"
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
        SET status = 'recebido_na_empresa' 
        WHERE id = ? AND status = 'aguardando_envio'
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

// GET: Retorna os últimos logs de auditoria para o Admin
router.get('/admin/auditoria/logs', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const query = `
            SELECT id, usuario_id AS usuarioId, usuario_nome AS usuarioNome, acao, detalhes, 
                   DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS criadoEm 
            FROM logs_auditoria 
            ORDER BY id DESC LIMIT 100
        `;
        const [logs] = await executarQuery(query);
        return res.json(logs);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao buscar logs de auditoria." });
    }
});

// GET: Lista de usuários que solicitaram cargo de perito ou logística
router.get('/admin/auditoria/candidaturas', verificarToken, permitirCargos(['admin']), async (req, res) => {
    try {
        const query = `
            SELECT id, nome, email, role AS cargoAtual, status_aprovacao AS statusAprovacao 
            FROM usuarios 
            WHERE status_aprovacao = 'pendente'
        `;
        const [candidaturas] = await executarQuery(query);
        return res.json(candidaturas);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao buscar candidaturas." });
    }
});

// PUT: Admin aprova ou recusa alteração de cargo
router.put('/admin/auditoria/decidir-candidatura/:id', verificarToken, permitirCargos(['admin']), async (req, res) => {
    const usuarioAlvoId = req.params.id;
    const adminNome = req.usuario.nome; // Nome do admin logado
    const adminId = req.usuario.id;     // ID do admin logado
    const { acao, cargoDesejado } = req.body; // acao: 'aprovar' ou 'recusar', cargoDesejado: 'perito' ou 'logistica'

    if (!acao || !cargoDesejado) {
        return res.status(400).json({ erro: "Ação (aprovar/recusar) e cargo desejado são obrigatórios." });
    }

    try {
        // Busca o nome do usuário que está recebendo a alteração
        const [usuario] = await executarQuery("SELECT nome FROM usuarios WHERE id = ?", [usuarioAlvoId]);
        if (usuario.length === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
        
        const nomeUsuarioAlvo = usuario[0].nome;

        if (acao.toLowerCase() === 'aprovar') {
            // Atualiza o cargo e aprova
            await executarQuery(
                "UPDATE usuarios SET role = ?, status_aprovacao = 'aprovado' WHERE id = ?", 
                [cargoDesejado.toLowerCase(), usuarioAlvoId]
            );
            
            // Grava na Auditoria
            await registrarLog(adminId, adminNome, "Promoção de Cargo", `Admin aprovou ${nomeUsuarioAlvo} (ID: ${usuarioAlvoId}) como ${cargoDesejado}.`);
            
            return res.json({ mensagem: `Usuário promovido a ${cargoDesejado} com sucesso!` });
        } else {
            // Apenas recusa a candidatura e o mantém como cliente
            await executarQuery("UPDATE usuarios SET status_aprovacao = 'recusado' WHERE id = ?", [usuarioAlvoId]);
            
            // Grava na Auditoria
            await registrarLog(adminId, adminNome, "Candidatura Recusada", `Admin recusou o pedido de ${nomeUsuarioAlvo} (ID: ${usuarioAlvoId}) para o cargo de ${cargoDesejado}.`);
            
            return res.json({ mensagem: "Candidatura recusada com sucesso." });
        }
    } catch (error) {
        console.error("Erro ao decidir candidatura:", error);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
});

export default router;