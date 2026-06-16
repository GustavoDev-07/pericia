

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

async function login_usuario(evento) {
    // 1. Evita que a página recarregue ao submeter o formulário
    evento.preventDefault();

    // 2. Captura os valores dos inputs (certifique-se de que os IDs existam no seu HTML de login)
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    // Validação básica no front-end para não enviar campos vazios
    if (!email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // 3. Monta o objeto (payload) com os dados de login
    const payload = {
        email: email,
        senha: senha
    };

    try {
        // 4. Faz a requisição POST para a rota de login do backend
        const resposta = await fetch('http://127.0.0.1:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        // 5. Trata a resposta enviada pelo servidor
        if (resposta.ok && resultado.auth === true) {
            alert(`Bem-vindo de volta, ${resultado.usuario.nome}!`);

            // 6. Armazena o Token JWT de forma segura no navegador do usuário
            localStorage.setItem('token', resultado.token);

            // Redireciona o usuário para a página principal ou painel de serviços
            window.location.href = 'http://127.0.0.1:5500/frontend/html/inicio.html'; 

        } else {
            // Exibe a mensagem de erro vinda do backend ("E-mail ou senha incorretos!", etc)
            alert(resultado.mensagem || "Falha ao realizar o login.");
        }

    } catch (erro) {
        console.error("Erro na comunicação com a API de login:", erro);
        alert("Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando na porta 3000.");
    }
}