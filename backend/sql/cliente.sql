USE pericia;
DROP TABLE IF EXISTS clientes;
CREATE TABLE clientes(

    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL,
    email VARCHAR (100),
    cpfCnpj  VARCHAR(14) NOT NULL UNIQUE,
    dataNascimento VARCHAR(10),
    senha VARCHAR(12)

);

SELECT
    nome,
    email,
    cpf_cnpj,
    data_nascimento,
    senha
FROM
    clientes;
