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

        const query = `
        SELECT * FROM dispositivos
        WHERE perito_id IS NULL AND status = 'recebido_na_empresa'
        `;

        const [dispositivosLivres] = await executarQuery(query)
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

router.post('/cadastrar', verificarToken, permitirCargos(['cliente']), async (req, res) => {
    const usuarioId = req.usuario.id;
    
    const { 
        tipoDispositivo, 
        modeloDescricao, 
        formaEntrega,
        endereco 
    } = req.body;

    if (!tipoDispositivo || !modeloDescricao || !formaEntrega) {
        return res.status(400).json({ erro: "Campos obrigatórios ausentes." });
    }

    const tipoFormatado = tipoDispositivo.toLowerCase();
    const formaFormatada = formaEntrega.toLowerCase();
    let enderecoId = null;

    try {
        if (formaFormatada === 'correios') {
            if (!endereco || !endereco.cep || !endereco.logradouro || !endereco.numero || !endereco.bairro || !endereco.cidade || !endereco.estado) {
                return res.status(400).json({ erro: "Para envio via Correios, o endereço de devolução completo é obrigatório." });
            }

            const queryEndereco = `
                INSERT INTO enderecos_devolucao (usuario_id, cep, logradouro, numero, complemento, bairro, cidade, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const resultEndereco = await executarQuery(queryEndereco, [
                usuarioId, 
                endereco.cep, 
                endereco.logradouro, 
                endereco.numero, 
                endereco.complemento || null, 
                endereco.bairro, 
                endereco.cidade, 
                endereco.estado
            ]);

            enderecoId = resultEndereco.insertId;
        }

        const queryDispositivo = `
            INSERT INTO dispositivos (usuario_id, tipo_dispositivo, modelo_descricao, forma_entrega, endereco_devolucao_id, status) 
            VALUES (?, ?, ?, ?, ?, 'aguardando_envio')
        `;
        
        await executarQuery(queryDispositivo, [
            usuarioId, 
            tipoFormatado, 
            modeloDescricao, 
            formaFormatada, 
            enderecoId
        ]);

        return res.status(201).json({ 
            mensagem: formaFormatada === 'correios' 
                ? "Dispositivo registrado! Por favor, poste nos Correios e insira o código de rastreamento no painel."
                : "Dispositivo registrado! Aguardamos a entrega no balcão da empresa."
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
        SET codigo_rastreio = ? 
        WHERE id = ? AND usuario_id = ? AND forma_entrega = 'correios'
    `;

    try {
        const result = await executarQuery(query, [codigoRastreio, dispositivoId, usuarioId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ erro: "Dispositivo não encontrado ou modalidade não é via Correios." });
        }

        return res.json({ mensagem: "Código de rastreamento atualizado com sucesso! A empresa acompanhará a entrega." });
    } catch (error) {
        console.error("Erro ao atualizar rastreio:", error);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

export default router;