(function () {
    'use strict'

    let app = {
        proxies: {},
        clashConfig: {},
        config: {},
        defaultConfig: {
            address: "localhost",
            port: 9090,
            secret: "",
            switch: {}
        }
    }

    let size = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s', 'EB/s', 'ZB/s', 'YB/s']

    // Tabs Selecter
    let tabsClass = document.querySelectorAll('div.nav li.tab-button')
    Array.from(tabsClass).forEach(e => {
        e.addEventListener('click', e => {
            let tabName, nowNav

            tabName = e.currentTarget.dataset.tabName
            nowNav = document.querySelector('div.nav li.tab-button.is-active').dataset.tabName

            document.querySelector('div.nav li.tab-button.is-active').classList.remove('is-active')
            e.currentTarget.classList.add('is-active')

            document.querySelector('div.container.tab-content.' + nowNav).classList.add('tabs-hidden')
            document.querySelector('div.container.tab-content.' + tabName).classList.remove('tabs-hidden')
        }, false)
    })

    // Setting Save
    document.getElementById('setting-save').addEventListener('click', () => {
        let address = document.querySelector('.setting-form input[name=address]').value
        let port = document.querySelector('.setting-form input[name=port]').value
        let secret = document.querySelector('.setting-form input[name=secret]').value

        app.config['address'] = address.length == 0 ? 'localhost' : address
        app.config['port'] = port.length == 0 ? '9090' : port
        app.config['secret'] = secret

        document.querySelector('#setting div.notification').style.display = 'none'
        document.getElementById('setting-save').classList.add('is-loading')

        app.dataStore()
        app.initService()
    }, false)

    // reSetting
    document.getElementById('setting-button').addEventListener('click', () => {
        document.getElementById('setting').classList.add('is-active')
    }, false)

    // Config
    document.getElementById('config-form').addEventListener('submit', e => {
        let configData = {
            'port': parseInt(document.querySelector('div.container.config div.columns [name=port]').value),
            'socket-port': parseInt(document.querySelector('div.container.config div.columns [name=socket-port]').value),
            'redir-port': parseInt(document.querySelector('div.container.config div.columns [name=redir-port]').value),
            'allow-lan': document.querySelector('div.container.config div.columns [name=allow-lan]').value === 'true',
            'mode': document.querySelector('div.container.config div.columns [name=mode]').value,
            'log-level': document.querySelector('div.container.config div.columns [name=log-level]').value,
        }

        app.clashRequest('configs', 'PUT', configData).then(response => {
            if (response.ok) {
                return
            } else {
                throw new Error('Update config error.')
            }
        }).then(() => {
            window.location.reload()
        }).catch(error => {
            console.log(error)
        })
        e.preventDefault()
    }, false)

    // fetch Clash API
    app.clashRequest = (uri, method, data = {}) => {
        let url = "http://" + app.config.address + ":" + app.config.port + '/' + uri
        let headers

        if (app.config.secret.length == 0) {
            headers = new Headers()
        } else {
            headers = new Headers({
                "Authorization": "Bearer " + app.config.secret
            })
        }

        let requestInit = {
            method: method,
            headers: headers,
            mode: 'cors'
        }

        if (!(Object.keys(data).length === 0 && data.constructor === Object)) {
            requestInit['body'] = JSON.stringify(data)
        }
        let configRequest = new Request(url, requestInit)

        return new Promise((resolve, reject) => {
            fetch(configRequest).then(response => {
                resolve(response)
            }).catch(error => {
                reject(error)
            })
        })
    }

    app.dataStore = () => {
        localStorage.clashConfig = JSON.stringify(app.config)
    }

    app.updateTraffic = (up, down) => {
        var upFlag = 0
        var downFlag = 0

        while (up > 1000) {
            up = parseInt(up / 1000)
            upFlag++
        }

        while (down > 1000) {
            down = parseInt(down / 1000)
            downFlag++
        }

        document.getElementById('up-tag').innerHTML = '↑ ' + up + ' ' + size[upFlag]
        document.getElementById('down-tag').innerHTML = '↓ ' + down + ' ' + size[downFlag]
    }

    app.insertLogs = (type, message) => {
        var logTable = document.querySelector('#logs-table tbody')

        var logTrDom = document.createElement('tr')
        var logTypeDom = document.createElement('td')
        var logMsgDom = document.createElement('td')
        var logSpanDom = document.createElement('span')

        switch (type) {
            case 'info':
                var tagType = 'is-info'
                break
            case 'warning':
                var tagType = 'is-warning'
                break
            case 'error':
                var tagType = 'is-danger'
                break
            case 'debug':
                var tagType = 'is-dark'
                break
            default:
                var tagType = 'is-info'

        }
        logSpanDom.classList.add('tag', tagType)
        logSpanDom.innerText = type
        logTypeDom.appendChild(logSpanDom)
        logTrDom.appendChild(logTypeDom)
        logMsgDom.innerHTML = message
        logTrDom.appendChild(logMsgDom)
        logTable.insertBefore(logTrDom, logTable.firstChild)
    }

    app.receiveTraffic = () => {
        app.clashRequest('traffic', 'GET').then(response => {
            const reader = response.body.getReader()

            reader.read().then(function processTraffic({
                done,
                value
            }) {
                if (done) {
                    return
                }

                var trafficValue = JSON.parse(new TextDecoder("utf-8").decode(value))

                app.updateTraffic(trafficValue.up, trafficValue.down)

                return reader.read().then(processTraffic)
            })
        }).catch(error => {
            console.log(error)
        })
    }

    app.receiveLog = () => {
        app.clashRequest('logs', 'GET').then(response => {
            const reader = response.body.getReader()

            reader.read().then(function processLogs({
                done,
                value
            }) {
                if (done) {
                    return
                }

                try {
                    let logs = new TextDecoder("utf-8").decode(value).split("\n");

                    for (var i in logs) {
                        var logValue = JSON.parse(logs[i])
                        app.insertLogs(logValue.type, logValue.payload)
                    }
                } catch (err) {
                    return reader.read().then(processLogs)
                }

                

                return reader.read().then(processLogs)
            })
        }).catch(error => {
            console.log(error)
        })
    }

    app.selectProxies = (group, proxy, ul, tag) => {
        app.clashRequest('proxies/' + group, 'PUT', {
            'name': proxy
        }).then(response => {
            if (!response.ok) {
                throw new Error("Change Proixes Error.")
            }
        }).then(() => {
            app.proxies[group].now = proxy
            app.config.switch[group] = proxy
            app.dataStore()
            document.querySelector('div.container ul.' + ul + ' a.is-active').classList.remove('is-active')
            document.querySelector('div.container ul.' + ul + ' a[data-tag=' + tag + ']').classList.add('is-active')
        }).catch(error => {
            console.log(error)
        })
    }

    app.updateProxies = () => {
        let proxiesBox = document.querySelector('div.container.proxies div.card-content')
        proxiesBox.innerHTML = ''

        for (var group in app.proxies) {
            if (group == 'DIRECT') {
                continue
            } else if (group == 'REJECT') {
                continue
            } else if (app.clashConfig.mode == 'Rule' && group == 'GLOBAL') {
                continue
            }

            if (app.proxies[group].type == 'Selector') {
                var boxDiv = document.createElement('div')
                boxDiv.classList.add('box', 'group-list')

                var aside = document.createElement('aside')
                aside.classList.add('menu')

                var pLabel = document.createElement('p')
                pLabel.classList.add('menu-label')
                pLabel.innerHTML = group
                aside.appendChild(pLabel)

                var ulList = document.createElement('ul')
                var ul = 'ul' + Math.random().toString(36).substr(2)
                ulList.classList.add('menu-list', ul)

                for (var proxy in app.proxies[group].all) {
                    var liDom = document.createElement('li')
                    var aDom = document.createElement('a')
                    aDom.innerHTML = app.proxies[group].all[proxy]
                    if (app.proxies[group].now == app.proxies[group].all[proxy]) {
                        aDom.classList.add('is-active')
                    }
                    aDom.dataset.group = group
                    aDom.dataset.ul = ul
                    aDom.dataset.tag = 'tag' + Math.random().toString(36).substr(2)
                    aDom.addEventListener('click', e => {
                        let group = e.currentTarget.dataset.group
                        let proxy = e.currentTarget.textContent
                        let tag = e.currentTarget.dataset.tag
                        let ul = e.currentTarget.dataset.ul
                        app.selectProxies(group, proxy, ul, tag)
                    })
                    liDom.appendChild(aDom)
                    ulList.appendChild(liDom)
                }

                aside.appendChild(ulList)
                boxDiv.appendChild(aside)

                proxiesBox.appendChild(boxDiv)
            }
        }
        app.restoreProxies()
    }

    app.restoreProxies = () => {
        for (let group in app.config.switch) {
            if (typeof app.proxies[group] === "undefined") {
                delete(app.config.switch[group])
            } else if (app.proxies[group].now != app.config.switch[group]) {
                app.selectProxies(group, app.config.switch[group])
            }
        }
    }

    app.getProxies = () => {
        app.clashRequest('proxies', 'GET').then(response => {
            return response.json()
        }).then(json => {
            app.proxies = json.proxies
            app.updateProxies()
        }).catch(error => {
            console.log(error)
        })
    }

    app.updateConfig = () => {
        for (let config in app.clashConfig) {
            document.querySelector('div.config [name=' + config + ']').value = app.clashConfig[config]
        }
    }

    app.initService = () => {
        console.log('[ClashZ] Application Init.')
        document.querySelector('.setting-form input[name=address]').value = app.config.address
        document.querySelector('.setting-form input[name=port]').value = app.config.port
        document.querySelector('.setting-form input[name=secret]').value = app.config.secret

        app.clashRequest('configs', 'GET').then(response => {
            if (response.ok) {
                return response.json()
            } else {
                throw new Error("Get Clash Config Error.")
            }
        }).then(json => {
            document.querySelector('#setting-save').classList.remove('is-loading')
            document.getElementById('setting').classList.remove('is-active')

            app.clashConfig = json

            app.updateConfig()
            app.receiveTraffic()
            app.receiveLog()

            app.getProxies()
        }).catch(error => {
            console.log(error)
            document.getElementById('setting').classList.add('is-active')
            document.querySelector('#setting .notification').style.display = ''
            document.querySelector('#setting-save').classList.remove('is-loading')
        })
    }

    let config = localStorage.clashConfig
    if (config) {
        app.config = JSON.parse(config)
    } else {
        app.config = app.defaultConfig
        app.dataStore()
    }

    app.initService()

    // service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('/sw.js')
            .then(function () {
                console.log('[ClashZ - ServiceWorker] Registered')
            })
    }
})()