JiraTrellofy = (options = {}) => {
    /**
     * Limite de células/colunas que um card pode ter para iniciar a compactação.
     */
    const MAX_CELL_COMPACT = 3

    /**
     * Classes de estilos css do Jira.
     */
    const CSS = {
        GERRIT_COMMITS: 'customfield_11920',
        RESPONSAVEL_N3: 'customfield_14221',
        ENVOLVIDOS: 'customfield_10054',
        ASSIGNEE: 'assignee',
        LINK_USER: 'user-hover',
        ISSUE_KEY: 'issuekey',
        ISSUE_ACTIONS: 'issue_actions',
        DEADLINE: 'customfield_10200',
    }

    /**
     * Ícones utilizados para labels específicas caso a opção `disableLabelIcon` esteja desabilitada.
     * Podem ser sobrescritos por `LABELS_ICON = {}` definidos por cada usuário.
     * Para incluir novos Ícones, é necessario informar:
     *  NOME_LABEL: {
            icon: 'nome_icone',
            animate: true,
            background:'red',
            color:'white',
        }
     *
     * https://fonts.google.com/icons
     */
    const ICONS = {
        URGENTE: {
            icon: 'e911_emergency',
            animate: true,
            background:'red',
            color:'white',
        },
        ATENCAO: {
            icon: 'warning',
            background:'gold',
        },
        DEPENDENCIA: {
            icon: 'link',
        },
        PASTELARIA: {
            icon: 'lunch_dining',
        },
        TESTES_AUTOMATICOS: {
            icon: 'terminal',
        }
    }

    /**
     * Substitui o nome completo do usuário pelo seu nickname customizado.
     * Caso a opção 'avatarOnly' estiver habilitada, sera exibido apenas o avatar tendo o nome do usuário omitido.
     */
    const replaceNickname = (link) => {
        if ((options.withAvatar??true) && (options.avatarOnly??true)) {
            link.closest('.tinylink')?.parentElement.classList.add('min-width')
            return ''
        }
        const nickname = options.assigneeNicks?.[
            Object.keys(options.assigneeNicks).filter((key) => link.innerText.trim().startsWith(key))
        ]
        if (nickname) return nickname
        else if (link.innerText.indexOf(' ') > 0) return link.innerText.substr(0, link.innerText.indexOf(' '))
    }

    /**
     * Coloca o avatar do usuário no corpo de seu link.
     */
    const putAvatar = (link) => {
        let username = link.rel
        if (!username) return
        username = options.fixUsernameLDAP?.[username] || username
        link.prepend(Object.assign(
            document.createElement('img'),
            { height: 30, width: 30, src: `https://jira.touchtec.com.br/secure/useravatar?ownerId=${username}` }
        ))
    }

    /**
     * Adiciona o avatar e o apelido dos usuários para cada link de usuário vinculado a issue.
     */
    const formatLinkUsers = (row) => {
        const linksUser = row.querySelectorAll(`a.${CSS.LINK_USER}`)
        if (linksUser.length === 0) return
        linksUser.forEach((link) => {
            link.innerText = replaceNickname(link)
            if (options.withAvatar??true) putAvatar(link)
        })
    }

    /**
     * Remove uma quebra de linha `<br>` que são inseridas (intermitente) na coluna dos commits do gerrit.
     */
    const removeFirstBRFromCommitsArea = (row) => {
        const commitsCell = row.querySelector(`.${CSS.GERRIT_COMMITS}`)
        if (!commitsCell) return
        commitsCell.querySelector('br')?.remove()
    }

    const fixGerritlinksTextView = (gerritlinks) => {
        let p = gerritlinks.querySelector('p');
        if (p) {
            let br = p.querySelectorAll('br');
            if (br.length) br.forEach((br) => br.remove());
            p.querySelectorAll('a').forEach((a) => a.after(document.createElement('br')))
        }
    }

    /**
     * Remove as colunas de Responsável e Envolvidos caso a issue possua um Responsável N3.
     */
    const removeOthersUsersWhenN3 = (row) => {
        const cellN3 = row.querySelector(`.${CSS.RESPONSAVEL_N3}`)
        if (cellN3 === null) return
        const hasN3 = cellN3.querySelector(`a.${CSS.LINK_USER}`) !== null
        if (!hasN3) return
        let colspan = 1
        const cellAssignee = row.querySelector(`.${CSS.ASSIGNEE}`)
        if (cellAssignee !== null) {
            colspan++
            cellAssignee.remove()
        }
        const cellEnvolvidos = row.querySelector(`.${CSS.ENVOLVIDOS}`)
        if (cellEnvolvidos !== null) {
            colspan++
            cellEnvolvidos.remove()
        }
        cellN3.setAttribute('colspan', colspan)
    }

    /**
     * Troca labels especificas para Ícones
     */
    const changeLabelIcon = (row, labels) => {
        labels.querySelectorAll('ul.labels li').forEach((li) => {
            let labelText = li.innerText.trim()
            let label = options.labelsIcon?.[labelText]
            let padrao = ICONS[labelText]
            const a = li.querySelector('a')
            if (label) setLabelIcon(a, labelText, label)
            else if (padrao) setLabelIcon(a, labelText, padrao)
        })
    }

    const setLabelIcon = (a, labelText, icon) => {
        if (icon.icon) {
            a.className += ` label-${labelText} ${icon.animate ? 'animate' : ''}`
            a.innerHTML = `<span class="material-symbols-rounded">${icon.icon}</span>`
        }
        a.style.background = icon.background
        a.style.color = icon.color
        a.title = icon.title ? icon.title : a.title
    }

    /**
     * Hook chamado antes de realizar a compactação das linhas da tabela de cada painel.
     */
    const preCompactRow = (row) => {
        formatLinkUsers(row)
        removeFirstBRFromCommitsArea(row)
    }

    /**
     * Hook chamado depois de realizar a compactação das linhas da tabela de cada painel.
     */
    const postCompactRow = (row, subRow) => {
        removeOthersUsersWhenN3(subRow)

        let labels = subRow.querySelector('td.labels')
        if (labels && !options.disableLabelIcon) changeLabelIcon(row, labels)

        let gerritlinks = subRow.querySelector(`.${CSS.GERRIT_COMMITS}`)
        if (gerritlinks) fixGerritlinksTextView(gerritlinks)
    }

    /**
     * Marca a célula de uma <table> para ocupar duas linhas.
     */
    const fillTwoRows = (cell) => cell.setAttribute('rowspan', 2)

    /**
     * Realiza o "cardfy" de cada item (issue) do painel, compactando
     */
    const compactRow = (row) => {
        const cells = Array.from(row.querySelectorAll('td, th'))
        row.classList.add('compactRow')
        if (cells.length <= MAX_CELL_COMPACT) return

        preCompactRow(row)

        // primeiras celulas posterior ao número da issue ocupando o espaço de duas linhas
        for (let firstCell = cells.shift() ; cells.length > 1 ; firstCell = cells.shift()) {
            fillTwoRows(firstCell)
            if (firstCell.className.indexOf(CSS.ISSUE_KEY) >= 0) break
        }
        if (cells.length <= MAX_CELL_COMPACT - 1) return

        // ultima celula (acoes) ocupando o espaço de duas linhas
        const lastCell = cells[cells.length - 1]
        if (lastCell.classList.contains(CSS.ISSUE_ACTIONS)) fillTwoRows(cells.pop())

        // célula adjacente ao número da issue terá maior destaque ocupando o espaço das próximas colunas
        cells.shift().setAttribute('colspan', cells.length)

        // movendo demais colunas para a linha de baixo
        const subRow = document.createElement('tr')
        subRow.classList.add('compactRow')
        row.after(subRow)
        cells.forEach((cell) => subRow.append(cell))

        postCompactRow(row, subRow)
    }

    /**
     * Remove do titulo do painel o prefixo indicando que se trata de um gadget de Resultados por Filtro.
     */
    const reduceTitle = (gadget) => {
        const title = gadget.querySelector('.dashboard-item-title')
        if (!title) return
        const minTitle = title.innerHTML.trim().split(':')[1]
        if (minTitle) title.innerHTML = minTitle.trim()
    }

    const run = () => {
        const content = document.getElementById('dashboard-content')
        const cells = content.querySelectorAll('.issue-table tr:not(.compactRow)')
        cells.forEach((row) => compactRow(row))

        const gadgets = content.querySelectorAll('#dashboard-content > .gadget')
        gadgets.forEach((gadget) => reduceTitle(gadget))
    }

    window.addEventListener('load', (event) => {
        if (!options.disableLabelIcon) {
            document.head.append(Object.assign(
                document.createElement('link'),
                { rel:"stylesheet", href:"https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,500,0,0" }
            ))
        }
        run()
        const jira = document.getElementById('jira')
        const observer = new MutationObserver((mutationList, observer) => {
            window.clearTimeout(jira.timeoutRunner)
            // timeout com override para não ficar disparando toda hora
            // quando multiplos elementos estão sendo carregados na DOM
            jira.timeoutRunner = setTimeout(() => run(), 100)
        })

        // verifica se algum elemento é inserido no corpo da div principal do Jira
        observer.observe(jira, { attributes: false, childList: true, subtree: true })
    })

    window.addEventListener('keypress', (event) => {
        if (event.key === 'q') {
            var currentUser = document.getElementById('header').querySelector('nav.aui-header li#user-options > a').getAttribute('data-username')
            document.getElementById('content').querySelectorAll(`.issue-table .compactRow:not(.issuerow):not(:has(.tinylink > a[rel="${currentUser}"]))`).forEach(item => {
                item.classList?.toggle('hide-shortchut')
                item.previousSibling?.classList?.toggle('hide-shortchut')
            })
        }
    })
}
