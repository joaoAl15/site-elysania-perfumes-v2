# Site v2 "Boutique Rosé" — Elysanya Perfumaria

Segunda versão visual (creme, blush, cacau e rosé da logo; serifada Cormorant + Manrope; molduras em arco).
Mesmo catálogo, painel e pedido pelo WhatsApp da v1 (github.com/joaoAl15/site-elysania-perfumes-v1).
O painel `admin.html` usa o mesmo visual do site (`style.css` + `admin.css`). A chave fica salva por repositório, então v1 e v2 não se misturam.

Vitrine estática (HTML/CSS/JS puro) para GitHub Pages. Pedidos são finalizados no WhatsApp.
Site feito por Tokanu.

## Publicar no GitHub Pages
1. Crie um repositório (ex.: `site-elysania-perfumes-v2`) e envie todos os arquivos desta pasta para a branch `main`.
2. No repositório: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. O site fica em `https://SEU-USUARIO.github.io/site-elysania-perfumes-v2/`.
4. Edite `assets/js/config.js` e preencha `github.owner` e `github.repo` (e o `instagram`).

## Painel para editar produtos
- Endereço: `https://SEU-USUARIO.github.io/site-elysania-perfumes-v2/admin.html` (não aparece no menu do site).
- Precisa de um **token fine-grained** do GitHub com acesso só a este repositório e permissão
  **Contents: Read and write** (o passo a passo está dentro do próprio painel).
- Cada "Salvar" faz um commit em `data/produtos.json` (e envia a foto para `assets/produtos/`).
  O site atualiza em ~1 minuto.

## Onde fica cada coisa
- `data/produtos.json` — catálogo (nome, marca, categoria, preço, descrição, imagem…)
- `assets/js/config.js` — WhatsApp, Instagram, cidade, repositório
- `assets/produtos/` — fotos dos produtos (1000×1250)
- `privacidade.html` — política de privacidade (LGPD)

## Rodar localmente
```
python -m http.server 5173
```
e abra http://localhost:5173

## Ao alterar CSS ou JS
Aumente o número `?v=` nos links de `index.html`, `privacidade.html` e `admin.html`
(ex.: `style.css?v=3` → `?v=4`) para os visitantes não ficarem com a versão antiga em cache.
Alterações de produtos pelo painel não precisam disso.
