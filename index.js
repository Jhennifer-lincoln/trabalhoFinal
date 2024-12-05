import express from 'express';
import session from 'express-session';
import path from 'path';

const app = express();
const port = 3000;

app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'chat-room-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { 
            secure: false,   
            httpOnly: true,
            maxAge: 1000 * 60 * 30
        }
    })
);

let usuario = []; 
let mensagem = [];

function autenticacao(req, res, next) {
    if (!req.session.usuario) {
        res.redirect('/');
        return;
    }
    next();
}

function renderizarErro(res, erros, voltarPara) {
    res.send(`
        <h3>Erros:</h3>
        <ul>${erros.map((err) => `<li>${err}</li>`).join('')}</ul>
        <a href="${voltarPara}">Voltar</a>
    `);
}

function login(req, res) {
    res.sendFile(path.join(process.cwd(), 'login.html'));
}

function validarLogin(req, res) {
    const { usuario, senha } = req.body;

    if (usuario === "adm" && senha === "123") {
        req.session.usuario = usuario;
        req.session.lastAccess = new Date().toLocaleString();
        res.redirect('/menu');
    } else {
        res.send(`
            <head>
            <meta charset="utf-8">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container w-50 mt-5">
                    <div class="alert alert-danger" role="alert">
                        Usuário ou senha inválidos!
                    </div>
                    <a href="/" class="btn btn-secondary">Tentar novamente</a>
                </div>
            </body>
        `);
    }
}

function menu(req, res) {
    const lastAccess = req.session.lastAccess || 'Nunca';
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <title>Menu Principal</title>
            <meta charset="utf-8">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container w-50 mt-5">
                <h1 class="text-center mb-4">Bem-vindo, ${req.session.usuario}</h1>
                <p><strong>Último acesso:</strong> ${lastAccess}</p>
                <ul class="list-group">
                    <li class="list-group-item">
                        <a href="/cadastro.html" class="btn btn-outline-primary w-100">Cadastro de Usuários</a>
                    </li>
                    <li class="list-group-item">
                        <a href="/chat" class="btn btn-outline-success w-100">Bate-papo</a>
                    </li>
                    <li class="list-group-item">
                        <a href="/logout" class="btn btn-outline-danger w-100">Sair</a>
                    </li>
                </ul>
            </div>
        </body>
        </html>

    `);
}

function sair(req, res) {
    req.session.destroy();
    res.redirect('/');
}

function cadastrar(req, res) {
    res.sendFile(path.join(process.cwd(), 'cadastro.html'));
}

function cadastro(req, res) {
    const { nome, dataNascimento, nickname } = req.body;
    let erros = [];

    if (!nome) erros.push('Nome é obrigatório.');
    if (!dataNascimento) erros.push('Data de nascimento é obrigatória.');
    if (!nickname) erros.push('Nickname é obrigatório.');

    if (erros.length > 0) {
        return renderizarErro(res, erros, '/cadastro.html');
    }

    usuario.push({ nome, dataNascimento, nickname });
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <title>Cadastro de Usuários</title>
            <meta charset="utf-8">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-5">
                <h3>Usuários cadastrados:</h3>
                <ul class="list-group">
                    ${usuario.map((u) => `
                        <li class="list-group-item">
                            <strong>${u.nome}</strong> - ${u.nickname} 
                            <small class="text-muted">(${u.dataNascimento})</small>
                        </li>
                    `).join('')}
                </ul>
                <div class="mt-3">
                    <a href="/cadastro.html" class="btn btn-secondary">Continuar cadastrando</a>
                    <a href="/menu" class="btn btn-primary">Voltar ao menu</a>
                </div>
            </div>
        </body>
        </html>
    `);
}

function chat(req, res) {
    const lista = usuario
        .map((usuario) => `<option value="${usuario.nickname}">${usuario.nome} (${usuario.nickname})</option>`)
        .join('');
    res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <title>Bate-papo</title>
            <meta charset="utf-8">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container w-50 mt-5">
                <h1>Bate-papo</h1>
                <form action="/postarMensagem" method="POST">
                    <div class="mb-3">
                        <label for="usuario" class="form-label">Usuário:</label>
                        <select name="usuario" class="form-select" required>
                            <option value="">Selecione um usuário</option>
                            ${lista}  <!-- Aqui irá a lista de usuários dinâmicos -->
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="message" class="form-label">Mensagem:</label>
                        <textarea name="message" class="form-control" placeholder="Escreva sua mensagem" required></textarea>
                    </div>
                    <div class="d-flex justify-content-between">
                        <button type="submit" class="btn btn-primary">Enviar</button>
                        <a href="/menu" class="btn btn-secondary">Voltar ao Menu</a>
                    </div>
                </form>
                
                <hr>
                
                <h3>Mensagens:</h3>
                <ul class="list-group">
                    ${mensagem
                        .map((msg) => `<li class="list-group-item"><strong>${msg.sender}:</strong> ${msg.content} <em>(${msg.timestamp})</em></li>`)
                        .join('')}
                </ul>
            </div>
        </body>
        </html>
    `);
}

function postarMensagem(req, res) {
    const { usuario:nickname, message } = req.body;

    if (!message) {
        res.send(`
            <p>Mensagem não pode estar vazia!</p>
            <a href="/chat">Voltar</a>
        `);
        return;
    }

    mensagem.push({
        sender: nickname,  
        content: message,
        timestamp: new Date().toLocaleString(),
    });
    res.redirect('/chat');
}

app.get('/', login);
app.post('/login', validarLogin);
app.get('/menu', autenticacao, menu);
app.get('/logout', sair);
app.get('/cadastro.html', cadastrar);
app.post('/cadastrar', autenticacao, cadastro);
app.get('/chat', autenticacao, chat);
app.post('/postarMensagem', autenticacao, postarMensagem);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
