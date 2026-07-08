// Função para registrar ações no banco de auditoria
async function registrarLog(usuarioId, usuarioNome, acao, detalhes) {
    const query = `
        INSERT INTO logs_auditoria (usuario_id, usuario_nome, acao, detalhes) 
        VALUES (?, ?, ?, ?)
    `;
    try {
        await executarQuery(query, [usuarioId || null, usuarioNome || 'Sistema', acao, detalhes]);
    } catch (error) {
        console.error("Falha ao gravar log de auditoria:", error);
    }
}