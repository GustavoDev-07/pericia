

async function cadastro_usuario(evento) {
    evento.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const dataNascimento = document.getElementById('data').value;
    const cpfCnpj = document.getElementById('cpf').value;
    const senha = document.getElementById('senha').value;
    const confirmacaoSenha = document.getElementById('confirmar').value;

    if (senha !== confirmacaoSenha) {
        alert("As senhas não coincidem!")
        return;
    }

    const payload = {
        nome: nome,
        email: email,
        dataNascimento: dataNascimento,
        cpfCnpj: cpfCnpj,
        senha: senha,
        confirmacaoSenha: confirmacaoSenha
    };

    
try {
        // Realiza a chamada do método POST para o endpoint correto
        const resposta = await fetch('http://127.0.0.1:3000/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        // Tratamento da resposta baseado no try/catch do seu backend

        if (resposta.ok && resultado.insertId) {
            alert("Usuário cadastrado com sucesso! ID: "+ resultado.insertId);

            document.getElementById("form_card").reset();
        } else {
            alert(resultado.mensagem || "O servidor processou a requisição, mas falhou ao salvar no banco.")
        }
    } catch (erro) {
        console.error("Erro na comunicação com a API:", erro);
        alert("Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando na porta 3000.");
    }
};

async function login_usuario(params) {
    
}