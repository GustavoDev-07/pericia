import { Router } from "express";
import { permitirCargos, verificarToken } from "../autenticacao";
const router = Router();
import { upload } from "../upload";

router.get('/meus-servicos', verificarToken, permitirCargos(['cliente']), async (req, res) => {
    const userId = req.usuario.id;

    const query = `
        SELECT d.*, u.nome AS nome_perito 
        FROM dispositivos d
        LEFT JOIN usuarios u ON d.perito_id = u.id
        WHERE d.usuario_id = ?
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

router.put('/assumir-dispositivos/:id', verificarToken, permitirCargos(['peritos'], upload.single('foto')), async (req, res) => {
    const dispositivoId = req.params.id;
    const peritoId = req.usuario.id;

    const nomeFoto = req.file ? req.file.filename : null;

    const query = `
        UPDATE dispositivos
        SET perito_id = ?, status = 'em_analise'
        WHERE id = ? AND perito_id IS NULL 
    `;

    try {
        const resultado = await executarQuery(query, [peritoId, nomeFoto, dispositivoId]);

        if (resultado.affectedRows === 0) {
            return res.status(400).json({
                mensagem: "Este dispositivo já foi assumido por outro perito ou não existe."
            });
        }

        return res.json({
            mensagem: "Você assumiu o dispositivo com sucesso! O cliente já foi notificado no painel.",
            url_foto: nomeFoto ? `http://localhost:3000/uploads/${nomeFoto}`: null
        });

    } catch (error) {
        console.error("Erro ao assumir dispositivo com foto:", error);
        return res.status(500).json({erro: "Erro interno do servidor."})
    }
});

router.get('/disponiveis', verificarToken, permitirCargos(['perito', 'admin']), async (req, res) => {
    try {
        const [dispositivosLivres] = await executarQuery(
            'SELECT * FROM dispositivos WHERE perito_id IS NULL'
        );
        return res.json(dispositivosLivres);
    }catch (error) {
        return res.status(500).json({erro: "Erro ao buscar dispositivos disponíveis."});
    }
});

router.get('/meus-casos', verificarToken, permitirCargos(['perito']), async (req, res) => {
    const peritoId = req.usuario.id

    try{
        const [meusDispositivos] = await executarQuery(
            'SELECT * FROM dispositivos WHERE perito_id = ? AND status = "em_analise"',
            [peritoId]
        );
        return res.json(meusDispositivos);
    }catch (error) {
        return res.json({erro: "Erro ao buscar seus casos."});
    }
});

router.post('/cadastrar', verificarToken, permitirCargos(['cliente']), async (req, res) => {
    const usuarioId = req.usuario.id; 
    const { tipo_dispositivo, modelo_descricao } = req.body;

    if (!tipo_dispositivo || !modelo_descricao) {
        return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    const tipoFormatado = tipo_dispositivo.toLowerCase();

    const query = `
        INSERT INTO dispositivos (usuario_id, tipo_dispositivo, modelo_descricao, status) 
        VALUES (?, ?, ?, 'aguardando_perito')
    `;

    try {
        await executarQuery(query, [usuarioId, tipoFormatado, modelo_descricao]);
        return res.status(201).json({ mensagem: "Dispositivo cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar dispositivo:", error);
        return res.status(500).json({ erro: "Erro interno do servidor ao cadastrar." });
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
        WHERE id = ? AND perito_id = ? AND status = 'em_analise'
    `;

    try {
        const result = await executarQuery(query, [parecer_tecnico, dispositivoId, peritoId]);

        if (result.affectedRows === 0) {
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
            d.id AS dispositivo_id,
            d.tipo_dispositivo,
            d.modelo_descricao,
            d.status,
            d.laudo AS parecer_tecnico,
            DATE_FORMAT(d.data_entrada, '%d/%m/%Y') AS data_entrada,
            u_cliente.nome AS nome_cliente,
            u_perito.nome AS nome_perito
        FROM dispositivos d
        INNER JOIN usuarios u_cliente ON d.usuario_id = u_cliente.id
        INNER JOIN usuarios u_perito ON d.perito_id = u_perito.id
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

export default router;