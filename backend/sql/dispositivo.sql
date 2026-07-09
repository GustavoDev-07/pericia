CREATE TABLE IF NOT EXISTS dispositivos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuarioId INT NOT NULL,
    peritoId INT DEFAULT NULL,
    tipoDispositivo VARCHAR(100) NOT NULL,
    modeloDescricao TEXT NOT NULL,
    formaEntrega ENUM('correios', 'balcao') NOT NULL,
    enderecoDevolucaoId INT DEFAULT NULL,
    codigoRastreio VARCHAR(100) DEFAULT NULL,
    status ENUM('aguardandoEnvio', 'recebidoNaEmpresa', 'aguardandoPerito', 'emAnalise', 'concluida') DEFAULT 'aguardandoEnvio',
    fotoEnvidencia VARCHAR(255) DEFAULT NULL,
    laudo TEXT DEFAULT NULL,
    dataEntrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (peritoId) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (enderecoDevolucaoId) REFERENCES enderecosDevolucao(id) ON DELETE SET NULL
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