// ==========================================================================
// backend/js/routes/usuarios-extra.js  (ARQUIVO NOVO)
//
// Resolve o item 2 do pedido: POST /api/usuarios/foto-perfil e
// DELETE /api/usuarios/excluir-conta, chamadas por usuario.js no frontend.
//
// Por que um arquivo separado em vez de mexer em routes/usuarios.js:
// o pedido é explícito em não tocar nesse arquivo porque outra pessoa está
// mexendo nele em paralelo. Como o Express permite montar mais de um router
// no mesmo prefixo, este arquivo pode ser registrado TAMBÉM em '/api/usuarios'
// sem conflitar, desde que os sub-caminhos (/foto-perfil, /excluir-conta)
// não colidam com o que já existe em usuarios.js. Confirmar com quem está
// mexendo naquele arquivo que esses dois sub-caminhos estão livres antes de
// registrar as duas rotas no server.
//
// Usa o upload.js já existente no projeto para lidar com o multipart/form-data
// da foto — ajustar o caminho do import abaixo para o local real do arquivo.
// ==========================================================================

import { Router } from 'express';
import { verificarToken } from '../middlewares/verificarToken.js'; // ajustar caminho se necessário
import { upload } from '../middlewares/upload.js'; // ajustar para o upload.js real do projeto
import { pool } from '../db.js'; // ajustar para o módulo de conexão real do projeto

const router = Router();

// POST /api/usuarios/foto-perfil
// Recebe multipart/form-data com o campo "foto" (mesmo nome usado pelo
// frontend em usuario.js: formData.append('foto', arquivo)).
router.post('/foto-perfil', verificarToken, upload.single('foto'), async (req, res) => {
    try {
        const usuarioId = req.usuario?.id ?? req.usuarioId;

        if (!req.file) {
            return res.status(400).json({ mensagem: 'Nenhuma foto enviada.' });
        }

        // Ajustar conforme o que upload.js retorna (path local, URL do S3/Cloudinary, etc.)
        const caminhoFoto = req.file.path ?? req.file.location ?? req.file.filename;

        await pool.query(
            'UPDATE usuarios SET foto_perfil = $1 WHERE id = $2',
            [caminhoFoto, usuarioId]
        );

        return res.json({ mensagem: 'Foto de perfil atualizada com sucesso!', foto_perfil: caminhoFoto });

    } catch (error) {
        console.error('Erro ao atualizar foto de perfil:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao atualizar a foto de perfil.' });
    }
});

// DELETE /api/usuarios/excluir-conta
// Exclui a conta do usuário logado. O frontend já pede dupla confirmação
// antes de chamar essa rota (ver usuario.js).
router.delete('/excluir-conta', verificarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario?.id ?? req.usuarioId;

        // Ajustar: se houver FK de dispositivos apontando para usuarios,
        // decidir aqui a política (cascade no banco, ou apagar/anonimizar
        // os pedidos do usuário antes de apagar o usuário).
        await pool.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);

        return res.json({ mensagem: 'Conta excluída com sucesso.' });

    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao excluir a conta.' });
    }
});

export default router;

// No arquivo principal do servidor, registrar ADICIONALMENTE ao router que
// já existe para usuarios.js (não substituir, os dois convivem no mesmo
// prefixo):
//   import usuariosExtraRoutes from './routes/usuarios-extra.js';
//   app.use('/api/usuarios', usuariosExtraRoutes);