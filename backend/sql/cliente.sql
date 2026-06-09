USE pericia;
DROP TABLE IF EXISTS cliente;
CREATE TABLE cliente(

    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    email VARCHAR (100),
    cpf_cnpj  VARCHAR(14) NOT NULL UNIQUE,
    data_de_nascimento VARCHAR(8),
    senha VARCHAR(12)

);

SELECT
    nome,
    email,
    cpf_cnpj,
    data_de_nascimento,
    senha
FROM
    cliente;
