-- Active: 1770140835489@@127.0.0.1@3306@pericia
USE pericia;

-- ATENÇÃO: este CREATE TABLE serve apenas para criação inicial do banco (ambiente novo).
-- Se a tabela "dispositivos" já existe em produção (ex.: Railway), NÃO rode este arquivo
-- para "corrigir" o ENUM ou a FK — isso não terá efeito sobre a tabela já criada e,
-- se algum dia a tabela for recriada (DROP + CREATE), os dados existentes serão perdidos.
-- Em vez disso, aplique as mudanças abaixo via ALTER TABLE:
--
--   ALTER TABLE dispositivos
--       MODIFY COLUMN status ENUM('aguardandoEnvio', 'recebidoNaEmpresa', 'aguardandoPerito', 'emAnalise', 'concluida', 'devolvida') DEFAULT 'aguardandoEnvio';
--
--   ALTER TABLE dispositivos
--       DROP FOREIGN KEY <nome_da_fk_atual>,
--       ADD FOREIGN KEY (enderecoDevolucaoId) REFERENCES enderecos_devolucao(id) ON DELETE SET NULL;
--   -- (descubra o nome da FK atual com: SHOW CREATE TABLE dispositivos;)
--
CREATE TABLE IF NOT EXISTS dispositivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuarioId INT NOT NULL,
    peritoId INT DEFAULT NULL,
    tipoDispositivo VARCHAR(100) NOT NULL,
    modeloDescricao TEXT NOT NULL,
    formaEntrega ENUM('correios', 'balcao') NOT NULL,
    enderecoDevolucaoId INT DEFAULT NULL,
    codigoRastreio VARCHAR(100) DEFAULT NULL,
    status ENUM('aguardandoEnvio', 'recebidoNaEmpresa', 'aguardandoPerito', 'emAnalise', 'concluida', 'devolvida') DEFAULT 'aguardandoEnvio',
    fotoEvidencia VARCHAR(255) DEFAULT NULL,
    laudo TEXT DEFAULT NULL,
    dataEntrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (peritoId) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (enderecoDevolucaoId) REFERENCES enderecos_devolucao(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enderecos_devolucao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuarioId INT NOT NULL,
    cep VARCHAR(10) NOT NULL,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado CHAR(2) NOT NULL,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
);