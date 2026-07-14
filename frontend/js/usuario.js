// ==========================================================================
// backend/js/routes/usuario.js  (ARQUIVO NOVO)
//
// Rota isolada para dados do usuário logado. Criada separada de
// routes/usuarios.js (que NÃO deve ser tocado, conforme combinado) para
// não gerar conflito com quem está corrigindo aquele arquivo em paralelo.
//
// Resolve o item 1 do pedido: GET /api/usuario/perfil, usada hoje (com bug
// de URL) por usuario.js, servicos.js, entregas.js, peritos.js e inicio.js
// no frontend.
//
// AJUSTAR os imports abaixo (verificarToken, conexão com o banco) para
// bater exatamente com o que já existe em outras rotas do projeto (ex.:
// dispositivos.js) — os nomes usados aqui seguem o padrão citado nos
// comentários do frontend (verificarToken / permitirCargos).
// ==========================================================================

import { Router } from 'express';
import { verificarToken } from '../middlewares/verificarToken.js'; // ajustar caminho se necessário
import { pool } from '../db.js'; // ajustar para o módulo de conexão real do projeto

const router = Router();

// GET /api/usuario/perfil
// Retorna nome, email e role do usuário logado, a partir do token.
router.get('/perfil', verificarToken, async (req, res) => {
    try {
        // req.usuario é preenchido pelo middleware verificarToken a partir
        // do JWT decodificado (ajustar nome do campo conforme o middleware
        // real do projeto, ex.: req.usuarioId / req.usuario.id).
        const usuarioId = req.usuario?.id ?? req.usuarioId;

        if (!usuarioId) {
            return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
        }

        const resultado = await pool.query(
            'SELECT nome, email, role, foto_perfil FROM usuarios WHERE id = $1',
            [usuarioId]
        );

        const usuario = resultado.rows?.[0] ?? resultado[0];

        if (!usuario) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        return res.json({
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role,
            foto_perfil: usuario.foto_perfil ?? null
        });

    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao buscar perfil.' });
    }
});

export default router;

// No arquivo principal do servidor (onde os outros routers são montados),
// registrar com:
//   import usuarioRoutes from './routes/usuario.js';
//   app.use('/api/usuario', usuarioRoutes);