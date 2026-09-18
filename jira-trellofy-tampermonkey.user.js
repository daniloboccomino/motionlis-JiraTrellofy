// ==UserScript==
// @name         JiraTrellofy Loader
// @namespace    touchtec
// @version      2.1.0
// @description  Bootstrap que injeta o JiraTrellofy (js/css) a partir dos anexos da MOTAUTO-24
// @match        https://jira.touchtec.com.br/secure/Dashboard.jspa?selectPageId=53772
// @grant        none
// @updateURL    https://raw.githubusercontent.com/daniloboccomino/motionlis-JiraTrellofy/refs/heads/master/jira-trellofy-tampermonkey.user.js
// @downloadURL  https://raw.githubusercontent.com/daniloboccomino/motionlis-JiraTrellofy/refs/heads/master/jira-trellofy-tampermonkey.user.js
// ==/UserScript==

(async () => {
    const findAttachment = (doc, extension) => {
        return doc.querySelector(`dt.attachment-title > a[href$='jira-trellofy.${extension}']`).href
    }

    const page = await fetch('https://jira.touchtec.com.br/browse/MOTAUTO-24')
    const doc = new DOMParser().parseFromString(await page.text(), 'text/html')

    const [css, js] = await Promise.all([
        fetch(findAttachment(doc, 'css')).then((r) => r.text()),
        fetch(findAttachment(doc, 'js')).then((r) => r.text()),
    ])

    const cleanCSS = (css) => {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove comentários
            .replace(/\s+/g, ' ')               // Substitui múltiplos espaços por um
            .replace(/\s*([{}:;,])\s*/g, '$1')  // Remove espaços ao redor de pontuações
            .trim()                             // Remove espaços nas pontas
    }

    const styles = Object.assign(document.createElement('style'), { innerText: cleanCSS(css) })
    window.JiraTrellofyUserStyles ? window.JiraTrellofyUserStyles.before(styles) : document.head.append(styles)
    document.body.append(Object.assign(document.createElement('script'), { text: js }))

    console.log('TESTE FINAL v2.1.0')

    JiraTrellofy(window.JiraTrellofyUserOptions ?? {})
})()
