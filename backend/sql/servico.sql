
USE pericia;
CREATE TABLE servico(
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_produto VARCHAR(250) NOT NULL,
    numero_identificacao CHAR (12) NOT NULL UNIQUE,
    endereco VARCHAR(250)
   
);
SELECT
    nome_produto,
    numero_identificacao
    endereco
FROM
    servico;